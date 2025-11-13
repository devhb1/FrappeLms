/**
 * ===============================
 * SHARED EMAIL ERROR HANDLING
 * ===============================
 * 
 * Centralized email error handling to eliminate duplication.
 * Used across grant processing, affiliate payouts, and admin notifications.
 * 
 * Features:
 * - Consistent error handling across all email operations
 * - Detailed logging for debugging
 * - Retry mechanism for transient failures
 * - Graceful degradation for non-critical emails
 */

import { logger } from './production-logger';

export interface EmailResult {
    success: boolean;
    error?: string;
    retryable?: boolean;
    attempts?: number;
}

/**
 * Safe email sending wrapper with error handling and retries
 * 
 * @param emailPromise - Promise that sends the email
 * @param context - Context for logging (e.g., 'grant approval', 'payout notification')
 * @param maxRetries - Maximum number of retry attempts (default: 2)
 * @param critical - Whether email failure should fail the entire operation (default: false)
 * @returns EmailResult with success status and error details
 */
export async function safeEmailSend(
    emailPromise: Promise<boolean>,
    context: string,
    options: {
        maxRetries?: number;
        critical?: boolean;
        retryDelay?: number;
    } = {}
): Promise<EmailResult> {
    const { maxRetries = 2, critical = false, retryDelay = 1000 } = options;

    let lastError: string = '';
    let attempts = 0;

    for (attempts = 1; attempts <= maxRetries + 1; attempts++) {
        try {
            logger.info(`Sending email: ${context}`, {
                attempt: attempts,
                maxRetries: maxRetries + 1
            });

            const success = await emailPromise;

            if (success) {
                logger.info(`Email sent successfully: ${context}`, {
                    attempts,
                    success: true
                });

                return {
                    success: true,
                    attempts
                };
            } else {
                lastError = 'Email service returned false';
                logger.warn(`Email service returned false: ${context}`, {
                    attempt: attempts
                });
            }
        } catch (error: any) {
            lastError = error?.message || String(error);
            logger.warn(`Email sending failed: ${context}`, {
                error: lastError,
                attempt: attempts,
                stack: error?.stack
            });
        }

        // If this isn't the last attempt, wait before retrying
        if (attempts <= maxRetries) {
            logger.info(`Retrying email send in ${retryDelay}ms: ${context}`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }

    // All attempts failed
    const errorMessage = `Failed to send email after ${attempts} attempts: ${lastError}`;

    if (critical) {
        logger.error(`CRITICAL email failure: ${context}`, {
            error: lastError,
            attempts,
            critical: true
        });
        throw new Error(errorMessage);
    } else {
        logger.warn(`Non-critical email failure: ${context}`, {
            error: lastError,
            attempts,
            critical: false
        });

        return {
            success: false,
            error: errorMessage,
            retryable: isRetryableError(lastError),
            attempts
        };
    }
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: string): boolean {
    const retryablePatterns = [
        'timeout',
        'network',
        'connection',
        'rate limit',
        'temporary',
        'busy',
        'throttle'
    ];

    const errorLower = error.toLowerCase();
    return retryablePatterns.some(pattern => errorLower.includes(pattern));
}

/**
 * Batch email sending with error handling
 * Useful for bulk operations like grant approvals
 */
export async function batchEmailSend(
    emailTasks: Array<{
        emailPromise: Promise<boolean>;
        context: string;
        critical?: boolean;
    }>,
    options: {
        maxConcurrent?: number;
        failFast?: boolean;
    } = {}
): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ context: string; error: string }>;
}> {
    const { maxConcurrent = 5, failFast = false } = options;

    let successful = 0;
    let failed = 0;
    const errors: Array<{ context: string; error: string }> = [];

    // Process emails in batches to avoid overwhelming the email service
    for (let i = 0; i < emailTasks.length; i += maxConcurrent) {
        const batch = emailTasks.slice(i, i + maxConcurrent);

        const results = await Promise.allSettled(
            batch.map(task =>
                safeEmailSend(task.emailPromise, task.context, {
                    critical: task.critical || false
                })
            )
        );

        for (let j = 0; j < results.length; j++) {
            const result = results[j];
            const task = batch[j];

            if (result.status === 'fulfilled') {
                if (result.value.success) {
                    successful++;
                } else {
                    failed++;
                    errors.push({
                        context: task.context,
                        error: result.value.error || 'Unknown error'
                    });

                    if (failFast && task.critical) {
                        logger.error('Critical email failed in batch, stopping', {
                            context: task.context,
                            error: result.value.error
                        });
                        throw new Error(`Critical email failed: ${task.context}`);
                    }
                }
            } else {
                failed++;
                errors.push({
                    context: task.context,
                    error: result.reason?.message || String(result.reason)
                });

                if (failFast && task.critical) {
                    logger.error('Critical email threw exception in batch, stopping', {
                        context: task.context,
                        error: result.reason?.message
                    });
                    throw result.reason;
                }
            }
        }

        // Brief pause between batches to be respectful to email service
        if (i + maxConcurrent < emailTasks.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    logger.info('Batch email sending completed', {
        total: emailTasks.length,
        successful,
        failed,
        errorCount: errors.length
    });

    return { successful, failed, errors };
}

/**
 * Email queue for handling high-volume email operations
 * Useful for large-scale notifications
 */
export class EmailQueue {
    private queue: Array<{
        emailPromise: Promise<boolean>;
        context: string;
        critical?: boolean;
        priority?: number;
    }> = [];

    private processing = false;
    private maxConcurrent = 3;

    add(
        emailPromise: Promise<boolean>,
        context: string,
        options: { critical?: boolean; priority?: number } = {}
    ): void {
        this.queue.push({
            emailPromise,
            context,
            ...options
        });

        // Sort by priority (higher numbers first)
        this.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));

        this.process();
    }

    private async process(): Promise<void> {
        if (this.processing || this.queue.length === 0) return;

        this.processing = true;

        while (this.queue.length > 0) {
            const batch = this.queue.splice(0, this.maxConcurrent);

            await batchEmailSend(batch.map(item => ({
                emailPromise: item.emailPromise,
                context: item.context,
                critical: item.critical
            })));
        }

        this.processing = false;
    }
}

// Export singleton email queue for global use
export const emailQueue = new EmailQueue();

export default {
    safeEmailSend,
    batchEmailSend,
    emailQueue,
    EmailQueue
};