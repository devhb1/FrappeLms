/**
 * ===============================
 * USER DATA MODEL
 * ===============================
 * 
 * This module defines the User schema and model for the MaalEdu platform's
 * user management system. It handles user authentication, course purchases,
 * progress tracking, and role-based access control.
 * 
 * KEY FEATURES:
 * 1. 🔐 AUTHENTICATION: Email verification, password management, role-based access
 * 2. 📚 COURSE TRACKING: Purchase history, progress monitoring, certification status
 * 3. 💰 FINANCIAL DATA: Spending analytics, payment history integration
 * 4. 👤 PROFILE MANAGEMENT: Personal information, avatar, login tracking
 * 5. 🔒 SECURITY: Email verification workflow, password protection
 * 
 * BUSINESS LOGIC:
 * - Users start unverified and require email confirmation
 * - Course purchases are tracked with progress and completion status
 * - Role system supports regular users and administrative access
 * - Total spending tracked for analytics and loyalty programs
 * 
 * DATA RELATIONSHIPS:
 * - One-to-Many: User → Enrollments (via email/userId)
 * - Many-to-Many: User ↔ Courses (via purchasedCourses array)
 * - One-to-Many: User → Grant Applications (if eligible)
 * 
 * @module UserModel
 * @version 2.0 - Enhanced with Course Progress Tracking
 */

import mongoose, { Schema, Document } from "mongoose";

// ===============================
// INTERFACE DEFINITIONS
// ===============================

/**
 * Purchased course data embedded in user documents.
 * Provides quick access to user's course history and progress.
 * 
 * PROGRESS TRACKING:
 * - progress: Percentage completion (0-100)
 * - completedAt: Auto-set when progress reaches 100%
 * - certificateIssued: Flag for certificate generation
 * 
 * BUSINESS DATA:
 * - amount: Price paid for the course (for refund/analytics)
 * - paymentId: Reference to payment transaction
 */
export interface IPurchasedCourse {
    courseId: string;              // Course identifier (matches Course.courseId)
    title: string;                 // Course title at time of purchase (for history)
    enrolledAt: Date;              // Purchase/enrollment timestamp
    paymentId: string;             // Stripe payment ID or "FREE_GRANT"
    amount: number;                // Amount paid in USD (0 for free courses)
    progress?: number;             // Course completion percentage (0-100)
    completedAt?: Date;            // Completion timestamp (auto-set at 100%)
    certificateIssued?: boolean;   // Certificate generation status
}

/**
 * User document interface extending Mongoose Document.
 * Represents a registered user on the MaalEdu platform.
 * 
 * AUTHENTICATION FLOW:
 * 1. User registers with email/password
 * 2. Verification code sent to email
 * 3. User verifies email to activate account
 * 4. Full platform access granted
 * 
 * ROLE SYSTEM:
 * - 'user': Regular student with course access
 * - 'admin': Administrative access to all platform features
 */
export interface IUser extends Document {
    username: string;              // Unique display name for the user
    name?: string;                 // Optional full legal name
    email: string;                 // Primary email (used for login and notifications)
    password: string;              // Hashed password for authentication
    verifyCode?: string;           // Email verification code (6-digit numeric)
    verifyCodeExpiry?: Date;       // Verification code expiration timestamp
    isVerified: boolean;           // Email verification status
    role: 'user' | 'admin';        // Access level (user = student, admin = full access)
    purchasedCourses: IPurchasedCourse[];  // Embedded course purchase history
    totalSpent: number;            // Cumulative spending for analytics
    lastLogin?: Date;              // Last login timestamp for activity tracking
    profileImage?: string;         // Avatar/profile picture URL
    createdAt: Date;               // Account creation timestamp

    // Instance methods
    hasPurchasedCourse(courseId: string): boolean;
    addPurchasedCourse(course: Omit<IPurchasedCourse, 'enrolledAt'>): Promise<IUser>;
    updateCourseProgress(courseId: string, progress: number): Promise<IUser | null>;
    updateLastLogin(): Promise<void>;
    isSuperAdmin(): boolean;
}

// ===============================
// MONGOOSE SCHEMA DEFINITION
// ===============================

/**
 * User schema with comprehensive validation and business rules.
 * 
 * VALIDATION STRATEGY:
 * - Email format validation and uniqueness enforcement
 * - Username constraints for display consistency
 * - Password minimum length for security
 * - Conditional validation for verification workflow
 * - Progress constraints for course tracking
 */

