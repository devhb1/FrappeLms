/**
 * ===============================
 * SHARED COUPON GENERATOR UTILITY
 * ===============================
 * 
 * Centralized coupon code generation to eliminate duplication.
 * Used by grant system, admin bulk operations, and affiliate system.
 * 
 * Features:
 * - Unique code generation with timestamp
 * - Customizable prefixes
 * - Collision-resistant algorithm
 * - Consistent format across platform
 */

/**
 * Generate a unique coupon code
 * Format: PREFIX-TIMESTAMP-RANDOM
 * 
 * @param prefix - Code prefix (default: 'GRANT')
 * @param length - Random suffix length (default: 6)
 * @returns Unique coupon code
 * 
 * Examples:
 * - generateCouponCode() → "GRANT-1K2L3M-A1B2C3"
 * - generateCouponCode('AFFILIATE') → "AFFILIATE-1K2L3M-D4E5F6"
 * - generateCouponCode('PROMO', 4) → "PROMO-1K2L3M-G7H8"
 */
export function generateCouponCode(prefix: string = 'GRANT', length: number = 6): string {
    // Create timestamp-based component for uniqueness
    const timestamp = Date.now().toString(36).toUpperCase();

    // Generate random component
    const random = Array.from(
        { length },
        () => Math.random().toString(36).substring(2, 3)
    ).join('').toUpperCase();

    // Combine components with consistent format
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate coupon code specifically for grant applications
 */
export function generateGrantCoupon(discountPercentage?: number): string {
    // Generate different prefixes based on discount amount for easy identification
    if (discountPercentage && discountPercentage < 100) {
        const prefix = `GRANT${discountPercentage}`;
        return generateCouponCode(prefix, 6);
    }
    return generateCouponCode('GRANT', 6);
}

/**
 * Generate coupon code for partial discount grants
 */
export function generatePartialGrantCoupon(discountPercentage: number): string {
    if (discountPercentage >= 100) {
        return generateGrantCoupon();
    }

    // Use percentage in prefix for partial discounts
    const prefix = `GRANT${discountPercentage}`;
    return generateCouponCode(prefix, 4);
}

/**
 * Get discount percentage from grant coupon code
 */
export function getGrantDiscountFromCode(code: string): number {
    const prefix = getCouponPrefix(code?.toUpperCase() || '');

    if (!prefix) return 100;

    if (prefix === 'GRANT') return 100;

    // Extract percentage from prefix like GRANT50, GRANT25, etc.
    const match = prefix.match(/^GRANT(\d+)$/);
    if (match) {
        const percentage = parseInt(match[1]);
        return percentage >= 1 && percentage <= 100 ? percentage : 100;
    }

    return 100;
}

/**
 * Generate coupon code for affiliate promotions
 */
export function generateAffiliateCoupon(affiliateId?: string): string {
    const prefix = affiliateId ? `AFF-${affiliateId.slice(-4)}` : 'AFFILIATE';
    return generateCouponCode(prefix, 4);
}

/**
 * Generate admin-issued promotional coupon
 */
export function generatePromoCoupon(promoName?: string): string {
    const prefix = promoName ? `PROMO-${promoName.slice(0, 4)}`.toUpperCase() : 'PROMO';
    return generateCouponCode(prefix, 5);
}

/**
 * Validate coupon code format
 */
export function validateCouponFormat(code: string): boolean {
    // Pattern: PREFIX-TIMESTAMP-RANDOM (at least 10 chars, contains hyphens)
    const pattern = /^[A-Z]+-[A-Z0-9]+-[A-Z0-9]+$/;
    return pattern.test(code.toUpperCase()) && code.length >= 10;
}

/**
 * Extract prefix from coupon code
 */
export function getCouponPrefix(code: string): string | null {
    const parts = code.split('-');
    return parts.length >= 3 ? parts[0] : null;
}

/**
 * Get coupon type from code
 */
export function getCouponType(code: string): 'grant' | 'affiliate' | 'promo' | 'unknown' {
    const prefix = getCouponPrefix(code?.toUpperCase() || '');

    if (!prefix) return 'unknown';

    if (prefix === 'GRANT' || prefix.startsWith('GRANT')) return 'grant';
    if (prefix.startsWith('AFF')) return 'affiliate';
    if (prefix.startsWith('PROMO')) return 'promo';

    return 'unknown';
}

/**
 * Check if grant coupon is partial discount
 */
export function isPartialGrantCoupon(code: string): boolean {
    const discountPercentage = getGrantDiscountFromCode(code);
    return discountPercentage > 0 && discountPercentage < 100;
}

export default {
    generateCouponCode,
    generateGrantCoupon,
    generatePartialGrantCoupon,
    generateAffiliateCoupon,
    generatePromoCoupon,
    validateCouponFormat,
    getCouponPrefix,
    getCouponType,
    getGrantDiscountFromCode,
    isPartialGrantCoupon
};