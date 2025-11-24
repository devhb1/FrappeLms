/**
 * ===============================
 * COURSE DATA MODEL
 * ===============================
 * 
 * This module defines the Course schema and model for the MaalEdu platform's
 * course management system. It handles course metadata, pricing, enrollment
 * tracking, and administrative features.
 * 
 * KEY FEATURES:
 * 1. 📚 COURSE CATALOG: Complete course information with metadata
 * 2. 💰 PRICING MODEL: Flexible pricing with promotional capabilities
 * 3. 👥 ENROLLMENT TRACKING: Real-time enrollment counts and user lists
 * 4. 🔗 RELATIONSHIP MAPPING: Virtual relationships with enrollment data
 * 5. 📊 PERFORMANCE OPTIMIZATION: Strategic indexes for fast queries
 * 
 * BUSINESS LOGIC:
 * - Courses can be free (price: 0) or paid with flexible pricing
 * - Custom ordering system for course display priority
 * - Automatic enrollment count tracking for analytics
 * - Support for course deactivation without data loss
 * 
 * DATA RELATIONSHIPS:
 * - One-to-Many: Course → Enrollments (via courseId)
 * - One-to-Many: Course → Grant Applications (via courseId)
 * - Many-to-Many: Course ↔ Users (via enrolledUsers array)
 * 
 * @module CourseModel
 * @version 2.0 - Enhanced with Virtual Relationships
 */

import mongoose, { Schema, Document } from "mongoose";

// ===============================
// COURSE INTERFACE DEFINITION
// ===============================

/**
 * Course document interface extending Mongoose Document.
 * Represents a complete course offering on the MaalEdu platform.
 * 
 * ENROLLMENT TRACKING:
 * - enrolledUsers: Embedded user enrollment data for quick access
 * - totalEnrollments: Cached count for performance (updated via hooks)
 * - Virtual relationships: Links to full Enrollment documents
 * 
 * BUSINESS FIELDS:
 * - courseId: Unique identifier for external system integration
 * - price: 0 for free courses, positive number for paid courses
 * - order: Display priority (1 = highest priority, 999+ = lowest)
 * - isActive: Soft delete flag - preserves data while hiding course
 */
export interface ICourse extends Document {
    courseId: string;                    // Unique course identifier (e.g., "blockchain-101")
    title: string;                       // Display name (e.g., "Blockchain Fundamentals")
    description: string;                 // Detailed course description for marketing
    price: number;                       // Course price in USD (0 = free course)
    duration: string;                    // Human-readable duration (e.g., "8 weeks", "Self-paced")
    level: 'Beginner' | 'Intermediate' | 'Advanced';  // Difficulty level for filtering
    image: string;                       // Course thumbnail/hero image URL
    features: string[];                  // Key course features for marketing bullets
    totalEnrollments: number;            // Cached enrollment count (auto-updated)
    enrolledUsers: {                     // Embedded enrollment summary for quick queries
        userId?: mongoose.Types.ObjectId;   // Optional: User ID if registered user
        email: string;                      // Student email (required for all enrollments)
        enrolledAt: Date;                   // Enrollment timestamp
        paymentId: string;                  // Payment reference (Stripe ID or "FREE_GRANT")
    }[];
    isActive: boolean;                   // Course visibility flag (soft delete)
    status: 'draft' | 'published' | 'archived'; // Course publication status
    createdAt: Date;                     // Course creation timestamp
    order: number;                       // Display order priority (1 = first, higher = later)
}

// ===============================
// MONGOOSE SCHEMA DEFINITION
// ===============================

/**
 * Course schema with comprehensive validation and business rules.
 * 
 * VALIDATION STRATEGY:
 * - Required fields enforced at database level
 * - String length limits prevent data bloat
 * - Email validation ensures valid contact information
 * - Enum validation maintains data consistency
 * - Numeric constraints prevent invalid business data
 */