const userSchema: Schema<IUser> = new mongoose.Schema({
    // ===== CORE IDENTIFICATION =====
    username: {
        type: String,
        required: [true, 'Username is required'],
        trim: true,
        minlength: [3, 'Username must be at least 3 characters'],
        maxlength: [30, 'Username cannot exceed 30 characters'],
        match: [/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens']
    },
    name: {
        type: String,
        trim: true,
        maxlength: [100, 'Full name cannot exceed 100 characters'],
        validate: {
            validator: function (value: string) {
                // If provided, name should contain only letters, spaces, and common punctuation
                return !value || /^[a-zA-Z\s\-'.]+$/.test(value)
            },
            message: 'Name can only contain letters, spaces, hyphens, apostrophes, and periods'
        }
    },

    // ===== AUTHENTICATION CREDENTIALS =====
    email: {
        type: String,
        required: [true, 'Email address is required'],
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        // Note: Password will be hashed before storage (handled in authentication service)
        select: false  // Exclude from query results by default for security
    },

    // ===== EMAIL VERIFICATION SYSTEM =====
    verifyCode: {
        type: String,
        required: function (this: IUser) {
            // Verification code required only for unverified users
            return !this.isVerified;
        },
        match: [/^\d{6}$/, 'Verification code must be 6 digits'],
        select: false  // Exclude from normal queries for security
    },
    verifyCodeExpiry: {
        type: Date,
        required: function (this: IUser) {
            // Expiry required only for unverified users
            return !this.isVerified;
        },
        validate: {
            validator: function (this: IUser, value: Date) {
                // Expiry must be in the future for unverified users
                return this.isVerified || value > new Date()
            },
            message: 'Verification code expiry must be in the future'
        }
    },
    isVerified: {
        type: Boolean,
        default: false
    },

    // ===== ACCESS CONTROL =====
    role: {
        type: String,
        enum: {
            values: ['admin', 'user'],
            message: 'Role must be admin or user'
        },
        required: [true, 'User role is required'],
        default: 'user'
    },

    // ===== COURSE PURCHASE HISTORY =====
    // Embedded array for quick access to user's course data
    purchasedCourses: [{
        courseId: {
            type: String,
            required: [true, 'Course ID is required'],
            trim: true,
            match: [/^[a-z0-9-]+$/, 'Course ID must contain only lowercase letters, numbers, and hyphens']
        },
        title: {
            type: String,
            required: [true, 'Course title is required'],
            trim: true,
            maxlength: [200, 'Course title cannot exceed 200 characters']
        },
        enrolledAt: {
            type: Date,
            default: Date.now,
            required: [true, 'Enrollment date is required'],
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
            // Payment ID format validation
            match: [/^(pi_|ch_|cs_|GRANT_|FREE_).+/, 'Invalid payment ID format']
        },
        amount: {
            type: Number,
            required: [true, 'Course amount is required'],
            min: [0, 'Course amount must be zero or positive'],
            validate: {
                validator: function (value: number) {
                    // Amount must be a valid monetary value (max 2 decimal places)
                    return Number.isInteger(value * 100)
                },
                message: 'Amount must have at most 2 decimal places'
            }
        },

        // ===== PROGRESS TRACKING =====
        progress: {
            type: Number,
            default: 0,
            min: [0, 'Progress cannot be negative'],
            max: [100, 'Progress cannot exceed 100%'],
            validate: {
                validator: Number.isInteger,
                message: 'Progress must be a whole number'
            }
        },
        completedAt: {
            type: Date,
            validate: {
                validator: function (this: IPurchasedCourse, value: Date) {
                    // Completion date must be after enrollment date
                    return !value || value >= this.enrolledAt
                },
                message: 'Completion date must be after enrollment date'
            }
        },
        certificateIssued: {
            type: Boolean,
            default: false,
            validate: {
                validator: function (this: IPurchasedCourse, value: boolean) {
                    // Certificate can only be issued for completed courses
                    return !value || ((this.progress || 0) >= 100 && this.completedAt)
                },
                message: 'Certificate can only be issued for completed courses'
            }
        }
    }],

    // ===== FINANCIAL ANALYTICS =====
    totalSpent: {
        type: Number,
        default: 0,
        min: [0, 'Total spent cannot be negative'],
        validate: {
            validator: function (value: number) {
                // Total spent must be a valid monetary amount
                return Number.isInteger(value * 100)
            },
            message: 'Total spent must have at most 2 decimal places'
        }
    },

    // ===== ACTIVITY TRACKING =====
    lastLogin: {
        type: Date,
        validate: {
            validator: function (value: Date) {
                // Last login cannot be in the future
                return !value || value <= new Date()
            },
            message: 'Last login date cannot be in the future'
        }
    },
    profileImage: {
        type: String,
        default: '',
        trim: true,
        validate: {
            validator: function (value: string) {
                // If provided, must be a valid HTTP(S) URL
                return !value || /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)$/i.test(value)
            },
            message: 'Profile image must be a valid HTTP(S) URL ending in jpg, jpeg, png, webp, or gif'
        }
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true  // Prevent modification after creation
    }
}, {
    // ===== SCHEMA OPTIONS =====
    timestamps: true,  // Automatically manage createdAt and updatedAt
    collection: 'users',  // Explicit collection name
    // Optimize JSON output
    toJSON: {
        transform: function (doc, ret) {
            // Remove sensitive fields from JSON output
            const { password, verifyCode, verifyCodeExpiry, __v, ...result } = ret;
            return result;
        }
    },
    toObject: {
        transform: function (doc, ret) {
            // Remove sensitive fields from object output
            const { password, verifyCode, verifyCodeExpiry, __v, ...result } = ret;
            return result;
        }
    }
});

// ===============================
// DATABASE INDEXES FOR PERFORMANCE
// ===============================

/**
 * Strategic indexes for common query patterns:
 * 
 * 1. email: Primary login lookup (unique constraint)
 * 2. username: Profile lookups and uniqueness
 * 3. isVerified: Filter verified/unverified users
 * 4. role: Admin/user filtering
 * 5. purchasedCourses.courseId: Check course ownership
 * 6. totalSpent: Analytics and loyalty program queries
 * 7. lastLogin: Activity reports and user engagement
 */
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ isVerified: 1, role: 1 });          // Common admin queries
userSchema.index({ 'purchasedCourses.courseId': 1 });   // Course access checks
userSchema.index({ totalSpent: -1 });                   // Top spenders analytics
userSchema.index({ lastLogin: -1 });                    // Activity tracking
userSchema.index({ createdAt: -1 });                    // Registration analytics

