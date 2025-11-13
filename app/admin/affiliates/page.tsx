'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    AlertCircle,
    CheckCircle,
    DollarSign,
    Eye,
    Search,
    TrendingUp,
    Users,
    Wallet,
    X,
    Send
} from 'lucide-react';

interface Affiliate {
    _id: string;
    userId: string;
    email: string;
    username: string;
    name: string;
    status: 'active' | 'inactive' | 'suspended';
    pendingCommissions: number;
    totalPaid: number;
    enrollmentCount: number;
    payoutMethod: string;
    payoutDetails: any;
    paymentMethod?: {
        type: string;
        bankName?: string;
        accountNumber?: string;
        routingNumber?: string;
        paypalEmail?: string;
        cryptoWallet?: string;
        cryptoCurrency?: string;
    };
    commissionRate: number;
    lastPayoutDate?: string;
    createdAt: string;
    updatedAt: string;
}

interface AdminStats {
    totalAffiliates: number;
    activeAffiliates: number;
    totalCommissionsPaid: number;
    pendingPayouts: number;
    monthlyGrowth: number;
}

export default function AdminAffiliatesPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [stats, setStats] = useState<AdminStats | null>(null);
    const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
    const [filteredAffiliates, setFilteredAffiliates] = useState<Affiliate[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // ===== MODAL STATES =====
    const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [payoutProcessing, setPayoutProcessing] = useState(false);
    const [payoutSuccess, setPayoutSuccess] = useState('');

    // ===== PAYOUT FORM DATA =====
    const [payoutAmount, setPayoutAmount] = useState('');
    const [transactionId, setTransactionId] = useState('');
    const [payoutNotes, setPayoutNotes] = useState(''); useEffect(() => {
        if (status === 'loading') return;

        if (!session || session.user?.role !== 'admin') {
            router.push('/dashboard');
            return;
        }

        loadData();
    }, [session, status, router]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');

            const [statsResponse, affiliatesResponse] = await Promise.all([
                fetch('/api/admin/affiliate/stats'),
                fetch('/api/admin/affiliates')
            ]);

            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                setStats(statsData);
            }

            if (affiliatesResponse.ok) {
                const affiliatesData = await affiliatesResponse.json();
                setAffiliates(affiliatesData.affiliates || []);
                setFilteredAffiliates(affiliatesData.affiliates || []);
            }

        } catch (err) {
            console.error('Error loading admin data:', err);
            setError('Failed to load affiliate data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let filtered = affiliates;

        if (searchTerm) {
            filtered = filtered.filter(affiliate =>
                affiliate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (affiliate.username && affiliate.username.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(affiliate => affiliate.status === statusFilter);
        }

        setFilteredAffiliates(filtered);
    }, [affiliates, searchTerm, statusFilter]);

    // ===== MODAL HANDLERS =====
    const handleViewDetails = (affiliate: Affiliate) => {
        setSelectedAffiliate(affiliate);
        setShowDetailsModal(true);
    };

    const handleOpenPayout = (affiliate: Affiliate) => {
        setSelectedAffiliate(affiliate);
        setPayoutAmount(affiliate.pendingCommissions.toString());
        setTransactionId('');
        setPayoutNotes('');
        setShowPayoutModal(true);
    };

    const handleClosePayout = () => {
        setShowPayoutModal(false);
        setSelectedAffiliate(null);
        setPayoutAmount('');
        setTransactionId('');
        setPayoutNotes('');
        setPayoutProcessing(false);
        setPayoutSuccess('');
    };

    const handleProcessPayout = async () => {
        if (!selectedAffiliate || !transactionId.trim() || !payoutAmount) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            setPayoutProcessing(true);
            setError('');

            console.log('Processing payout for:', selectedAffiliate.email, 'Amount:', payoutAmount);

            const response = await fetch('/api/admin/affiliate/payout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    affiliateId: selectedAffiliate._id,
                    amount: parseFloat(payoutAmount),
                    transactionId: transactionId.trim(),
                    notes: payoutNotes.trim() || undefined
                }),
            });

            const result = await response.json();

            if (response.ok) {
                console.log('Payout processed successfully:', result);
                setPayoutSuccess(`Payout of $${payoutAmount} processed successfully! Confirmation email sent to ${selectedAffiliate.email}`);
                // Success - refresh data and close modal after delay
                await loadData();
                setTimeout(() => {
                    handleClosePayout();
                }, 2000); // Show success message for 2 seconds
            } else {
                console.error('Payout failed:', result);
                setError(result.error || 'Failed to process payout');
            }
        } catch (err) {
            console.error('Error processing payout:', err);
            setError('Failed to process payout. Please try again.');
        } finally {
            setPayoutProcessing(false);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
                    <p>Loading admin panel...</p>
                </div>
            </div>
        );
    }

    if (!session || session.user?.role !== 'admin') {
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            <SiteHeader />
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">
                            Affiliate Management
                        </h1>
                        <p className="text-muted-foreground">
                            Manage affiliates, track commissions, and process payouts
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/admin-dashboard')}
                            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-lg shadow-lg hover:from-orange-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-200"
                        >
                            Back to Dashboard
                        </button>
                        <Button onClick={() => loadData()}>
                            Refresh Data
                        </Button>
                    </div>
                </div>

                {error && (
                    <Alert className="mb-6 border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">{error}</AlertDescription>
                    </Alert>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="affiliates">Affiliates</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Affiliates</p>
                                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.totalAffiliates || 0}</p>
                                        </div>
                                        <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-green-700 dark:text-green-300">Active Affiliates</p>
                                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats?.activeAffiliates || 0}</p>
                                        </div>
                                        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Total Paid</p>
                                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">${stats?.totalCommissionsPaid?.toFixed(2) || '0.00'}</p>
                                        </div>
                                        <Wallet className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Pending Payouts</p>
                                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">${stats?.pendingPayouts?.toFixed(2) || '0.00'}</p>
                                        </div>
                                        <DollarSign className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Affiliate Activity</CardTitle>
                                <CardDescription>Latest affiliate registrations and activity</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {affiliates.slice(0, 5).map((affiliate) => (
                                        <div key={affiliate._id} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                                    <Users className="w-5 h-5 text-orange-600" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{affiliate.username || affiliate.name}</p>
                                                    <p className="text-sm text-gray-500">{affiliate.email}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant={affiliate.status === 'active' ? 'default' : 'secondary'}>
                                                    {affiliate.status}
                                                </Badge>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    ${(affiliate.pendingCommissions + affiliate.totalPaid).toFixed(2)} earned
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="affiliates" className="space-y-6">
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                placeholder="Search affiliates..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-10"
                                            />
                                        </div>
                                    </div>
                                    <div className="md:w-48">
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                        >
                                            <option value="all">All Status</option>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="suspended">Suspended</option>
                                        </select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Affiliate</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Earnings</TableHead>
                                            <TableHead>Referrals</TableHead>
                                            <TableHead>Payout Method</TableHead>
                                            <TableHead>Joined</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAffiliates.map((affiliate) => (
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
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">${(affiliate.pendingCommissions + affiliate.totalPaid).toFixed(2)}</p>
                                                        <p className="text-sm text-gray-500">
                                                            ${affiliate.pendingCommissions.toFixed(2)} pending
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{affiliate.enrollmentCount || 0}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{affiliate.payoutMethod}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(affiliate.createdAt).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex space-x-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleViewDetails(affiliate)}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleOpenPayout(affiliate)}
                                                            disabled={affiliate.pendingCommissions <= 0}
                                                        >
                                                            <Wallet className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* ===== AFFILIATE DETAILS MODAL ===== */}
                <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Affiliate Details</DialogTitle>
                            <DialogDescription>
                                View detailed information about this affiliate
                            </DialogDescription>
                        </DialogHeader>

                        {selectedAffiliate && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-sm font-medium text-gray-600">Name</Label>
                                        <p className="text-lg font-semibold">{selectedAffiliate.username || selectedAffiliate.name}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-600">Email</Label>
                                        <p className="text-lg">{selectedAffiliate.email}</p>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-600">Status</Label>
                                        <div className="mt-1">
                                            <Badge variant={selectedAffiliate.status === 'active' ? 'default' : 'secondary'}>
                                                {selectedAffiliate.status}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-sm font-medium text-gray-600">Joined Date</Label>
                                        <p className="text-lg">{new Date(selectedAffiliate.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-4 bg-green-50 rounded-lg">
                                        <p className="text-sm text-gray-600">Total Earned</p>
                                        <p className="text-2xl font-bold text-green-600">
                                            ${((selectedAffiliate.pendingCommissions || 0) + (selectedAffiliate.totalPaid || 0)).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                                        <p className="text-sm text-gray-600">Pending</p>
                                        <p className="text-2xl font-bold text-orange-600">
                                            ${selectedAffiliate.pendingCommissions?.toFixed(2) || '0.00'}
                                        </p>
                                    </div>
                                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                                        <p className="text-sm text-gray-600">Total Paid</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            ${selectedAffiliate.totalPaid?.toFixed(2) || '0.00'}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-sm font-medium text-gray-600">Payment Method</Label>
                                    <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <Badge variant="outline">{selectedAffiliate.payoutMethod}</Badge>
                                        </div>
                                        {selectedAffiliate.paymentMethod && (
                                            <div className="space-y-1 text-sm">
                                                <p><strong>Type:</strong> {selectedAffiliate.paymentMethod.type}</p>
                                                {selectedAffiliate.paymentMethod.type === 'bank' && (
                                                    <>
                                                        <p><strong>Bank:</strong> {selectedAffiliate.paymentMethod.bankName}</p>
                                                        <p><strong>Account:</strong> ****{selectedAffiliate.paymentMethod.accountNumber?.slice(-4)}</p>
                                                        <p><strong>Routing:</strong> {selectedAffiliate.paymentMethod.routingNumber}</p>
                                                    </>
                                                )}
                                                {selectedAffiliate.paymentMethod.type === 'paypal' && (
                                                    <p><strong>PayPal:</strong> {selectedAffiliate.paymentMethod.paypalEmail}</p>
                                                )}
                                                {selectedAffiliate.paymentMethod.type === 'crypto' && (
                                                    <>
                                                        <p><strong>Currency:</strong> {selectedAffiliate.paymentMethod.cryptoCurrency}</p>
                                                        <p><strong>Wallet:</strong> {selectedAffiliate.paymentMethod.cryptoWallet}</p>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        {selectedAffiliate.payoutDetails && !selectedAffiliate.paymentMethod && (
                                            <div className="space-y-1 text-sm">
                                                <p><strong>Details:</strong></p>
                                                <pre className="text-xs bg-white p-2 rounded border">
                                                    {JSON.stringify(selectedAffiliate.payoutDetails, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {selectedAffiliate.lastPayoutDate && (
                                    <div>
                                        <Label className="text-sm font-medium text-gray-600">Last Payout</Label>
                                        <p className="text-lg">{new Date(selectedAffiliate.lastPayoutDate).toLocaleDateString()}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ===== PAYOUT PROCESSING MODAL ===== */}
                <Dialog open={showPayoutModal} onOpenChange={setShowPayoutModal}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Process Payout</DialogTitle>
                            <DialogDescription>
                                Process payout for {selectedAffiliate?.name}
                            </DialogDescription>
                        </DialogHeader>

                        {selectedAffiliate && (
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-gray-600">Affiliate:</span>
                                        <span className="font-medium">{selectedAffiliate.username || selectedAffiliate.name}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-gray-600">Email:</span>
                                        <span className="font-medium">{selectedAffiliate.email}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-gray-600">Payment Method:</span>
                                        <span className="font-medium">{selectedAffiliate.payoutMethod}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Available:</span>
                                        <span className="font-bold text-green-600">
                                            ${selectedAffiliate.pendingCommissions?.toFixed(2) || '0.00'}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="payoutAmount">Payout Amount ($) *</Label>
                                    <Input
                                        id="payoutAmount"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max={selectedAffiliate.pendingCommissions}
                                        value={payoutAmount}
                                        onChange={(e) => setPayoutAmount(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="transactionId">Transaction ID *</Label>
                                    <Input
                                        id="transactionId"
                                        value={transactionId}
                                        onChange={(e) => setTransactionId(e.target.value)}
                                        placeholder="Enter transaction/payment reference ID"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="payoutNotes">Notes (Optional)</Label>
                                    <Textarea
                                        id="payoutNotes"
                                        value={payoutNotes}
                                        onChange={(e) => setPayoutNotes(e.target.value)}
                                        placeholder="Additional notes about this payout..."
                                        rows={3}
                                    />
                                </div>

                                {payoutSuccess && (
                                    <Alert className="border-green-200 bg-green-50">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <AlertDescription className="text-green-800">{payoutSuccess}</AlertDescription>
                                    </Alert>
                                )}

                                {error && (
                                    <Alert className="border-red-200 bg-red-50">
                                        <AlertCircle className="h-4 w-4 text-red-600" />
                                        <AlertDescription className="text-red-800">{error}</AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="outline" onClick={handleClosePayout}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleProcessPayout}
                                disabled={payoutProcessing || !transactionId.trim() || !payoutAmount}
                            >
                                {payoutProcessing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Process Payout
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
