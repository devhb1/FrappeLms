/**
 * API Route: Verify Frappe LMS User
 * 
 * Checks if user exists in Frappe LMS before allowing checkout.
 * This prevents payment failures by ensuring the user has a Frappe account.
 * 
 * POST /api/verify-frappe-user
 * Body: { email: string }
 * 
 * Returns:
 * - exists: true -> User can proceed with checkout
 * - exists: false -> Redirect to Frappe registration required
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkFrappeUserExists } from '@/lib/services/frappeLMS';
import ProductionLogger from '@/lib/utils/production-logger';
import { z } from 'zod';

// Request validation schema
const verifySchema = z.object({
    email: z.string().email('Valid email required').toLowerCase().trim()
});

export async function POST(request: NextRequest) {
    try {
        ProductionLogger.info('Received user verification request');

        // Parse and validate request body
        const body = await request.json();
        const { email } = verifySchema.parse(body);

        ProductionLogger.info('Verifying Frappe user', { email });

        // Check if user exists in Frappe LMS
        const result = await checkFrappeUserExists(email);

        if (!result.success) {
            ProductionLogger.error('User verification failed', {
                email,
                error: result.error
            });

            return NextResponse.json({
                error: 'Unable to verify user account. Please try again.',
                code: 'VERIFICATION_FAILED',
                details: result.error,
                retryable: true
            }, { status: 500 });
        }

        if (result.exists) {
            ProductionLogger.info('User verified in Frappe LMS', {
                email,
                username: result.user?.username,
                fullName: result.user?.full_name
            });

            return NextResponse.json({
                exists: true,
                verified: true,
                user: {
                    email: result.user?.email,
                    fullName: result.user?.full_name,
                    username: result.user?.username
                },
                message: 'Account verified! You can proceed with enrollment.'
            }, { status: 200 });
        } else {
            ProductionLogger.info('User not found in Frappe LMS', {
                email,
                registrationUrl: result.registration_url
            });

            return NextResponse.json({
                exists: false,
                verified: false,
                registrationUrl: result.registration_url,
                message: 'No account found with this email. Please create an account first.',
                action: 'REGISTER_REQUIRED'
            }, { status: 200 }); // 200 because it's a valid response, user just doesn't exist
        }

    } catch (error) {
        if (error instanceof z.ZodError) {
            ProductionLogger.warn('Invalid email format in verification request', {
                errors: error.errors
            });

            return NextResponse.json({
                error: 'Invalid email format. Please enter a valid email address.',
                code: 'VALIDATION_ERROR',
                details: error.errors,
                retryable: false
            }, { status: 400 });
        }

        ProductionLogger.error('Unexpected error in user verification', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });

        return NextResponse.json({
            error: 'Verification failed. Please try again or contact support.',
            code: 'INTERNAL_ERROR',
            retryable: true
        }, { status: 500 });
    }
}

// Optional: Add GET endpoint for testing
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({
            error: 'Email parameter required',
            usage: 'GET /api/verify-frappe-user?email=user@example.com'
        }, { status: 400 });
    }

    // Reuse POST logic
    return POST(
        new NextRequest(request.url, {
            method: 'POST',
            body: JSON.stringify({ email }),
            headers: { 'Content-Type': 'application/json' }
        })
    );
}
