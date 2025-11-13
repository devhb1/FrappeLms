// ===== SIMPLIFIED EMAIL API =====
// For immediate project integration without complexity

import { emailService } from './index';

/**
 * Simple Email API for MaalEdu
 * Clean, straightforward interface for common email operations
 */
export const sendEmail = {
    // Authentication emails
    async otp(email: string, userName: string, otp: string): Promise<boolean> {
        return await emailService.otp(email, userName, otp);
    },

    async welcome(email: string, userName: string): Promise<boolean> {
        return await emailService.welcome(email, userName);
    },

    // Grant emails
    async grantApproval(email: string, userName: string, courseTitle: string, couponCode: string): Promise<boolean> {
        return await emailService.grantApproval(email, userName, courseTitle, couponCode);
    },

    async grantRejection(email: string, userName: string, courseTitle: string, reason?: string): Promise<boolean> {
        return await emailService.grantRejection(email, userName, courseTitle, reason);
    },

    // Affiliate emails
    async affiliatePayout(
        email: string,
        affiliateName: string,
        amount: number,
        payoutMethod: string,
        transactionId?: string,
        commissionsCount?: number
    ): Promise<boolean> {
        return await emailService.affiliatePayout(
            email,
            affiliateName,
            amount,
            payoutMethod,
            transactionId || 'N/A',
            commissionsCount || 0
        );
    },

    // Test email
    async test(email: string): Promise<boolean> {
        return await emailService.test(email);
    }
};

// Export simplified interface
export default sendEmail;

// Advanced features still available if needed
export { emailService } from './index';
