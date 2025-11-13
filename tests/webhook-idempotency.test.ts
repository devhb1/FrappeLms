/**
 * ===============================
 * WEBHOOK IDEMPOTENCY FIX TEST
 * ===============================
 * 
 * This test verifies that the webhook idempotency prevents
 * duplicate processing of the same Stripe event.
 */

// Test framework - assuming Jest environment

import mongoose from 'mongoose';
import { Enrollment } from '@/lib/models';
import connectToDatabase from '@/lib/db';

// Mock Stripe event
const createMockStripeEvent = (eventId: string, enrollmentId: string) => ({
    id: eventId,
    type: 'checkout.session.completed',
    data: {
        object: {
            payment_intent: 'pi_test_123',
            customer_details: {
                email: 'test@example.com'
            },
            amount_total: 49900, // $499.00
            metadata: {
                enrollmentId,
                courseId: 'test-course',
                email: 'test@example.com'
            }
        }
    }
});

// Mock webhook processing logic
const processWebhookEvent = async (stripeEvent: any) => {
    const session = stripeEvent.data.object;
    const metadata = session.metadata;

    // Find existing enrollment
    const existingEnrollment = await Enrollment.findById(metadata.enrollmentId);
    if (!existingEnrollment) {
        throw new Error('Enrollment not found');
    }

    // Check if this specific event was already processed
    const isEventProcessed = existingEnrollment.stripeEvents?.some(
        (event: any) => event.eventId === stripeEvent.id
    );

    if (isEventProcessed) {
        return {
            success: true,
            message: 'Event already processed',
            eventId: stripeEvent.id,
            enrollmentId: existingEnrollment._id
        };
    }

    // Legacy check for backward compatibility
    if (existingEnrollment.status === 'paid' && !isEventProcessed) {
        // Add this event to the tracking array
        await Enrollment.findByIdAndUpdate(existingEnrollment._id, {
            $push: {
                stripeEvents: {
                    eventId: stripeEvent.id,
                    eventType: stripeEvent.type,
                    processedAt: new Date(),
                    status: 'processed'
                }
            }
        });
        return {
            success: true,
            message: 'Payment already processed, event logged',
            eventId: stripeEvent.id,
            enrollmentId: existingEnrollment._id
        };
    }

    // Process the payment
    const updatedEnrollment = await Enrollment.findByIdAndUpdate(
        metadata.enrollmentId,
        {
            $set: {
                paymentId: session.payment_intent,
                status: 'paid',
                'verification.paymentVerified': true,
                updatedAt: new Date()
            },
            $push: {
                stripeEvents: {
                    eventId: stripeEvent.id,
                    eventType: stripeEvent.type,
                    processedAt: new Date(),
                    status: 'processed'
                }
            }
        },
        { new: true }
    );

    return {
        success: true,
        message: 'Payment processed',
        eventId: stripeEvent.id,
        enrollmentId: updatedEnrollment!._id
    };
};

