/**
 * ===============================
 * FRAPPE LMS INTEGRATION SERVICE
 * ===============================
 * 
 * Handles all FrappeLMS API interactions for course enrollment
 * after successful payment processing.
 * 
 * @module FrappeLMS Service
 * @version 1.0
 */

import ProductionLogger from '@/lib/utils/production-logger';

// FrappeLMS Configuration
// Production endpoint: https://lms.maaledu.com/api/method/lms.lms.payment_confirmation.confirm_payment

// Ensure URL always has protocol (https://)
const ensureProtocol = (url: string): string => {
    if (!url) return 'https://lms.maaledu.com';

    // If URL already has protocol, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // If URL is missing protocol, add https://
    return `https://${url}`;
};

const FRAPPE_CONFIG = {
    baseUrl: ensureProtocol(process.env.FRAPPE_LMS_BASE_URL || 'lms.maaledu.com'),
    apiKey: process.env.FRAPPE_LMS_API_KEY || '',
    timeout: 15000 // 15 seconds - reasonable timeout for enrollment operations
};

// ===== TYPE DEFINITIONS =====

/**
 * FrappeLMS Enrollment Request Payload
 */
export interface FrappeEnrollmentRequest {
    user_email: string;
    course_id: string;
    paid_status: boolean;
    payment_id: string;
    amount: number;
    currency?: string; // Optional, defaults to 'usd'
    referral_code?: string;
}

/**
 * FrappeLMS API Response
 */
export interface FrappeEnrollmentResponse {
    success: boolean;
    enrollment_id?: string;
    error?: string;
}

/**
 * Validates email format for FrappeLMS compatibility
 * RFC 5322 compliant email validation
 */
function validateEmail(email: string): { valid: boolean; error?: string } {
    if (!email || typeof email !== 'string') {
        return { valid: false, error: 'Email is required' };
    }

    const trimmed = email.trim().toLowerCase();
    if (trimmed.length === 0) {
        return { valid: false, error: 'Email cannot be empty' };
    }

    // RFC 5322 compliant email regex (simplified but comprehensive)
    const emailPattern = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

    if (!emailPattern.test(trimmed)) {
        return {
            valid: false,
            error: `Invalid email format: "${email}". Please provide a valid email address.`
        };
    }

    return { valid: true };
}

/**
 * Validates course ID format for FrappeLMS compatibility
 * Expected format: lowercase-with-hyphens (e.g., 'full-stack-bootcamp')
 */
function validateCourseId(courseId: string): { valid: boolean; error?: string } {
    if (!courseId || typeof courseId !== 'string') {
        return { valid: false, error: 'Course ID is required' };
    }

    const trimmed = courseId.trim();
    if (trimmed.length === 0) {
        return { valid: false, error: 'Course ID cannot be empty' };
    }

    // Check for valid URL slug format (lowercase, hyphens, numbers allowed)
    const validPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!validPattern.test(trimmed)) {
        return {
            valid: false,
            error: `Invalid course ID format: "${trimmed}". Expected lowercase-with-hyphens format (e.g., 'blockchain-revolution')`
        };
    }

    return { valid: true };
}

/**
 * FrappeLMS Course Information
 */
export interface FrappeCourseInfo {
    success: boolean;
    course?: {
        id: string;
        title: string;
        description: string;
        price: number;
        currency: string;
        paid_course: boolean;
        image?: string;
        instructors?: string[];
    };
    error?: string;
}

// ===== MAIN FUNCTIONS =====

/**
 * Enroll user in FrappeLMS course after successful payment
 * 
 * @param data - Enrollment request data
 * @returns Promise with enrollment response
 */