// ===============================
// SCHEMA MIDDLEWARE (HOOKS)
// ===============================

/**
 * Pre-save middleware to maintain data consistency.
 */
userSchema.pre('save', function (next) {
    // Automatically calculate total spent from purchased courses
    if (this.isModified('purchasedCourses')) {
        this.totalSpent = this.purchasedCourses.reduce((total, course) => total + course.amount, 0);
    }

    // Clear verification fields for verified users
    if (this.isVerified && (this.verifyCode || this.verifyCodeExpiry)) {
        this.verifyCode = undefined;
        this.verifyCodeExpiry = undefined;
    }

    next();
});

/**
 * Pre-aggregate middleware for common population.
 */
userSchema.pre('aggregate', function () {
    // Add common lookup stages for user analytics
    this.pipeline().unshift(
        {
            $addFields: {
                courseCount: { $size: '$purchasedCourses' },
                averageProgress: { $avg: '$purchasedCourses.progress' },
                completedCourses: {
                    $size: {
                        $filter: {
                            input: '$purchasedCourses',
                            cond: { $gte: ['$$this.progress', 100] }
                        }
                    }
                }
            }
        }
    );
});

// ===============================
// INSTANCE METHODS
// ===============================

/**
 * Add a new course purchase to the user's history.
 * Updates purchasedCourses array and recalculates totalSpent.
 * 
 * @param courseData - Course purchase information
 * @returns Promise<IUser> - Updated user document
 */
userSchema.methods.addPurchasedCourse = function (courseData: Omit<IPurchasedCourse, 'enrolledAt'>) {
    // Check for duplicate course purchase
    const existingCourse = this.purchasedCourses.find(
        (course: IPurchasedCourse) => course.courseId === courseData.courseId
    );

    if (!existingCourse) {
        // Add new course with current timestamp
        this.purchasedCourses.push({
            ...courseData,
            enrolledAt: new Date()
        });

        // Update total spending
        this.totalSpent += courseData.amount;
    } else {
        throw new Error('User has already purchased this course');
    }

    return this.save();
};

