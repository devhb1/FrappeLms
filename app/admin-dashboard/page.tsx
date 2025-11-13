'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Users,
    DollarSign,
    BookOpen,
    TrendingUp,
    Mail,
    Calendar,
    Shield,
    BarChart3,
    Settings,
    UserCheck,
    GraduationCap,
    Target,
    Search,
    Check,
    X,
    Eye,
    Edit,
    RefreshCw
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SiteHeader } from '@/components/site-header';

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // State for admin data
    const [adminData, setAdminData] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [grants, setGrants] = useState<any[]>([]);
    const [affiliates, setAffiliates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    // Search and filter states
    const [userSearch, setUserSearch] = useState('');
    const [grantFilter, setGrantFilter] = useState('all');
    const [selectedGrants, setSelectedGrants] = useState<string[]>([]);

    // ===== PAYOUT DIALOG STATE (MVP FEATURE) =====
    const [payoutDialog, setPayoutDialog] = useState<{
        isOpen: boolean;
        affiliate: any | null;
        loading: boolean;
    }>({
        isOpen: false,
        affiliate: null,
        loading: false
    });

    // Payout form state for admin input
    const [payoutForm, setPayoutForm] = useState({
        transactionId: '',
        amount: '',
        notes: ''
    });

    // Redirect if not authenticated or not admin
    useEffect(() => {
        if (status === 'loading') return;

        if (!session) {
            router.push('/signin');
            return;
        }

        if (session?.user?.role !== 'admin') {
            router.push('/signin');
            return;
        }

        // Load admin data
        loadAdminData();
    }, [session, status, router]);

    // Load admin analytics data
    const loadAdminData = async () => {
        try {
            const response = await fetch('/api/admin/analytics');
            if (response.ok) {
                const data = await response.json();
                setAdminData(data);
            }
        } catch (error) {
            console.error('Failed to load admin data:', error);
        }
    };

    // Load users data
    const loadUsers = async () => {
        try {
            const params = new URLSearchParams();
            if (userSearch) params.append('search', userSearch);

            const response = await fetch(`/api/admin/users?${params}`);
            if (response.ok) {
                const data = await response.json();
                setUsers(data.users || []);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    };

    // Load grants data
    const loadGrants = async () => {
        try {
            const params = new URLSearchParams();
            if (grantFilter !== 'all') params.append('status', grantFilter);

            const response = await fetch(`/api/grants?${params}`);
            if (response.ok) {
                const data = await response.json();
                setGrants(data.grants || []);
            }
        } catch (error) {
            console.error('Failed to load grants:', error);
        }
    };

    // Load affiliates data
    const loadAffiliates = async () => {
        try {
            const response = await fetch('/api/admin/affiliates');
            if (response.ok) {
                const data = await response.json();
                setAffiliates(data.affiliates || []);
            }
        } catch (error) {
            console.error('Failed to load affiliates:', error);
        }
    };

    // Load data when tabs change
    useEffect(() => {
        if (session?.user?.role !== 'admin') return;

        switch (activeTab) {
            case 'users':
                loadUsers();
                break;
            case 'grants':
                loadGrants();
                break;
            case 'affiliates':
                loadAffiliates();
                break;
        }
        setLoading(false);
    }, [activeTab, userSearch, grantFilter]);

    // Process individual grant
    const processGrant = async (grantId: string, approved: boolean, message = '') => {
        try {
            const response = await fetch(`/api/grants/${grantId}/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    approved,
                    reason: message,
                    processedBy: session?.user?.email
                })
            });

            if (response.ok) {
                loadGrants(); // Reload grants
                alert(`Grant ${approved ? 'approved' : 'rejected'} successfully!`);
            } else {
                alert('Failed to process grant');
            }
        } catch (error) {
            console.error('Grant processing error:', error);
            alert('Error processing grant');
        }
    };

    // Bulk process grants
    const bulkProcessGrants = async (approved: boolean, message = '') => {
        if (selectedGrants.length === 0) {
            alert('Please select grants to process');
            return;
        }

        try {
            const response = await fetch('/api/admin/grants/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grantIds: selectedGrants,
                    action: approved ? 'approve' : 'reject',
                    message,
                    processedBy: session?.user?.email
                })
            });

            if (response.ok) {
                setSelectedGrants([]);
                loadGrants();
                alert(`Bulk ${approved ? 'approval' : 'rejection'} completed!`);
            } else {
                alert('Failed to process grants');
            }
        } catch (error) {
            console.error('Bulk grant processing error:', error);
            alert('Error processing grants');
        }
    };

    // ===== PAYOUT PROCESSING FUNCTIONS (MVP FEATURE) =====

    /**
     * Opens the payout dialog for a specific affiliate
     * Pre-fills amount with pending payout amount
     */
    const openPayoutDialog = (affiliate: any) => {
        setPayoutDialog({
            isOpen: true,
            affiliate,
            loading: false
        });

        // Pre-fill amount with pending payout
        setPayoutForm({
            transactionId: '',
            amount: (affiliate.stats?.pendingPayout || 0).toString(),
            notes: ''
        });
    };

    /**
     * Closes payout dialog and resets form
     */
    const closePayoutDialog = () => {
        setPayoutDialog({
            isOpen: false,
            affiliate: null,
            loading: false
        });

        setPayoutForm({
            transactionId: '',
            amount: '',
            notes: ''
        });
    };

    /**
     * Processes the payout using existing API
     * Updates database, sends email, refreshes affiliate list
     */
    const processAffiliatePayout = async () => {
        if (!payoutDialog.affiliate || !payoutForm.transactionId || !payoutForm.amount) {
            alert('Please fill in Transaction ID and Amount');
            return;
        }

        setPayoutDialog(prev => ({ ...prev, loading: true }));

        try {
            const response = await fetch('/api/admin/affiliate/payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId: payoutDialog.affiliate._id,
                    approve: true,
                    transactionId: payoutForm.transactionId,
                    proofLink: payoutForm.transactionId, // Use transaction ID as proof link for MVP
                    adminMessage: payoutForm.notes || `Payout processed: $${payoutForm.amount}`
                })
            });

            if (response.ok) {
                const result = await response.json();

                // Show success message
                alert(`✅ Payout processed successfully!\n💰 Amount: $${payoutForm.amount}\n📧 Email sent to ${payoutDialog.affiliate.email}`);

                // Refresh affiliate list to show updated data
                loadAffiliates();

                // Close dialog
                closePayoutDialog();
            } else {
                const error = await response.json();
                alert(`❌ Payout failed: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ Payout processing error:', error);
            alert('❌ Network error during payout processing');
        } finally {
            setPayoutDialog(prev => ({ ...prev, loading: false }));
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!session || session.user?.role !== 'admin') {
        return null;
    }

    return (
        <>
            <SiteHeader />
            <div className="min-h-screen bg-background">
                {/* Dashboard Header */}
                <div className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center py-6">
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">
                                    Admin Dashboard
                                </h1>
                                <p className="text-muted-foreground">
                                    Welcome back, {session.user?.username || session.user?.email}!
                                </p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <Badge variant="default" className="bg-red-600 hover:bg-red-700 text-white">
                                    <Shield className="w-3 h-3 mr-1" />
                                    Administrator
                                </Badge>
                                <Button
                                    variant="outline"
                                    onClick={() => router.push('/')}
                                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                                >
                                    <TrendingUp className="w-4 h-4 mr-2" />
                                    Back to Home
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                            Total Users
                                        </p>
                                        <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                                            {adminData?.metrics?.users?.total?.toLocaleString() || '0'}
                                        </p>
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                            +{adminData?.metrics?.users?.newThisMonth || 0} this month
                                        </p>
                                    </div>
                                    <div className="p-3 bg-blue-200/50 dark:bg-blue-800/30 rounded-full">
                                        <Users className="h-6 w-6 text-blue-700 dark:text-blue-300" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/30">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                            Total Revenue
                                        </p>
                                        <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                                            ${adminData?.metrics?.revenue?.total?.toLocaleString() || '0'}
                                        </p>
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                            +${adminData?.metrics?.revenue?.thisMonth?.toLocaleString() || '0'} this month
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
                                        <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                                            Active Courses
                                        </p>
                                        <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                                            {adminData?.metrics?.courses?.total || '0'}
                                        </p>
                                        <p className="text-xs text-blue-600 dark:text-blue-400">
                                            {adminData?.metrics?.courses?.enrollments || 0} total enrollments
                                        </p>
                                    </div>
                                    <div className="p-3 bg-orange-200/50 dark:bg-orange-800/30 rounded-full">
                                        <BookOpen className="h-6 w-6 text-orange-700 dark:text-orange-300" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                            Active Affiliates
                                        </p>
                                        <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                                            {adminData?.metrics?.affiliates?.active || '0'}
                                        </p>
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                            ${adminData?.metrics?.affiliates?.revenue || 0} affiliate revenue
                                        </p>
                                    </div>
                                    <div className="p-3 bg-purple-200/50 dark:bg-purple-800/30 rounded-full">
                                        <TrendingUp className="h-6 w-6 text-purple-700 dark:text-purple-300" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Quick Actions */}
                    <Card className="mb-8 bg-card border-border">
                        <CardHeader>
                            <CardTitle className="text-foreground">Quick Actions</CardTitle>
                            <CardDescription>
                                Common administrative tasks
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                <Button
                                    variant="outline"
                                    className="h-20 flex-col"
                                    onClick={() => setActiveTab('users')}
                                >
                                    <Users className="h-6 w-6 mb-2" />
                                    <span className="text-xs">Manage Users</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-20 flex-col"
                                    onClick={() => setActiveTab('courses')}
                                >
                                    <BookOpen className="h-6 w-6 mb-2" />
                                    <span className="text-xs">Manage Courses</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-20 flex-col"
                                    onClick={() => setActiveTab('affiliates')}
                                >
                                    <UserCheck className="h-6 w-6 mb-2" />
                                    <span className="text-xs">Manage Affiliates</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-20 flex-col"
                                    onClick={() => setActiveTab('grants')}
                                >
                                    <Mail className="h-6 w-6 mb-2" />
                                    <span className="text-xs">Manage Grants</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-20 flex-col"
                                    onClick={() => setActiveTab('overview')}
                                >
                                    <BarChart3 className="h-6 w-6 mb-2" />
                                    <span className="text-xs">Analytics</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-20 flex-col"
                                    disabled
                                >
                                    <Settings className="h-6 w-6 mb-2" />
                                    <span className="text-xs">Settings</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tabs */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                        <TabsList>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="users">Users</TabsTrigger>
                            <TabsTrigger value="courses">Courses</TabsTrigger>
                            <TabsTrigger value="grants">Grants</TabsTrigger>
                            <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Recent Activity</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {adminData?.recentActivity ? (
                                                [
                                                    ...adminData.recentActivity.users.slice(0, 2),
                                                    ...adminData.recentActivity.grants.slice(0, 2),
                                                    ...adminData.recentActivity.purchases.slice(0, 2)
                                                ].map((activity: any, index) => (
                                                    <div key={index} className="flex items-center space-x-3">
                                                        <div className={`w-2 h-2 rounded-full ${activity.type === 'user_registered' ? 'bg-green-500' :
                                                            activity.type === 'grant_application' ? 'bg-orange-500' :
                                                                'bg-blue-500'
                                                            }`}></div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium">
                                                                {activity.type === 'user_registered' ? 'New user registered' :
                                                                    activity.type === 'grant_application' ? 'Grant application submitted' :
                                                                        'Course purchased'}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {activity.email} • {new Date(activity.timestamp).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <Badge variant="secondary">
                                                            {activity.type === 'user_registered' ? 'New' :
                                                                activity.type === 'grant_application' ? 'Grant' :
                                                                    `$${activity.amount}`}
                                                        </Badge>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-gray-500">Loading activity...</p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle>Grant Summary</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium">Total Applications</span>
                                                <Badge variant="outline">{adminData?.metrics?.grants?.total || 0}</Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium">Pending Review</span>
                                                <Badge variant="secondary">{adminData?.metrics?.grants?.pending || 0}</Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium">Approved</span>
                                                <Badge variant="default" className="bg-green-600">{adminData?.metrics?.grants?.approved || 0}</Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium">Rejected</span>
                                                <Badge variant="destructive">{adminData?.metrics?.grants?.rejected || 0}</Badge>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium">Approval Rate</span>
                                                <Badge variant="outline">{adminData?.metrics?.grants?.approvalRate || 0}%</Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        <TabsContent value="users">
                            <Card>
                                <CardHeader>
                                    <CardTitle>User Management</CardTitle>
                                    <CardDescription>
                                        Manage all registered users and their permissions
                                    </CardDescription>
                                    <div className="flex items-center space-x-2">
                                        <Search className="h-4 w-4 text-gray-500" />
                                        <Input
                                            placeholder="Search users by email or username..."
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                            className="max-w-sm"
                                        />
                                        <Button onClick={loadUsers}>
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Refresh
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {loading ? (
                                        <p>Loading users...</p>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Email</TableHead>
                                                    <TableHead>Username</TableHead>
                                                    <TableHead>Role</TableHead>
                                                    <TableHead>Total Spent</TableHead>
                                                    <TableHead>Courses</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {users.map((user: any) => (
                                                    <TableRow key={user._id}>
                                                        <TableCell>{user.email}</TableCell>
                                                        <TableCell>{user.username}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={user.role === 'admin' ? 'destructive' : 'default'}>
                                                                {user.role}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>${user.totalSpent}</TableCell>
                                                        <TableCell>{user.coursesCount}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={user.isVerified ? 'default' : 'secondary'}>
                                                                {user.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button variant="outline" size="sm">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="courses">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Course Management</CardTitle>
                                    <CardDescription>
                                        Monitor course performance and enrollment statistics
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {adminData?.topCourses ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Course Title</TableHead>
                                                    <TableHead>Total Enrollments</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {adminData.topCourses.map((course: any, index: number) => (
                                                    <TableRow key={index}>
                                                        <TableCell className="font-medium">{course.title}</TableCell>
                                                        <TableCell>{course.enrollments}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="default">Active</Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button variant="outline" size="sm" disabled>
                                                                View Details
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div className="text-center py-8">
                                            <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                            <p className="text-gray-500">Loading course data...</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="grants">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Grant Management</CardTitle>
                                    <CardDescription>
                                        Review and process grant applications
                                    </CardDescription>
                                    <div className="flex items-center space-x-2">
                                        <Select value={grantFilter} onValueChange={setGrantFilter}>
                                            <SelectTrigger className="w-40">
                                                <SelectValue placeholder="Filter by status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Grants</SelectItem>
                                                <SelectItem value="pending">Pending</SelectItem>
                                                <SelectItem value="approved">Approved</SelectItem>
                                                <SelectItem value="rejected">Rejected</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button onClick={loadGrants}>
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Refresh
                                        </Button>
                                        {selectedGrants.length > 0 && (
                                            <div className="flex space-x-2">
                                                <Button
                                                    onClick={() => bulkProcessGrants(true, 'Bulk approved by admin')}
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    <Check className="h-4 w-4 mr-2" />
                                                    Approve Selected ({selectedGrants.length})
                                                </Button>
                                                <Button
                                                    onClick={() => bulkProcessGrants(false, 'Bulk rejected by admin')}
                                                    variant="destructive"
                                                >
                                                    <X className="h-4 w-4 mr-2" />
                                                    Reject Selected ({selectedGrants.length})
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {loading ? (
                                        <p>Loading grants...</p>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-12">
                                                        <Checkbox
                                                            checked={selectedGrants.length === grants.filter((g: any) => g.status === 'pending').length}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setSelectedGrants(grants.filter((g: any) => g.status === 'pending').map((g: any) => g._id));
                                                                } else {
                                                                    setSelectedGrants([]);
                                                                }
                                                            }}
                                                        />
                                                    </TableHead>
                                                    <TableHead>Applicant</TableHead>
                                                    <TableHead>Course</TableHead>
                                                    <TableHead>Applied</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {grants.map((grant: any) => (
                                                    <TableRow key={grant._id}>
                                                        <TableCell>
                                                            {grant.status === 'pending' && (
                                                                <Checkbox
                                                                    checked={selectedGrants.includes(grant._id)}
                                                                    onCheckedChange={(checked) => {
                                                                        if (checked) {
                                                                            setSelectedGrants([...selectedGrants, grant._id]);
                                                                        } else {
                                                                            setSelectedGrants(selectedGrants.filter(id => id !== grant._id));
                                                                        }
                                                                    }}
                                                                />
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div>
                                                                <p className="font-medium">{grant.name}</p>
                                                                <p className="text-sm text-gray-500">{grant.email}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{grant.courseId}</TableCell>
                                                        <TableCell>{new Date(grant.createdAt).toLocaleDateString()}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={
                                                                grant.status === 'approved' ? 'default' :
                                                                    grant.status === 'rejected' ? 'destructive' :
                                                                        'secondary'
                                                            }>
                                                                {grant.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {grant.status === 'pending' && (
                                                                <div className="flex space-x-2">
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => processGrant(grant._id, true, 'Grant approved')}
                                                                        className="bg-green-600 hover:bg-green-700"
                                                                    >
                                                                        <Check className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        onClick={() => processGrant(grant._id, false, 'Grant rejected')}
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                            {grant.status === 'approved' && grant.couponCode && (
                                                                <Badge variant="outline">
                                                                    {grant.couponCode}
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="affiliates">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Affiliate Management</CardTitle>
                                    <CardDescription>
                                        Monitor affiliate performance and manage payouts
                                    </CardDescription>
                                    <Button onClick={loadAffiliates}>
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Refresh
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {loading ? (
                                        <p>Loading affiliates...</p>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Affiliate</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Referrals</TableHead>
                                                    <TableHead>Total Revenue</TableHead>
                                                    <TableHead>Commission</TableHead>
                                                    <TableHead>Pending Payout</TableHead>
                                                    <TableHead>Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {affiliates.map((affiliate: any) => (
                                                    <TableRow key={affiliate._id}>
                                                        <TableCell>
                                                            <div>
                                                                <p className="font-medium">{affiliate.name}</p>
                                                                <p className="text-sm text-gray-500">{affiliate.email}</p>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={affiliate.status === 'active' ? 'default' : 'secondary'}>
                                                                {affiliate.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>{affiliate.stats?.totalReferrals || 0}</TableCell>
                                                        <TableCell>${affiliate.stats?.totalRevenue || 0}</TableCell>
                                                        <TableCell>{affiliate.commissionRate}%</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">
                                                                ${affiliate.stats?.pendingPayout || 0}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex space-x-2">
                                                                <Dialog>
                                                                    <DialogTrigger asChild>
                                                                        <Button variant="outline" size="sm">
                                                                            <Eye className="h-4 w-4" />
                                                                        </Button>
                                                                    </DialogTrigger>
                                                                    <DialogContent>
                                                                        <DialogHeader>
                                                                            <DialogTitle>{affiliate.name} - Affiliate Profile</DialogTitle>
                                                                            <DialogDescription>
                                                                                Complete affiliate performance overview
                                                                            </DialogDescription>
                                                                        </DialogHeader>
                                                                        <div className="space-y-4">
                                                                            <div>
                                                                                <h4 className="font-medium">Performance Stats</h4>
                                                                                <div className="grid grid-cols-2 gap-4 mt-2">
                                                                                    <div>
                                                                                        <p className="text-sm text-gray-500">Total Referrals</p>
                                                                                        <p className="font-medium">{affiliate.stats?.totalReferrals || 0}</p>
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-sm text-gray-500">Total Revenue</p>
                                                                                        <p className="font-medium">${affiliate.stats?.totalRevenue || 0}</p>
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-sm text-gray-500">Commission Rate</p>
                                                                                        <p className="font-medium">{affiliate.commissionRate}%</p>
                                                                                    </div>
                                                                                    <div>
                                                                                        <p className="text-sm text-gray-500">Pending Payout</p>
                                                                                        <p className="font-medium">${affiliate.stats?.pendingPayout || 0}</p>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <h4 className="font-medium">Payment Method</h4>
                                                                                <p className="text-sm text-gray-500 mt-1">
                                                                                    {affiliate.payoutMode} - {
                                                                                        affiliate.paymentMethod?.paypalEmail ||
                                                                                        affiliate.paymentMethod?.cryptoWallet ||
                                                                                        affiliate.paymentMethod?.accountNumber ||
                                                                                        'Not configured'
                                                                                    }
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </DialogContent>
                                                                </Dialog>
                                                                {affiliate.stats?.pendingPayout > 0 && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => openPayoutDialog(affiliate)}
                                                                        className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                                                    >
                                                                        💰 Process Payout
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* ===== PAYOUT PROCESSING DIALOG (MVP FEATURE) ===== */}
                <Dialog open={payoutDialog.isOpen} onOpenChange={closePayoutDialog}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                💰 Process Affiliate Payout
                            </DialogTitle>
                            <DialogDescription>
                                Process payout for {payoutDialog.affiliate?.name} manually via your payment method
                            </DialogDescription>
                        </DialogHeader>

                        {payoutDialog.affiliate && (
                            <div className="space-y-6">
                                {/* Affiliate Payment Details Display */}
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="font-medium text-gray-900 mb-3">Affiliate Payment Details</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Name:</span>
                                            <span className="font-medium">{payoutDialog.affiliate.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Email:</span>
                                            <span className="font-medium">{payoutDialog.affiliate.email}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Payment Method:</span>
                                            <span className="font-medium capitalize">{payoutDialog.affiliate.payoutMode}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Account Details:</span>
                                            <span className="font-medium">
                                                {payoutDialog.affiliate.paymentMethod?.paypalEmail ||
                                                    payoutDialog.affiliate.paymentMethod?.cryptoWallet ||
                                                    payoutDialog.affiliate.paymentMethod?.accountNumber ||
                                                    'Not configured'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Pending Amount:</span>
                                            <span className="font-bold text-green-600">
                                                ${payoutDialog.affiliate.stats?.pendingPayout?.toFixed(2) || '0.00'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Admin Input Form */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Transaction ID / Proof Link *
                                        </label>
                                        <Input
                                            placeholder="Enter transaction ID, hash, or proof link"
                                            value={payoutForm.transactionId}
                                            onChange={(e) => setPayoutForm(prev => ({
                                                ...prev,
                                                transactionId: e.target.value
                                            }))}
                                            className="w-full"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Amount Paid *
                                        </label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={payoutForm.amount}
                                            onChange={(e) => setPayoutForm(prev => ({
                                                ...prev,
                                                amount: e.target.value
                                            }))}
                                            className="w-full"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Admin Notes (Optional)
                                        </label>
                                        <Textarea
                                            placeholder="Add any notes about this payout..."
                                            value={payoutForm.notes}
                                            onChange={(e) => setPayoutForm(prev => ({
                                                ...prev,
                                                notes: e.target.value
                                            }))}
                                            rows={3}
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={closePayoutDialog}
                                        disabled={payoutDialog.loading}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={processAffiliatePayout}
                                        disabled={payoutDialog.loading || !payoutForm.transactionId || !payoutForm.amount}
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                    >
                                        {payoutDialog.loading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Processing...
                                            </div>
                                        ) : (
                                            '✅ Confirm Payout & Send Email'
                                        )}
                                    </Button>
                                </div>

                                {/* Information Note */}
                                <div className="bg-blue-50 p-3 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                        <strong>Note:</strong> This will update the database, mark commissions as paid,
                                        and send an email notification to the affiliate with payout details.
                                    </p>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}
