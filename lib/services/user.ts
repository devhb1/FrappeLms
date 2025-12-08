import { User, IUser, IPurchasedCourse } from '../models/user';
import { Course } from '../models/course';
import connectToDatabase from '../db';

// ===== USER SERVICE =====

export class UserService {

    // Get user by email with purchased courses
    static async getUserByEmail(email: string): Promise<IUser | null> {
        await connectToDatabase();
        return await User.findOne({ email: email.toLowerCase() });
    }

    // Get user dashboard data
    static async getUserDashboard(userId: string) {
        await connectToDatabase();

        const user = await User.findById(userId).select('-password -verifyCode');
        if (!user) {
            throw new Error('User not found');
        }

        const stats = {
            totalCourses: user.purchasedCourses.length,
            completedCourses: user.purchasedCourses.filter((c: IPurchasedCourse) => (c.progress || 0) >= 100).length,
            totalSpent: user.totalSpent,
            averageProgress: user.purchasedCourses.length > 0
                ? Math.round(user.purchasedCourses.reduce((sum: number, c: IPurchasedCourse) => sum + (c.progress || 0), 0) / user.purchasedCourses.length)
                : 0,
            certificatesEarned: user.purchasedCourses.filter((c: IPurchasedCourse) => c.certificateIssued).length
        };

        return {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                profileImage: user.profileImage,
                lastLogin: user.lastLogin,
                isVerified: user.isVerified,
                createdAt: user.createdAt
            },
            purchasedCourses: user.purchasedCourses.sort((a: IPurchasedCourse, b: IPurchasedCourse) =>
                new Date(b.enrolledAt).getTime() - new Date(a.enrolledAt).getTime()
            ),
            stats
        };
    }

    // Add course purchase to user
    static async addCoursePurchase(
        userId: string,
        courseId: string,
        paymentId: string,
        amount: number
    ): Promise<boolean> {
        try {
            await connectToDatabase();

            // Get course details
            const course = await Course.findOne({ courseId });
            if (!course) {
                throw new Error('Course not found');
            }

            // Get user
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Check if user already has this course
            if (user.hasPurchasedCourse(courseId)) {
                return false; // Already purchased
            }

            // Add course to user's purchased courses
            await user.addPurchasedCourse({
                courseId,
                title: course.title,
                paymentId,
                amount,
                progress: 0
            });

            // Update course enrollment
            course.enrolledUsers.push({
                userId: user._id as any,
                email: user.email,
                enrolledAt: new Date(),
                paymentId
            });
            course.totalEnrollments += 1;
            await course.save();

            return true;
        } catch (error) {
            console.error('❌ Failed to add course purchase:', error);
            return false;
        }
    }

    // Update course progress
    static async updateCourseProgress(
        userId: string,
        courseId: string,
        progress: number
    ): Promise<boolean> {
        try {
            await connectToDatabase();

            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            await user.updateCourseProgress(courseId, progress);
            return true;
        } catch (error) {
            console.error('❌ Failed to update course progress:', error);
            return false;
        }
    }

    // Issue certificate for completed course
    static async issueCertificate(userId: string, courseId: string): Promise<boolean> {
        try {
            await connectToDatabase();

            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const course = user.purchasedCourses.find((c: IPurchasedCourse) => c.courseId === courseId);
            if (!course) {
                throw new Error('Course not found in user purchases');
            }

            if ((course.progress || 0) < 100) {
                throw new Error('Course not completed yet');
            }

            course.certificateIssued = true;
            await user.save();

            return true;
        } catch (error) {
            console.error('❌ Failed to issue certificate:', error);
            return false;
        }
    }

    // Get user learning analytics
    static async getUserAnalytics(userId: string) {
        await connectToDatabase();

        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const now = new Date();
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const recentPurchases = user.purchasedCourses.filter(
            (c: IPurchasedCourse) => new Date(c.enrolledAt) >= monthAgo
        );

        const progressData = user.purchasedCourses.map((course: IPurchasedCourse) => ({
            courseId: course.courseId,
            title: course.title,
            progress: course.progress || 0,
            enrolledAt: course.enrolledAt,
            completedAt: course.completedAt
        }));

        return {
            totalCourses: user.purchasedCourses.length,
            recentPurchases: recentPurchases.length,
            averageProgress: user.purchasedCourses.length > 0
                ? Math.round(user.purchasedCourses.reduce((sum: number, c: IPurchasedCourse) => sum + (c.progress || 0), 0) / user.purchasedCourses.length)
                : 0,
            progressData,
            spending: {
                total: user.totalSpent,
                recent: recentPurchases.reduce((sum: number, c: IPurchasedCourse) => sum + c.amount, 0)
            }
        };
    }

    // Update user login timestamp
    static async updateLastLogin(userId: string): Promise<void> {
        try {
            await connectToDatabase();
            const user = await User.findById(userId);
            if (user) {
                await user.updateLastLogin();
            }
        } catch (error) {
            console.error('❌ Failed to update last login:', error);
        }
    }
}

export default UserService;
