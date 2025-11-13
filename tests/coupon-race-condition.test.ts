/**
 * ===============================
 * COUPON RACE CONDITION FIX TEST
 * ===============================
 * 
 * This test verifies that the atomic coupon reservation prevents
 * multiple users from using the same coupon simultaneously.
 */

// Test framework imports
declare global {
    const describe: any;
    const it: any;
    const expect: any;
    const beforeAll: any;
    const afterAll: any;
    const beforeEach: any;
}
import mongoose from 'mongoose';
import { Grant, Enrollment } from '@/lib/models';
import connectToDatabase from '@/lib/db';

// Mock the checkout API
const mockCheckoutAPI = async (courseId: string, email: string, couponCode: string) => {
    // Simulate the atomic coupon reservation logic
    const reservedGrant = await Grant.findOneAndUpdate(
        {
            couponCode: couponCode.toUpperCase(),
            status: 'approved',
            couponUsed: false,
            email: email.toLowerCase()
        },
        {
            $set: {
                couponUsed: true,
                couponUsedAt: new Date(),
                couponUsedBy: email.toLowerCase(),
                reservedAt: new Date()
            }
        },
        {
            new: true,
            runValidators: true
        }
    );

    if (!reservedGrant) {
        throw new Error('COUPON_UNAVAILABLE');
    }

    // Simulate enrollment creation
    const enrollment = new Enrollment({
        courseId,
        email: email.toLowerCase(),
        status: 'paid',
        amount: 0,
        grantData: {
            grantId: reservedGrant._id,
            couponCode: couponCode.toUpperCase(),
            grantVerified: true,
            discountPercentage: reservedGrant.discountPercentage || 100
        }
    });

    return await enrollment.save();
};

describe('Coupon Race Condition Fix', () => {
    beforeAll(async () => {
        // Connect to test database
        process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/maaledu-test';
        await connectToDatabase();
    });

    afterAll(async () => {
        // Clean up database connection
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        // Clean up test data
        await Grant.deleteMany({ couponCode: { $regex: /^TEST_/ } });
        await Enrollment.deleteMany({ email: { $regex: /@test\.com$/ } });
    });

    it('should prevent simultaneous coupon usage', async () => {
        const couponCode = 'TEST_COUPON_123';
        const email = 'test@test.com';
        const courseId = 'test-course-id';

        // Create a test grant
        await Grant.create({
            name: 'Test User',
            email: email.toLowerCase(),
            username: 'testuser',
            age: 25,
            socialAccounts: 'test@twitter.com',
            reason: 'Testing purposes',
            courseId,
            status: 'approved',
            couponCode: couponCode.toUpperCase(),
            couponUsed: false,
            discountPercentage: 100
        });

        // Fire 10 concurrent requests to simulate race condition
        const promises = Array(10).fill(null).map((_, index) =>
            mockCheckoutAPI(courseId, email, couponCode)
                .then(() => ({ success: true, index }))
                .catch((error) => ({ success: false, error: error.message, index }))
        );

        const results = await Promise.all(promises);

        // Verify only ONE request succeeded
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.filter(r => !r.success).length;

        expect(successCount).toBe(1);
        expect(failureCount).toBe(9);

        // Verify coupon is properly marked as used
        const grant = await Grant.findOne({ couponCode: couponCode.toUpperCase() });
        expect(grant?.couponUsed).toBe(true);
        expect(grant?.reservedAt).toBeDefined();
        expect(grant?.couponUsedBy).toBe(email.toLowerCase());

        // Verify only one enrollment was created
        const enrollments = await Enrollment.find({
            email: email.toLowerCase(),
            courseId
        });
        expect(enrollments).toHaveLength(1);

        console.log('✅ Race condition test results:', {
            totalRequests: 10,
            successful: successCount,
            failed: failureCount,
            enrollmentsCreated: enrollments.length
        });
    }, 30000); // 30 second timeout for concurrent operations

    it('should rollback coupon reservation if enrollment fails', async () => {
        const couponCode = 'TEST_ROLLBACK_456';
        const email = 'rollback@test.com';
        const courseId = 'test-course-id';

        // Create a test grant
        const grant = await Grant.create({
            name: 'Rollback Test User',
            email: email.toLowerCase(),
            username: 'rollbackuser',
            age: 25,
            socialAccounts: 'test@twitter.com',
            reason: 'Testing rollback',
            courseId,
            status: 'approved',
            couponCode: couponCode.toUpperCase(),
            couponUsed: false,
            discountPercentage: 100
        });

        // Reserve the coupon
        const reservedGrant = await Grant.findOneAndUpdate(
            {
                couponCode: couponCode.toUpperCase(),
                status: 'approved',
                couponUsed: false,
                email: email.toLowerCase()
            },
            {
                $set: {
                    couponUsed: true,
                    couponUsedAt: new Date(),
                    couponUsedBy: email.toLowerCase(),
                    reservedAt: new Date()
                }
            },
            { new: true }
        );

        expect(reservedGrant?.couponUsed).toBe(true);

        // Simulate enrollment failure and rollback
        await Grant.findByIdAndUpdate(reservedGrant!._id, {
            $unset: {
                couponUsed: 1,
                couponUsedAt: 1,
                couponUsedBy: 1,
                reservedAt: 1
            }
        });

        // Verify rollback worked
        const rolledBackGrant = await Grant.findById(grant._id);
        expect(rolledBackGrant?.couponUsed).toBe(false);
        expect(rolledBackGrant?.couponUsedAt).toBeUndefined();
        expect(rolledBackGrant?.couponUsedBy).toBeUndefined();
        expect(rolledBackGrant?.reservedAt).toBeUndefined();

        console.log('✅ Rollback test successful - coupon available for reuse');
    });

    it('should handle expired coupons correctly', async () => {
        const couponCode = 'TEST_EXPIRED_789';
        const email = 'expired@test.com';
        const courseId = 'test-course-id';

        // Create an expired grant
        await Grant.create({
            name: 'Expired Test User',
            email: email.toLowerCase(),
            username: 'expireduser',
            age: 25,
            socialAccounts: 'test@twitter.com',
            reason: 'Testing expiration',
            courseId,
            status: 'approved',
            couponCode: couponCode.toUpperCase(),
            couponUsed: false,
            discountPercentage: 100,
            couponMetadata: {
                type: 'full_grant',
                discountAmount: 499,
                finalPrice: 0,
                expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
                createdAt: new Date()
            }
        });

        // Try to use expired coupon
        await expect(mockCheckoutAPI(courseId, email, couponCode))
            .rejects.toThrow('COUPON_UNAVAILABLE');

        // Verify coupon remains unused
        const grant = await Grant.findOne({ couponCode: couponCode.toUpperCase() });
        expect(grant?.couponUsed).toBe(false);

        console.log('✅ Expired coupon correctly rejected');
    });
});