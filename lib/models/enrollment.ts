/**
 * ===============================
 * ENROLLMENT MODEL - Course Registration System
 * ===============================
 * 
 * This is the CENTRAL model for tracking all course enrollments in the MaalEdu platform.
 * It serves as the single source of truth for student course access and payment status.
 * 
 * KEY RESPONSIBILITIES:
 * 1. 📚 COURSE ACCESS: Determines which courses a user can access
 * 2. 💳 PAYMENT TRACKING: Links enrollments to payment transactions (Stripe or free)
 * 3. 🎓 LMS INTEGRATION: Manages synchronization with external learning platforms
 * 4. 🤝 AFFILIATE TRACKING: Tracks referrals and commission eligibility
 * 5. 🎫 GRANT MANAGEMENT: Links free enrollments to grant/coupon systems
 * 6. 📊 ANALYTICS: Provides data for business intelligence and reporting
 * 
 * ENROLLMENT TYPES:
 * - 'paid_stripe': Regular paid enrollment via Stripe
 * - 'free_grant': Free enrollment via 100% off coupon
 * - 'free_grant_affiliate': Free enrollment with affiliate referral
 * 
 * DATA ARCHITECTURE:
 * - Core fields: Basic enrollment information
 * - LMS Context: OpenEdX and external platform integration
 * - Affiliate Data: Commission and referral tracking
 * - Grant Data: Free access coupon information
 * - Verification: Access control and validation status
 * - Sync Status: External platform synchronization tracking
 * - Metadata: Request tracking and audit information
 * 
 * INDEXING STRATEGY:
 * - Compound indexes for common query patterns
 * - Single field indexes for unique constraints
 * - Performance-optimized for dashboard queries
 * 
 * @model Enrollment
 * @collection enrollments
 * @version 2.0 - Enhanced Metadata
 */

import mongoose, { Schema, Document } from "mongoose";
import { CourseEnrollment } from '../types';

// ===== ENROLLMENT INTERFACE =====

/**
 * TypeScript interface extending the base CourseEnrollment type
 * with Mongoose-specific fields and methods
 */
export interface IEnrollment extends Document, CourseEnrollment {
    _id: mongoose.Types.ObjectId;        // MongoDB ObjectId
    createdAt: Date;                     // Automatic creation timestamp
    updatedAt: Date;                     // Automatic update timestamp
}

// ===== ENROLLMENT SCHEMA =====

/**
 * Comprehensive Mongoose schema for enrollment documents
 * Includes validation, indexing, and business logic constraints
 */
