/**
 * ===============================
 * FRAPPE LMS RETRY QUEUE TEST
 * ===============================
 * 
 * This test validates the FrappeLMS retry queue system functionality
 * including job creation, processing, and failure handling.
 * 
 * Note: These tests require a Jest testing environment setup.
 * Run with: npm test or jest
 */

import { Types } from 'mongoose';
import connectToDatabase from '@/lib/db';
import { RetryJob } from '@/lib/models/retry-job';

describe('FrappeLMS Retry Queue System', () => {
    beforeEach(async () => {
        // Connect to test database
        await connectToDatabase();

        // Clean up test data
        await RetryJob.deleteMany({});
    });

    afterAll(async () => {
        // Cleanup after tests
        await RetryJob.deleteMany({});
    });

    describe('RetryJob Model - Basic Operations', () => {
        it('should create a retry job with correct defaults', async () => {
            const enrollmentId = new Types.ObjectId();
            const payload = {
                user_email: 'test@example.com',
                course_id: 'test-course-123',
                paid_status: true,
                payment_id: 'pi_test123',
                amount: 99.99,
                currency: 'USD'
            };

            const job = await RetryJob.create({
                jobType: 'frappe_enrollment',
                enrollmentId,
                payload
            });

            expect(job.jobType).toBe('frappe_enrollment');
            expect(job.status).toBe('pending');
            expect(job.attempts).toBe(0);
            expect(job.enrollmentId).toEqual(enrollmentId);
            expect(job.payload.user_email).toBe('test@example.com');
            expect(job.payload.course_id).toBe('test-course-123');
            expect(job.nextRetryAt).toBeTruthy();
        });

        it('should create multiple retry jobs', async () => {
            const enrollmentIds = [new Types.ObjectId(), new Types.ObjectId()];

            const jobs = await RetryJob.create([
                {
                    jobType: 'frappe_enrollment',
                    enrollmentId: enrollmentIds[0],
                    payload: {
                        user_email: 'user1@test.com',
                        course_id: 'course-1',
                        paid_status: true,
                        payment_id: 'pi_001',
                        amount: 50.00
                    }
                },
                {
                    jobType: 'frappe_enrollment',
                    enrollmentId: enrollmentIds[1],
                    payload: {
                        user_email: 'user2@test.com',
                        course_id: 'course-2',
                        paid_status: true,
                        payment_id: 'pi_002',
                        amount: 75.00
                    }
                }
            ]);

            expect(jobs).toHaveLength(2);
            expect(jobs[0].jobType).toBe('frappe_enrollment');
            expect(jobs[1].jobType).toBe('frappe_enrollment');
            expect(jobs[0].status).toBe('pending');
            expect(jobs[1].status).toBe('pending');
        });

        it('should calculate next retry time with exponential backoff', async () => {
            const enrollmentId = new Types.ObjectId();
            const job = await RetryJob.create({
                jobType: 'frappe_enrollment',
                enrollmentId,
                payload: {
                    user_email: 'retry@test.com',
                    course_id: 'test-course',
                    paid_status: true,
                    payment_id: 'pi_retry',
                    amount: 100.00
                }
            });

            // Test exponential backoff calculation
            const initialTime = new Date();
            job.attempts = 1;
            const nextRetry = job.calculateNextRetry();

            expect(nextRetry).toBeTruthy();
            expect(nextRetry.getTime()).toBeGreaterThan(initialTime.getTime());

            // Should be approximately 2 minutes (with jitter)
            const expectedDelay = 2 * 60 * 1000; // 2 minutes in ms
            const actualDelay = nextRetry.getTime() - Date.now();
            expect(actualDelay).toBeGreaterThan(expectedDelay * 0.8); // Allow for jitter
            expect(actualDelay).toBeLessThan(expectedDelay * 1.2);
        });
    });

    describe('Job Processing - Static Methods', () => {
        it('should claim next available job atomically', async () => {
            // Create test jobs
            const enrollmentId = new Types.ObjectId();
            await RetryJob.create({
                jobType: 'frappe_enrollment',
                enrollmentId,
                payload: {
                    user_email: 'claim@test.com',
                    course_id: 'claimable-course',
                    paid_status: true,
                    payment_id: 'pi_claim',
                    amount: 150.00
                },
                nextRetryAt: new Date(Date.now() - 1000) // Ready for retry
            });

            const workerId = 'test-worker-1';
            const claimedJob = await RetryJob.claimNextJob(workerId);

            expect(claimedJob).toBeTruthy();
            expect(claimedJob!.status).toBe('processing');
            expect(claimedJob!.workerNodeId).toBe(workerId);
            expect(claimedJob!.processingStartedAt).toBeTruthy();
            expect(claimedJob!.attempts).toBe(1); // Incremented during claim
        });

        it('should not claim jobs scheduled for future', async () => {
            const enrollmentId = new Types.ObjectId();
            await RetryJob.create({
                jobType: 'frappe_enrollment',
                enrollmentId,
                payload: {
                    user_email: 'future@test.com',
                    course_id: 'future-course',
                    paid_status: true,
                    payment_id: 'pi_future',
                    amount: 200.00
                },
                nextRetryAt: new Date(Date.now() + 60000) // 1 minute in future
            });

            const claimedJob = await RetryJob.claimNextJob('test-worker');
            expect(claimedJob).toBeNull();
        });

        it('should release stuck jobs', async () => {
            const enrollmentId = new Types.ObjectId();
            const stuckTime = new Date(Date.now() - 600000); // 10 minutes ago

            await RetryJob.create({
                jobType: 'frappe_enrollment',
                enrollmentId,
                payload: {
                    user_email: 'stuck@test.com',
                    course_id: 'stuck-course',
                    paid_status: true,
                    payment_id: 'pi_stuck',
                    amount: 75.00
                },
                status: 'processing',
                processingStartedAt: stuckTime,
                processingTimeout: new Date(Date.now() - 60000), // Expired
                workerNodeId: 'stuck-worker'
            });

            const releasedCount = await RetryJob.releaseStuckJobs();
            expect(releasedCount).toBe(1);

            const job = await RetryJob.findOne({ 'payload.user_email': 'stuck@test.com' });
            expect(job!.status).toBe('pending');
        });
    });

    describe('Queue Statistics', () => {
        it('should get correct queue statistics', async () => {
            const enrollmentIds = Array.from({ length: 5 }, () => new Types.ObjectId());

            // Create test jobs with different statuses
            await RetryJob.create([
                {
                    jobType: 'frappe_enrollment',
                    enrollmentId: enrollmentIds[0],
                    payload: { user_email: 'pending1@test.com', course_id: 'course-1', paid_status: true, payment_id: 'pi_1', amount: 50 },
                    status: 'pending'
                },
                {
                    jobType: 'frappe_enrollment',
                    enrollmentId: enrollmentIds[1],
                    payload: { user_email: 'pending2@test.com', course_id: 'course-2', paid_status: true, payment_id: 'pi_2', amount: 60 },
                    status: 'pending'
                },
                {
                    jobType: 'frappe_enrollment',
                    enrollmentId: enrollmentIds[2],
                    payload: { user_email: 'processing@test.com', course_id: 'course-3', paid_status: true, payment_id: 'pi_3', amount: 70 },
                    status: 'processing'
                },
                {
                    jobType: 'frappe_enrollment',
                    enrollmentId: enrollmentIds[3],
                    payload: { user_email: 'completed@test.com', course_id: 'course-4', paid_status: true, payment_id: 'pi_4', amount: 80 },
                    status: 'completed'
                },
                {
                    jobType: 'frappe_enrollment',
                    enrollmentId: enrollmentIds[4],
                    payload: { user_email: 'failed@test.com', course_id: 'course-5', paid_status: true, payment_id: 'pi_5', amount: 90 },
                    status: 'failed'
                }
            ]);

            const stats = await RetryJob.getQueueStats();

            expect(stats.pending).toBe(2);
            expect(stats.processing).toBe(1);
            expect(stats.completed).toBe(1);
            expect(stats.failed).toBe(1);
            expect(stats.total).toBe(5);
        });
    });

    describe('Job Status Updates', () => {
        it('should update job to completed status', async () => {
            const enrollmentId = new Types.ObjectId();
            const job = await RetryJob.create({
                jobType: 'frappe_enrollment',
                enrollmentId,
                payload: {
                    user_email: 'success@test.com',
                    course_id: 'success-course',
                    paid_status: true,
                    payment_id: 'pi_success',
                    amount: 120.00
                },
                status: 'processing'
            });

            // Simulate successful completion
            await RetryJob.findByIdAndUpdate(job._id, {
                status: 'completed',
                completedAt: new Date()
            });

            const updatedJob = await RetryJob.findById(job._id);
            expect(updatedJob!.status).toBe('completed');
            expect(updatedJob!.completedAt).toBeTruthy();
        });

        it('should update job to failed status after max attempts', async () => {
            const enrollmentId = new Types.ObjectId();
            const job = await RetryJob.create({
                jobType: 'frappe_enrollment',
                enrollmentId,
                payload: {
                    user_email: 'failed@test.com',
                    course_id: 'failed-course',
                    paid_status: true,
                    payment_id: 'pi_failed',
                    amount: 130.00
                },
                status: 'processing',
                attempts: 5,
                maxAttempts: 5
            });

            // Simulate failure at max attempts
            await RetryJob.findByIdAndUpdate(job._id, {
                status: 'failed',
                lastError: 'Max attempts reached',
                updatedAt: new Date()
            });

            const updatedJob = await RetryJob.findById(job._id);
            expect(updatedJob!.status).toBe('failed');
            expect(updatedJob!.lastError).toBe('Max attempts reached');
            expect(updatedJob!.attempts).toBe(5);
        });
    });

    describe('Job Instance Methods', () => {
        it('should get job summary', async () => {
            const enrollmentId = new Types.ObjectId();
            const job = await RetryJob.create({
                jobType: 'frappe_enrollment',
                enrollmentId,
                payload: {
                    user_email: 'summary@test.com',
                    course_id: 'summary-course',
                    paid_status: true,
                    payment_id: 'pi_summary',
                    amount: 140.00
                }
            });

            const summary = job.getSummary();

            expect(summary.id).toEqual(job._id);
            expect(summary.jobType).toBe('frappe_enrollment');
            expect(summary.enrollmentId).toEqual(enrollmentId);
            expect(summary.status).toBe('pending');
            expect(summary.attempts).toBe(0);
            expect(summary.timeSinceCreation).toBeGreaterThan(0);
        });

        it('should check if job is expired', async () => {
            const enrollmentId = new Types.ObjectId();
            const job = await RetryJob.create({
                jobType: 'frappe_enrollment',
                enrollmentId,
                payload: {
                    user_email: 'expired@test.com',
                    course_id: 'expired-course',
                    paid_status: true,
                    payment_id: 'pi_expired',
                    amount: 160.00
                },
                status: 'processing',
                processingTimeout: new Date(Date.now() - 60000) // Expired 1 minute ago
            });

            expect(job.isExpired()).toBe(true);

            // Test non-expired job
            job.processingTimeout = new Date(Date.now() + 60000); // Expires in 1 minute
            expect(job.isExpired()).toBe(false);
        });
    });
});