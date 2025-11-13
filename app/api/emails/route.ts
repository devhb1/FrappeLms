import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, emailService } from '@/lib/emails';

// ===== SIMPLIFIED EMAIL API =====

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const email = searchParams.get('email');

    try {
        switch (action) {
            case 'test':
                if (!email) {
                    return NextResponse.json({
                        success: false,
                        message: 'Email parameter required'
                    }, { status: 400 });
                }

                const testResult = await sendEmail.test(email);
                return NextResponse.json({
                    success: testResult,
                    message: testResult ? 'Test email sent!' : 'Test email failed'
                });

            default:
                return NextResponse.json({
                    success: true,
                    message: 'MaalEdu Email API',
                    usage: {
                        test: '/api/emails?action=test&email=your@email.com',
                        send: 'POST /api/emails with action and data'
                    }
                });
        }
    } catch (error) {
        console.error('❌ Email API error:', error);
        return NextResponse.json({
            success: false,
            message: 'Internal server error'
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { action, ...data } = await request.json();

        switch (action) {
            case 'otp':
                const { email, userName, otp } = data;
                if (!email || !userName || !otp) {
                    return NextResponse.json({
                        success: false,
                        message: 'Missing: email, userName, otp'
                    }, { status: 400 });
                }

                const otpResult = await sendEmail.otp(email, userName, otp);
                return NextResponse.json({
                    success: otpResult,
                    message: otpResult ? 'OTP email sent!' : 'Failed to send OTP'
                });

            case 'welcome':
                const { email: welcomeEmail, userName: welcomeUserName } = data;
                if (!welcomeEmail || !welcomeUserName) {
                    return NextResponse.json({
                        success: false,
                        message: 'Missing: email, userName'
                    }, { status: 400 });
                }

                const welcomeResult = await sendEmail.welcome(welcomeEmail, welcomeUserName);
                return NextResponse.json({
                    success: welcomeResult,
                    message: welcomeResult ? 'Welcome email sent!' : 'Failed to send welcome email'
                });

            case 'grant':
                const { email: grantEmail, userName: grantUserName, courseTitle, approved, couponCode, reason } = data;
                if (!grantEmail || !grantUserName || !courseTitle || approved === undefined) {
                    return NextResponse.json({
                        success: false,
                        message: 'Missing: email, userName, courseTitle, approved'
                    }, { status: 400 });
                }

                let grantResult;
                if (approved) {
                    if (!couponCode) {
                        return NextResponse.json({
                            success: false,
                            message: 'Coupon code required for approval'
                        }, { status: 400 });
                    }
                    grantResult = await sendEmail.grantApproval(grantEmail, grantUserName, courseTitle, couponCode);
                } else {
                    grantResult = await sendEmail.grantRejection(grantEmail, grantUserName, courseTitle, reason);
                }

                return NextResponse.json({
                    success: grantResult,
                    message: grantResult ? 'Grant email sent!' : 'Failed to send grant email'
                });

            case 'payout':
                const {
                    email: payoutEmail,
                    affiliateName,
                    amount,
                    payoutMethod,
                    transactionId,
                    commissionsCount
                } = data;

                if (!payoutEmail || !affiliateName || !amount || !payoutMethod) {
                    return NextResponse.json({
                        success: false,
                        message: 'Missing: email, affiliateName, amount, payoutMethod'
                    }, { status: 400 });
                }

                const payoutResult = await sendEmail.affiliatePayout(
                    payoutEmail,
                    affiliateName,
                    amount,
                    payoutMethod,
                    transactionId,
                    commissionsCount
                );
                return NextResponse.json({
                    success: payoutResult,
                    message: payoutResult ? 'Payout email sent!' : 'Failed to send payout email'
                });

            default:
                return NextResponse.json({
                    success: false,
                    message: 'Unknown action. Use: otp, welcome, grant, payout'
                }, { status: 400 });
        }
    } catch (error) {
        console.error('❌ Email API error:', error);
        return NextResponse.json({
            success: false,
            message: 'Internal server error'
        }, { status: 500 });
    }
}
