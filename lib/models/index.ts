// ===== CENTRALIZED MODEL EXPORTS =====
// Re-export all models for clean imports

import UserModel, { User, userModel, type IUser, type IPurchasedCourse } from './user';
import { Course, type ICourse } from './course';
import { Enrollment, enrollmentModel, type IEnrollment } from './enrollment';
import GrantModel, { Grant, grantModel, type IGrant } from './grant';
import AffiliateModel, { Affiliate, affiliateModel, type IAffiliate } from './affiliate';

// Export all models
export {
    // User
    User,
    userModel,
    type IUser,
    type IPurchasedCourse,

    // Course
    Course,
    type ICourse,

    // Enrollment
    Enrollment,
    enrollmentModel,
    type IEnrollment,

    // Grant
    Grant,
    grantModel,
    type IGrant,

    // Affiliate
    Affiliate,
    affiliateModel,
    type IAffiliate
};

// Default exports
export default User;
