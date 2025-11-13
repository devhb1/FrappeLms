'use client';

import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { GraduationCap, Users, ArrowRight, Shield } from "lucide-react";
import Link from "next/link";

/**
 * Grant and Affiliate Buttons Component
 * 
 * Displays two action buttons at the bottom of homepage:
 * 1. "Apply for Grant" - Public access, redirects to /grants
 * 2. "Become Affiliate" - Requires authentication, redirects to /affiliate
 * 
 * Features:
 * - Authentication check for affiliate button
 * - Professional design matching site theme
 * - Clear call-to-action messaging
 * - Responsive layout
 */
export function GrantAffiliateButtons() {
    const { data: session } = useSession();
    const router = useRouter();

    const handleAffiliateClick = () => {
        if (session) {
            // User is authenticated, go to affiliate dashboard
            router.push('/affiliate');
        } else {
            // Not authenticated, redirect to signin with callback
            router.push('/signin?callbackUrl=/affiliate');
        }
    };

    return (
        <section className="py-16 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-gray-800 dark:to-gray-900 transition-colors">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    {/* Section Header */}
                    <div className="text-center mb-12">
                        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                            Ready to Get Started?
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                            Choose your path to blockchain education and financial empowerment
                        </p>
                    </div>

                    {/* Action Buttons Grid */}
                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {/* Grant Application Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-orange-200 dark:border-gray-700">
                            <div className="text-center space-y-6">
                                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto">
                                    <GraduationCap className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                                </div>

                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                        Apply for Grant
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                                        Get 100% funding for your blockchain education. Submit your application and get approved for a full scholarship to any course.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                                        <Shield className="w-4 h-4 mr-2" />
                                        <span>No login required</span>
                                    </div>

                                    <Button
                                        asChild
                                        size="lg"
                                        className="w-full bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 text-white font-semibold py-3 transition-all duration-300 hover:scale-105"
                                    >
                                        <Link href="/grants">
                                            Apply for Grant
                                            <ArrowRight className="ml-2 h-5 w-5" />
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Affiliate Program Card */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-blue-200 dark:border-gray-700">
                            <div className="text-center space-y-6">
                                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
                                    <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                </div>

                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                        Become Affiliate
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                                        Earn commissions by referring students. Get your unique referral link and track your earnings in real-time.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                                        <Shield className="w-4 h-4 mr-2" />
                                        <span>{session ? 'Access your dashboard' : 'Login required'}</span>
                                    </div>

                                    <Button
                                        onClick={handleAffiliateClick}
                                        size="lg"
                                        className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-semibold py-3 transition-all duration-300 hover:scale-105"
                                    >
                                        {session ? 'Go to Dashboard' : 'Get Started'}
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Info */}
                    <div className="mt-12 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            🎯 <strong>Grant Program:</strong> Limited spots available each month
                            &nbsp;&nbsp;•&nbsp;&nbsp;
                            💰 <strong>Affiliate Program:</strong> Earn up to 10% commission per referral
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
