'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, Loader2, Users, DollarSign, TrendingUp, Eye, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';

// ===== AFFILIATE DATA INTERFACE (MVP FEATURE) =====
interface AffiliateData {
    isAffiliate: boolean;
    affiliate: {
        affiliateLink: string;
        name: string;
        email: string;
        stats?: {
            totalReferrals: number;
            conversionRate: number;
        };
        // ===== SIMPLIFIED PAYOUT TRACKING =====
        totalPaid: number;
        pendingCommissions: number;
        lastPayoutDate?: string;
    };
}

// ===== PAYOUT HISTORY INTERFACE =====
interface PayoutHistoryItem {
    _id: string;
    amount: number;
    status: string;
    processedAt: string;
    transactionId?: string;
    notes?: string;
}

interface PayoutHistoryData {
    history: PayoutHistoryItem[];
    summary: {
        totalReceived: number;
        totalPayouts: number;
        averagePayoutAmount: number;
    };
}

// ===== RECENT ACTIVITY INTERFACE =====
interface RecentActivityItem {
    _id: string;
    serialNo: number;
    courseName: string;
    commission: number;
    purchaseDate: string;
    customerEmail: string;
    enrollmentId: string;
}

interface RecentActivityData {
    activities: RecentActivityItem[];
    totalCount: number;
}

