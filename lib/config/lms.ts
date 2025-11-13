/**
 * ===============================
 * LMS CONFIGURATION UTILITY
 * ===============================
 * 
 * Centralized configuration for LMS URLs and integration settings.
 * This utility ensures consistent LMS URL usage across the application.
 * 
 * Migration Notes:
 * - Migrated from OpenEDX (apps.lms.maaledu.com) to Frappe LMS
 * - All URLs now point to Frappe LMS instance
 * - Backward compatibility maintained for existing references
 */

// ===== LMS CONFIGURATION =====

/**
 * Get the Frappe LMS base URL
 * Uses environment variable with fallback to default instance
 */
export const getFrappeLMSUrl = (): string => {
    return process.env.NEXT_PUBLIC_FRAPPE_LMS_URL ||
        process.env.FRAPPE_LMS_BASE_URL ||
        'http://139.59.229.250:8000';
};

/**
 * Get the main LMS access URL for user registration/login
 */
export const getLMSAccessUrl = (): string => {
    const baseUrl = getFrappeLMSUrl();
    return `${baseUrl}/login`;
};

/**
 * Get the LMS registration URL
 */
export const getLMSRegistrationUrl = (): string => {
    const baseUrl = getFrappeLMSUrl();
    return `${baseUrl}/signup`;
};

/**
 * Get course access URL for a specific course
 */
export const getCourseAccessUrl = (courseId?: string): string => {
    const baseUrl = getFrappeLMSUrl();
    if (courseId) {
        return `${baseUrl}/courses/${courseId}`;
    }
    return `${baseUrl}/courses`;
};

/**
 * Get user dashboard URL in LMS
 */
export const getLMSDashboardUrl = (): string => {
    const baseUrl = getFrappeLMSUrl();
    return `${baseUrl}/dashboard`;
};

/**
 * LMS Configuration object for easy access
 */
export const LMS_CONFIG = {
    baseUrl: getFrappeLMSUrl(),
    accessUrl: getLMSAccessUrl(),
    registrationUrl: getLMSRegistrationUrl(),
    dashboardUrl: getLMSDashboardUrl(),

    // API endpoints
    api: {
        enrollment: `${getFrappeLMSUrl()}/api/method/lms.lms.payment_confirmation.confirm_payment`,
        courses: `${getFrappeLMSUrl()}/api/method/lms.lms.courses.get_courses`,
    },

    // Legacy support (for backward compatibility)
    legacy: {
        openedxUrl: 'https://apps.lms.maaledu.com', // Deprecated - kept for reference
        oldUrl: 'https://lms.maaledu.com', // Deprecated - kept for reference
    }
} as const;

/**
 * Type definitions for LMS configuration
 */
export type LMSConfig = typeof LMS_CONFIG;

/**
 * Validate LMS URL configuration
 */
export const validateLMSConfig = (): boolean => {
    const url = getFrappeLMSUrl();
    try {
        new URL(url);
        return true;
    } catch {
        console.error('Invalid LMS URL configuration:', url);
        return false;
    }
};

/**
 * Get affiliate link with LMS base URL
 */
export const generateAffiliateLMSLink = (email: string): string => {
    const baseUrl = getFrappeLMSUrl();
    const encodedEmail = encodeURIComponent(email);
    return `${baseUrl}/?ref=${encodedEmail}`;
};

export default LMS_CONFIG;