'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Loader2, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react'

interface CheckoutProgressProps {
    courseId: string
    email: string
    couponCode?: string
    affiliateEmail?: string
    onSuccess: (result: any) => void
    onError: (error: string) => void
}

interface CheckoutStep {
    id: string
    label: string
    status: 'pending' | 'loading' | 'completed' | 'error'
    error?: string
}

export default function EnhancedCheckoutFlow({
    courseId,
    email,
    couponCode,
    affiliateEmail,
    onSuccess,
    onError
}: CheckoutProgressProps) {
    const [steps, setSteps] = useState<CheckoutStep[]>([
        { id: 'verify', label: 'Verifying Frappe LMS user', status: 'pending' },
        { id: 'validation', label: 'Validating request', status: 'pending' },
        { id: 'coupon', label: 'Processing coupon', status: 'pending' },
        { id: 'enrollment', label: 'Creating enrollment', status: 'pending' },
        { id: 'payment', label: 'Processing payment', status: 'pending' }
    ])

    const [currentStep, setCurrentStep] = useState(0)
    const [isProcessing, setIsProcessing] = useState(false)
    const [retryCount, setRetryCount] = useState(0)
    const [requestId, setRequestId] = useState<string | null>(null)
    const [userVerified, setUserVerified] = useState(false)
    const [frappeUser, setFrappeUser] = useState<any>(null)
    const [showRegistrationPrompt, setShowRegistrationPrompt] = useState(false)
    const [registrationUrl, setRegistrationUrl] = useState<string>('')
    const [showWelcomeMessage, setShowWelcomeMessage] = useState(false)

    const updateStepStatus = (stepId: string, status: CheckoutStep['status'], error?: string) => {
        setSteps(prev => prev.map(step =>
            step.id === stepId ? { ...step, status, error } : step
        ))
    }

    const getProgressPercentage = () => {
        const completedSteps = steps.filter(step => step.status === 'completed').length
        return (completedSteps / steps.length) * 100
    }

    const verifyFrappeUser = async () => {
        try {
            updateStepStatus('verify', 'loading')

            const response = await fetch('/api/verify-frappe-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email.toLowerCase() })
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Verification failed')
            }

            if (result.exists) {
                setFrappeUser(result.user)
                setUserVerified(true)
                setShowWelcomeMessage(true)
                updateStepStatus('verify', 'completed')
                return true
            } else {
                // User doesn't exist, show registration prompt
                setRegistrationUrl(result.registrationUrl || 'https://lms.maaledu.com/signup')
                setShowRegistrationPrompt(true)
                updateStepStatus('verify', 'error', 'Frappe LMS account required')
                return false
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Verification failed'
            updateStepStatus('verify', 'error', errorMessage)
            return false
        }
    }

    const handleRegistrationRedirect = () => {
        window.open(registrationUrl, '_blank')
    }

    const handleRetryVerification = () => {
        // Reset all verification-related states
        setShowRegistrationPrompt(false)
        setUserVerified(false)
        setFrappeUser(null)
        setShowWelcomeMessage(false)
        // Reset the verify step to pending
        updateStepStatus('verify', 'pending')
        // Don't automatically start - user needs to click Start Enrollment again
    }

    const processCheckout = async (isRetry: boolean = false) => {
        if (isProcessing) return

        setIsProcessing(true)

        // Generate or reuse requestId for idempotency
        const currentRequestId = requestId || `checkout_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        if (!requestId) setRequestId(currentRequestId)

        try {
            // Step 1: Verify Frappe User (NEW - Pre-payment verification)
            if (!userVerified) {
                setCurrentStep(0)
                const verified = await verifyFrappeUser()
                if (!verified) {
                    setIsProcessing(false)
                    return // Stop here if user doesn't exist
                }
            }

            // Step 2: Validation
            setCurrentStep(1)
            updateStepStatus('validation', 'loading')

            await new Promise(resolve => setTimeout(resolve, 500)) // Visual feedback

            if (!email || !courseId) {
                throw new Error('Missing required information')
            }

            updateStepStatus('validation', 'completed')

            // Step 3: Coupon Processing (if applicable)
            setCurrentStep(2)
            if (couponCode) {
                updateStepStatus('coupon', 'loading')
                await new Promise(resolve => setTimeout(resolve, 300))
                updateStepStatus('coupon', 'completed')
            } else {
                updateStepStatus('coupon', 'completed') // Skip if no coupon
            }

            // Step 4: Enrollment Creation
            setCurrentStep(3)
            updateStepStatus('enrollment', 'loading')

            const checkoutRequest = {
                courseId,
                email: email?.toLowerCase() || undefined,
                couponCode: couponCode?.toUpperCase() || undefined,
                affiliateEmail: affiliateEmail?.toLowerCase() || undefined,
                redirectSource: 'direct',
                requestId: currentRequestId
            }

            console.log('🚀 Starting enhanced checkout:', checkoutRequest)

            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(checkoutRequest)
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || `Server error: ${response.status}`)
            }

            updateStepStatus('enrollment', 'completed')

            // Step 5: Payment Processing
            setCurrentStep(4)
            updateStepStatus('payment', 'loading')

            if (result.directEnrollment) {
                // Free enrollment completed
                await new Promise(resolve => setTimeout(resolve, 500))
                updateStepStatus('payment', 'completed')

                console.log('✅ Free enrollment completed')
                onSuccess(result)
            } else if (result.checkoutUrl) {
                // Redirect to Stripe for payment
                updateStepStatus('payment', 'completed')
                window.location.href = result.checkoutUrl
            } else {
                throw new Error('Invalid response from server')
            }

        } catch (error) {
            console.error('❌ Checkout failed:', error)

            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            const currentStepId = steps[currentStep]?.id || 'unknown'

            updateStepStatus(currentStepId, 'error', errorMessage)

            // Provide specific error guidance
            let userFriendlyMessage = errorMessage

            if (errorMessage.includes('already enrolled')) {
                userFriendlyMessage = 'You are already enrolled in this course. Check your dashboard for access.'
            } else if (errorMessage.includes('Invalid coupon')) {
                userFriendlyMessage = 'The coupon code is invalid, expired, or not authorized for your account.'
            } else if (errorMessage.includes('already used')) {
                userFriendlyMessage = 'This coupon has already been used. Each coupon can only be used once.'
            } else if (errorMessage.includes('not valid for the selected course')) {
                userFriendlyMessage = 'This coupon is not valid for the selected course.'
            } else if (errorMessage.includes('Course not found')) {
                userFriendlyMessage = 'The requested course could not be found.'
            } else if (errorMessage.includes('Network')) {
                userFriendlyMessage = 'Network connection issue. Please check your internet and try again.'
            }

            onError(userFriendlyMessage)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleRetry = () => {
        if (retryCount < 3) {
            setRetryCount(prev => prev + 1)
            // Reset verification state to ensure it runs again
            setUserVerified(false)
            setShowRegistrationPrompt(false)
            setFrappeUser(null)
            setShowWelcomeMessage(false)
            // Reset failed steps
            setSteps(prev => prev.map(step =>
                step.status === 'error' ? { ...step, status: 'pending', error: undefined } : step
            ))
            setCurrentStep(0)
            processCheckout(true)
        }
    }

    const getStepIcon = (step: CheckoutStep) => {
        switch (step.status) {
            case 'completed':
                return <CheckCircle className="h-5 w-5 text-green-500" />
            case 'loading':
                return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            case 'error':
                return <XCircle className="h-5 w-5 text-red-500" />
            default:
                return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
        }
    }

    const hasErrors = steps.some(step => step.status === 'error')
    const canRetry = hasErrors && retryCount < 3 && !isProcessing

    return (
        <Card className="w-full max-w-md mx-auto p-2 sm:p-4 md:p-6 overflow-auto">
            <CardHeader>
                <CardTitle>Processing Your Enrollment</CardTitle>
                <CardDescription>
                    Please wait while we process your enrollment...
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Progress</span>
                        <span>{Math.round(getProgressPercentage())}%</span>
                    </div>
                    <Progress value={getProgressPercentage()} className="h-2" />
                </div>

                {/* Welcome Message */}
                {showWelcomeMessage && frappeUser && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <div className="text-sm text-green-800">
                            <span className="font-medium">Welcome back, {frappeUser.fullName || frappeUser.username}!</span>
                            <span className="block text-xs text-green-700 mt-0.5">Your Frappe LMS account has been verified.</span>
                        </div>
                    </div>
                )}

                {/* Steps */}
                <div className="space-y-3">
                    {steps.map((step, index) => (
                        <div key={step.id} className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${currentStep === index ? 'bg-blue-50' : ''
                            }`}>
                            {getStepIcon(step)}
                            <div className="flex-1">
                                <div className="text-sm font-medium">{step.label}</div>
                                {step.error && (
                                    <div className="text-xs text-red-600 mt-1">{step.error}</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Error Message & Retry */}
                {hasErrors && !showRegistrationPrompt && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Enrollment failed. {canRetry ? 'You can retry the process.' : 'Maximum retries reached.'}
                            <br />
                            <span className="block mt-2 text-xs text-gray-700 dark:text-gray-300">
                                If you used a coupon, please double-check it is correct, unused, and valid for this course. If issues persist, contact support or try again later.
                            </span>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Registration Prompt */}
                {showRegistrationPrompt && (
                    <Alert className="border-orange-500 bg-orange-50">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <AlertDescription>
                            <div className="space-y-2">
                                <p className="font-medium text-orange-900">Frappe LMS Account Required</p>
                                <p className="text-sm text-orange-800">
                                    You need a Frappe LMS account to complete enrollment. Please register first, then return to complete your purchase.
                                </p>
                                <div className="flex gap-2 mt-2">
                                    <Button
                                        onClick={handleRegistrationRedirect}
                                        variant="outline"
                                        className="flex-1 border-orange-500 text-orange-700 hover:bg-orange-100"
                                    >
                                        Register on Frappe LMS <ExternalLink className="ml-2 h-4 w-4" />
                                    </Button>
                                    <Button
                                        onClick={handleRetryVerification}
                                        variant="outline"
                                        className="flex-1 border-green-500 text-green-700 hover:bg-green-100"
                                    >
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Already Registered?
                                    </Button>
                                </div>
                                <p className="text-xs text-orange-700 mt-2">
                                    After registering on Frappe LMS, click "Already Registered?" to verify your account.
                                </p>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2">
                    {!isProcessing && !hasErrors && (
                        <Button onClick={() => processCheckout()} className="flex-1">
                            Start Enrollment
                        </Button>
                    )}

                    {canRetry && (
                        <Button onClick={handleRetry} variant="outline" className="flex-1">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Retry ({3 - retryCount} attempts left)
                        </Button>
                    )}
                </div>

                {/* Processing Info */}
                {isProcessing && (
                    <div className="text-center text-sm text-gray-600">
                        <Loader2 className="h-4 w-4 mx-auto mb-2 animate-spin" />
                        Processing your enrollment...
                    </div>
                )}

                {/* Request ID for support */}
                {requestId && (
                    <div className="text-xs text-gray-500 text-center">
                        Request ID: {requestId}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