export default function AffiliateDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // Utility function to mask email addresses
    const maskEmail = (email: string) => {
        if (!email) return 'Unknown';
        const [username, domain] = email.split('@');
        if (!username || !domain) return email;

        // Show first 3 characters, then stars, then @domain
        const maskedUsername = username.length <= 3
            ? username + '***'
            : username.substring(0, 3) + '***';
        return `${maskedUsername}@${domain}`;
    };

    // Simplified state management
    const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
    const [payoutHistory, setPayoutHistory] = useState<PayoutHistoryData | null>(null);
    const [recentActivity, setRecentActivity] = useState<RecentActivityData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);
    const [success, setSuccess] = useState('');

    // Check authentication and load data
    useEffect(() => {
        if (status === 'loading') return;

        if (!session) {
            router.push('/signin?callbackUrl=/affiliate-dashboard');
            return;
        }

        loadAffiliateData();

        // Set up automatic refresh every 30 seconds
        const interval = setInterval(() => {
            loadAffiliateData();
        }, 30000);

        // Cleanup interval on unmount
        return () => clearInterval(interval);
    }, [session, status, router]);

    const loadAffiliateData = async () => {
        try {
            setLoading(true);
            setError('');

            // Load affiliate data, payout history, and recent activity in parallel
            const [affiliateResponse, payoutHistoryResponse, activityResponse] = await Promise.all([
                fetch('/api/affiliate/status'),
                fetch('/api/affiliate/payout-history?limit=10'),
                fetch('/api/affiliate/referrals?view=activity')
            ]);

            if (!affiliateResponse.ok) {
                throw new Error(`HTTP ${affiliateResponse.status}: ${affiliateResponse.statusText}`);
            }

            const affiliateData = await affiliateResponse.json();
            setAffiliateData(affiliateData);

            // Load payout history and recent activity if user is an affiliate
            if (affiliateData.isAffiliate) {
                if (payoutHistoryResponse.ok) {
                    const payoutData = await payoutHistoryResponse.json();
                    setPayoutHistory(payoutData);
                }

                if (activityResponse.ok) {
                    const activityData = await activityResponse.json();
                    setRecentActivity(activityData);
                }
            }

        } catch (err) {
            console.error('Failed to load affiliate data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load affiliate data');
        } finally {
            setLoading(false);
        }
    };

    const copyAffiliateLink = () => {
        if (affiliateData?.affiliate?.affiliateLink) {
            // Check if the link already has https:// to avoid double prefixing
            const fullLink = affiliateData.affiliate.affiliateLink.startsWith('https://')
                ? affiliateData.affiliate.affiliateLink
                : `https://${affiliateData.affiliate.affiliateLink}`;
            navigator.clipboard.writeText(fullLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Loading state
    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-orange-600 dark:text-orange-400" />
                    <p className="text-muted-foreground">Loading affiliate dashboard...</p>
                </div>
            </div>
        );
    }

    // Authentication check
    if (!session) {
        return null;
    }

    return (
        <>
            <SiteHeader />
            <div className="min-h-screen bg-background">
                {/* Dashboard Header */}
                <div className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center py-6">
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">
                                    Affiliate Dashboard
                                </h1>
                                <p className="text-muted-foreground mt-1">
                                    Welcome back, {session.user?.username || session.user?.email}!
                                </p>
                            </div>
                            <div className="flex items-center space-x-4">
                                {affiliateData?.isAffiliate ? (
                                    <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Active Affiliate
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary">
                                        Not an Affiliate
                                    </Badge>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={loadAffiliateData}
                                    disabled={loading}
                                    className="mr-2"
                                >
                                    {loading ? (
                                        <div className="w-4 h-4 mr-2 animate-spin border-2 border-muted border-t-primary rounded-full"></div>
                                    ) : (
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                    )}
                                    Refresh
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => router.push('/')}
                                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Back to Home
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                    {/* Error Alert */}
                    {error && (
                        <Alert className="mb-6 border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Error:</strong> {error}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={loadAffiliateData}
                                    className="ml-3"
                                >
                                    Retry
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Success Alert */}
                    {success && (
                        <Alert className="mb-6 border-green-200 bg-green-50">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">{success}</AlertDescription>
                        </Alert>
                    )}

                    {/* Main Content Based on Affiliate Status */}
                    {affiliateData?.isAffiliate ? (
                        // EXISTING AFFILIATE VIEW
                        <div className="space-y-6">

                            {/* ===== EARNINGS OVERVIEW (MVP FEATURE - REAL DATA) ===== */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Total Paid Out</p>
                                                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                                                    ${affiliateData.affiliate?.totalPaid?.toFixed(2) || '0.00'}
                                                </p>
                                                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                                                    All-time earnings received
                                                </p>
                                            </div>
                                            <div className="p-3 bg-emerald-200/50 dark:bg-emerald-800/30 rounded-full">
                                                <DollarSign className="h-6 w-6 text-emerald-700 dark:text-emerald-300" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/30">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Pending Commissions</p>
                                                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                                                    ${affiliateData.affiliate?.pendingCommissions?.toFixed(2) || '0.00'}
                                                </p>
                                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                                    Awaiting next payout
                                                </p>
                                            </div>
                                            <div className="p-3 bg-orange-200/50 dark:bg-orange-800/30 rounded-full">
                                                <TrendingUp className="h-6 w-6 text-orange-700 dark:text-orange-300" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Commission Rate</p>
                                                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">10%</p>
                                            </div>
                                            <div className="p-3 bg-blue-200/50 dark:bg-blue-800/30 rounded-full">
                                                <CheckCircle className="h-6 w-6 text-blue-700 dark:text-blue-300" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* 1. AFFILIATE LINK CARD - Primary Action */}
                            {/* Affiliate Link Card */}
                            <Card className="bg-card border-border">
                                <CardHeader>
                                    <CardTitle className="flex items-center text-foreground">
                                        <ExternalLink className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                                        Your Affiliate Link
                                    </CardTitle>
                                    <CardDescription>
                                        Share this link to earn 10% commission on successful course enrollments
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2">
                                            <div className="flex-1 p-3 bg-muted rounded-md border border-border">
                                                <code className="text-sm font-mono break-all text-foreground">
                                                    {affiliateData.affiliate?.affiliateLink?.startsWith('https://')
                                                        ? affiliateData.affiliate.affiliateLink
                                                        : `https://${affiliateData.affiliate.affiliateLink}`}
                                                </code>
                                            </div>
                                            <Button
                                                onClick={copyAffiliateLink}
                                                variant={copied ? "default" : "outline"}
                                                className="shrink-0"
                                            >
                                                {copied ? (
                                                    <>
                                                        <CheckCircle className="w-4 h-4 mr-2" />
                                                        Copied!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-4 h-4 mr-2" />
                                                        Copy Link
                                                    </>
                                                )}
                                            </Button>
                                        </div>

                                        <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
                                            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            <AlertDescription className="text-blue-800 dark:text-blue-300">
                                                <strong>How it works:</strong> When someone clicks your link and purchases a course,
                                                you earn 10% commission. Commissions are paid monthly via your preferred payment method.
                                            </AlertDescription>
                                        </Alert>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 2 & 3. PAYOUT HISTORY + RECENT ACTIVITY - Side by Side */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                {/* 2. PAYOUT HISTORY - Financial Overview */}
                                <Card className="bg-card border-border">
                                    <CardHeader>
                                        <CardTitle className="flex items-center text-foreground">
                                            <DollarSign className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" />
                                            Payout History
                                        </CardTitle>
                                        <CardDescription>
                                            Your recent payouts and earnings summary
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {payoutHistory ? (
                                            <div className="space-y-4">
                                                {/* Summary Stats */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg border border-border">
                                                    <div className="text-center">
                                                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                                            ${payoutHistory.summary.totalReceived?.toFixed(2) || '0.00'}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">Total Received</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                            {payoutHistory.summary.totalPayouts || 0}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">Total Payouts</p>
                                                    </div>
                                                </div>

                                                {/* Recent Payouts */}
                                                {payoutHistory.history.length > 0 ? (
                                                    <div className="space-y-3">
                                                        <h4 className="font-medium text-foreground">Recent Payouts</h4>
                                                        {payoutHistory.history.map((payout) => (
                                                            <div
                                                                key={payout._id}
                                                                className="flex items-center justify-between p-3 border border-border rounded-lg bg-card"
                                                            >
                                                                <div>
                                                                    <p className="font-medium text-foreground">${payout.amount.toFixed(2)}</p>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {new Date(payout.processedAt).toLocaleDateString()}
                                                                    </p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <Badge
                                                                        variant={payout.status === 'processed' ? 'default' : 'secondary'}
                                                                        className={
                                                                            payout.status === 'processed'
                                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                                                : ''
                                                                        }
                                                                    >
                                                                        {payout.status}
                                                                    </Badge>
                                                                    {payout.transactionId && (
                                                                        <p className="text-xs text-muted-foreground mt-1">
                                                                            ID: {payout.transactionId}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 text-muted-foreground">
                                                        <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                                                        <p>No payouts received yet</p>
                                                        <p className="text-sm">Keep referring customers to earn your first payout!</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <div className="w-6 h-6 mx-auto mb-4 animate-spin border-2 border-muted border-t-primary rounded-full"></div>
                                                <p className="text-muted-foreground">Loading payout history...</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* 3. RECENT ACTIVITY - Performance Tracking */}
                                <Card className="bg-card border-border">
                                    <CardHeader>
                                        <CardTitle className="flex items-center text-foreground">
                                            <TrendingUp className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                                            Recent Activity
                                        </CardTitle>
                                        <CardDescription>
                                            Latest course purchases made through your affiliate link
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {recentActivity ? (
                                            <div className="space-y-4">
                                                {recentActivity.activities.length > 0 ? (
                                                    <div className="space-y-3">
                                                        {recentActivity.activities.map((activity) => (
                                                            <div
                                                                key={activity._id}
                                                                className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30"
                                                            >
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="inline-flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-xs font-medium">
                                                                            {activity.serialNo}
                                                                        </span>
                                                                        <h4 className="font-medium text-foreground">
                                                                            {activity.courseName}
                                                                        </h4>
                                                                    </div>
                                                                    <div className="text-sm text-muted-foreground space-y-1">
                                                                        <p><strong>Customer:</strong> {maskEmail(activity.customerEmail)}</p>
                                                                        <p><strong>Enrolled:</strong> {new Date(activity.purchaseDate).toLocaleDateString('en-US', {
                                                                            year: 'numeric',
                                                                            month: 'short',
                                                                            day: 'numeric'
                                                                        })}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right ml-4">
                                                                    <div className="bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-full">
                                                                        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                                                                            +${activity.commission.toFixed(2)}
                                                                        </p>
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground mt-1">Commission</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8">
                                                        <div className="p-4 bg-muted rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                                            <TrendingUp className="h-8 w-8 text-muted-foreground" />
                                                        </div>
                                                        <h3 className="text-lg font-medium text-foreground mb-2">No Recent Activity</h3>
                                                        <p className="text-muted-foreground">
                                                            Course purchases made through your affiliate link will appear here
                                                        </p>
                                                        <div className="mt-4 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                                                            <p className="text-sm text-blue-800 dark:text-blue-300">
                                                                💡 <strong>Pro Tip:</strong> Share your referral link on social media to track activity here
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <div className="w-6 h-6 mx-auto mb-4 animate-spin border-2 border-muted border-t-primary rounded-full"></div>
                                                <p className="text-muted-foreground">Loading recent activity...</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                            </div>

                            {/* 4. ACCOUNT INFORMATION - Profile Details (Full Width) */}
                            <Card className="bg-card border-border">
                                <CardHeader>
                                    <CardTitle className="text-foreground">Account Information</CardTitle>
                                    <CardDescription>Your affiliate account details</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="font-medium text-foreground mb-2">Personal Details</h4>
                                            <div className="space-y-1 text-sm text-muted-foreground">
                                                <p><strong className="text-foreground">Name:</strong> {affiliateData.affiliate?.name}</p>
                                                <p><strong className="text-foreground">Email:</strong> {affiliateData.affiliate?.email}</p>
                                                <p><strong className="text-foreground">Status:</strong> <span className="text-emerald-600 dark:text-emerald-400">Active</span></p>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-foreground mb-2">Program Details</h4>
                                            <div className="space-y-1 text-sm text-muted-foreground">
                                                <p><strong className="text-foreground">Commission Rate:</strong> 10%</p>
                                                <p><strong className="text-foreground">Payment Terms:</strong> Monthly</p>
                                                <p><strong className="text-foreground">Minimum Payout:</strong> $50</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                        </div>
                    ) : (
                        // NOT AN AFFILIATE VIEW
                        <Card className="bg-card border-border">
                            <CardHeader>
                                <CardTitle className="flex items-center text-foreground">
                                    <Users className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                                    Join Our Affiliate Program
                                </CardTitle>
                                <CardDescription>
                                    Earn 10% commission on every course sale through your referral link
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30">
                                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <AlertDescription className="text-blue-800 dark:text-blue-300">
                                            You're not currently registered as an affiliate. Join our program to start earning commissions!
                                        </AlertDescription>
                                    </Alert>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 border border-border rounded-lg bg-card">
                                            <h4 className="font-medium text-foreground mb-2">10% Commission</h4>
                                            <p className="text-sm text-muted-foreground">Earn 10% on every successful course enrollment</p>
                                        </div>
                                        <div className="p-4 border border-border rounded-lg bg-card">
                                            <h4 className="font-medium text-foreground mb-2">Monthly Payouts</h4>
                                            <p className="text-sm text-muted-foreground">Get paid monthly via PayPal, bank transfer, or crypto</p>
                                        </div>
                                        <div className="p-4 border border-border rounded-lg bg-card">
                                            <h4 className="font-medium text-foreground mb-2">Real-time Tracking</h4>
                                            <p className="text-sm text-muted-foreground">Monitor your earnings and referrals in real-time</p>
                                        </div>
                                    </div>

                                    <div className="text-center">
                                        <Button
                                            size="lg"
                                            onClick={() => router.push('/affiliate-registration')}
                                            className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700"
                                        >
                                            <Users className="w-4 h-4 mr-2" />
                                            Register as Affiliate
                                        </Button>
                                        <p className="text-sm text-muted-foreground mt-2">
                                            Start earning commissions by becoming our affiliate partner
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </>
    );
}
