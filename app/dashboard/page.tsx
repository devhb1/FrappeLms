'use client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Users, TrendingUp, Settings, ArrowRight, User, BookOpen, ExternalLink } from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getLMSAccessUrl } from "@/lib/config/lms";

/**
 * Dashboard Page
 * 
 * Main dashboard for authenticated users.
 * Redirects based on user role:
 * - Regular users: Access to courses and profile
 * - Admins: Access to admin panel
 * 
 * Features:
 * - Role-based content
 * - Quick action buttons
 * - Profile information
 * - Course progress (placeholder)
 */
export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loadingEnrollments, setLoadingEnrollments] = useState(false);

    useEffect(() => {
        if (status === 'loading') return; // Still loading

        if (!session) {
            router.push('/signin');
            return;
        }

        // Load user enrollments if user is logged in
        loadEnrollments();
    }, [session, status, router]);

    const loadEnrollments = async () => {
        if (!session?.user?.email) return;

        setLoadingEnrollments(true);
        try {
            const response = await fetch(`/api/enrollments/user?email=${encodeURIComponent(session.user.email)}`);
            if (response.ok) {
                const data = await response.json();
                setEnrollments(data.enrollments || []);
            }
        } catch (error) {
            console.error('Failed to load enrollments:', error);
        } finally {
            setLoadingEnrollments(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
            </div>
        );
    }

    if (!session) {
        return null; // Will redirect
    }

    const isAdmin = session.user?.role === 'admin';

    return (
        <>
            <SiteHeader />
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-foreground">
                                    Welcome back, {session.user?.email?.split('@')[0] || 'User'}! 👋
                                </h1>
                                <p className="text-muted-foreground mt-2">
                                    {isAdmin ? 'Admin Dashboard - Manage grants, affiliates, and platform' : 'Your learning dashboard'}
                                </p>
                            </div>
                            <Badge variant={isAdmin ? "destructive" : "default"} className="px-3 py-1">
                                {isAdmin ? 'Admin' : 'User'}
                            </Badge>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {/* For Regular Users */}
                        {!isAdmin && (
                            <>
                                <Card className="hover:shadow-lg transition-shadow cursor-pointer bg-card border-border">
                                    <CardContent className="p-6">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                                                <GraduationCap className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-foreground">Browse Courses</h3>
                                                <p className="text-sm text-muted-foreground">Explore blockchain education</p>
                                            </div>
                                        </div>
                                        <Button asChild className="w-full mt-4" variant="outline">
                                            <Link href="/courses">
                                                View Courses
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                                    <CardContent className="p-6">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white">Become Affiliate</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-300">Earn by referring students</p>
                                            </div>
                                        </div>
                                        <Button asChild className="w-full mt-4" variant="outline">
                                            <Link href="/affiliate-dashboard">
                                                Join Program
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {/* For Admin Users */}
                        {isAdmin && (
                            <>
                                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                                    <CardContent className="p-6">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                                <GraduationCap className="w-6 h-6 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white">Grant Management</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-300">Review applications</p>
                                            </div>
                                        </div>
                                        <Button asChild className="w-full mt-4" variant="outline">
                                            <Link href="/admin/grants">
                                                Manage Grants
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                                    <CardContent className="p-6">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                                                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white">Affiliates</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-300">Manage affiliate program</p>
                                            </div>
                                        </div>
                                        <Button asChild className="w-full mt-4" variant="outline">
                                            <Link href="/admin/affiliates">
                                                Manage Affiliates
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                                    <CardContent className="p-6">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                                                <Settings className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white">Admin Panel</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-300">Platform settings</p>
                                            </div>
                                        </div>
                                        <Button asChild className="w-full mt-4" variant="outline">
                                            <Link href="/admin-dashboard">
                                                Admin Panel
                                                <ArrowRight className="w-4 h-4 ml-2" />
                                            </Link>
                                        </Button>
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {/* Common Actions */}
                        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                            <CardContent className="p-6">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                        <User className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">Profile Settings</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-300">Update your information</p>
                                    </div>
                                </div>
                                <Button asChild className="w-full mt-4" variant="outline">
                                    <Link href="/profile">
                                        Edit Profile
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {/* User Enrollments Section */}
                    {!isAdmin && (
                        <Card className="mb-8">
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <BookOpen className="w-5 h-5" />
                                    <span>My Enrollments</span>
                                </CardTitle>
                                <CardDescription>
                                    Your enrolled courses and access status
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {loadingEnrollments ? (
                                    <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                                        <p className="text-gray-500 mt-2">Loading enrollments...</p>
                                    </div>
                                ) : enrollments.length === 0 ? (
                                    <div className="text-center py-8">
                                        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 mb-4">No enrollments found</p>
                                        <Button asChild>
                                            <Link href="/courses">Browse Courses</Link>
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {enrollments.map((enrollment) => (
                                            <div key={enrollment.id} className="flex items-center justify-between p-4 border rounded-lg">
                                                <div>
                                                    <h4 className="font-semibold text-gray-900 dark:text-white">
                                                        {enrollment.courseId.replace('course-v1:', '').replace(/\+/g, ' ')}
                                                    </h4>
                                                    <div className="flex items-center space-x-2 mt-1">
                                                        <Badge variant={enrollment.enrollmentType === 'free_grant' ? 'secondary' : 'default'}>
                                                            {enrollment.enrollmentType === 'free_grant' ? 'Free Grant' : 'Paid'}
                                                        </Badge>
                                                        <span className="text-sm text-gray-500">
                                                            Enrolled: {new Date(enrollment.enrolledAt).toLocaleDateString()}
                                                        </span>
                                                        {enrollment.couponCode && (
                                                            <Badge variant="outline">
                                                                Coupon: {enrollment.couponCode}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button asChild size="sm">
                                                    <a href={getLMSAccessUrl()} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink className="w-4 h-4 mr-2" />
                                                        Access Course
                                                    </a>
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* User Info Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <User className="w-5 h-5" />
                                <span>Account Information</span>
                            </CardTitle>
                            <CardDescription>
                                Your current account details and status
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                                    <p className="text-gray-900 dark:text-white">{session.user?.email}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</p>
                                    <Badge variant={isAdmin ? "destructive" : "default"}>
                                        {isAdmin ? 'Administrator' : 'Student'}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Account Status</p>
                                    <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                        Active
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Member Since</p>
                                    <p className="text-gray-900 dark:text-white">September 2025</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Navigation */}
                    <div className="mt-8 text-center">
                        <Button asChild variant="outline">
                            <Link href="/">
                                ← Back to Homepage
                            </Link>
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