const courseSchema: Schema<ICourse> = new mongoose.Schema({
    // ===== CORE IDENTIFICATION =====
    courseId: {
        type: String,
        required: [true, 'Course ID is required'],
        unique: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: function(value: string) {
                // Accept letters, numbers, hyphens, underscores, colons, plus, dots, percent, and forward slashes
                // This matches Open edX course ID format: course-v1:Org+Course+Run
                return /^[a-zA-Z0-9-_:+.%\/]+$/.test(value);
            },
            message: 'Course ID can only contain letters, numbers, and the following characters: - _ : + . % /'
        },
        minlength: [3, 'Course ID must be at least 3 characters'],
        maxlength: [100, 'Course ID cannot exceed 100 characters']
    },

    // ===== MARKETING CONTENT =====
    title: {
        type: String,
        required: [true, 'Course title is required'],
        trim: true,
        maxlength: [200, 'Title cannot exceed 200 characters'],
        minlength: [3, 'Title must be at least 3 characters']
    },
    description: {
        type: String,
        required: [true, 'Course description is required'],
        trim: true,
        maxlength: [2000, 'Description cannot exceed 2000 characters'],
        minlength: [10, 'Description must be at least 10 characters']
    },

    // ===== BUSINESS CONFIGURATION =====
    price: {
        type: Number,
        required: [true, 'Course price is required'],
        min: [0, 'Price must be zero or positive'],
        validate: {
            validator: function (value: number) {
                // Price must be a valid monetary amount (max 2 decimal places)
                return Number.isInteger(value * 100)
            },
            message: 'Price must have at most 2 decimal places'
        }
    },
    duration: {
        type: String,
        required: [true, 'Course duration is required'],
        trim: true,
        maxlength: [50, 'Duration cannot exceed 50 characters']
    },
    level: {
        type: String,
        enum: {
            values: ['Beginner', 'Intermediate', 'Advanced'],
            message: 'Level must be Beginner, Intermediate, or Advanced'
        },
        required: [true, 'Course level is required']
    },

    // ===== MEDIA & PRESENTATION =====
    image: {
        type: String,
        required: [true, 'Course image URL is required'],
        trim: true,
        validate: {
            validator: function (value: string) {
                // Flexible URL validation - accepts any valid HTTP(S) URL
                // Supports modern image services like Unsplash, Cloudinary, etc.
                try {
                    const url = new URL(value);
                    return ['http:', 'https:'].includes(url.protocol);
                } catch {
                    return false;
                }
            },
            message: 'Image must be a valid HTTP(S) URL'
        }
    },
    features: [{
        type: String,
        required: [true, 'Feature description is required'],
        trim: true,
        maxlength: [100, 'Feature description cannot exceed 100 characters']
    }],

    // ===== ENROLLMENT ANALYTICS =====
    totalEnrollments: {
        type: Number,
        default: 0,
        min: [0, 'Total enrollments cannot be negative'],
        validate: {
            validator: Number.isInteger,
            message: 'Total enrollments must be a whole number'
        }
    },

    // ===== EMBEDDED ENROLLMENT DATA =====
    // This array provides quick access to enrollment info without joins
    // For detailed enrollment data, use virtual relationships
    enrolledUsers: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            sparse: true  // Allow null for guest/grant enrollments
        },
        email: {
            type: String,
            required: [true, 'Enrolled user email is required'],
            lowercase: true,
            trim: true,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
        },
        enrolledAt: {
            type: Date,
            default: Date.now,
            validate: {
                validator: function (value: Date) {
                    // Enrollment date cannot be in the future
                    return value <= new Date()
                },
                message: 'Enrollment date cannot be in the future'
            }
        },
        paymentId: {
            type: String,
            required: [true, 'Payment ID is required'],
            trim: true,
            // Payment ID format: Stripe IDs start with "pi_" or "ch_", grants use "GRANT_" prefix
            match: [/^(pi_|ch_|cs_|GRANT_|FREE_).+/, 'Invalid payment ID format']
        }
    }],

    // ===== ADMINISTRATIVE CONTROLS =====
    isActive: {
        type: Boolean,
        default: true
        // Index handled by compound indexes below
    },
    status: {
        type: String,
        enum: {
            values: ['draft', 'published', 'archived'],
            message: 'Status must be draft, published, or archived'
        },
        default: 'draft'
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true  // Prevent modification after creation
    },

    // ===== DISPLAY ORDERING =====
    // Lower numbers appear first (1, 2, 3...), higher numbers appear later
    order: {
        type: Number,
        default: 999, // Default to end of list for new courses
        min: [1, 'Order must be at least 1'],
        max: [9999, 'Order cannot exceed 9999'],
        validate: {
            validator: Number.isInteger,
            message: 'Order must be a whole number'
        }
    }
}, {
    // ===== SCHEMA OPTIONS =====
    timestamps: true,  // Automatically manage createdAt and updatedAt
    collection: 'courses',  // Explicit collection name
    // Optimize JSON output
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            // Remove version key from JSON output
            const { __v, ...result } = ret;
            return result;
        }
    },
    toObject: { virtuals: true }
});

