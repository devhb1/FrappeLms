
/**
 * =====================================================
 *  AFFILIATE MODEL - MongoDB Schema Definition (Mongoose)
 * =====================================================
 *
 * This model defines the structure for affiliate accounts in the MaalEdu platform.
 *
 * ## Key Features
 * - Email-based referral system (ref=email in URLs)
 * - Single affiliateId for internal tracking
 * - Multiple payout methods (PayPal, Bank, Crypto)
 * - Stats calculated from enrollments (not duplicated)
 * - Profile integration for payment method editing
 *
 * ## Referral System
 * - Uses email as the affiliate identifier in referral links
 * - Example: `/?ref=affiliate@email.com`
 * - Clean, human-readable, and easy to debug
 *
 * ## Payout Methods Supported
 * - PayPal: Requires valid PayPal email
 * - Bank Transfer: Requires account details
 * - Cryptocurrency: Requires wallet address
 *
 * ## Stats
 * - Calculated from enrollments collection
 * - Includes total earnings, pending, referrals, per-course sales
 *
 * ## Design
 * - Single affiliateId for internal use (af_xxx)
 * - Email as the public referral identifier
 * - Payment method is a flexible object
 * - Stats are always up-to-date (no duplicate storage)
 */

import mongoose, { Schema, Document } from "mongoose";

// ===== AFFILIATE PAYMENT METHOD INTERFACE =====
export interface IAffiliatePaymentMethod {
    type: 'bank' | 'paypal' | 'crypto';
    // Bank details
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
    accountHolderName?: string;
    swiftCode?: string;
    // PayPal details
    paypalEmail?: string;
    // Crypto details
    cryptoWallet?: string;
    cryptoCurrency?: 'bitcoin' | 'ethereum' | 'usdt';
}

// ===== SIMPLIFIED AFFILIATE STATS INTERFACE =====
export interface IAffiliateStats {
    totalReferrals: number;
    conversionRate: number;
    coursesSold: Map<string, number>; // Track sales per course
}

// ===== AFFILIATE INTERFACE =====
export interface IAffiliate extends Document {
    affiliateId: string; // Unique affiliate identifier (auto-generated)
    userId: mongoose.Types.ObjectId;
    email: string; // This serves as the affiliate identifier in referral links
    name: string;
    status: 'active' | 'inactive' | 'suspended';

    // Commission settings
    commissionRate: number; // percentage (e.g., 10 for 10%)

    // Payment preferences
    payoutMode: 'bank' | 'paypal' | 'crypto';
    paymentMethod: IAffiliatePaymentMethod;

    // Statistics (calculated from enrollments - simplified)
    stats: IAffiliateStats;

    // ===== PAYOUT TRACKING (SIMPLIFIED) =====
    totalPaid: number; // Total amount paid out so far
    lastPayoutDate?: Date; // Last payout date
    pendingCommissions: number; // Current pending commissions

    // Metadata
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;

    // Instance methods
    generateAffiliateLink(baseUrl?: string): string;
    refreshStats(): Promise<any>;
}

