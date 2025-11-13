/**
 * ===============================
 * PRODUCTION-SAFE LOGGER UTILITY
 * ===============================
 * 
 * Centralized logging system that prevents sensitive data exposure in production.
 * Replaces all console.log statements throughout the application.
 * 
 * Features:
 * - Environment-aware log levels
 * - Structured logging with context
 * - Sensitive data filtering
 * - Performance monitoring
 * - Error tracking integration
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Record<string, any>;

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: LogContext;
    requestId?: string;
}

class ProductionLogger {
    private isProduction = process.env.NODE_ENV === 'production';
    private isDevelopment = process.env.NODE_ENV === 'development';

    // Sensitive fields to filter out from logs
    private sensitiveFields = [
        'password', 'token', 'secret', 'key', 'auth',
        'verifyCode', 'otp', 'transactionId', 'paymentMethod',
        'stripeKey', 'mongoUri', 'smtpPassword'
    ];

    /**
     * Filter sensitive data from log context
     */
    private sanitizeContext(context: LogContext): LogContext {
        if (!context || typeof context !== 'object') return context;

        const sanitized = { ...context };

        for (const key in sanitized) {
            const lowerKey = key.toLowerCase();
            const isSensitive = this.sensitiveFields.some(field =>
                lowerKey.includes(field.toLowerCase())
            );

            if (isSensitive) {
                sanitized[key] = typeof sanitized[key] === 'string'
                    ? '***REDACTED***'
                    : '[SENSITIVE_DATA]';
            }

            // Recursively sanitize nested objects
            if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                sanitized[key] = this.sanitizeContext(sanitized[key]);
            }
        }

        return sanitized;
    }

    /**
     * Create structured log entry
     */
    private createLogEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
        return {
            timestamp: new Date().toISOString(),
            level,
            message,
            context: context ? this.sanitizeContext(context) : undefined,
            requestId: context?.requestId || undefined
        };
    }

    /**
     * Output log based on environment and level
     */
    private output(entry: LogEntry): void {
        const { timestamp, level, message, context } = entry;

        // In production, only log warn and error levels
        if (this.isProduction && !['warn', 'error'].includes(level)) {
            return;
        }

        // Format message for console output
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        const formattedMessage = context
            ? `${prefix} ${message} ${JSON.stringify(context)}`
            : `${prefix} ${message}`;

        // Use appropriate console method based on level
        switch (level) {
            case 'debug':
                if (this.isDevelopment) console.debug(formattedMessage);
                break;
            case 'info':
                if (this.isDevelopment) console.info(formattedMessage);
                break;
            case 'warn':
                console.warn(formattedMessage);
                break;
            case 'error':
                console.error(formattedMessage);
                break;
        }

        // In production, also send to monitoring service
        if (this.isProduction && level === 'error') {
            this.sendToMonitoring(entry);
        }
    }

    /**
     * Send critical errors to monitoring service (Sentry, etc.)
     */
    private sendToMonitoring(entry: LogEntry): void {
        // TODO: Integrate with Sentry or other monitoring service
        // For now, just ensure it's logged to system
        if (process.env.SENTRY_DSN) {
            // Sentry.captureMessage(entry.message, 'error');
        }
    }

    // Public logging methods
    debug(message: string, context?: LogContext): void {
        this.output(this.createLogEntry('debug', message, context));
    }

    info(message: string, context?: LogContext): void {
        this.output(this.createLogEntry('info', message, context));
    }

    warn(message: string, context?: LogContext): void {
        this.output(this.createLogEntry('warn', message, context));
    }

    error(message: string, context?: LogContext): void {
        this.output(this.createLogEntry('error', message, context));
    }

    /**
     * Log API requests for debugging
     */
    apiRequest(method: string, path: string, context?: LogContext): void {
        this.info(`${method} ${path}`, {
            type: 'api_request',
            ...context
        });
    }

    /**
     * Log API responses for debugging
     */
    apiResponse(method: string, path: string, status: number, context?: LogContext): void {
        const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
        this[level](`${method} ${path} ${status}`, {
            type: 'api_response',
            status,
            ...context
        });
    }

    /**
     * Log authentication events
     */
    auth(event: string, context?: LogContext): void {
        this.info(`Auth: ${event}`, {
            type: 'authentication',
            ...context
        });
    }

    /**
     * Log payment events
     */
    payment(event: string, context?: LogContext): void {
        this.info(`Payment: ${event}`, {
            type: 'payment',
            ...context
        });
    }

    /**
     * Log affiliate events
     */
    affiliate(event: string, context?: LogContext): void {
        this.info(`Affiliate: ${event}`, {
            type: 'affiliate',
            ...context
        });
    }

    /**
     * Log database operations
     */
    db(operation: string, context?: LogContext): void {
        this.debug(`DB: ${operation}`, {
            type: 'database',
            ...context
        });
    }
}

// Create singleton instance
export const logger = new ProductionLogger();

// Export individual methods for convenience
export const { debug, info, warn, error } = logger;

// Export specialized loggers
export const apiLogger = {
    request: logger.apiRequest.bind(logger),
    response: logger.apiResponse.bind(logger)
};

export const authLogger = {
    log: logger.auth.bind(logger)
};

export const paymentLogger = {
    log: logger.payment.bind(logger)
};

export const affiliateLogger = {
    log: logger.affiliate.bind(logger)
};

export const dbLogger = {
    log: logger.db.bind(logger)
};

export default logger;