// ===============================
// DATABASE INDEXES FOR PERFORMANCE
// ===============================

/**
 * Strategic indexes for common query patterns:
 * 
 * 1. isActive: Filter active/inactive courses (compound with other fields)
 * 2. enrolledUsers.email: Check if user already enrolled
 * 3. totalEnrollments: Sort by popularity (descending)
 * 4. order: Custom admin-defined display order
 * 5. createdAt: Sort by newest courses first
 * 6. price: Filter free vs paid courses
 * 7. level: Filter by difficulty level
 */
courseSchema.index({ isActive: 1, order: 1 });        // Primary course listing
courseSchema.index({ isActive: 1, price: 1 });        // Filter by free/paid
courseSchema.index({ isActive: 1, level: 1 });        // Filter by difficulty
courseSchema.index({ 'enrolledUsers.email': 1 });     // Enrollment checks
courseSchema.index({ totalEnrollments: -1 });         // Sort by popularity
courseSchema.index({ createdAt: -1 });                // Sort by newest
// courseId index is created automatically by unique: true constraint

// ===============================
// VIRTUAL RELATIONSHIPS
// ===============================

/**
 * Virtual relationships provide access to related data without embedding.
 * These are computed at query time and not stored in the database.
 */

// Virtual to get complete enrollment records with LMS and affiliate data
courseSchema.virtual('fullEnrollments', {
    ref: 'Enrollment',               // Reference the Enrollment model
    localField: 'courseId',          // Match course's courseId field
    foreignField: 'courseId',        // With enrollment's courseId field
    options: {
        sort: { createdAt: -1 },     // Newest enrollments first
        select: 'email paymentId lmsContext affiliateData status createdAt'  // Limit fields
    }
});

// Virtual to get only successful paid enrollments
courseSchema.virtual('paidEnrollments', {
    ref: 'Enrollment',
    localField: 'courseId',
    foreignField: 'courseId',
    match: {
        status: 'paid',              // Only successful payments
        'lmsContext.enrollmentStatus': 'enrolled'  // Only LMS-enrolled users
    },
    options: {
        sort: { createdAt: -1 },
        select: 'email lmsContext.frappeUsername affiliateData.affiliateEmail createdAt'
    }
});

// Virtual to get grant-based enrollments
courseSchema.virtual('grantEnrollments', {
    ref: 'Enrollment',
    localField: 'courseId',
    foreignField: 'courseId',
    match: {
        status: 'grant',             // Grant-funded enrollments
        'lmsContext.enrollmentStatus': 'enrolled'
    },
    options: {
        sort: { createdAt: -1 },
        select: 'email grantData lmsContext.frappeUsername createdAt'
    }
});

// ===============================
// SCHEMA MIDDLEWARE (HOOKS)
// ===============================

/**
 * Pre-save middleware to maintain data consistency and business rules.
 */
