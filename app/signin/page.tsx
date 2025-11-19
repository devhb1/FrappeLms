'use client';

import { useState, Suspense } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Lock, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * SignIn Page Component
 * 
 * NextAuth-compatible signin page for admin and affiliate access.
 * Redirects users based on their role after successful authentication.
 * 
 * Features:
 * - NextAuth credentials authentication
 * - Role-based redirection (admin → /admin/dashboard, user → /affiliate)
 * - Professional form validation
 * - Error handling with user feedback
 * - Responsive design
 */

function SignInForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            setError('Please fill in all fields');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const result = await signIn('credentials', {
                email: email.toLowerCase().trim(),
                password,
                redirect: false,
            });

            if (result?.error) {
                // Handle specific error types
                switch (result.error) {
                    case 'CredentialsSignin':
                        setError('Invalid email or password');
                        break;
                    case 'Configuration':
                        setError('Authentication service temporarily unavailable');
                        break;
                    default:
                        setError('Invalid email or password');
                }
                setIsLoading(false);
                return;
            }

            if (result?.ok) {
                // Get the updated session to check user role
                const session = await getSession();

                // Refresh the router to update the session state
                router.refresh();

                // Redirect based on role or to default dashboard
                if (session?.user?.role === 'admin') {
                    router.replace('/dashboard');
                } else {
                    // Redirect all authenticated users to dashboard
                    router.replace('/dashboard');
                }
            }
        } catch (error) {
            console.error('SignIn error:', error);
            setError('Network error. Please check your connection and try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6">
                {/* Back to home link */}
                <div className="text-center">
                    <Link
                        href="/"
                        className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to MaalEdu
                    </Link>
                </div>

                <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                            Sign In
                        </CardTitle>
                        <CardDescription className="text-gray-600 dark:text-gray-400">
                            Access your affiliate dashboard or admin panel
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Email Field */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Email Address
                                </Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        className="pl-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:border-orange-500 dark:focus:border-orange-400"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Password
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        required
                                        className="pl-10 pr-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:border-orange-500 dark:focus:border-orange-400"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={isLoading}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                                    <AlertDescription className="text-red-600 dark:text-red-400 text-sm">
                                        {error}
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800 text-white font-medium py-2.5 transition-colors duration-200"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Signing in...
                                    </div>
                                ) : (
                                    'Sign In'
                                )}
                            </Button>
                        </form>

                        {/* Additional Info */}
                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Don't have an account?{' '}
                                <Link
                                    href="/register"
                                    className="font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition-colors"
                                >
                                    Register here
                                </Link>
                            </p>
                        </div>

                        {/* Help Text */}
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                                <strong>For Affiliates:</strong> Register first, then sign in to access your dashboard<br />
                                <strong>For Admins:</strong> Contact support for account access
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="text-center text-xs text-gray-500 dark:text-gray-400">
                    © 2025 MaalEdu. All rights reserved.
                </div>
            </div>
        </div>
    );
}

// Loading component for Suspense fallback
function SignInLoading() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <Card>
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-2xl font-bold tracking-tight">
                            Loading...
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="animate-pulse space-y-4">
                            <div className="h-4 bg-gray-200 rounded"></div>
                            <div className="h-10 bg-gray-200 rounded"></div>
                            <div className="h-4 bg-gray-200 rounded"></div>
                            <div className="h-10 bg-gray-200 rounded"></div>
                            <div className="h-10 bg-gray-200 rounded"></div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Main export with Suspense boundary
export default function SignInPage() {
    return (
        <Suspense fallback={<SignInLoading />}>
            <SignInForm />
        </Suspense>
    );
}
