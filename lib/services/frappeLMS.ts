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
const FRAPPE_CONFIG = {
    baseUrl: process.env.FRAPPE_LMS_BASE_URL || 'http://139.59.229.250:8000',
    apiKey: process.env.FRAPPE_LMS_API_KEY || '',
    timeout: 30000 // 30 seconds
};

// ===== TYPE DEFINITIONS =====

/**
 * FrappeLMS Enrollment Request Payload
 */
export interface FrappeEnrollmentRequest {
    user_email: string;
    course_id: string;
    paid_status: boolean;
    payment_id?: string;
    amount?: number;
    currency?: string;
    referral_code?: string;
}

/**
 * FrappeLMS Enrollment Response
 */
export interface FrappeEnrollmentResponse {
    success: boolean;
    message?: string;
    enrollment_id?: string;
    user_email?: string;
    course_id?: string;
    error?: string;
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
            amount: data.amount
        });

        // Validate required fields
        if (!data.user_email || !data.course_id) {
            throw new Error('Missing required fields: user_email or course_id');
        }

        const response = await fetch(
            `${FRAPPE_CONFIG.baseUrl}/api/method/lms.lms.payment_confirmation.confirm_payment`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(FRAPPE_CONFIG.apiKey && { 'Authorization': `Bearer ${FRAPPE_CONFIG.apiKey}` })
                },
                body: JSON.stringify(data),
                signal: AbortSignal.timeout(FRAPPE_CONFIG.timeout)
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`FrappeLMS API returned ${response.status}: ${response.statusText}. Details: ${errorText}`);
        }

        const result = await response.json();

        // FrappeLMS wraps response in 'message' field
        const enrollmentData = result.message || result;

        if (enrollmentData.success) {
            ProductionLogger.info('FrappeLMS enrollment successful', {
                enrollmentId: enrollmentData.enrollment_id,
                userEmail: enrollmentData.user_email,
                courseId: enrollmentData.course_id
            });
        } else {
            ProductionLogger.error('FrappeLMS enrollment failed', {
                error: enrollmentData.error,
                userEmail: data.user_email,
                courseId: data.course_id
            });
        }

        return enrollmentData;

    } catch (error) {
        ProductionLogger.error('FrappeLMS enrollment error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            userEmail: data.user_email,
            courseId: data.course_id
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
 * Test FrappeLMS connection
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
