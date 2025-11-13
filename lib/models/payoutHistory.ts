/**
 * ====================================
 * PAYOUT HISTORY MODEL
 * ====================================
 * 
 * Tracks all affiliate payout transactions for audit and history purposes.
 * Each payout record includes transaction details, proof links, and commission breakdown.
 */

import mongoose, { Schema, Document } from 'mongoose';

// ===== COMMISSION PAID INTERFACE =====
export interface ICommissionPaid {
    enrollmentId: mongoose.Types.ObjectId;
    commissionAmount: number;
    courseId: string;
    customerEmail: string;
    enrolledAt: Date;
}

// ===== PAYOUT HISTORY INTERFACE =====
export interface IPayoutHistory extends Document {
    // Affiliate information
    affiliateId: string; // Reference to Affiliate.affiliateId
    affiliateEmail: string;
    affiliateName: string;

    // Payout details
    amount: number;
    payoutMethod: string; // 'paypal', 'bank', 'crypto'
    currency: string;

    // Transaction tracking
    transactionId?: string;
    proofLink?: string;
    adminMessage?: string;

    // Processing details
    processedBy: string; // Admin email who processed
    processedAt: Date;
    status: 'processed' | 'failed' | 'pending';

    // Commission breakdown
    commissionsPaid: ICommissionPaid[];
    commissionsCount: number;

    // Audit fields
    createdAt: Date;
    updatedAt: Date;
}

// ===== COMMISSION PAID SCHEMA =====
const commissionPaidSchema = new Schema<ICommissionPaid>({
    enrollmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Enrollment',
        required: true
    },
    commissionAmount: {
        type: Number,
        required: true,
        min: 0
    },
    courseId: {
        type: String,
        required: true
    },
    customerEmail: {
        type: String,
        required: true,
        lowercase: true
    },
    enrolledAt: {
        type: Date,
        required: true
    }
}, { _id: false });

// ===== PAYOUT HISTORY SCHEMA =====
const payoutHistorySchema = new Schema<IPayoutHistory>({
    // ===== AFFILIATE REFERENCE =====
    affiliateId: {
        type: String, // Reference to Affiliate.affiliateId (not ObjectId)
        required: [true, 'Affiliate ID is required']
        // Index handled by compound indexes below
    },
    affiliateEmail: {
        type: String,
        required: [true, 'Affiliate email is required'],
        lowercase: true,
        trim: true
        // Index handled by compound indexes below
    },
    affiliateName: {
        type: String,
        required: [true, 'Affiliate name is required'],
        trim: true
    },

    // ===== PAYOUT DETAILS =====
    amount: {
        type: Number,
        required: [true, 'Payout amount is required'],
        min: [0.01, 'Payout amount must be positive']
    },
    payoutMethod: {
        type: String,
        required: [true, 'Payout method is required'],
        enum: ['paypal', 'bank', 'crypto'],
        lowercase: true
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true
    },

    // ===== TRANSACTION TRACKING =====
    transactionId: {
        type: String,
        trim: true,
        sparse: true // Allow multiple null values but unique non-null values
    },
    proofLink: {
        type: String,
        trim: true,
        validate: {
            validator: function (value: string) {
                if (!value) return true; // Optional field
                return /^https?:\/\/.+/.test(value);
            },
            message: 'Proof link must be a valid URL'
        }
    },
    adminMessage: {
        type: String,
        trim: true,
        maxlength: [1000, 'Admin message cannot exceed 1000 characters']
    },

    // ===== PROCESSING DETAILS =====
    processedBy: {
        type: String,
        required: [true, 'Processed by admin email is required'],
        lowercase: true,
        trim: true
    },
    processedAt: {
        type: Date,
        required: [true, 'Processing date is required'],
        default: Date.now
    },
    status: {
        type: String,
        enum: ['processed', 'failed', 'pending'],
        default: 'processed'
        // Index handled by compound indexes below
    },

    // ===== COMMISSION BREAKDOWN =====
    commissionsPaid: {
        type: [commissionPaidSchema],
        required: true,
        validate: {
            validator: function (commissions: ICommissionPaid[]) {
                return commissions.length > 0;
            },
            message: 'At least one commission must be included in payout'
        }
    },
    commissionsCount: {
        type: Number,
        required: true,
        min: 1
    }
}, {
    timestamps: true,
    collection: 'payout_history'
});

// ===== INDEXES =====
payoutHistorySchema.index({ affiliateId: 1, processedAt: -1 });
payoutHistorySchema.index({ affiliateEmail: 1, status: 1 });
payoutHistorySchema.index({ processedAt: -1 });
payoutHistorySchema.index({ status: 1, processedAt: -1 });

// ===== VIRTUAL FIELDS =====
payoutHistorySchema.virtual('formattedAmount').get(function () {
    return `$${this.amount.toFixed(2)}`;
});

payoutHistorySchema.virtual('monthYear').get(function () {
    return this.processedAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
    });
});

// ===== STATIC METHODS =====

// Get payout history for specific affiliate
payoutHistorySchema.statics.getAffiliateHistory = function (
    affiliateEmail: string,
    options: { limit?: number; page?: number; status?: string } = {}
) {
    const { limit = 10, page = 1, status } = options;
    const query: any = { affiliateEmail: affiliateEmail.toLowerCase() };

    if (status) {
        query.status = status;
    }

    return this.find(query)
        .sort({ processedAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean();
};

// Get total paid amount for affiliate
payoutHistorySchema.statics.getTotalPaid = function (affiliateEmail: string) {
    return this.aggregate([
        {
            $match: {
                affiliateEmail: affiliateEmail.toLowerCase(),
                status: 'processed'
            }
        },
        {
            $group: {
                _id: null,
                totalPaid: { $sum: '$amount' },
                payoutCount: { $sum: 1 },
                lastPayoutDate: { $max: '$processedAt' }
            }
        }
    ]);
};

// Get monthly payout summary
payoutHistorySchema.statics.getMonthlySummary = function (year: number) {
    return this.aggregate([
        {
            $match: {
                status: 'processed',
                processedAt: {
                    $gte: new Date(year, 0, 1),
                    $lt: new Date(year + 1, 0, 1)
                }
            }
        },
        {
            $group: {
                _id: {
                    month: { $month: '$processedAt' },
                    year: { $year: '$processedAt' }
                },
                totalAmount: { $sum: '$amount' },
                payoutCount: { $sum: 1 },
                uniqueAffiliates: { $addToSet: '$affiliateEmail' }
            }
        },
        {
            $sort: { '_id.year': 1, '_id.month': 1 }
        }
    ]);
};

// ===== MODEL EXPORT =====
export const PayoutHistory = mongoose.models.PayoutHistory ||
    mongoose.model<IPayoutHistory>('PayoutHistory', payoutHistorySchema);

export default PayoutHistory;
