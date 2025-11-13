'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/utils-stripe';
import {
    CreditCard,
    Loader2,
    CheckCircle,
    ArrowLeft,
    Lock,
    Shield
} from 'lucide-react';

function CheckoutSimulationContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const courseId = searchParams.get('courseId') || '';
    const email = searchParams.get('email') || '';
    const price = parseFloat(searchParams.get('price') || '0');
    const title = searchParams.get('title') || '';

    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        if (!courseId || !email || !title) {
            toast({
                title: "Invalid Checkout Session",
                description: "Missing required checkout information. Redirecting to courses...",
                variant: "destructive"
            });
            setTimeout(() => router.push('/courses'), 2000);
        }
    }, [courseId, email, title, router, toast]);

    const [couponCode, setCouponCode] = useState("");
    const [error, setError] = useState("");

    const handleCheckout = async () => {
        setIsProcessing(true);
        setError("");
        try {
            const response = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    courseId,
                    email,
                    couponCode: couponCode.trim() || undefined,
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                setError(result.error || "Checkout failed");
                setIsProcessing(false);
                return;
            }
            if (result.directEnrollment) {
                setShowSuccess(true);
                toast({
                    title: "🎉 Enrollment Successful!",
                    description: "Your grant coupon was accepted. Redirecting to success...",
                    variant: "default"
                });
                setTimeout(() => {
                    router.push(result.redirectUrl || "/success");
                }, 3000);
            } else if (result.checkoutUrl) {
                window.location.href = result.checkoutUrl;
            } else {
                setError("Unexpected response from server.");
            }
        } catch (err) {
            setError("Network error. Please try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (showSuccess) {
        return (
            <div className="min-h-screen bg-background">
                <SiteHeader />
                <div className="container mx-auto px-4 py-20">
                    <div className="max-w-md mx-auto text-center">
                        <div className="mb-8">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Payment Successful!
                            </h1>
                            <p className="text-gray-600 dark:text-gray-300">
                                Your enrollment is being processed...
                            </p>
                        </div>

                        <Card>
                            <CardContent className="pt-6">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Course:</span>
                                        <span className="font-medium">{title}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Email:</span>
                                        <span className="font-medium">{email}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Amount:</span>
                                        <span className="font-medium">{formatPrice(price)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                            You will be redirected automatically...
                        </p>
                    </div>
                </div>
                <SiteFooter />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <SiteHeader />
            <div className="container mx-auto px-4 py-20">
                <div className="max-w-md mx-auto">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Complete Your Payment
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300">
                            Enter your grant coupon (if any) and proceed to payment.
                        </p>
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5" />
                                Order Summary
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white">
                                            {title}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Course ID: {courseId}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            {formatPrice(price)}
                                        </p>
                                    </div>
                                </div>
                                <hr className="border-gray-200 dark:border-gray-700" />
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Subtotal:</span>
                                        <span>{formatPrice(price)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Tax:</span>
                                        <span>$0.00</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Total:</span>
                                        <span>{formatPrice(price)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 text-blue-800 dark:text-blue-300">
                                        <Shield className="w-4 h-4" />
                                        <span className="text-sm font-medium">Enrollment Details</span>
                                    </div>
                                    <div className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                                        <p>• Email: {email}</p>
                                        <p>• Course access: Immediate after payment</p>
                                        <p>• Certificate: Available upon completion</p>
                                        <p>• Support: Lifetime access included</p>
                                    </div>
                                </div>
                                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 text-orange-800 dark:text-orange-300">
                                        <Lock className="w-4 h-4" />
                                        <span className="text-sm font-medium">Grant Coupon</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={couponCode}
                                        onChange={e => setCouponCode(e.target.value)}
                                        placeholder="Enter grant coupon code (if any)"
                                        className="w-full mt-2 px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        disabled={isProcessing}
                                    />
                                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                                        Enter your grant coupon to claim your Discount, or leave blank for paid checkout.
                                    </p>
                                </div>
                            </div>
                            {error && (
                                <div className="text-sm text-red-600 mb-2">{error}</div>
                            )}
                            <div className="space-y-3">
                                <Button
                                    onClick={handleCheckout}
                                    disabled={isProcessing}
                                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                                    size="lg"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard className="w-4 h-4 mr-2" />
                                            Proceed to Payment
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={() => router.back()}
                                    variant="outline"
                                    className="w-full"
                                    disabled={isProcessing}
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to Course
                                </Button>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1">
                                <p>🔒 Secure 256-bit SSL encryption</p>
                                <p>💳 Powered by Stripe</p>
                                <p>🛡️ Your payment information is safe</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <SiteFooter />
        </div>
    );
}

export default function CheckoutSimulationPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CheckoutSimulationContent />
        </Suspense>
    );
}
