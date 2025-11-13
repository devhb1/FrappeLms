import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { Affiliate } from '@/lib/models/affiliate';

export async function PUT(request: NextRequest) {
    try {
        // Check if user is authenticated
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json(
                { success: false, message: 'Authentication required' },
                { status: 401 }
            );
        }

        // Connect to database
        await connectToDatabase();

        // Parse request body
        const { payoutMode, paymentMethod } = await request.json();

        // Validate input
        if (!payoutMode || !paymentMethod) {
            return NextResponse.json(
                { success: false, message: 'Payout mode and payment method are required' },
                { status: 400 }
            );
        }

        // Validate payment method based on type
        let validatedPaymentMethod;
        switch (payoutMode) {
            case 'paypal':
                if (!paymentMethod.paypalEmail || !paymentMethod.paypalEmail.includes('@')) {
                    return NextResponse.json(
                        { success: false, message: 'Valid PayPal email is required' },
                        { status: 400 }
                    );
                }
                validatedPaymentMethod = {
                    type: 'paypal',
                    paypalEmail: paymentMethod.paypalEmail
                };
                break;

            case 'bank':
                if (!paymentMethod.bankName || !paymentMethod.accountNumber ||
                    !paymentMethod.routingNumber || !paymentMethod.accountHolderName) {
                    return NextResponse.json(
                        { success: false, message: 'All bank details are required' },
                        { status: 400 }
                    );
                }
                validatedPaymentMethod = {
                    type: 'bank',
                    bankName: paymentMethod.bankName,
                    accountNumber: paymentMethod.accountNumber,
                    routingNumber: paymentMethod.routingNumber,
                    accountHolderName: paymentMethod.accountHolderName,
                    swiftCode: paymentMethod.swiftCode || undefined
                };
                break;

            case 'crypto':
                if (!paymentMethod.cryptoWallet || paymentMethod.cryptoWallet.length < 10) {
                    return NextResponse.json(
                        { success: false, message: 'Valid crypto wallet address is required' },
                        { status: 400 }
                    );
                }
                validatedPaymentMethod = {
                    type: 'crypto',
                    cryptoWallet: paymentMethod.cryptoWallet,
                    cryptoCurrency: paymentMethod.cryptoCurrency || 'bitcoin'
                };
                break;

            default:
                return NextResponse.json(
                    { success: false, message: 'Invalid payout mode' },
                    { status: 400 }
                );
        }

        // Find and update affiliate
        const affiliate = await Affiliate.findOneAndUpdate(
            { email: session.user.email.toLowerCase() },
            {
                payoutMode: payoutMode,
                paymentMethod: validatedPaymentMethod
            },
            { new: true, runValidators: true }
        );

        if (!affiliate) {
            return NextResponse.json(
                { success: false, message: 'Affiliate account not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Payment method updated successfully',
            affiliate: {
                _id: affiliate._id,
                email: affiliate.email,
                name: affiliate.name,
                payoutMode: affiliate.payoutMode,
                paymentMethod: affiliate.paymentMethod,
                status: affiliate.status
            }
        });

    } catch (error: any) {
        console.error('Payment method update error:', error);

        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}