// ===== PAYMENT METHOD SCHEMA =====
const affiliatePaymentMethodSchema = new Schema<IAffiliatePaymentMethod>({
    type: {
        type: String,
        enum: ['bank', 'paypal', 'crypto'],
        required: true
    },
    // Bank details
    bankName: {
        type: String,
        validate: {
            validator: function (this: IAffiliatePaymentMethod, value: string) {
                if (this.type === 'bank') {
                    return value && value.length > 0;
                }
                return true;
            },
            message: 'Bank name is required for bank payout method'
        }
    },
    accountNumber: {
        type: String,
        validate: {
            validator: function (this: IAffiliatePaymentMethod, value: string) {
                if (this.type === 'bank') {
                    return value && value.length > 0;
                }
                return true;
            },
            message: 'Account number is required for bank payout method'
        }
    },
    routingNumber: {
        type: String,
        validate: {
            validator: function (this: IAffiliatePaymentMethod, value: string) {
                if (this.type === 'bank') {
                    return value && value.length > 0;
                }
                return true;
            },
            message: 'Routing number is required for bank payout method'
        }
    },
    accountHolderName: {
        type: String,
        validate: {
            validator: function (this: IAffiliatePaymentMethod, value: string) {
                if (this.type === 'bank') {
                    return value && value.length > 0;
                }
                return true;
            },
            message: 'Account holder name is required for bank payout method'
        }
    },
    swiftCode: String,
    // PayPal details
    paypalEmail: {
        type: String,
        validate: {
            validator: function (this: IAffiliatePaymentMethod, value: string) {
                if (this.type === 'paypal') {
                    return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                }
                return true;
            },
            message: 'Valid PayPal email is required for PayPal payout method'
        }
    },
    // Crypto details
    cryptoWallet: {
        type: String,
        validate: {
            validator: function (this: IAffiliatePaymentMethod, value: string) {
                if (this.type === 'crypto') {
                    return value && value.length >= 20;
                }
                return true;
            },
            message: 'Valid crypto wallet address is required for crypto payout method'
        }
    },
    cryptoCurrency: {
        type: String,
        enum: ['bitcoin', 'ethereum', 'usdt'],
        validate: {
            validator: function (this: IAffiliatePaymentMethod, value: string) {
                if (this.type === 'crypto') {
                    return value && ['bitcoin', 'ethereum', 'usdt'].includes(value);
                }
                return true;
            },
            message: 'Crypto type is required for crypto payout method'
        }
    }
}, { _id: false });

// ===== SIMPLIFIED AFFILIATE STATS SCHEMA =====
const affiliateStatsSchema = new Schema<IAffiliateStats>({
    totalReferrals: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    coursesSold: { type: Map, of: Number, default: new Map() }
}, { _id: false });

