/**
 * ===============================
 * GRANT MODEL - Free Course Access System
 * ===============================
 * 
 * This model represents the Grant system - MaalEdu's mechanism for providing
 * free course access through 100% off coupons. It serves multiple purposes:
 * 
 * 1. 🎯 SOCIAL IMPACT: Democratize education by providing free access to deserving students
 * 2. 💰 BUSINESS STRATEGY: Attract users who may purchase additional courses later
 * 3. 📈 MARKETING: Generate word-of-mouth and social proof through success stories
 * 4. 🤝 PARTNERSHIPS: Support initiatives with educational organizations
 * 
 * GRANT WORKFLOW:
 * 1. User applies via grant form with justification
 * 2. Admin reviews application and approves/rejects with discount percentage
 * 3. System generates unique coupon code with specified discount (10-100%)
 * 4. User receives email with coupon and discount details
 * 5. User enrolls using coupon (free if 100%, partial payment if less)
 * 6. Grant marked as used, enrollment created
 * 
 * SECURITY FEATURES:
 * - Coupon tied to specific email (prevents sharing)
 * - Course-specific grants (optional - some grants are platform-wide)
 * - Single-use atomic reservation (prevents race conditions)
 * - Admin audit trail (who approved, when, why)
 * 
 * @model Grant
 * @collection grants
 * @version 2.0 - Enhanced Tracking
 */

import mongoose, { Schema, Document } from "mongoose";

// ===== GRANT INTERFACE =====

/**
 * TypeScript interface defining the Grant document structure
 * Extends Mongoose Document for database operations
 */
export interface IGrant extends Document {
    // ===== APPLICANT INFORMATION =====
    name: string;                               // Full name of grant applicant
    email: string;                              // Email address (used for coupon delivery and validation)
    username: string;                           // Frappe LMS username for enrollment
    age: number;                                // Age verification for eligibility
    socialAccounts: string;                     // Social media presence for verification
    reason: string;                             // Justification for grant request

    // ===== GRANT DETAILS =====
    courseId: string;                           // Target course (or platform-wide if empty)
    status: 'pending' | 'approved' | 'rejected';  // Current application status
    adminNotes?: string;                        // Admin comments on decision

    // ===== COUPON SYSTEM =====
    couponCode?: string;                        // Generated unique coupon code
    stripeCouponId?: string;                    // Stripe coupon ID (for payment integration)
    couponUsed?: boolean;                       // Whether coupon has been redeemed
    couponUsedAt?: Date;                        // Timestamp of coupon usage
    couponUsedBy?: string;                      // Email of user who redeemed (verification)
    reservedAt?: Date;                          // Timestamp when coupon was atomically reserved (prevents race conditions)
    enrollmentId?: mongoose.Types.ObjectId;     // Link to enrollment record

    // ===== DISCOUNT CONTROL SYSTEM (v2.1) =====
    discountPercentage?: number;                // Admin-selected discount (10-100, default: 100)
    discountType?: 'percentage';                // Future: support fixed amounts
    originalPrice?: number;                     // Course price when grant created
    discountedPrice?: number;                   // Calculated final price after discount
    requiresPayment?: boolean;                  // true if discount < 100%

    // ===== ENHANCED COUPON METADATA =====
    couponMetadata?: {
        type: 'full_grant' | 'partial_grant';   // Grant type based on discount
        discountAmount: number;                  // Dollar amount of discount
        finalPrice: number;                      // Final price after discount
        expiresAt?: Date;                        // Optional coupon expiration
        createdAt: Date;                         // When coupon was generated
    };

    // ===== AUDIT TRAIL =====
    createdAt: Date;                            // Application submission date
    processedAt?: Date;                         // Admin decision date
    processedBy?: string;                       // Admin who made decision
}

// ===== GRANT SCHEMA =====

/**
 * Mongoose schema definition with validation rules and business constraints
 */
