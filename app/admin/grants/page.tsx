'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SiteHeader } from '@/components/site-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Calendar,
    Check,
    X,
    Eye,
    RefreshCw,
    ArrowLeft,
    Mail,
    User,
    BookOpen,
    MessageSquare
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminGrantsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // State
    const [grants, setGrants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [grantFilter, setGrantFilter] = useState('all');
    const [selectedGrants, setSelectedGrants] = useState<string[]>([]);
    const [selectedGrant, setSelectedGrant] = useState<any>(null);
    const [approvalMessage, setApprovalMessage] = useState('');
    const [rejectionMessage, setRejectionMessage] = useState('');
    const [discountPercentage, setDiscountPercentage] = useState(100);

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

        loadGrants();
    }, [session, status, router, grantFilter]);

    // Load grants data
    const loadGrants = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (grantFilter !== 'all') params.append('status', grantFilter);

            const response = await fetch(`/api/grants?${params}`);
            if (response.ok) {
                const data = await response.json();
                setGrants(data.grants || []);
            }
        } catch (error) {
            console.error('Failed to load grants:', error);
        } finally {
            setLoading(false);
        }
    };

    // Process individual grant with detailed workflow
    const processGrant = async (grantId: string, approved: boolean, message = '') => {
        try {
            const response = await fetch(`/api/grants/${grantId}/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    approved,
                    reason: message,
                    processedBy: session?.user?.email,
                    discountPercentage: approved ? discountPercentage : undefined
                })
            });

            if (response.ok) {
                loadGrants(); // Reload grants
                setSelectedGrant(null); // Close dialog
                setApprovalMessage('');
                setRejectionMessage('');
                setDiscountPercentage(100); // Reset to default

                if (approved) {
                    const discountType = discountPercentage === 100 ? '100% discount (free)' : `${discountPercentage}% discount`;
                    alert(`Grant approved successfully! User will receive ${discountType} coupon code via email.`);
                } else {
                    alert('Grant rejected successfully.');
                }
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
                    processedBy: session?.user?.email,
                    discountPercentage: approved ? discountPercentage : undefined
                })
            });

            if (response.ok) {
                setSelectedGrants([]);
                setDiscountPercentage(100); // Reset discount percentage
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

    const pendingGrants = grants.filter(g => g.status === 'pending');
    const approvedGrants = grants.filter(g => g.status === 'approved');
    const rejectedGrants = grants.filter(g => g.status === 'rejected');

    return (
        <div className="min-h-screen bg-background">
            <SiteHeader />
            {/* Header */}
            <div className="bg-card border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => router.push('/admin-dashboard')}
                                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg shadow-lg hover:from-orange-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to Dashboard
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-foreground">
                                    Grant Management
                                </h1>
                                <p className="text-muted-foreground">
                                    Review and process grant applications
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="outline"
                                onClick={loadGrants}
                                disabled={loading}
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                                        Pending
                                    </p>
                                    <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                                        {pendingGrants.length}
                                    </p>
                                </div>
                                <Calendar className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                                        Approved
                                    </p>
                                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                        {approvedGrants.length}
                                    </p>
                                </div>
                                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                                        Rejected
                                    </p>
                                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                                        {rejectedGrants.length}
                                    </p>
                                </div>
                                <X className="h-8 w-8 text-red-600 dark:text-red-400" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                        Total
                                    </p>
                                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                        {grants.length}
                                    </p>
                                </div>
                                <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Grant Management */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Grant Applications</CardTitle>
                                <CardDescription>
                                    Click on any application to view details before processing
                                </CardDescription>
                            </div>
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

                                {selectedGrants.length > 0 && (
                                    <div className="flex space-x-2">
                                        <Button
                                            onClick={() => bulkProcessGrants(true, 'Bulk approved by admin')}
                                            variant="default"
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
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                                <p className="mt-2 text-gray-600">Loading grants...</p>
                            </div>
                        ) : grants.length === 0 ? (
                            <div className="text-center py-8">
                                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-gray-500">No grant applications found</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={selectedGrants.length === pendingGrants.length && pendingGrants.length > 0}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setSelectedGrants(pendingGrants.map((g: any) => g._id));
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
                                        <TableHead>Discount</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {grants.map((grant: any) => (
                                        <TableRow
                                            key={grant._id}
                                            className="cursor-pointer hover:bg-gray-50"
                                            onClick={() => setSelectedGrant(grant)}
                                        >
                                            <TableCell onClick={(e) => e.stopPropagation()}>
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
                                                {grant.status === 'approved' && grant.discountPercentage ? (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700">
                                                        {grant.discountPercentage}%
                                                    </Badge>
                                                ) : grant.status === 'approved' ? (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700">
                                                        100%
                                                    </Badge>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedGrant(grant)}
                                                >
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
            </div>

            {/* Grant Details Dialog */}
            <Dialog open={!!selectedGrant} onOpenChange={() => setSelectedGrant(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Grant Application Details</DialogTitle>
                        <DialogDescription>
                            Review the complete application before making a decision
                        </DialogDescription>
                    </DialogHeader>

                    {selectedGrant && (
                        <div className="space-y-6">
                            {/* Applicant Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Applicant Name</label>
                                    <p className="font-medium">{selectedGrant.name}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Email</label>
                                    <p className="font-medium">{selectedGrant.email}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Age</label>
                                    <p className="font-medium">{selectedGrant.age}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Course ID</label>
                                    <p className="font-medium">{selectedGrant.courseId}</p>
                                </div>
                            </div>

                            {/* Social Accounts */}
                            <div>
                                <label className="text-sm font-medium text-gray-500">Social Media Accounts</label>
                                <p className="mt-1 p-3 bg-gray-50 rounded-md">{selectedGrant.socialAccounts}</p>
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="text-sm font-medium text-gray-500">Reason for Grant Application</label>
                                <p className="mt-1 p-3 bg-gray-50 rounded-md">{selectedGrant.reason}</p>
                            </div>

                            {/* Application Date */}
                            <div>
                                <label className="text-sm font-medium text-gray-500">Application Date</label>
                                <p className="font-medium">{new Date(selectedGrant.createdAt).toLocaleString()}</p>
                            </div>

                            {/* Current Status */}
                            <div>
                                <label className="text-sm font-medium text-gray-500">Current Status</label>
                                <div className="mt-1">
                                    <Badge variant={
                                        selectedGrant.status === 'approved' ? 'default' :
                                            selectedGrant.status === 'rejected' ? 'destructive' :
                                                'secondary'
                                    }>
                                        {selectedGrant.status}
                                    </Badge>
                                </div>
                            </div>

                            {/* Action Buttons for Pending Grants */}
                            {selectedGrant.status === 'pending' && (
                                <div className="flex flex-col space-y-4 pt-4 border-t">
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Approval Section */}
                                        <div className="space-y-3">
                                            <label className="text-sm font-medium text-green-600">Approve Grant</label>

                                            {/* Discount Percentage Selector */}
                                            <div className="space-y-2">
                                                <label className="text-xs font-medium text-gray-600">Discount Percentage</label>
                                                <Select
                                                    value={discountPercentage.toString()}
                                                    onValueChange={(value) => setDiscountPercentage(parseInt(value))}
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="100">100% - Free Course</SelectItem>
                                                        <SelectItem value="90">90% Discount</SelectItem>
                                                        <SelectItem value="80">80% Discount</SelectItem>
                                                        <SelectItem value="75">75% Discount</SelectItem>
                                                        <SelectItem value="70">70% Discount</SelectItem>
                                                        <SelectItem value="60">60% Discount</SelectItem>
                                                        <SelectItem value="50">50% Discount</SelectItem>
                                                        <SelectItem value="40">40% Discount</SelectItem>
                                                        <SelectItem value="30">30% Discount</SelectItem>
                                                        <SelectItem value="25">25% Discount</SelectItem>
                                                        <SelectItem value="20">20% Discount</SelectItem>
                                                        <SelectItem value="10">10% Discount</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {discountPercentage < 100 && (
                                                    <p className="text-xs text-orange-600">
                                                        ⚠️ Student will need to pay the remaining amount via Stripe checkout
                                                    </p>
                                                )}
                                            </div>

                                            <Textarea
                                                placeholder="Approval message (optional)"
                                                value={approvalMessage}
                                                onChange={(e) => setApprovalMessage(e.target.value)}
                                                className="min-h-[80px]"
                                            />
                                            <Button
                                                onClick={() => processGrant(selectedGrant._id, true, approvalMessage)}
                                                variant="default"
                                                className="w-full bg-green-600 hover:bg-green-700"
                                            >
                                                <Check className="h-4 w-4 mr-2" />
                                                {discountPercentage === 100 ?
                                                    'Approve & Send Free Coupon' :
                                                    `Approve & Send ${discountPercentage}% Discount Coupon`
                                                }
                                            </Button>
                                        </div>

                                        {/* Rejection Section */}
                                        <div className="space-y-3">
                                            <label className="text-sm font-medium text-red-600">Reject Grant</label>
                                            <Textarea
                                                placeholder="Rejection reason (required)"
                                                value={rejectionMessage}
                                                onChange={(e) => setRejectionMessage(e.target.value)}
                                                className="min-h-[80px]"
                                            />
                                            <Button
                                                onClick={() => processGrant(selectedGrant._id, false, rejectionMessage)}
                                                variant="destructive"
                                                className="w-full"
                                                disabled={!rejectionMessage.trim()}
                                            >
                                                <X className="h-4 w-4 mr-2" />
                                                Reject Application
                                            </Button>
                                        </div>
                                    </div>

                                    <Alert>
                                        <Mail className="h-4 w-4" />
                                        <AlertDescription>
                                            <strong>Approval:</strong> User will receive a {discountPercentage}% discount coupon via email.
                                            {discountPercentage === 100 ?
                                                ' They can enroll for free at checkout.' :
                                                ` They'll pay ${100 - discountPercentage}% of the course price via Stripe.`
                                            }<br />
                                            <strong>Rejection:</strong> User will be notified with your custom message.
                                        </AlertDescription>
                                    </Alert>
                                </div>
                            )}

                            {/* Show coupon code for approved grants */}
                            {selectedGrant.status === 'approved' && selectedGrant.couponCode && (
                                <div className="mt-4 p-4 bg-green-50 rounded-md">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-green-600">Generated Coupon Code</label>
                                        <Badge variant="outline" className="bg-green-100 text-green-800">
                                            {selectedGrant.discountPercentage || 100}% Discount
                                        </Badge>
                                    </div>
                                    <p className="font-mono text-lg font-bold text-green-800">{selectedGrant.couponCode}</p>
                                    <div className="mt-2 text-sm text-green-600">
                                        {(selectedGrant.discountPercentage || 100) === 100 ? (
                                            <p>User can enroll for free using this coupon at checkout</p>
                                        ) : (
                                            <div>
                                                <p>User gets {selectedGrant.discountPercentage}% discount at checkout</p>
                                                {selectedGrant.originalPrice && (
                                                    <p>Original: ${selectedGrant.originalPrice} → Final: ${selectedGrant.discountedPrice || 'TBD'}</p>
                                                )}
                                                {selectedGrant.couponMetadata?.expiresAt && (
                                                    <p className="text-orange-600">
                                                        Expires: {new Date(selectedGrant.couponMetadata.expiresAt).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Admin notes for processed grants */}
                            {selectedGrant.adminNotes && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Admin Notes</label>
                                    <p className="mt-1 p-3 bg-gray-50 rounded-md">{selectedGrant.adminNotes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
