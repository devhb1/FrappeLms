import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { Affiliate } from '@/lib/models/affiliate';
import { User } from '@/lib/models/user';
import { sendEmail } from '@/lib/emails';
import { logger } from '@/lib/utils/logger';
import { createSuccessResponse, createErrorResponse, HTTP_STATUS } from '@/lib/types/api';

export async function POST(request: NextRequest) {
    const requestId = crypto.randomUUID();

    try {
        logger.info('Affiliate registration started', { requestId });

        // Check authentication
        const session = await getServerSession(authOptions);
        logger.debug('Session retrieved', {
            requestId,
            hasSession: !!session,
            userEmail: session?.user?.email ? '[EMAIL_PROVIDED]' : 'none'
        });

        if (!session || !session.user) {
            logger.warn('Unauthorized affiliate registration attempt', { requestId });
            return NextResponse.json(
                createErrorResponse('Authentication required', 'No valid session found', requestId),
                { status: HTTP_STATUS.UNAUTHORIZED }
            );
        }

        const requestBody = await request.json();
        logger.debug('Request body received', {
            requestId,
            payoutMode: requestBody.payoutMode,
            hasPaymentMethod: !!requestBody.paymentMethod
        });

        const { payoutMode, paymentMethod } = requestBody;

        // Validate required fields
        if (!payoutMode || !paymentMethod) {
            logger.warn('Missing required fields in affiliate registration', {
                requestId,
                missingFields: {
                    payoutMode: !payoutMode,
                    paymentMethod: !paymentMethod
                }
            });
            return NextResponse.json(
                createErrorResponse('Validation failed', 'Payout mode and payment method are required', requestId),
                { status: HTTP_STATUS.BAD_REQUEST }
            );
        }

        logger.debug('Connecting to database', { requestId });
        await connectToDatabase();

        // Check if user exists and is verified
        const user = await User.findOne({ email: session.user.email?.toLowerCase() });
        logger.debug('User lookup completed', {
            requestId,
            userFound: !!user,
            userVerified: user?.isVerified || false
        });

        if (!user || !user.isVerified) {
            logger.warn('Unverified user attempted affiliate registration', {
                requestId,
                userExists: !!user,
                userVerified: user?.isVerified || false
            });
            return NextResponse.json(
                createErrorResponse('User verification required', 'User must be verified to become an affiliate', requestId),
                { status: HTTP_STATUS.BAD_REQUEST }
            );
        }

        // Check if already an affiliate
        const existingAffiliate = await Affiliate.findOne({
            email: session.user.email?.toLowerCase()
        });

        if (existingAffiliate) {
            logger.warn('User already registered as affiliate', {
                requestId,
                email: '[EMAIL_REDACTED]'
            });
            return NextResponse.json(
                createErrorResponse('Duplicate registration', 'User is already registered as an affiliate', requestId),
                { status: HTTP_STATUS.CONFLICT }
            );
        }

        // Simple validation for required fields
        let validationError = '';

        if (payoutMode === 'paypal') {
            if (!paymentMethod.paypalEmail) {
                validationError = 'PayPal email is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paymentMethod.paypalEmail)) {
                validationError = 'Invalid PayPal email format';
            }
        } else if (payoutMode === 'bank') {
            if (!paymentMethod.bankName) validationError = 'Bank name is required';
            else if (!paymentMethod.accountNumber) validationError = 'Account number is required';
            else if (!paymentMethod.routingNumber) validationError = 'Routing number is required';
            else if (!paymentMethod.accountHolderName) validationError = 'Account holder name is required';
        } else if (payoutMode === 'crypto') {
            if (!paymentMethod.cryptoWallet) validationError = 'Crypto wallet address is required';
            else if (!paymentMethod.cryptoCurrency) validationError = 'Cryptocurrency type is required';
        }

        if (validationError) {
            logger.warn('Affiliate registration validation failed', {
                requestId,
                error: validationError,
                payoutMode
            });
            return NextResponse.json(
                createErrorResponse('Validation failed', validationError, requestId),
                { status: HTTP_STATUS.BAD_REQUEST }
            );
        }

        logger.debug('Creating affiliate record', { requestId });

        // Structure payment method correctly for the model
        const structuredPaymentMethod = {
            type: payoutMode,
            ...(payoutMode === 'paypal' && { paypalEmail: paymentMethod.paypalEmail }),
            ...(payoutMode === 'bank' && {
                bankName: paymentMethod.bankName,
                accountNumber: paymentMethod.accountNumber,
                routingNumber: paymentMethod.routingNumber,
                accountHolderName: paymentMethod.accountHolderName,
                swiftCode: paymentMethod.swiftCode || ''
            }),
            ...(payoutMode === 'crypto' && {
                cryptoWallet: paymentMethod.cryptoWallet,
                cryptoCurrency: paymentMethod.cryptoCurrency
            })
        };

        // Create new affiliate
        const affiliate = await Affiliate.create({
            // affiliateId will be auto-generated by the schema default function
            userId: user._id,
            email: session.user.email!.toLowerCase(),
            name: user.username || user.name || session.user.email!.split('@')[0],
            status: 'active',
            commissionRate: 10, // Default 10% commission
            payoutMode,
            paymentMethod: structuredPaymentMethod,
            stats: {
                totalReferrals: 0,
                conversionRate: 0,
                coursesSold: new Map()
            },
            totalPaid: 0,
            pendingCommissions: 0
        });

        logger.success('Affiliate created successfully', {
            requestId,
            affiliateId: affiliate.affiliateId,
            email: '[EMAIL_REDACTED]'
        });

        // Generate affiliate link
        const affiliateLink = affiliate.generateAffiliateLink();

        // Send welcome email
        try {
            await sendEmail.welcome(
                affiliate.email,
                affiliate.name
            );
            logger.info('Welcome email sent successfully', { requestId });
        } catch (emailError: any) {
            logger.warn('Failed to send welcome email', {
                requestId,
                error: emailError?.message || 'Unknown email error'
            });
            // Don't fail registration if email fails
        }

        return NextResponse.json(
            createSuccessResponse('Successfully registered as affiliate!', {
                id: affiliate._id,
                affiliateId: affiliate.affiliateId,
                email: affiliate.email,
                name: affiliate.name,
                status: affiliate.status,
                commissionRate: affiliate.commissionRate,
                affiliateLink,
                payoutMode: affiliate.payoutMode,
                createdAt: affiliate.createdAt
            }, requestId),
            { status: HTTP_STATUS.CREATED }
        );

    } catch (error: any) {
        logger.error('Affiliate registration failed', {
            requestId,
            error: error.message,
            errorName: error.name,
            errorCode: error.code,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });

        // Log more specific error details for debugging
        if (error.name === 'ValidationError') {
            logger.error('Mongoose validation error details', {
                requestId,
                validationErrors: error.errors
            });
        }

        return NextResponse.json(
            createErrorResponse('Registration failed', `Internal server error during registration: ${error.message}`, requestId),
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
    }
}