const grantSchema: Schema<IGrant> = new mongoose.Schema({
    // ===== APPLICANT INFORMATION FIELDS =====
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/.+\@.+\..+/, 'Please use a valid email address']
    },
    username: {
        type: String,
        required: [true, 'Username is required'],
        trim: true,
        maxlength: [50, 'Username cannot exceed 50 characters'],
        match: [/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, dots, dashes and underscores']
    },
    age: {
        type: Number,
        required: [true, 'Age is required'],
        min: [16, 'Age must be at least 16'],
        max: [100, 'Age cannot exceed 100']
    },
    socialAccounts: {
        type: String,
        required: [true, 'Social accounts information is required'],
        maxlength: [1000, 'Social accounts description is too long']
    },
    reason: {
        type: String,
        required: [true, 'Reason for applying is required'],
        maxlength: [2000, 'Reason description is too long']
    },
    courseId: {
        type: String,
        required: [true, 'Course ID is required']
    },
    status: {
        type: String,
        enum: {
            values: ['pending', 'approved', 'rejected'],
            message: 'Status must be pending, approved, or rejected'
        },
        default: 'pending'
    },
    adminNotes: {
        type: String,
        maxlength: [1000, 'Admin notes cannot exceed 1000 characters']
    },
    couponCode: String,
    stripeCouponId: String,
    couponUsed: {
        type: Boolean,
        default: false
    },
    couponUsedAt: Date,
    couponUsedBy: String,
    reservedAt: {
        type: Date,
        validate: {
            validator: function (value: Date) {
                return !value || this.couponUsed;
            },
            message: 'reservedAt can only be set when coupon is used'
        }
    },
    enrollmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Enrollment'
    },

    // ===== NEW DISCOUNT CONTROL FIELDS (v2.1) =====
    discountPercentage: {
        type: Number,
        min: [1, 'Discount must be at least 1%'],
        max: [100, 'Discount cannot exceed 100%'],
        default: 100 // Maintains current behavior for backward compatibility
    },
    discountType: {
        type: String,
        enum: ['percentage'],
        default: 'percentage'
    },
    originalPrice: {
        type: Number,
        min: [0, 'Price cannot be negative']
    },
    discountedPrice: {
        type: Number,
        min: [0, 'Price cannot be negative']
    },
    requiresPayment: {
        type: Boolean,
        default: false // Maintains current free behavior
    },

    // Enhanced coupon metadata
    couponMetadata: {
        type: {
            type: String,
            enum: ['full_grant', 'partial_grant'],
            default: 'full_grant'
        },
        discountAmount: {
            type: Number,
            min: [0, 'Discount amount cannot be negative']
        },
        finalPrice: {
            type: Number,
            min: [0, 'Final price cannot be negative']
        },
        expiresAt: Date,
        createdAt: {
            type: Date,
            default: Date.now
        }
    },

    createdAt: {
        type: Date,
        default: Date.now
    },
    processedAt: Date,
    processedBy: String
}, {
    timestamps: true
});

// Add indexes for better query performance
grantSchema.index({ email: 1, status: 1 });
grantSchema.index({ status: 1, createdAt: -1 });
grantSchema.index({ courseId: 1 });
grantSchema.index({ couponCode: 1 }); // For coupon validation
grantSchema.index({ discountPercentage: 1 }); // For discount analytics
grantSchema.index({ requiresPayment: 1 }); // For payment flow queries
grantSchema.index({ 'couponMetadata.expiresAt': 1 }); // For expiration cleanup

// ===== INSTANCE METHODS =====

/**
 * Calculate discount pricing based on course price and discount percentage
 */
grantSchema.methods.calculatePricing = function (coursePrice: number) {
    const discountPercentage = this.discountPercentage || 100;

    // Calculate the actual discount amount (money saved)
    const discountAmount = Math.round((coursePrice * discountPercentage) / 100 * 100) / 100;

    // Calculate final price (what user pays)
    const finalPrice = Math.max(0, Math.round((coursePrice - discountAmount) * 100) / 100);

    return {
        originalPrice: coursePrice,
        discountPercentage,
        discountAmount, // Amount saved by user
        finalPrice,     // Amount user needs to pay
        requiresPayment: discountPercentage < 100
    };
};

/**
 * Check if coupon is valid and not expired
 */
grantSchema.methods.isValidCoupon = function () {
    if (this.status !== 'approved' || this.couponUsed) {
        return false;
    }

    if (this.couponMetadata?.expiresAt && new Date() > this.couponMetadata.expiresAt) {
        return false;
    }

    return true;
};

/**
 * Get coupon display information with proper fallbacks for legacy grants
 */
grantSchema.methods.getCouponInfo = function () {
    const discountPercentage = this.discountPercentage || 100;
    const originalPrice = this.originalPrice || 499; // Fallback price
    const finalPrice = this.discountedPrice !== undefined ? this.discountedPrice : (discountPercentage === 100 ? 0 : originalPrice * (100 - discountPercentage) / 100);

    return {
        code: this.couponCode,
        discountPercentage,
        discountType: this.discountType || 'percentage',
        originalPrice,
        finalPrice,
        requiresPayment: this.requiresPayment !== undefined ? this.requiresPayment : (discountPercentage < 100),
        expiresAt: this.couponMetadata?.expiresAt,
        isExpired: this.couponMetadata?.expiresAt && new Date() > this.couponMetadata.expiresAt
    };
};

// ===== GRANT MODEL =====

export const Grant = mongoose.models.Grant || mongoose.model<IGrant>('Grant', grantSchema);

// Legacy export for backward compatibility
export const grantModel = Grant;

export default Grant;