/**
 * Update progress for a specific course.
 * Automatically marks course as completed when progress reaches 100%.
 * 
 * @param courseId - Course identifier
 * @param progress - Progress percentage (0-100)
 * @returns Promise<IUser> - Updated user document
 */
userSchema.methods.updateCourseProgress = function (courseId: string, progress: number) {
    const course = this.purchasedCourses.find(
        (course: IPurchasedCourse) => course.courseId === courseId
    );

    if (course) {
        // Clamp progress between 0 and 100
        course.progress = Math.min(Math.max(progress, 0), 100);

        // Auto-complete course when progress reaches 100%
        if (progress >= 100 && !course.completedAt) {
            course.completedAt = new Date();
        }

        // Reset completion if progress drops below 100%
        if (progress < 100 && course.completedAt) {
            course.completedAt = undefined;
            course.certificateIssued = false;  // Revoke certificate if incomplete
        }
    } else {
        throw new Error('Course not found in user\'s purchased courses');
    }

    return this.save();
};

/**
 * Check if user has purchased a specific course.
 * 
 * @param courseId - Course identifier to check
 * @returns boolean - True if course is owned by user
 */
userSchema.methods.hasPurchasedCourse = function (courseId: string): boolean {
    return this.purchasedCourses.some(
        (course: IPurchasedCourse) => course.courseId === courseId
    );
};

/**
 * Update the user's last login timestamp.
 * Used for activity tracking and session management.
 * 
 * @returns Promise<IUser> - Updated user document
 */
userSchema.methods.updateLastLogin = function () {
    this.lastLogin = new Date();
    return this.save();
};

/**
 * Get user's learning statistics for dashboard display.
 * 
 * @returns object - Learning analytics
 */
userSchema.methods.getLearningStats = function () {
    const courses = this.purchasedCourses;
    const completedCourses = courses.filter((course: IPurchasedCourse) => (course.progress || 0) >= 100);
    const inProgressCourses = courses.filter((course: IPurchasedCourse) =>
        (course.progress || 0) > 0 && (course.progress || 0) < 100
    );

    return {
        totalCourses: courses.length,
        completedCourses: completedCourses.length,
        inProgressCourses: inProgressCourses.length,
        notStartedCourses: courses.length - completedCourses.length - inProgressCourses.length,
        averageProgress: courses.length > 0 ?
            courses.reduce((sum: number, course: IPurchasedCourse) => sum + (course.progress || 0), 0) / courses.length : 0,
        totalSpent: this.totalSpent,
        certificatesEarned: courses.filter((course: IPurchasedCourse) => course.certificateIssued).length
    };
};

/**
 * Check if user account is fully activated and ready for course access.
 * 
 * @returns boolean - True if user can access courses
 */
userSchema.methods.isAccountActive = function (): boolean {
    return this.isVerified && this.role !== undefined;
};

// ===============================
// STATIC METHODS
// ===============================

/**
 * Find users with course access for a specific course.
 * 
 * @param courseId - Course identifier
 * @returns Promise<IUser[]> - Users who own the course
 */
userSchema.statics.findUsersWithCourse = function (courseId: string) {
    return this.find({
        'purchasedCourses.courseId': courseId,
        isVerified: true
    }).select('username email purchasedCourses.$');
};

/**
 * Get user analytics for admin dashboard.
 * 
 * @returns Promise<object> - User statistics
 */
userSchema.statics.getUserStats = async function () {
    const [stats] = await this.aggregate([
        {
            $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                verifiedUsers: {
                    $sum: { $cond: ['$isVerified', 1, 0] }
                },
                adminUsers: {
                    $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
                },
                totalRevenue: { $sum: '$totalSpent' },
                averageSpending: { $avg: '$totalSpent' },
                totalCoursesPurchased: {
                    $sum: { $size: '$purchasedCourses' }
                }
            }
        }
    ]);

    return stats || {
        totalUsers: 0,
        verifiedUsers: 0,
        adminUsers: 0,
        totalRevenue: 0,
        averageSpending: 0,
        totalCoursesPurchased: 0
    };
};

// ===============================
// MODEL EXPORT
// ===============================

/**
 * User model with comprehensive authentication, course tracking, and analytics.
 * Handles user lifecycle from registration through course completion.
 */

// Clear existing model to prevent "Cannot overwrite model" errors
if (mongoose.models.User) {
    delete mongoose.models.User;
}

export const User = mongoose.model<IUser>('User', userSchema);

// Legacy exports for backward compatibility
export const userModel = User;
export default User;
