/**
 * ===============================
 * COMMISSION CALCULATION UTILITIES
 * ===============================
 * 
 * Centralized commission calculation to ensure consistency across the entire application.
 * All commission calculations MUST use these functions to prevent discrepancies.
 */

/**
 * Calculate commission amount with consistent rounding
 * Formula: amount * (rate / 100), rounded to 2 decimal places
 * 
 * @param amount - Base amount to calculate commission on
 * @param rate - Commission rate as percentage (e.g., 10 for 10%)
 * @returns Commission amount rounded to 2 decimal places
 * 
 * @example
 * calculateCommission(299.99, 10) // Returns 30.00
 * calculateCommission(100, 15.5) // Returns 15.50
 * calculateCommission(0, 10) // Returns 0
 */
export function calculateCommission(amount: number, rate: number): number {
    // Validate inputs
    if (amount < 0) {
        throw new Error('Amount cannot be negative');
    }
    if (rate < 0 || rate > 100) {
        throw new Error('Commission rate must be between 0 and 100');
    }

    // Return 0 for zero amount (free courses don't earn commission)
    if (amount === 0) {
        return 0;
    }

    // Calculate: (amount * rate / 100) with proper rounding
    // Multiply by 100, round to integer, then divide by 100 for 2 decimal precision
    const commission = Math.round((amount * rate / 100) * 100) / 100;

    return commission;
}

/**
 * Calculate commission with validation that result has max 2 decimal places
 * Throws error if monetary precision is violated
 * 
 * @param amount - Base amount
 * @param rate - Commission rate
 * @returns Commission amount
 * @throws Error if result has more than 2 decimal places
 */
export function calculateCommissionStrict(amount: number, rate: number): number {
    const commission = calculateCommission(amount, rate);

    // Validate monetary precision
    if (!Number.isInteger(commission * 100)) {
        throw new Error(
            `Commission calculation resulted in more than 2 decimal places: ${commission}`
        );
    }

    return commission;
}

/**
 * Validate that a commission amount matches the expected calculation
 * 
 * @param amount - Base amount
 * @param rate - Commission rate
 * @param expectedCommission - Commission to validate
 * @returns true if commission matches calculation
 */
export function validateCommission(
    amount: number,
    rate: number,
    expectedCommission: number
): boolean {
    const calculated = calculateCommission(amount, rate);

    // Allow for floating point precision differences (within 0.01)
    return Math.abs(calculated - expectedCommission) < 0.01;
}

/**
 * Get commission breakdown for display purposes
 * 
 * @param amount - Base amount
 * @param rate - Commission rate
 * @returns Detailed breakdown object
 */
export function getCommissionBreakdown(amount: number, rate: number): {
    baseAmount: number;
    rate: number;
    rateDecimal: number;
    commission: number;
    netAmount: number;
} {
    const commission = calculateCommission(amount, rate);
    const netAmount = Math.round((amount - commission) * 100) / 100;

    return {
        baseAmount: amount,
        rate,
        rateDecimal: rate / 100,
        commission,
        netAmount
    };
}

/**
 * Calculate total commissions for multiple enrollments
 * 
 * @param enrollments - Array of { amount, rate } objects
 * @returns Total commission
 */
export function calculateTotalCommissions(
    enrollments: Array<{ amount: number; rate: number }>
): number {
    const total = enrollments.reduce((sum, enrollment) => {
        return sum + calculateCommission(enrollment.amount, enrollment.rate);
    }, 0);

    // Round total to 2 decimal places
    return Math.round(total * 100) / 100;
}

/**
 * Format commission amount for display
 * 
 * @param amount - Commission amount
 * @param currency - Currency code (default: USD)
 * @returns Formatted string
 * 
 * @example
 * formatCommission(30.5) // Returns "$30.50"
 * formatCommission(1234.56) // Returns "$1,234.56"
 */
export function formatCommission(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Calculate commission rate needed to achieve target commission amount
 * 
 * @param amount - Base amount
 * @param targetCommission - Desired commission amount
 * @returns Required commission rate (percentage)
 * 
 * @example
 * calculateRequiredRate(100, 10) // Returns 10.00 (10%)
 */
export function calculateRequiredRate(amount: number, targetCommission: number): number {
    if (amount === 0) {
        throw new Error('Cannot calculate rate for zero amount');
    }

    const rate = (targetCommission / amount) * 100;
    return Math.round(rate * 100) / 100;
}
