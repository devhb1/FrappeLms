'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';

// Simple validation functions
const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePaymentMethod = (method: any) => {
    const errors: Record<string, string> = {};

    if (method.type === 'paypal' && (!method.paypalEmail || !validateEmail(method.paypalEmail))) {
        errors.paypalEmail = 'Valid PayPal email is required';
    }
    if (method.type === 'crypto' && !method.cryptoWallet) {
        errors.cryptoWallet = 'Crypto wallet address is required';
    }
    if (method.type === 'bank' && !method.accountNumber) {
        errors.accountNumber = 'Account number is required';
    }

    return { isValid: Object.keys(errors).length === 0, errors };
};

export default function AffiliateRegistrationPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // Form state
    const [payoutMode, setPayoutMode] = useState<'paypal' | 'bank' | 'crypto'>('paypal');
    const [formData, setFormData] = useState({
        // PayPal
        paypalEmail: '',
        // Bank
        bankName: '',
        accountNumber: '',
        routingNumber: '',
        accountHolderName: '',
        swiftCode: '',
        // Crypto
        cryptoWallet: '',
        cryptoCurrency: 'bitcoin'
    });

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Real-time validation
    const validateField = (field: string, value: string) => {
        const paymentMethodData: any = { type: payoutMode };

        if (payoutMode === 'paypal' && field === 'paypalEmail') {
            paymentMethodData.paypalEmail = value;
        } else if (payoutMode === 'crypto' && field === 'cryptoWallet') {
            paymentMethodData.cryptoWallet = value;
            paymentMethodData.cryptoCurrency = formData.cryptoCurrency;
        } else if (payoutMode === 'bank') {
            paymentMethodData.accountNumber = field === 'accountNumber' ? value : formData.accountNumber;
            paymentMethodData.routingNumber = field === 'routingNumber' ? value : formData.routingNumber;
            paymentMethodData.accountHolderName = field === 'accountHolderName' ? value : formData.accountHolderName;
            paymentMethodData.bankName = field === 'bankName' ? value : formData.bankName;
            paymentMethodData.swiftCode = field === 'swiftCode' ? value : formData.swiftCode;
        }

        const validation = validatePaymentMethod(paymentMethodData);
        setFieldErrors(prev => ({
            ...prev,
            [field]: validation.errors[field] || ''
        }));
    };

    // Redirect if not authenticated
    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!session) {
        router.push('/signin?callbackUrl=/affiliate-registration');
        return null;
    }

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Validate field in real-time for payment method fields
        if (['paypalEmail', 'cryptoWallet', 'accountNumber', 'routingNumber', 'accountHolderName', 'bankName', 'swiftCode'].includes(field)) {
            validateField(field, value);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            // Prepare payment method data for validation
            const paymentMethodData: any = { type: payoutMode };

            if (payoutMode === 'paypal') {
                paymentMethodData.paypalEmail = formData.paypalEmail;
            } else if (payoutMode === 'bank') {
                paymentMethodData.accountNumber = formData.accountNumber;
                paymentMethodData.routingNumber = formData.routingNumber;
                paymentMethodData.accountHolderName = formData.accountHolderName;
                paymentMethodData.bankName = formData.bankName;
                paymentMethodData.swiftCode = formData.swiftCode;
            } else if (payoutMode === 'crypto') {
                paymentMethodData.cryptoWallet = formData.cryptoWallet;
                paymentMethodData.cryptoCurrency = formData.cryptoCurrency;
            }

            // Enhanced validation using the new validation functions
            const validation = validatePaymentMethod(paymentMethodData);
            if (!validation.isValid) {
                const firstError = Object.values(validation.errors)[0];
                throw new Error(firstError);
            }

            // Prepare payment method for API
            const paymentMethod = paymentMethodData;

            const response = await fetch('/api/affiliate/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    payoutMode,
                    paymentMethod
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Registration failed');
            }

            setSuccess('Successfully registered as affiliate! Redirecting to dashboard...');

            // Redirect to dashboard after a delay
            setTimeout(() => {
                router.push('/affiliate-dashboard');
            }, 2000);

        } catch (err: any) {
            setError(err.message || 'An error occurred during registration');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between py-6">
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="outline"
                                onClick={() => router.back()}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Affiliate Registration
                                </h1>
                                <p className="text-gray-600">
                                    Join our affiliate program and start earning commissions
                                </p>
                            </div>
                        </div>
                        <Badge className="bg-orange-100 text-orange-800">
                            10% Commission Rate
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Alerts */}
                {error && (
                    <Alert className="mb-6 border-red-200 bg-red-50">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-800">{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert className="mb-6 border-green-200 bg-green-50">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-800">{success}</AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Program Benefits */}
                    <div className="lg:col-span-1">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Users className="w-5 h-5 mr-2" />
                                    Program Benefits
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-start space-x-3">
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">10% Commission</h4>
                                        <p className="text-sm text-gray-600">Earn on every successful enrollment</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">Monthly Payouts</h4>
                                        <p className="text-sm text-gray-600">Regular payments via your preferred method</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">Real-time Tracking</h4>
                                        <p className="text-sm text-gray-600">Monitor earnings and referrals</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                    <div>
                                        <h4 className="font-medium">Marketing Support</h4>
                                        <p className="text-sm text-gray-600">Access to promotional materials</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Registration Form */}
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Registration Details</CardTitle>
                                <CardDescription>
                                    Choose your payment method and provide the necessary information
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleSubmit} className="space-y-6">

                                    {/* Payout Method Selection */}
                                    <div>
                                        <Label htmlFor="payoutMode">Payout Method</Label>
                                        <Select value={payoutMode} onValueChange={(value: 'paypal' | 'bank' | 'crypto') => setPayoutMode(value)}>
                                            <SelectTrigger className="mt-1">
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
                                    {payoutMode === 'paypal' && (
                                        <div>
                                            <Label htmlFor="paypalEmail">PayPal Email</Label>
                                            <Input
                                                id="paypalEmail"
                                                type="email"
                                                value={formData.paypalEmail}
                                                onChange={(e) => handleInputChange('paypalEmail', e.target.value)}
                                                placeholder="your@email.com"
                                                required
                                                className={`mt-1 ${fieldErrors.paypalEmail ? 'border-red-500 focus:border-red-500' : ''}`}
                                            />
                                            {fieldErrors.paypalEmail && (
                                                <p className="mt-1 text-sm text-red-600">{fieldErrors.paypalEmail}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Bank Fields */}
                                    {payoutMode === 'bank' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="bankName">Bank Name</Label>
                                                <Input
                                                    id="bankName"
                                                    value={formData.bankName}
                                                    onChange={(e) => handleInputChange('bankName', e.target.value)}
                                                    placeholder="Bank of America"
                                                    required
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="accountHolderName">Account Holder Name</Label>
                                                <Input
                                                    id="accountHolderName"
                                                    value={formData.accountHolderName}
                                                    onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
                                                    placeholder="John Doe"
                                                    required
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="accountNumber">Account Number</Label>
                                                <Input
                                                    id="accountNumber"
                                                    value={formData.accountNumber}
                                                    onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                                                    placeholder="1234567890"
                                                    required
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="routingNumber">Routing Number</Label>
                                                <Input
                                                    id="routingNumber"
                                                    value={formData.routingNumber}
                                                    onChange={(e) => handleInputChange('routingNumber', e.target.value)}
                                                    placeholder="123456789"
                                                    required
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <Label htmlFor="swiftCode">SWIFT Code (Optional)</Label>
                                                <Input
                                                    id="swiftCode"
                                                    value={formData.swiftCode}
                                                    onChange={(e) => handleInputChange('swiftCode', e.target.value)}
                                                    placeholder="BOFAUS3N"
                                                    className="mt-1"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Crypto Fields */}
                                    {payoutMode === 'crypto' && (
                                        <div className="space-y-4">
                                            <div>
                                                <Label htmlFor="cryptoCurrency">Cryptocurrency</Label>
                                                <Select value={formData.cryptoCurrency} onValueChange={(value) => handleInputChange('cryptoCurrency', value)}>
                                                    <SelectTrigger className="mt-1">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="bitcoin">Bitcoin (BTC)</SelectItem>
                                                        <SelectItem value="ethereum">Ethereum (ETH)</SelectItem>
                                                        <SelectItem value="usdt">Tether (USDT)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label htmlFor="cryptoWallet">Wallet Address</Label>
                                                <Input
                                                    id="cryptoWallet"
                                                    value={formData.cryptoWallet}
                                                    onChange={(e) => handleInputChange('cryptoWallet', e.target.value)}
                                                    placeholder="Your crypto wallet address"
                                                    required
                                                    className={`mt-1 ${fieldErrors.cryptoWallet ? 'border-red-500 focus:border-red-500' : ''}`}
                                                />
                                                {fieldErrors.cryptoWallet && (
                                                    <p className="mt-1 text-sm text-red-600">{fieldErrors.cryptoWallet}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Terms Notice */}
                                    <Alert>
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            By registering as an affiliate, you agree to our terms and conditions.
                                            Commission payments are processed monthly with a minimum payout of $50.
                                        </AlertDescription>
                                    </Alert>

                                    {/* Submit Button */}
                                    <Button
                                        type="submit"
                                        className="w-full bg-orange-600 hover:bg-orange-700"
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Registering...
                                            </>
                                        ) : (
                                            <>
                                                <Users className="w-4 h-4 mr-2" />
                                                Complete Registration
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
