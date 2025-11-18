'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
    User,
    CreditCard,
    Save,
    Edit,
    Trash2,
    Plus,
    ArrowLeft,
    CheckCircle,
    XCircle,
    Loader2
} from 'lucide-react';

// ===== INTERFACES =====
interface UserProfile {
    _id: string;
    email: string;
    username?: string;
    name?: string;
    createdAt: string;
}

interface PaymentMethod {
    _id?: string;
    type: 'paypal' | 'bank' | 'crypto';
    isDefault?: boolean;
    // PayPal
    paypalEmail?: string;
    // Bank
    bankName?: string;
    accountNumber?: string;
    routingNumber?: string;
    accountHolderName?: string;
    swiftCode?: string;
    // Crypto
    cryptoWallet?: string;
    cryptoCurrency?: string;
}

interface AffiliateData {
    _id: string;
    email: string;
    name: string;
    payoutMode: 'paypal' | 'bank' | 'crypto';
    paymentMethod: PaymentMethod;
    status: string;
    createdAt: string;
}

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // ===== STATE MANAGEMENT =====
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [affiliateData, setAffiliateData] = useState<AffiliateData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingProfile, setEditingProfile] = useState(false);
    const [editingPayment, setEditingPayment] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form data for profile editing
    const [profileForm, setProfileForm] = useState({
        username: ''
    });

    // Form data for payment method editing
    const [paymentForm, setPaymentForm] = useState<PaymentMethod>({
        type: 'paypal',
        paypalEmail: '',
        bankName: '',
        accountNumber: '',
        routingNumber: '',
        accountHolderName: '',
        swiftCode: '',
        cryptoWallet: '',
        cryptoCurrency: 'bitcoin'
    });

    // ===== AUTHENTICATION CHECK =====
    useEffect(() => {
        if (status === 'loading') return;

        if (!session) {
            router.push('/signin?callbackUrl=/profile');
            return;
        }

        loadUserData();
    }, [session, status, router]);

    // ===== API FUNCTIONS =====
    const loadUserData = async () => {
        try {
            setLoading(true);
            setError('');

            // Load user profile data
            if (session?.user) {
                setUserProfile({
                    _id: session.user._id || '',
                    email: session.user.email || '',
                    username: session.user.username || '',
                    name: session.user.name || '',
                    createdAt: new Date().toISOString()
                });

                setProfileForm({
                    username: session.user.username || ''
                });
            }

            // Check if user is an affiliate and load payment methods
            const affiliateResponse = await fetch('/api/affiliate/status');
            if (affiliateResponse.ok) {
                const data = await affiliateResponse.json();
                console.log('Affiliate status response:', data);

                if (data.isAffiliate && data.affiliate) {
                    setAffiliateData(data.affiliate);

                    // Pre-populate payment form with existing data
                    if (data.affiliate.paymentMethod) {
                        setPaymentForm({
                            ...data.affiliate.paymentMethod,
                            type: data.affiliate.payoutMode
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            setError('Failed to load profile data');
        } finally {
            setLoading(false);
        }
    };

    const updateProfile = async () => {
        try {
            setSaving(true);
            setError('');

            const response = await fetch('/api/user/update-profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profileForm),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess('Profile updated successfully!');
                setEditingProfile(false);

                // Update local state
                if (userProfile) {
                    setUserProfile({
                        ...userProfile,
                        username: profileForm.username
                    });
                }

                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(data.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            setError('Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const updatePaymentMethod = async () => {
        try {
            setSaving(true);
            setError('');

            const response = await fetch('/api/affiliate/update-payment', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    payoutMode: paymentForm.type,
                    paymentMethod: paymentForm
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess('Payment method updated successfully!');
                setEditingPayment(false);

                // Reload affiliate data
                await loadUserData();

                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(data.message || 'Failed to update payment method');
            }
        } catch (error) {
            console.error('Payment update error:', error);
            setError('Network error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // ===== UTILITY FUNCTIONS =====
    const handleProfileInputChange = (field: string, value: string) => {
        setProfileForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handlePaymentInputChange = (field: string, value: string) => {
        setPaymentForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const isPaymentFormValid = () => {
        switch (paymentForm.type) {
            case 'paypal':
                return paymentForm.paypalEmail && paymentForm.paypalEmail.includes('@');
            case 'bank':
                return paymentForm.bankName && paymentForm.accountNumber &&
                    paymentForm.routingNumber && paymentForm.accountHolderName;
            case 'crypto':
                return paymentForm.cryptoWallet && paymentForm.cryptoWallet.length > 10;
            default:
                return false;
        }
    };

    // ===== LOADING STATE =====
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    // ===== UNAUTHENTICATED STATE =====
    if (!session) {
        return null;
    }

    // ===== MAIN RENDER =====
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.back()}
                                className="flex items-center"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                    Profile Settings
                                </h1>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Manage your account information and preferences
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <User className="w-8 h-8 text-gray-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Alerts */}
                {error && (
                    <Alert className="mb-6 border-red-200 bg-red-50 text-red-800">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert className="mb-6 border-green-200 bg-green-50 text-green-800">
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>{success}</AlertDescription>
                    </Alert>
                )}

                <Tabs defaultValue="profile" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="profile">Profile Information</TabsTrigger>
                        <TabsTrigger value="payment">Payment Methods</TabsTrigger>
                    </TabsList>

                    {/* Profile Information Tab */}
                    <TabsContent value="profile">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span className="flex items-center">
                                        <User className="w-5 h-5 mr-2" />
                                        Profile Information
                                    </span>
                                    <Button
                                        variant={editingProfile ? "secondary" : "outline"}
                                        size="sm"
                                        onClick={() => setEditingProfile(!editingProfile)}
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        {editingProfile ? 'Cancel' : 'Edit'}
                                    </Button>
                                </CardTitle>
                                <CardDescription>
                                    Update your personal information and account details
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Email (read-only) */}
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={userProfile?.email || ''}
                                        disabled
                                        className="bg-gray-50 dark:bg-gray-800"
                                    />
                                    <p className="text-sm text-gray-500">
                                        Email cannot be changed for security reasons
                                    </p>
                                </div>

                                <Separator />

                                {/* Editable Fields */}
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="username">Username</Label>
                                        <Input
                                            id="username"
                                            value={profileForm.username}
                                            onChange={(e) => handleProfileInputChange('username', e.target.value)}
                                            disabled={!editingProfile}
                                            placeholder="Enter your username"
                                        />
                                    </div>
                                </div>

                                {editingProfile && (
                                    <div className="flex justify-end space-x-2 pt-4">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setEditingProfile(false);
                                                setProfileForm({
                                                    username: userProfile?.username || ''
                                                });
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={updateProfile}
                                            disabled={saving}
                                        >
                                            {saving ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-4 h-4 mr-2" />
                                                    Save Changes
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}

                                {/* Account Info */}
                                <Separator />
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                    <h4 className="font-medium mb-2">Account Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-600 dark:text-gray-400">Account Type:</span>
                                            <div className="flex items-center space-x-2 mt-1">
                                                <Badge variant={affiliateData ? "default" : "secondary"}>
                                                    {affiliateData ? 'Affiliate Member' : 'Regular User'}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-gray-600 dark:text-gray-400">Member Since:</span>
                                            <p className="mt-1">
                                                {userProfile?.createdAt ?
                                                    new Date(userProfile.createdAt).toLocaleDateString('en-US', {
                                                        month: 'long',
                                                        year: 'numeric'
                                                    }) :
                                                    'N/A'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Payment Methods Tab */}
                    <TabsContent value="payment">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span className="flex items-center">
                                        <CreditCard className="w-5 h-5 mr-2" />
                                        Payment Methods
                                    </span>
                                    {affiliateData && (
                                        <Button
                                            variant={editingPayment ? "secondary" : "outline"}
                                            size="sm"
                                            onClick={() => setEditingPayment(!editingPayment)}
                                        >
                                            <Edit className="w-4 h-4 mr-2" />
                                            {editingPayment ? 'Cancel' : 'Edit'}
                                        </Button>
                                    )}
                                </CardTitle>
                                <CardDescription>
                                    {affiliateData ?
                                        'Manage your payout methods for affiliate commissions' :
                                        'Join our affiliate program to add payment methods'
                                    }
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!affiliateData ? (
                                    // Not an affiliate
                                    <div className="text-center py-8">
                                        <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium mb-2">No Payment Methods</h3>
                                        <p className="text-gray-600 mb-4">
                                            You need to be an affiliate to add payment methods
                                        </p>
                                        <Button onClick={() => router.push('/affiliate-dashboard')}>
                                            Join Affiliate Program
                                        </Button>
                                    </div>
                                ) : editingPayment ? (
                                    // Editing payment method
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Payment Method Type</Label>
                                            <Select
                                                value={paymentForm.type}
                                                onValueChange={(value: 'paypal' | 'bank' | 'crypto') => {
                                                    setPaymentForm(prev => ({ ...prev, type: value }));
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="paypal">PayPal</SelectItem>
                                                    <SelectItem value="bank">Bank Transfer</SelectItem>
                                                    <SelectItem value="crypto">Cryptocurrency</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* PayPal Fields */}
                                        {paymentForm.type === 'paypal' && (
                                            <div className="space-y-2">
                                                <Label htmlFor="paypal-email">PayPal Email</Label>
                                                <Input
                                                    id="paypal-email"
                                                    type="email"
                                                    value={paymentForm.paypalEmail || ''}
                                                    onChange={(e) => handlePaymentInputChange('paypalEmail', e.target.value)}
                                                    placeholder="your-paypal@email.com"
                                                />
                                            </div>
                                        )}

                                        {/* Bank Fields */}
                                        {paymentForm.type === 'bank' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="bank-name">Bank Name</Label>
                                                    <Input
                                                        id="bank-name"
                                                        value={paymentForm.bankName || ''}
                                                        onChange={(e) => handlePaymentInputChange('bankName', e.target.value)}
                                                        placeholder="Bank of America"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="account-holder">Account Holder Name</Label>
                                                    <Input
                                                        id="account-holder"
                                                        value={paymentForm.accountHolderName || ''}
                                                        onChange={(e) => handlePaymentInputChange('accountHolderName', e.target.value)}
                                                        placeholder="John Doe"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="account-number">Account Number</Label>
                                                    <Input
                                                        id="account-number"
                                                        value={paymentForm.accountNumber || ''}
                                                        onChange={(e) => handlePaymentInputChange('accountNumber', e.target.value)}
                                                        placeholder="1234567890"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="routing-number">Routing Number</Label>
                                                    <Input
                                                        id="routing-number"
                                                        value={paymentForm.routingNumber || ''}
                                                        onChange={(e) => handlePaymentInputChange('routingNumber', e.target.value)}
                                                        placeholder="021000021"
                                                    />
                                                </div>
                                                <div className="space-y-2 md:col-span-2">
                                                    <Label htmlFor="swift-code">SWIFT Code (Optional)</Label>
                                                    <Input
                                                        id="swift-code"
                                                        value={paymentForm.swiftCode || ''}
                                                        onChange={(e) => handlePaymentInputChange('swiftCode', e.target.value)}
                                                        placeholder="BOFAUS3N"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {/* Crypto Fields */}
                                        {paymentForm.type === 'crypto' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="crypto-currency">Cryptocurrency</Label>
                                                    <Select
                                                        value={paymentForm.cryptoCurrency || 'bitcoin'}
                                                        onValueChange={(value) => handlePaymentInputChange('cryptoCurrency', value)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="bitcoin">Bitcoin (BTC)</SelectItem>
                                                            <SelectItem value="ethereum">Ethereum (ETH)</SelectItem>
                                                            <SelectItem value="usdt">Tether (USDT)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="crypto-wallet">Wallet Address</Label>
                                                    <Input
                                                        id="crypto-wallet"
                                                        value={paymentForm.cryptoWallet || ''}
                                                        onChange={(e) => handlePaymentInputChange('cryptoWallet', e.target.value)}
                                                        placeholder="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-end space-x-2 pt-4">
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setEditingPayment(false);
                                                    // Reset form to current affiliate data
                                                    if (affiliateData?.paymentMethod) {
                                                        setPaymentForm({
                                                            ...affiliateData.paymentMethod,
                                                            type: affiliateData.payoutMode
                                                        });
                                                    }
                                                }}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={updatePaymentMethod}
                                                disabled={saving || !isPaymentFormValid()}
                                            >
                                                {saving ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="w-4 h-4 mr-2" />
                                                        Save Payment Method
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    // Display current payment method
                                    <div className="space-y-4">
                                        <div className="border rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium">Current Payment Method</h4>
                                                <Badge variant="secondary">
                                                    {affiliateData.payoutMode?.toUpperCase()}
                                                </Badge>
                                            </div>

                                            <div className="text-sm text-gray-600 space-y-1">
                                                {affiliateData.payoutMode === 'paypal' && affiliateData.paymentMethod.paypalEmail && (
                                                    <p><strong>PayPal Email:</strong> {affiliateData.paymentMethod.paypalEmail}</p>
                                                )}

                                                {affiliateData.payoutMode === 'bank' && (
                                                    <>
                                                        <p><strong>Bank:</strong> {affiliateData.paymentMethod.bankName}</p>
                                                        <p><strong>Account:</strong> ****{affiliateData.paymentMethod.accountNumber?.slice(-4)}</p>
                                                        <p><strong>Holder:</strong> {affiliateData.paymentMethod.accountHolderName}</p>
                                                    </>
                                                )}

                                                {affiliateData.payoutMode === 'crypto' && affiliateData.paymentMethod.cryptoWallet && (
                                                    <>
                                                        <p><strong>Currency:</strong> {affiliateData.paymentMethod.cryptoCurrency?.toUpperCase() || 'BTC'}</p>
                                                        <p><strong>Wallet:</strong> {affiliateData.paymentMethod.cryptoWallet.substring(0, 20)}...</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <Alert>
                                            <AlertDescription>
                                                Click "Edit" to update your payment method. Changes will affect future payouts.
                                            </AlertDescription>
                                        </Alert>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