export async function enrollInFrappeLMS(
    data: FrappeEnrollmentRequest
): Promise<FrappeEnrollmentResponse> {
    try {
        ProductionLogger.info('Starting FrappeLMS enrollment', {
            email: data.user_email,
            courseId: data.course_id,
            paidStatus: data.paid_status,
            amount: data.amount,
            baseUrl: FRAPPE_CONFIG.baseUrl,
            hasApiKey: !!FRAPPE_CONFIG.apiKey
        });

        // Validate required fields
        if (!data.user_email || !data.course_id) {
            throw new Error('Missing required fields: user_email or course_id');
        }

        // Validate email format before making API call
        const emailValidation = validateEmail(data.user_email);
        if (!emailValidation.valid) {
            ProductionLogger.error('Email validation failed', {
                email: data.user_email,
                error: emailValidation.error
            });
            throw new Error(emailValidation.error);
        }

        // Validate course ID format before making API call
        const courseValidation = validateCourseId(data.course_id);
        if (!courseValidation.valid) {
            ProductionLogger.error('Course ID validation failed', {
                courseId: data.course_id,
                error: courseValidation.error
            });
            throw new Error(courseValidation.error);
        }

        // Validate base URL
        if (!FRAPPE_CONFIG.baseUrl || FRAPPE_CONFIG.baseUrl === '') {
            throw new Error('FRAPPE_LMS_BASE_URL is not configured');
        }

        const enrollmentUrl = `${FRAPPE_CONFIG.baseUrl}/api/method/lms.lms.payment_confirmation.confirm_payment`;
        ProductionLogger.info('Making Frappe LMS API call', {
            url: enrollmentUrl,
            payload: {
                user_email: data.user_email,
                course_id: data.course_id,
                paid_status: data.paid_status,
                payment_id: data.payment_id,
                amount: data.amount,
                currency: data.currency || 'usd'
            }
        });

        // Build clean payload with ONLY the fields Frappe LMS API expects
        const requestPayload: {
            user_email: string;
            course_id: string;
            paid_status: boolean;
            payment_id?: string;
            amount?: number;
            currency?: string;
            referral_code?: string;
        } = {
            user_email: data.user_email,
            course_id: data.course_id,
            paid_status: data.paid_status
        };

        // Add optional fields only if provided
        if (data.payment_id) requestPayload.payment_id = data.payment_id;
        if (data.amount) requestPayload.amount = data.amount;
        if (data.currency) requestPayload.currency = data.currency;
        if (data.referral_code) requestPayload.referral_code = data.referral_code;

        ProductionLogger.info('Clean Frappe payload constructed', {
            payload: requestPayload
        });

        const response = await fetch(enrollmentUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(FRAPPE_CONFIG.apiKey && { 'Authorization': `Bearer ${FRAPPE_CONFIG.apiKey}` })
            },
            body: JSON.stringify(requestPayload),
            signal: AbortSignal.timeout(FRAPPE_CONFIG.timeout)
        });

        ProductionLogger.info('Frappe LMS API response received', {
            status: response.status,
            statusText: response.statusText,
            ok: response.ok
        });

        if (!response.ok) {
            const errorText = await response.text();
            ProductionLogger.error('Frappe LMS API error response', {
                status: response.status,
                statusText: response.statusText,
                errorBody: errorText
            });
            throw new Error(`FrappeLMS API returned ${response.status}: ${response.statusText}. Details: ${errorText}`);
        }

        const result = await response.json();
        ProductionLogger.info('Frappe LMS API JSON response', {
            hasMessage: !!result.message,
            resultKeys: Object.keys(result),
            fullResult: JSON.stringify(result)
        });

        // FrappeLMS wraps response in 'message' field
        const enrollmentData = result.message || result;

        if (enrollmentData.success) {
            ProductionLogger.info('FrappeLMS enrollment successful', {
                enrollmentId: enrollmentData.enrollment_id,
                userEmail: enrollmentData.user_email,
                courseId: enrollmentData.course_id,
                fullResponse: JSON.stringify(enrollmentData)
            });
        } else {
            ProductionLogger.error('FrappeLMS enrollment failed', {
                error: enrollmentData.error,
                userEmail: data.user_email,
                courseId: data.course_id,
                fullResponse: JSON.stringify(enrollmentData)
            });
        }

        return enrollmentData;

    } catch (error) {
        ProductionLogger.error('FrappeLMS enrollment error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            userEmail: data.user_email,
            courseId: data.course_id,
            errorName: error instanceof Error ? error.name : 'Unknown',
            errorType: typeof error
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to connect to FrappeLMS'
        };
    }
}

/**
 * Get course information from FrappeLMS
 * 
 * @param courseId - Course ID to fetch information for
 * @returns Promise with course information
 */
export async function getFrappeCourseInfo(courseId: string): Promise<FrappeCourseInfo> {
    try {
        ProductionLogger.info('Fetching course info from FrappeLMS', { courseId });

        if (!courseId) {
            throw new Error('Course ID is required');
        }

        const response = await fetch(
            `${FRAPPE_CONFIG.baseUrl}/api/method/lms.lms.payment_confirmation.get_course_info?course_id=${encodeURIComponent(courseId)}`,
            {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...(FRAPPE_CONFIG.apiKey && { 'Authorization': `Bearer ${FRAPPE_CONFIG.apiKey}` })
                },
                signal: AbortSignal.timeout(FRAPPE_CONFIG.timeout)
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`FrappeLMS API returned ${response.status}: ${response.statusText}. Details: ${errorText}`);
        }

        const result = await response.json();
        const courseData = result.message || result;

        ProductionLogger.info('Course info retrieved from FrappeLMS', {
            courseId,
            hasData: !!courseData.course,
            courseTitle: courseData.course?.title
        });

        return courseData;

    } catch (error) {
        ProductionLogger.error('Failed to fetch course info from FrappeLMS', {
            courseId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch course info'
        };
    }
}