describe('Webhook Idempotency Fix', () => {
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
        await Enrollment.deleteMany({ email: { $regex: /@test\.com$/ } });
    });

    it('should prevent duplicate webhook processing of same event', async () => {
        const eventId = 'evt_test_webhook_123';
        const enrollmentId = new mongoose.Types.ObjectId();

        // Create a test enrollment
        const enrollment = await Enrollment.create({
            _id: enrollmentId,
            courseId: 'test-course',
            email: 'test@test.com',
            paymentId: 'temp_payment_id',
            amount: 499,
            status: 'pending'
        });

        // Create mock Stripe event
        const stripeEvent = createMockStripeEvent(eventId, enrollmentId.toString());

        // First webhook call
        const response1 = await processWebhookEvent(stripeEvent);
        expect(response1.success).toBe(true);
        expect(response1.message).toBe('Payment processed');

        // Verify enrollment was updated
        const updatedEnrollment1 = await Enrollment.findById(enrollmentId);
        expect(updatedEnrollment1?.status).toBe('paid');
        expect(updatedEnrollment1?.stripeEvents).toHaveLength(1);
        expect(updatedEnrollment1?.stripeEvents?.[0].eventId).toBe(eventId);

        // Second webhook call with same event ID (duplicate)
        const response2 = await processWebhookEvent(stripeEvent);
        expect(response2.success).toBe(true);
        expect(response2.message).toBe('Event already processed');
        expect(response2.eventId).toBe(eventId);

        // Verify enrollment wasn't modified again
        const updatedEnrollment2 = await Enrollment.findById(enrollmentId);
        expect(updatedEnrollment2?.status).toBe('paid');
        expect(updatedEnrollment2?.stripeEvents).toHaveLength(1); // Still only 1 event

        console.log('✅ Idempotency test successful - duplicate event rejected');
    });

    it('should handle different events for same enrollment', async () => {
        const enrollmentId = new mongoose.Types.ObjectId();

        // Create a test enrollment
        await Enrollment.create({
            _id: enrollmentId,
            courseId: 'test-course',
            email: 'multitest@test.com',
            paymentId: 'temp_payment_id',
            amount: 499,
            status: 'pending'
        });

        // Process first event (checkout.session.completed)
        const event1 = createMockStripeEvent('evt_first_123', enrollmentId.toString());
        const response1 = await processWebhookEvent(event1);
        expect(response1.success).toBe(true);

        // Process different event for same enrollment
        const event2 = {
            ...createMockStripeEvent('evt_second_456', enrollmentId.toString()),
            type: 'payment_intent.succeeded'
        };
        const response2 = await processWebhookEvent(event2);
        expect(response2.success).toBe(true);
        expect(response2.message).toBe('Payment already processed, event logged');

        // Verify both events are tracked
        const enrollment = await Enrollment.findById(enrollmentId);
        expect(enrollment?.stripeEvents).toHaveLength(2);
        expect(enrollment?.stripeEvents?.map(e => e.eventId)).toContain('evt_first_123');
        expect(enrollment?.stripeEvents?.map(e => e.eventId)).toContain('evt_second_456');

        console.log('✅ Multiple events test successful - both events tracked');
    });

    it('should handle concurrent webhook requests', async () => {
        const eventId = 'evt_concurrent_789';
        const enrollmentId = new mongoose.Types.ObjectId();

        // Create a test enrollment
        await Enrollment.create({
            _id: enrollmentId,
            courseId: 'test-course',
            email: 'concurrent@test.com',
            paymentId: 'temp_payment_id',
            amount: 499,
            status: 'pending'
        });

        const stripeEvent = createMockStripeEvent(eventId, enrollmentId.toString());

        // Fire 5 concurrent webhook requests with same event ID
        const promises = Array(5).fill(null).map(() =>
            processWebhookEvent(stripeEvent)
                .then(result => ({ success: true, result }))
                .catch(error => ({ success: false, error: error.message }))
        );

        const results = await Promise.all(promises);

        // All should succeed
        const successCount = results.filter(r => r.success).length;
        expect(successCount).toBe(5);

        // But only ONE should actually process, others should be idempotent
        const processedCount = results.filter(r =>
            r.success && (r as any).result.message === 'Payment processed'
        ).length;
        const duplicateCount = results.filter(r =>
            r.success && (r as any).result.message === 'Event already processed'
        ).length;

        expect(processedCount).toBe(1);
        expect(duplicateCount).toBe(4);

        // Verify only one event in database
        const enrollment = await Enrollment.findById(enrollmentId);
        expect(enrollment?.stripeEvents).toHaveLength(1);
        expect(enrollment?.status).toBe('paid');

        console.log('✅ Concurrent webhook test successful', {
            totalRequests: 5,
            processed: processedCount,
            duplicates: duplicateCount,
            eventsStored: enrollment?.stripeEvents?.length
        });
    });

    it('should clean up old events', async () => {
        const enrollmentId = new mongoose.Types.ObjectId();

        // Create enrollment with old events
        const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
        const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

        await Enrollment.create({
            _id: enrollmentId,
            courseId: 'test-course',
            email: 'cleanup@test.com',
            paymentId: 'payment_123',
            amount: 499,
            status: 'paid',
            stripeEvents: [
                {
                    eventId: 'evt_old_1',
                    eventType: 'checkout.session.completed',
                    processedAt: oldDate,
                    status: 'processed'
                },
                {
                    eventId: 'evt_old_2',
                    eventType: 'payment_intent.succeeded',
                    processedAt: oldDate,
                    status: 'processed'
                },
                {
                    eventId: 'evt_recent_1',
                    eventType: 'checkout.session.completed',
                    processedAt: recentDate,
                    status: 'processed'
                }
            ]
        });

        // Clean up events older than 30 days
        const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        await Enrollment.updateMany(
            { 'stripeEvents.processedAt': { $lt: cutoffDate } },
            {
                $pull: {
                    stripeEvents: {
                        processedAt: { $lt: cutoffDate }
                    }
                }
            }
        );

        // Verify old events were removed, recent events kept
        const enrollment = await Enrollment.findById(enrollmentId);
        expect(enrollment?.stripeEvents).toHaveLength(1);
        expect(enrollment?.stripeEvents?.[0].eventId).toBe('evt_recent_1');

        console.log('✅ Event cleanup test successful - old events removed');
    });
});