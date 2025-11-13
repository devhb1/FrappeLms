import { z } from 'zod';

/**
 * SIMPLIFIED AFFILIATE SYSTEM
 * 
 * Core Design:
 * - Affiliate ID = User's Email (no complex IDs needed)
 * - Affiliate Link = lms.maaledu.com/?ref={email}
 * - Tracking = Store affiliate email in enrollments when users purchase
 * - Metrics = Query enrollments to calculate affiliate performance
 */

// ===== AFFILIATE VALIDATION SCHEMAS =====


export const affiliateRegistrationSchema = z.object({
    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name cannot exceed 100 characters')
        .trim(),
    email: z.string()
        .email('Invalid email format')
        .toLowerCase()
        .trim(),
    payoutMode: z.enum(['paypal', 'bank', 'crypto'], {
        errorMap: () => ({ message: 'Payout mode must be paypal, bank, or crypto' })
    }),

    // PayPal fields
    paypalEmail: z.string()
        .email('Invalid PayPal email format')
        .optional(),

    // Bank fields
    bankName: z.string().min(2, 'Bank name is required').optional(),
    accountNumber: z.string().min(5, 'Account number must be at least 5 characters').optional(),
    routingNumber: z.string().min(5, 'Routing number must be at least 5 characters').optional(),
    accountHolderName: z.string().min(2, 'Account holder name is required').optional(),
    swiftCode: z.string().optional(),

    // Crypto fields
    cryptoWallet: z.string()
        .min(20, 'Crypto wallet address must be at least 20 characters')
        .optional(),
    cryptoCurrency: z.enum(['bitcoin', 'ethereum', 'usdt']).optional()
}).refine((data) => {
    // PayPal validation
    if (data.payoutMode === 'paypal' && !data.paypalEmail) {
        return false;
    }
    // Bank validation
    if (data.payoutMode === 'bank' && (!data.bankName || !data.accountNumber || !data.routingNumber || !data.accountHolderName)) {
        return false;
    }
    // Crypto validation
    if (data.payoutMode === 'crypto' && !data.cryptoWallet) {
        return false;
    }
    return true;
}, {
    message: "Payment details are required based on selected payout mode",
    path: ["payoutMode"]
});

// ===== TYPE DEFINITIONS =====

export interface AffiliateResponse {
    email: string; // This IS the affiliate ID
    name: string;
    affiliateLink: string;
    payoutMode: 'paypal' | 'bank' | 'crypto';
    pendingCommissions: number;
    totalPaid: number;
    isActive: boolean;
    createdAt: string;

    // Payment details
    paypalEmail?: string;
    bankDetails?: {
        accountNumber: string;
        routingNumber: string;
        bankName: string;
        accountHolderName: string;
    };
    cryptoWallet?: string;

    // Calculated metrics (from enrollments)
    totalReferrals?: number;
    totalRevenue?: number;
    courseBreakdown?: Array<{
        courseId: string;
        courseName: string;
        count: number;
        revenue: number;
    }>;
}

export interface AffiliateStatusResponse {
    isAffiliate: boolean;
    affiliate: AffiliateResponse | null;
}

export interface AffiliateRegistrationResponse {
    success: boolean;
    message: string;
    data: AffiliateResponse;
}

export type AffiliateRegistrationData = z.infer<typeof affiliateRegistrationSchema>;

// ===== HELPER FUNCTIONS =====

/**
 * Generate affiliate link using email as identifier
 * This is the ONLY identifier we need - the email itself
 */
export function generateAffiliateLink(email: string): string {
    const encodedEmail = encodeURIComponent(email);
    const baseUrl = process.env.NEXT_PUBLIC_FRAPPE_LMS_URL ||
        process.env.FRAPPE_LMS_BASE_URL ||
        'http://139.59.229.250:8000';

    // Remove protocol prefix for display link
    const displayUrl = baseUrl.replace(/^https?:\/\//, '');
    return `${displayUrl}/?ref=${encodedEmail}`;
}

/**
 * Extract affiliate email from URL parameter
 * Used when processing purchases from affiliate links
 */
export function extractAffiliateEmail(refParam: string): string {
    return decodeURIComponent(refParam);
}