/**
 * Check if user exists in Frappe LMS
 * Used for pre-payment verification to ensure user has an account
 * 
 * @param email - User email to verify
 * @returns Promise with user existence status
 */
export interface FrappeUserCheckResponse {
    success: boolean;
    exists: boolean;
    user?: {
        email: string;
        full_name?: string;
        username?: string;
        enabled?: number;
    };
    registration_url?: string;
    error?: string;
}

export async function checkFrappeUserExists(
    email: string
): Promise<FrappeUserCheckResponse> {
    try {
        ProductionLogger.info('Checking Frappe LMS user existence', {
            email: email.toLowerCase()
        });

        // Validate email format
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
            return {
                success: false,
                exists: false,
                error: emailValidation.error
            };
        }

        // Validate base URL
        if (!FRAPPE_CONFIG.baseUrl) {
            throw new Error('FRAPPE_LMS_BASE_URL is not configured');
        }

        const checkUrl = `${FRAPPE_CONFIG.baseUrl}/api/method/lms.lms.doctype.lms_enrollment.lms_enrollment.check_user_exists`;

        ProductionLogger.info('Making Frappe LMS user check API call', {
            url: checkUrl,
            email: email.toLowerCase()
        });

        // Make API call (guest access, no auth required)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FRAPPE_CONFIG.timeout);

        const response = await fetch(checkUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                user_email: email.toLowerCase()
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorText = await response.text();
            ProductionLogger.error('Frappe user check API error', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`Frappe API returned ${response.status}: ${errorText}`);
        }

        const result = await response.json();

        ProductionLogger.info('Frappe user check response', {
            exists: result.message?.exists,
            userEmail: result.message?.user_email,
            fullName: result.message?.full_name,
            enabled: result.message?.enabled,
            rawResponse: result
        });

        // Response structure: { message: { success, exists, user_email, full_name, enabled } }
        if (result.message?.exists) {
            return {
                success: true,
                exists: true,
                user: {
                    email: result.message.user_email,
                    full_name: result.message.full_name,
                    username: result.message.user_email?.split('@')[0], // Extract username from email
                    enabled: result.message.enabled
                }
            };
        } else {
            return {
                success: true,
                exists: false,
                registration_url: result.message?.registration_url ||
                    `${FRAPPE_CONFIG.baseUrl}/signup`
            };
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        ProductionLogger.error('Frappe user check failed', {
            error: errorMessage,
            email
        });

        // Provide user-friendly error messages
        let userError = errorMessage;
        if (errorMessage.includes('aborted')) {
            userError = 'Request timeout. Please check your connection and try again.';
        } else if (errorMessage.includes('network')) {
            userError = 'Network error. Please check your internet connection.';
        } else if (errorMessage.includes('not configured')) {
            userError = 'Service configuration error. Please contact support.';
        }

        return {
            success: false,
            exists: false,
            error: userError
        };
    }
}

/**
 * Test FrappeLMS API connection
 * 
 * @returns Promise<boolean> - true if connection successful
 */
export async function testFrappeConnection(): Promise<boolean> {
    try {
        ProductionLogger.info('Testing FrappeLMS connection', {
            baseUrl: FRAPPE_CONFIG.baseUrl
        });

        const response = await fetch(
            `${FRAPPE_CONFIG.baseUrl}/api/method/ping`,
            {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            }
        );

        const isConnected = response.ok;

        if (isConnected) {
            ProductionLogger.info('FrappeLMS connection test successful');
        } else {
            ProductionLogger.warn('FrappeLMS connection test failed', {
                status: response.status,
                statusText: response.statusText
            });
        }

        return isConnected;

    } catch (error) {
        ProductionLogger.error('FrappeLMS connection test failed', {
            error: error instanceof Error ? error.message : 'Unknown error',
            baseUrl: FRAPPE_CONFIG.baseUrl
        });
        return false;
    }
}

/**
 * Get FrappeLMS configuration (for debugging)
 */
export function getFrappeConfig() {
    return {
        baseUrl: FRAPPE_CONFIG.baseUrl,
        hasApiKey: !!FRAPPE_CONFIG.apiKey,
        timeout: FRAPPE_CONFIG.timeout
    };
}
