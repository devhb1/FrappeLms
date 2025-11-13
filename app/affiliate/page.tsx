'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, Users, ExternalLink, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SiteHeader } from '@/components/site-header';

/**
 * Affiliate Landing Page
 * 
 * Smart routing based on user status:
 * - Not authenticated → Show affiliate program info + login prompt
 * - Authenticated but not affiliate → Redirect to registration
 * - Authenticated and is affiliate → Redirect to dashboard
 */
export default function AffiliatePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [checking, setChecking] = useState(true);
    const [isAffiliate, setIsAffiliate] = useState(false);

    useEffect(() => {
        if (status === 'loading') return;

        if (!session) {
            // Not authenticated - show landing page
            setChecking(false);
            return;
        }

        // Authenticated - check affiliate status
        checkAffiliateStatus();
    }, [session, status, router]);

    const checkAffiliateStatus = async () => {
        try {
            const response = await fetch('/api/affiliate/status');
            const data = await response.json();

            if (data.isAffiliate) {
                // User is already an affiliate, redirect to dashboard
                router.push('/affiliate-dashboard');
            } else {
                // User is not an affiliate, redirect to registration
                router.push('/affiliate-registration');
            }
        } catch (error) {
            console.error('Error checking affiliate status:', error);
            // On error, redirect to registration as fallback
            router.push('/affiliate-registration');
        }
    };

    const handleGetStarted = () => {
        if (session) {
            // Already authenticated, check status again
            checkAffiliateStatus();
        } else {
            // Not authenticated, redirect to signin with callback
            router.push('/signin?callbackUrl=/affiliate');
        }
    };

    // Loading state while checking authentication/status
    if (status === 'loading' || checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-600 dark:text-orange-400" />
                    <p className="text-muted-foreground">Checking your affiliate status...</p>
                </div>
            </div>
        );
    }

    // Show landing page for non-authenticated users
    return (
        <>
            <SiteHeader />
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
                <div className="container mx-auto px-4 py-16">
                    {/* Hero Section */}
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center justify-center p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full mb-6">
                            <Users className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                            Join Our <span className="text-orange-600 dark:text-orange-400">Affiliate Program</span>
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                            Earn 10% commission on every successful course enrollment through your referral link.
                            Help others learn while building your passive income stream.
                        </p>
                        <Button
                            size="lg"
                            onClick={handleGetStarted}
                            className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 text-white px-8 py-3 text-lg"
                        >
                            Get Started <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>

                    {/* Features Grid */}
                    <div className="grid md:grid-cols-3 gap-8 mb-16">
                        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur border-0 shadow-lg">
                            <CardHeader>
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg w-fit mb-4">
                                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                </div>
                                <CardTitle className="text-gray-900 dark:text-white">10% Commission</CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-300">
                                    Earn 10% on every course sale through your referral link
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur border-0 shadow-lg">
                            <CardHeader>
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg w-fit mb-4">
                                    <ExternalLink className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <CardTitle className="text-gray-900 dark:text-white">Easy Sharing</CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-300">
                                    Get your unique referral link and start sharing immediately
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur border-0 shadow-lg">
                            <CardHeader>
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg w-fit mb-4">
                                    <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <CardTitle className="text-gray-900 dark:text-white">Real-time Tracking</CardTitle>
                                <CardDescription className="text-gray-600 dark:text-gray-300">
                                    Monitor your referrals and earnings in your dashboard
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </div>

                    {/* How It Works */}
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-12">
                            How It Works
                        </h2>
                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">1</span>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Sign Up</h3>
                                <p className="text-gray-600 dark:text-gray-300">
                                    Register as an affiliate and set up your payment method
                                </p>
                            </div>

                            <div className="text-center">
                                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">2</span>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Share</h3>
                                <p className="text-gray-600 dark:text-gray-300">
                                    Share your unique referral link with your audience
                                </p>
                            </div>

                            <div className="text-center">
                                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">3</span>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Earn</h3>
                                <p className="text-gray-600 dark:text-gray-300">
                                    Earn 10% commission for every successful enrollment
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* CTA Section */}
                    <Card className="bg-gradient-to-r from-orange-600 to-orange-700 border-0 shadow-xl">
                        <CardContent className="p-8 text-center">
                            <h2 className="text-3xl font-bold text-white mb-4">
                                Ready to Start Earning?
                            </h2>
                            <p className="text-orange-100 mb-6 text-lg max-w-2xl mx-auto">
                                Join hundreds of affiliates who are already earning commissions by helping others learn new skills.
                            </p>
                            <Button
                                size="lg"
                                variant="secondary"
                                onClick={handleGetStarted}
                                className="bg-white text-orange-600 hover:bg-gray-100 px-8 py-3 text-lg"
                            >
                                {session ? 'Continue to Registration' : 'Sign Up Now'}
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}