// ===== AFFILIATE SCHEMA =====
const affiliateSchema = new Schema<IAffiliate>({
    affiliateId: {
        type: String,
        unique: true,
        required: [true, 'Affiliate ID is required'],
        default: function () {
            return `af_${new mongoose.Types.ObjectId().toString()}`;
        }
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please use a valid email address']
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    commissionRate: {
        type: Number,
        default: 10, // 10% commission
        min: [0, 'Commission rate cannot be negative'],
        max: [100, 'Commission rate cannot exceed 100%']
    },
    payoutMode: {
        type: String,
        enum: ['bank', 'paypal', 'crypto'],
        required: [true, 'Payout mode is required']
    },
    paymentMethod: {
        type: affiliatePaymentMethodSchema,
        required: [true, 'Payment method is required']
    },
    stats: {
        type: affiliateStatsSchema,
        default: () => ({
            totalReferrals: 0,
            conversionRate: 0,
            coursesSold: new Map()
        })
    },

    // ===== SIMPLIFIED PAYOUT TRACKING =====
    totalPaid: {
        type: Number,
        default: 0,
        min: [0, 'Total paid cannot be negative']
    },
    lastPayoutDate: {
        type: Date
    },
    pendingCommissions: {
        type: Number,
        default: 0,
        min: [0, 'Pending commissions cannot be negative']
    },

    lastLoginAt: Date
}, {
    timestamps: true,
    collection: 'affiliates'
});

// ===== INDEXES =====
// affiliateId and email indexes are created automatically by unique: true constraint
affiliateSchema.index({ userId: 1 });
affiliateSchema.index({ status: 1 });
affiliateSchema.index({ createdAt: -1 });

// ===== STATIC METHODS =====
affiliateSchema.statics.findByEmail = function (email: string) {
    return this.findOne({ email: email.toLowerCase() });
};

affiliateSchema.statics.updateStatsFromEnrollments = async function (affiliateEmail: string) {
    const { Enrollment } = require('./enrollment');

    console.log('🔄 Updating stats for affiliate:', affiliateEmail);

    // Get affiliate stats from enrollments
    const stats = await Enrollment.aggregate([
        {
            $match: {
                'affiliateData.affiliateEmail': affiliateEmail.toLowerCase(),
                status: 'paid'
            }
        },
        {
            $group: {
                _id: null,
                totalReferrals: { $sum: 1 },
                totalRevenue: { $sum: '$amount' },
                courses: {
                    $push: {
                        courseId: '$courseId',
                        amount: '$amount'
                    }
                }
            }
        }
    ]);

    console.log('📊 Enrollment stats found:', stats);

    if (stats.length > 0) {
        const { totalReferrals, totalRevenue, courses } = stats[0];

        // Calculate commission (get from affiliate record)
        const affiliate = await this.findOne({ email: affiliateEmail.toLowerCase() });
        const commissionRate = affiliate?.commissionRate || 10;

        // ===== FIX FLOATING POINT PRECISION =====
        const totalEarnings = Math.round((totalRevenue * commissionRate) / 100 * 100) / 100;

        console.log('💰 Calculated earnings:', {
            totalRevenue,
            commissionRate,
            totalEarnings,
            totalReferrals
        });

        // Count courses sold
        const coursesSold = new Map();
        courses.forEach((course: any) => {
            const count = coursesSold.get(course.courseId) || 0;
            coursesSold.set(course.courseId, count + 1);
        });

        // Update affiliate stats
        console.log('🔍 About to update affiliate with:', {
            email: affiliateEmail.toLowerCase(),
            updateData: {
                pendingCommissions: totalEarnings,
                totalReferrals,
                preservingTotalPaid: affiliate?.totalPaid || 0
            }
        });

        // ===== CALCULATE PENDING COMMISSIONS CORRECTLY =====
        // Get current values to determine what's new
        const currentTotalPaid = affiliate?.totalPaid || 0;
        const currentPendingCommissions = affiliate?.pendingCommissions || 0;

        // New pending commissions = total earnings that haven't been paid yet
        const newPendingCommissions = Math.max(0, totalEarnings - currentTotalPaid);

        console.log('💡 Commission calculation:', {
            totalEarnings,
            currentTotalPaid,
            currentPendingCommissions,
            newPendingCommissions,
            shouldUpdate: newPendingCommissions !== currentPendingCommissions
        });

        const updatedAffiliate = await this.findOneAndUpdate(
            { email: affiliateEmail.toLowerCase() },
            {
                $set: {
                    'stats.totalReferrals': totalReferrals,
                    'stats.coursesSold': coursesSold,
                    'stats.conversionRate': 0, // TODO: Calculate based on clicks vs conversions

                    // ===== UPDATE SIMPLIFIED PAYOUT TRACKING =====
                    'pendingCommissions': newPendingCommissions, // Only pending amount, not total
                    // DO NOT RESET totalPaid - preserve existing value
                }
            },
            {
                new: true,
                runValidators: true,
                upsert: false
            }
        );

        if (!updatedAffiliate) {
            console.log('❌ Update failed - no affiliate found with email:', affiliateEmail.toLowerCase());
            return null;
        }

        console.log('✅ Updated affiliate stats:', {
            pendingCommissions: updatedAffiliate?.pendingCommissions,
            totalPaid: updatedAffiliate?.totalPaid,
            totalReferrals: updatedAffiliate?.stats?.totalReferrals,
            newPendingCommissions: newPendingCommissions
        });

        return updatedAffiliate;
    }

    console.log('❌ No enrollment stats found for affiliate');
    return null;
};

// ===== INSTANCE METHODS =====
affiliateSchema.methods.generateAffiliateLink = function (baseUrl?: string) {
    // Import the config here to avoid circular dependencies
    const defaultUrl = process.env.NEXT_PUBLIC_FRAPPE_LMS_URL ||
        process.env.FRAPPE_LMS_BASE_URL ||
        'http://139.59.229.250:8000';

    const finalUrl = baseUrl || defaultUrl;
    return `${finalUrl}/?ref=${encodeURIComponent(this.email)}`;
};

affiliateSchema.methods.refreshStats = function () {
    return (this.constructor as any).updateStatsFromEnrollments(this.email);
};

// ===== MODEL EXPORT WITH EXPLICIT CACHE CLEARING =====
// Clear any existing model cache to ensure clean schema
if (mongoose.models.Affiliate) {
    delete mongoose.models.Affiliate;
}

export const Affiliate = mongoose.model<IAffiliate>('Affiliate', affiliateSchema);
export const affiliateModel = Affiliate; // Alias for consistency

export default Affiliate;
