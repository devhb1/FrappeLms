'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, RefreshCw, CheckCircle } from 'lucide-react';
import Link from 'next/link';

function VerifyEmailForm() {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [countdown, setCountdown] = useState(0);
    // This page handles email verification for users after registration.
    // It provides a form for entering a 6-digit OTP sent to the user's email.
    // Features:
    // - OTP input with auto-focus and paste support
    // - Resend OTP functionality with countdown
    // - Success/error messages and redirects
    // - Suspense fallback for loading state

    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';

    // Refs for OTP inputs
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Countdown timer for resend button
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleOtpChange = (index: number, value: string) => {
        // Handle OTP input change and auto-focus next field
        if (value.length <= 1 && /^\d*$/.test(value)) {
            const newOtp = [...otp];
            newOtp[index] = value;
            setOtp(newOtp);
            setMessage({ type: '', text: '' }); // Clear message on input change

            // Auto-focus next input
            if (value && index < 5) {
                inputRefs.current[index + 1]?.focus();
            }
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        // Handle backspace to focus previous input
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        // Handle paste event to fill all OTP fields
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text').replace(/\D/g, '');
        if (pastedText.length === 6) {
            setOtp(pastedText.split(''));
            setMessage({ type: '', text: '' });
        }
    };

    const validateOtp = () => {
        // Validate OTP before submitting
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setMessage({ type: 'error', text: 'Please enter all 6 digits of the verification code' });
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        // Handle form submit for OTP verification
        e.preventDefault();

        if (!validateOtp()) return;

        setIsLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    otp: otp.join(''),
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({
                    type: 'success',
                    text: 'Email verified successfully! Redirecting to dashboard...'
                });

                // Redirect to sign in page with callback to dashboard
                setTimeout(() => {
                    router.push('/signin?callbackUrl=/dashboard&message=Email verified successfully. Please sign in.');
                }, 2000);
            } else {
                setMessage({ type: 'error', text: data.error || 'Verification failed' });

                // Clear OTP on error
                if (data.error === 'Invalid OTP' || data.error === 'OTP has expired') {
                    setOtp(['', '', '', '', '', '']);
                    inputRefs.current[0]?.focus();
                }
            }
        } catch (error) {
            console.error('Verification error:', error);
            setMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        // Handle resend OTP button click
        if (countdown > 0) return;

        setIsResending(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await fetch('/api/auth/resend-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({
                    type: 'success',
                    text: 'New verification code sent to your email!'
                });
                setCountdown(60); // 60 seconds countdown
                setOtp(['', '', '', '', '', '']); // Clear current OTP
                inputRefs.current[0]?.focus();
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to resend code' });
            }
        } catch (error) {
            console.error('Resend OTP error:', error);
            setMessage({ type: 'error', text: 'Network error. Please try again.' });
        } finally {
            setIsResending(false);
        }
    };

    // Redirect if no email provided
    useEffect(() => {
        // Redirect to registration if no email is provided
        if (!email) {
            router.push('/register');
        }
    }, [email, router]);

    if (!email) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">Redirecting to registration...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-2 text-center">
                    <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <Mail className="h-6 w-6 text-orange-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">Verify Your Email</CardTitle>
                    <CardDescription className="text-gray-600">
                        We've sent a 6-digit verification code to:
                        <br />
                        <span className="font-medium text-gray-900">{email}</span>
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* OTP Input */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">
                                Verification Code
                            </Label>
                            <div className="flex gap-2 justify-center">
                                {otp.map((digit, index) => (
                                    <Input
                                        key={index}
                                        ref={(el) => {
                                            inputRefs.current[index] = el;
                                        }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(index, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(index, e)}
                                        onPaste={index === 0 ? handlePaste : undefined}
                                        className="w-12 h-12 text-center text-lg font-semibold"
                                        disabled={isLoading}
                                    />
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 text-center">
                                Enter the 6-digit code from your email
                            </p>
                        </div>

                        {/* Message Alert */}
                        {message.text && (
                            <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
                                <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
                                    {message.type === 'success' && <CheckCircle className="h-4 w-4 inline mr-2" />}
                                    {message.text}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                            disabled={isLoading || otp.join('').length !== 6}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                'Verify Email'
                            )}
                        </Button>

                        {/* Resend Code */}
                        <div className="text-center space-y-2">
                            <p className="text-sm text-gray-600">
                                Didn't receive the code?
                            </p>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleResendOtp}
                                disabled={countdown > 0 || isResending}
                                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                                {isResending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : countdown > 0 ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Resend in {countdown}s
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Resend Code
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>

                    {/* Back to Registration */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Wrong email address?{' '}
                            <Link
                                href="/register"
                                className="font-medium text-orange-600 hover:text-orange-500 transition-colors"
                            >
                                Go back to registration
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Loading component for Suspense fallback
function VerifyEmailLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 px-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-2 text-center">
                    <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                        <Mail className="h-6 w-6 text-orange-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">Loading...</CardTitle>
                    <CardDescription className="text-gray-600">
                        Preparing email verification
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-200 rounded"></div>
                        <div className="flex gap-2 justify-center">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="w-12 h-12 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Main export with Suspense boundary
export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<VerifyEmailLoading />}>
            <VerifyEmailForm />
        </Suspense>
    );
}