courseSchema.pre('save', function (next) {
    // Ensure totalEnrollments matches enrolledUsers array length
    if (this.isModified('enrolledUsers')) {
        this.totalEnrollments = this.enrolledUsers.length;
    }

    // Validate feature array is not empty
    if (this.features.length === 0) {
        return next(new Error('Course must have at least one feature'));
    }

    next();
});

/**
 * Pre-find middleware to automatically populate related data.
 * This runs before find(), findOne(), findOneAndUpdate(), etc.
 */
courseSchema.pre(/^find/, function (this: any) {
    // Only populate for specific queries to avoid performance impact
    if (this.getOptions().populateEnrollments) {
        this.populate({
            path: 'paidEnrollments',
            select: 'email paymentId lmsContext.frappeUsername affiliateData.affiliateEmail createdAt',
            options: { limit: 50 }  // Limit to recent enrollments
        });
    }
});

// ===============================
// INSTANCE METHODS
// ===============================

/**
 * Check if a user is already enrolled in this course.
 * 
 * @param email - User's email address
 * @returns boolean - True if user is enrolled
 */
courseSchema.methods.isUserEnrolled = function (email: string): boolean {
    return this.enrolledUsers.some((user: any) =>
        user.email.toLowerCase() === email.toLowerCase()
    );
};

/**
 * Add a new enrollment to the course.
 * Updates both enrolledUsers array and totalEnrollments count.
 * 
 * @param enrollmentData - User enrollment information
 */
courseSchema.methods.addEnrollment = function (enrollmentData: {
    userId?: mongoose.Types.ObjectId;
    email: string;
    paymentId: string;
}) {
    // Check for duplicate enrollment
    if (this.isUserEnrolled(enrollmentData.email)) {
        throw new Error('User is already enrolled in this course');
    }

    // Add to enrolled users
    this.enrolledUsers.push({
        ...enrollmentData,
        enrolledAt: new Date()
    });

    // Update count
    this.totalEnrollments = this.enrolledUsers.length;
};

/**
 * Get enrollment statistics for analytics dashboard.
 * 
 * @returns object - Enrollment metrics
 */
courseSchema.methods.getEnrollmentStats = function () {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentEnrollments = this.enrolledUsers.filter((user: any) =>
        user.enrolledAt >= thirtyDaysAgo
    );

    return {
        total: this.totalEnrollments,
        recent: recentEnrollments.length,
        averagePerDay: recentEnrollments.length / 30,
        revenue: this.totalEnrollments * this.price  // Simplified revenue calculation
    };
};

// ===============================
// STATIC METHODS
// ===============================

/**
 * Find active courses with optional filtering and sorting.
 * 
 * @param filters - Query filters
 * @param options - Query options
 * @returns Promise<ICourse[]> - Array of courses
 */
courseSchema.statics.findActive = function (filters = {}, options = {}) {
    return this.find({
        isActive: true,
        ...filters
    }, null, {
        sort: { order: 1, createdAt: -1 },  // Order by priority, then newest
        ...options
    });
};

/**
 * Get course statistics for admin dashboard.
 * 
 * @returns Promise<object> - Course analytics
 */
courseSchema.statics.getStats = async function () {
    const [stats] = await this.aggregate([
        {
            $group: {
                _id: null,
                totalCourses: { $sum: 1 },
                activeCourses: {
                    $sum: { $cond: ['$isActive', 1, 0] }
                },
                totalEnrollments: { $sum: '$totalEnrollments' },
                averagePrice: { $avg: '$price' },
                freeCourses: {
                    $sum: { $cond: [{ $eq: ['$price', 0] }, 1, 0] }
                }
            }
        }
    ]);

    return stats || {
        totalCourses: 0,
        activeCourses: 0,
        totalEnrollments: 0,
        averagePrice: 0,
        freeCourses: 0
    };
};

// ===============================
// MODEL EXPORT
// ===============================

/**
 * Course model with full schema and business logic.
 * Handles course management, enrollment tracking, and analytics.
 */
export const Course = mongoose.models.Course || mongoose.model<ICourse>('Course', courseSchema);