const enrollmentSchema = new mongoose.Schema<IEnrollment>({
    // ===== CORE ENROLLMENT FIELDS =====

    courseId: {
        type: String,
        required: [true, 'Course ID is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,                 // Automatic normalization
        trim: true,
        // Note: Email indexing is handled by compound indexes for performance
        match: [/.+\@.+\..+/, 'Please use a valid email address']
    },
    paymentId: {
        type: String,
        required: [true, 'Payment ID is required'],
        unique: true,                    // Prevent duplicate payment processing
        trim: true
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount must be positive']
    },
    status: {
        type: String,
        enum: {
            values: ['paid', 'pending', 'failed'],
            message: 'Status must be paid, pending, or failed'
        },
        default: 'pending'
    },
    timestamp: {
        type: String,
        required: true,
        default: () => new Date().toISOString()
    },

    // ===== LEGACY TOP-LEVEL FIELDS (for backward compatibility) =====
    referralSource: {
        type: String,
        enum: {
            values: ['affiliate_link', 'direct', 'social', 'email', 'lms_redirect', 'other'],
            message: 'Referral source must be affiliate_link, direct, social, email, lms_redirect, or other'
        },
        default: 'direct'
    },
    hasReferral: {
        type: Boolean,
        default: false
    },

    // ===== ENHANCED FIELDS FOR OPENEDX LMS INTEGRATION =====

    // Enrollment type and context
    enrollmentType: {
        type: String,
        enum: {
            values: ['paid_stripe', 'free_grant', 'partial_grant', 'affiliate_referral', 'lms_redirect'],
            message: 'Enrollment type must be paid_stripe, free_grant, partial_grant, affiliate_referral, or lms_redirect'
        },
        default: 'paid_stripe'
    },

    // LMS context data (Updated for FrappeLMS)
    lmsContext: {
        frappeUsername: {
            type: String,
            trim: true
            // Index handled by schema-level index below
        },
        frappeEmail: {
            type: String,
            lowercase: true,
            trim: true,
            match: [/.+\@.+\..+/, 'Please use a valid email address']
        },
        redirectSource: {
            type: String,
            enum: ['lms_redirect', 'direct', 'affiliate'],
            default: 'direct'
        },
        // Legacy fields for backward compatibility
        openedxUsername: {
            type: String,
            trim: true
        },
        openedxEmail: {
            type: String,
            lowercase: true,
            trim: true
        }
    },

    // Enhanced affiliate data structure
    affiliateData: {
        affiliateEmail: {
            type: String,
            lowercase: true,
            trim: true,
            match: [/.+\@.+\..+/, 'Please use a valid affiliate email address']
        },
        referralSource: {
            type: String,
            enum: ['affiliate_link', 'grant_with_affiliate', 'lms_redirect_affiliate'],
            default: 'affiliate_link'
        },
        commissionEligible: {
            type: Boolean,
            default: true
        },
        referralTimestamp: {
            type: Date
        },
        commissionAmount: {
            type: Number,
            min: 0,
            default: 0
        }
    },

    // Grant/coupon data
    grantData: {
        grantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Grant'
        },
        couponCode: {
            type: String,
            uppercase: true
        },
        approvalDate: {
            type: Date
        },
        grantVerified: {
            type: Boolean,
            default: false
        }
    },

    // Verification data for OpenEdX access decisions
    verification: {
        paymentVerified: {
            type: Boolean,
            default: false
            // Index handled by schema-level index below
        },
        courseEligible: {
            type: Boolean,
            default: true
        },
        accessLevel: {
            type: String,
            enum: ['basic', 'verified', 'premium'],
            default: 'verified'
        },
        stripePaymentId: {
            type: String,
            trim: true
        },
        grantVerified: {
            type: Boolean,
            default: false
        }
    },

    // FrappeLMS sync tracking (Updated from OpenEdX)
    frappeSync: {
        synced: {
            type: Boolean,
            default: false
        },
        lastSyncAttempt: {
            type: Date
        },
        syncStatus: {
            type: String,
            enum: ['pending', 'success', 'failed', 'retrying'],
            default: 'pending'
        },
        enrollmentId: {
            type: String  // FrappeLMS enrollment ID
        },
        errorMessage: {
            type: String
        },
        retryCount: {
            type: Number,
            default: 0,
            min: 0
        },
        syncCompletedAt: {
            type: Date
        }
    },

    // Legacy OpenEdX sync (for backward compatibility)
    openedxSync: {
        synced: {
            type: Boolean,
            default: false
        },
        lastSyncAttempt: {
            type: Date
        },
        syncStatus: {
            type: String,
            enum: ['pending', 'success', 'failed', 'retrying'],
            default: 'pending'
        },
        enrollmentId: {
            type: String
        },
        errorMessage: {
            type: String
        },
        retryCount: {
            type: Number,
            default: 0,
            min: 0
        },
        syncCompletedAt: {
            type: Date
        }
    },

    // Payment and transaction metadata
    paymentMethod: {
        type: String,
        default: 'stripe'
    },
    currency: {
        type: String,
        default: 'usd'
    },
    originalAmount: {
        type: Number,
        min: 0
    },
    discountAmount: {
        type: Number,
        min: 0,
        default: 0
    },
    couponCode: {
        type: String,
        uppercase: true
    },

    // Additional tracking metadata
    metadata: {
        userAgent: {
            type: String
        },
        ipAddress: {
            type: String
        },
        timezone: {
            type: String
        },
        deviceType: {
            type: String
        },
        source: {
            type: String,
            default: 'web'
        }
    },

    // ===== STRIPE WEBHOOK IDEMPOTENCY =====
    stripeEvents: [{
        eventId: {
            type: String,
            required: true
        },
        eventType: {
            type: String,
            required: true
        },
        processedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['processed', 'failed'],
            default: 'processed'
        }
    }]
}, {
    timestamps: true,
    collection: 'enrollments'
});

// ===== INDEXES =====

// Create compound indexes for better query performance
enrollmentSchema.index({ courseId: 1, email: 1 });
enrollmentSchema.index({ status: 1, timestamp: -1 });

// Enhanced indexes for FrappeLMS integration
enrollmentSchema.index({ enrollmentType: 1, status: 1 });
enrollmentSchema.index({ 'verification.paymentVerified': 1, 'verification.courseEligible': 1 });
enrollmentSchema.index({ 'frappeSync.syncStatus': 1, createdAt: -1 });
enrollmentSchema.index({ 'grantData.couponCode': 1 });
enrollmentSchema.index({ 'affiliateData.affiliateEmail': 1, status: 1 });
enrollmentSchema.index({ 'lmsContext.frappeUsername': 1 });

// Stripe webhook idempotency indexes
enrollmentSchema.index({ 'stripeEvents.eventId': 1 });

// Legacy OpenEdX indexes (for backward compatibility)
enrollmentSchema.index({ 'openedxSync.syncStatus': 1, createdAt: -1 });
enrollmentSchema.index({ 'lmsContext.openedxUsername': 1 });

// Compound indexes for common queries
enrollmentSchema.index({ email: 1, courseId: 1, status: 1 });
enrollmentSchema.index({ paymentId: 1, 'verification.paymentVerified': 1 });

// ===== MODEL =====

// Clear existing models to ensure fresh schema
if (mongoose.models.Enrollment) {
    delete mongoose.models.Enrollment;
}

export const Enrollment = mongoose.model<IEnrollment>('Enrollment', enrollmentSchema);

// Legacy exports for backward compatibility
export const enrollmentModel = Enrollment;

export default Enrollment;
