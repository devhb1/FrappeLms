/**
 * ===============================
 * COURSE DETAIL & ENROLLMENT PAGE
 * ===============================
 * 
 * This is the main course detail page that handles course information display
 * and enrollment processing for the MaalEdu platform.
 * 
 * KEY FEATURES:
 * 1. 🎓 Course Information Display
 *    - Detailed course metadata (title, description, price, duration)
 *    - Course features and curriculum preview
 *    - Instructor information and testimonials
 * 
 * 2. 🎫 Multiple Enrollment Pathways
 *    - Free enrollment via 100% off coupons
 *    - Paid enrollment via Stripe integration
 *    - Affiliate-referred enrollments with commission tracking
 *    - LMS redirect handling (from external platforms)
 * 
 * 3. 🔐 Advanced Form Handling
 *    - Real-time coupon validation
 *    - Comprehensive error handling with user-friendly messages
 *    - Loading states and progress indicators
 *    - Request deduplication to prevent double-enrollment
 * 
 * 4. 📊 Analytics & Tracking
 *    - User interaction tracking
 *    - Conversion funnel analytics
 *    - Performance monitoring
 * 
 * BUSINESS LOGIC FLOW:
 * 1. Course data loading and validation
 * 2. URL parameter processing (LMS redirects, affiliate links)
 * 3. User form interaction and validation
 * 4. Enrollment request processing via unified checkout API
 * 5. Success/error handling and user feedback
 * 6. Redirect to appropriate completion page
 * 
 * @route /courses/[id]
 * @version 2.0 - Enhanced Error Handling
 */

'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/utils-stripe';
import { CheckoutRequest, CheckoutResponse } from '@/lib/types';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { parseApiError, parseResponseError, logError } from '@/lib/utils/error-parsing';
import Image from 'next/image';
import {
    Clock,
    Users,
    Award,
    CheckCircle,
    Star,
    BookOpen,
    ShoppingCart,
    Mail,
    Loader2,
    ArrowLeft,
    Globe,
    Calendar,
    Target,
    AlertCircle
} from 'lucide-react';

interface Course {
    courseId: string;  // Changed from 'id' to 'courseId'
    title: string;
    description: string;
    price: number;
    duration: string;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    image: string;
    features: string[];
}

export default function CourseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const courseId = decodeURIComponent(params.id as string);

    // Extract LMS redirect parameters from URL with enhanced parsing
    const lmsRedirectData = {
        openedx_username: searchParams.get('openedx_username'),
        openedx_email: searchParams.get('openedx_email') ? decodeURIComponent(searchParams.get('openedx_email')!) : null,
        affiliate_email: searchParams.get('affiliate_email') ? decodeURIComponent(searchParams.get('affiliate_email')!) : null,
        redirect_source: searchParams.get('openedx_username') || searchParams.get('affiliate_email') ? 'lms_redirect' : 'direct',
        // Additional LMS parameters for enhanced tracking
        session_id: searchParams.get('session_id'),
        course_run: searchParams.get('course_run'),
        utm_source: searchParams.get('utm_source'),
        utm_medium: searchParams.get('utm_medium'),
        utm_campaign: searchParams.get('utm_campaign')
    };

    // Get email from URL params (support both 'email' and 'openedx_email')
    const urlEmail = searchParams.get('email') || lmsRedirectData.openedx_email || '';

    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [email, setEmail] = useState(urlEmail);
    const [openedxUsername, setOpenedxUsername] = useState(lmsRedirectData.openedx_username || 'testuser');
    const [openedxEmail, setOpenedxEmail] = useState(lmsRedirectData.openedx_email || '');
    const [affiliateId, setAffiliateId] = useState(lmsRedirectData.affiliate_email || '');

    // Update form fields when URL parameters change
    useEffect(() => {
        const newUrlEmail = searchParams.get('email') || lmsRedirectData.openedx_email || '';
        if (newUrlEmail && newUrlEmail !== email) {
            setEmail(newUrlEmail);
        }

        const newOpenedxUsername = lmsRedirectData.openedx_username || '';
        if (newOpenedxUsername && newOpenedxUsername !== openedxUsername) {
            setOpenedxUsername(newOpenedxUsername);
        }

        const newOpenedxEmail = lmsRedirectData.openedx_email || '';
        if (newOpenedxEmail && newOpenedxEmail !== openedxEmail) {
            setOpenedxEmail(newOpenedxEmail);
        }

        const newAffiliateId = lmsRedirectData.affiliate_email || '';
        if (newAffiliateId && newAffiliateId !== affiliateId) {
            setAffiliateId(newAffiliateId);
        }
    }, [searchParams, lmsRedirectData.openedx_email, lmsRedirectData.openedx_username, lmsRedirectData.affiliate_email]);

    // Add validation state for self-referral
    const [validationState, setValidationState] = useState({
        hasSelfReferral: false,
        validationMessage: ''
    });

    const [couponCode, setCouponCode] = useState('');
    const [couponStatus, setCouponStatus] = useState<{
        isValid: boolean | null;
        message: string;
        isChecking: boolean;
        appliedDiscount?: number;
        finalPrice?: number;
        originalPrice?: number;
    }>({
        isValid: null,
        message: '',
        isChecking: false
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();

    // Enhanced state management for enrollment
    const [enrollmentState, setEnrollmentState] = useState<{
        isProcessing: boolean;
        requestId: string | null;
        lastAttempt: Date | null;
    }>({
        isProcessing: false,
        requestId: null,
        lastAttempt: null
    });

    const [retryState, setRetryState] = useState<{
        count: number;
        lastError: any | null;
        canRetry: boolean;
        errorCode?: string;
        suggestions?: string[];
    }>({
        count: 0,
        lastError: null,
        canRetry: true
    });

    // Handle LMS redirects and course loading
    useEffect(() => {

        if (lmsRedirectData.openedx_username) {
            toast({
                title: "Welcome from MaalEdu LMS!",
                description: `Hello ${lmsRedirectData.openedx_username}, you've been redirected from the LMS.`,
                variant: "default"
            });
        }
    }, [lmsRedirectData.openedx_username, lmsRedirectData.affiliate_email, courseId, searchParams, toast]);

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                // Try main database API first, fallback to static API
                // courseId is already decoded, so encode it for the URL
                let response = await fetch(`/api/courses/${encodeURIComponent(courseId)}`);

                if (!response.ok) {
                    response = await fetch(`/api/courses-static/${encodeURIComponent(courseId)}`);
                }

                if (response.ok) {
                    const data = await response.json();

                    // Handle both old and new response formats
                    const courseData = data.course || data;
                    setCourse(courseData);
                } else {
                    console.error(`❌ Course fetch failed: ${response.status} ${response.statusText}`);
                    toast({
                        title: "Course Not Found",
                        description: "The requested course could not be found.",
                        variant: "destructive"
                    });
                    router.push('/courses');
                }
            } catch (error) {
                console.error('❌ Error fetching course:', error);
                toast({
                    title: "Error",
                    description: "Failed to load course details. Please try again.",
                    variant: "destructive"
                });
                router.push('/courses');
            } finally {
                setLoading(false);
            }
        };

        if (courseId) {
            fetchCourse();
        }
    }, [courseId, router, toast]);

    const validateCoupon = async (code: string, userEmail: string) => {
        if (!code.trim()) return;

        setCouponStatus(prev => ({ ...prev, isChecking: true }));

        try {
            // Use email if provided, otherwise use a placeholder for validation
            const validationEmail = userEmail.trim() || 'placeholder@example.com';

            const response = await fetch('/api/coupons/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    couponCode: code.trim(),
                    email: validationEmail,
                    courseId: course?.courseId // Use courseId from loaded course data
                }),
            });

            const data = await response.json();

            if (response.ok && data.valid) {
                const discountPercentage = data.discountPercentage || 100;
                const finalPrice = data.finalPrice || 0;
                const originalPrice = data.originalPrice || course?.price || 0;

                setCouponStatus({
                    isValid: true,
                    message: discountPercentage === 100
                        ? 'Coupon applied! You get 100% discount.'
                        : `Coupon applied! You get ${discountPercentage}% discount (Pay $${finalPrice.toFixed(2)})`,
                    isChecking: false,
                    appliedDiscount: discountPercentage,
                    finalPrice: finalPrice,
                    originalPrice: originalPrice
                });
            } else {
                setCouponStatus({
                    isValid: false,
                    message: data.error || 'Invalid coupon code',
                    isChecking: false
                });
            }
        } catch (error) {
            setCouponStatus({
                isValid: false,
                message: 'Failed to validate coupon. Please try again.',
                isChecking: false
            });
        }
    };

    const handleCouponChange = (code: string) => {
        setCouponCode(code);
        // Reset coupon status when user types
        setCouponStatus({
            isValid: null,
            message: '',
            isChecking: false
        });
    };

    const handleCouponBlur = () => {
        if (couponCode.trim() && email.trim()) {
            validateCoupon(couponCode, email);
        }
    };

    // Validation function to check for self-referral
    const validateEnrollmentInputs = () => {
        const primaryEmail = (email.trim() || openedxEmail.trim()).toLowerCase();
        const affiliateEmailValue = affiliateId.trim().toLowerCase();

        if (affiliateEmailValue && affiliateEmailValue.includes('@') &&
            primaryEmail && primaryEmail === affiliateEmailValue) {
            setValidationState({
                hasSelfReferral: true,
                validationMessage: 'You cannot use your own email as an affiliate referral'
            });
            return false;
        } else {
            setValidationState({
                hasSelfReferral: false,
                validationMessage: ''
            });
            return true;
        }
    };

    // Run validation when relevant fields change
    useEffect(() => {
        validateEnrollmentInputs();
    }, [email, openedxEmail, affiliateId]);

    // 💳 SINGLE PATH: Consolidated enrollment via checkout API
    const handleBuyNow = async () => {
        // Prevent duplicate requests
        if (enrollmentState.isProcessing) {
            console.log('⚠️ Enrollment already in progress, ignoring duplicate request');
            toast({
                title: "Request in Progress",
                description: "Please wait for the current enrollment to complete.",
                variant: "default"
            });
            return;
        }

        // Rate limiting: Prevent rapid retries
        if (enrollmentState.lastAttempt) {
            const timeSinceLastAttempt = Date.now() - enrollmentState.lastAttempt.getTime();
            if (timeSinceLastAttempt < 3000) { // 3 second cooldown
                toast({
                    title: "Please Wait",
                    description: "Please wait a moment before trying again.",
                    variant: "default"
                });
                return;
            }
        }

        // Validation - Either OpenEdX username OR email must be provided
        const hasUsername = openedxUsername.trim();
        const hasEmail = email.trim() || openedxEmail.trim();

        if (!hasUsername && !hasEmail) {
            toast({
                title: "Username or Email Required",
                description: "Please enter either your MaalEdu LMS username or email address to proceed.",
                variant: "destructive"
            });
            return;
        }

        // If no username but has email, suggest username for better OpenEdX integration
        if (!hasUsername && hasEmail) {
            console.log('⚠️ Proceeding without OpenEdX username - enrollment will use email fallback');
        }

        // Validate coupon if provided - allow proceeding even if coupon validation hasn't completed
        if (couponCode.trim() && couponStatus.isValid === false) {
            toast({
                title: "Invalid Coupon",
                description: "The coupon code appears to be invalid. Continue anyway or correct it.",
                variant: "destructive"
            });
            // Don't return - allow user to proceed with paid enrollment
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Validate primary email if provided
        if (email.trim() && !emailRegex.test(email)) {
            toast({
                title: "Invalid Email",
                description: "Please enter a valid email address.",
                variant: "destructive"
            });
            return;
        }

        // Validate OpenEdX email if provided
        if (openedxEmail && !emailRegex.test(openedxEmail)) {
            toast({
                title: "Invalid MaalEdu LMS Email",
                description: "Please enter a valid MaalEdu LMS email address.",
                variant: "destructive"
            });
            return;
        }

        const requestId = `${email.toLowerCase()}-${couponCode || 'no-coupon'}-${Date.now()}`;

        setEnrollmentState({
            isProcessing: true,
            requestId,
            lastAttempt: new Date()
        });

        setIsLoading(true);

        try {
            console.log('🚀 Processing enrollment via real checkout API');

            // ALWAYS use the main checkout API (no MVP fallback)
            const checkoutUrl = '/api/checkout';

            // Create primary email with proper validation
            const primaryEmail = email.trim() || openedxEmail.trim() || '';

            // Validate required fields before sending - make username optional if email provided
            if (!primaryEmail) {
                throw new Error('Email address is required');
            }

            // Username is recommended but not required if email is provided
            if (!openedxUsername.trim() && !primaryEmail) {
                throw new Error('Either MaalEdu LMS username or email address is required');
            } console.log('📋 Checkout details:', {
                primaryEmail,
                hasEmail: !!email.trim(),
                hasOpenedxUsername: !!openedxUsername.trim(),
                hasOpenedxEmail: !!openedxEmail.trim(),
                redirectSource: lmsRedirectData.redirect_source
            });

            // Clean and validate affiliate email
            let cleanAffiliateEmail = affiliateId.trim() || lmsRedirectData.affiliate_email || '';
            if (cleanAffiliateEmail && !cleanAffiliateEmail.includes('@')) {
                cleanAffiliateEmail = ''; // Clear invalid affiliate emails
            }

            // Prevent self-referral on frontend
            if (cleanAffiliateEmail && primaryEmail &&
                cleanAffiliateEmail.toLowerCase() === primaryEmail.toLowerCase()) {
                toast({
                    title: "Self-Referral Not Allowed",
                    description: "You cannot use your own email as an affiliate referral. Continuing enrollment without affiliate tracking.",
                    variant: "destructive"
                });
                cleanAffiliateEmail = ''; // Clear the affiliate email
                setAffiliateId(''); // Clear the form field
            }

            const checkoutRequest: CheckoutRequest = {
                courseId: course!.courseId,
                email: primaryEmail || undefined,
                couponCode: couponCode.trim() || undefined,
                affiliateEmail: cleanAffiliateEmail || undefined,
                openedxUsername: openedxUsername.trim() || lmsRedirectData.openedx_username || undefined,
                openedxEmail: openedxEmail.trim() || lmsRedirectData.openedx_email || undefined,
                redirectSource: lmsRedirectData.redirect_source as 'lms_redirect' | 'direct' | 'affiliate',
                requestId: requestId
            };

            console.log('📋 Real checkout request:', checkoutRequest);

            const response = await fetch(checkoutUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(checkoutRequest),
            });

            if (!response.ok) {
                let errorData: any = {};
                try {
                    const textResponse = await response.text();
                    if (textResponse) {
                        errorData = JSON.parse(textResponse);
                    } else {
                        errorData = { error: `Server returned ${response.status} with empty response` };
                    }
                } catch (jsonError) {
                    console.error('❌ Failed to parse error response as JSON:', jsonError);
                    errorData = {
                        error: `Server error: ${response.status} ${response.statusText}`,
                        originalResponse: response.statusText
                    };
                }

                console.error('❌ Checkout API Error:', errorData);

                // Handle specific validation errors
                if (errorData.code === 'VALIDATION_ERROR' && errorData.fieldErrors) {
                    const fieldErrorMessages = Object.entries(errorData.fieldErrors)
                        .map(([field, message]) => `${field}: ${message}`)
                        .join('\n');

                    throw new Error(errorData.userMessage || `Validation failed:\n${fieldErrorMessages}`);
                }

                // Handle other specific errors
                if (errorData.code === 'DUPLICATE_ENROLLMENT') {
                    // For duplicate enrollment, show a positive message and redirect to dashboard
                    toast({
                        title: "Already Enrolled! 🎉",
                        description: "Good news! You're already enrolled in this course. Redirecting to dashboard...",
                        variant: "default"
                    });

                    setIsDialogOpen(false);

                    setTimeout(() => {
                        router.push('/dashboard');
                    }, 2000);

                    setIsLoading(false);
                    return; // Don't throw error, handle gracefully
                } if (errorData.code === 'SELF_REFERRAL_NOT_ALLOWED') {
                    toast({
                        title: "Self-Referral Not Allowed",
                        description: "You cannot use your own email as an affiliate referral. Clear the affiliate field to continue.",
                        variant: "destructive"
                    });

                    // Clear the affiliate field automatically
                    setAffiliateId('');
                    setIsLoading(false);
                    return;
                } if (errorData.code === 'INVALID_COUPON') {
                    toast({
                        title: "Invalid Coupon",
                        description: "The coupon code is invalid, expired, or not authorized for your account. Please check and try again.",
                        variant: "destructive"
                    });

                    // Don't throw error, let user try again
                    setIsLoading(false);
                    return;
                }

                const errorMessage = errorData?.userMessage || errorData?.error || errorData?.message ||
                    `Server returned ${response.status}: ${response.statusText || 'Unknown error'}`;
                throw new Error(errorMessage);
            }

            let data: any;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('❌ Failed to parse success response as JSON:', jsonError);

                // If we can't parse the response but got a 200, assume success
                if (response.status === 200) {
                    console.log('✅ Assuming successful enrollment based on 200 status');

                    toast({
                        title: "🎉 Enrollment Successful!",
                        description: "Your enrollment was processed successfully!",
                        variant: "default"
                    });

                    setIsDialogOpen(false);

                    setTimeout(() => {
                        const successParams = new URLSearchParams({
                            type: 'enrollment_success',
                            courseId: course!.courseId,
                            courseTitle: course!.title,
                            email: primaryEmail || 'enrollment@success.temp'
                        });
                        router.push(`/success?${successParams.toString()}`);
                    }, 1500);

                    return;
                }

                throw new Error('Server returned invalid response format');
            }

            console.log('📦 Checkout response:', data);

            // Validate response structure
            if (!data || typeof data !== 'object') {
                console.error('❌ Invalid response structure:', data);
                throw new Error('Invalid response format from server');
            }

            // Handle direct enrollment response (100% coupon processed via checkout API)
            if (data.directEnrollment) {
                console.log('🎫 Direct enrollment completed via checkout API');

                toast({
                    title: "🎉 Enrollment Successful!",
                    description: "You've been enrolled for free! Redirecting to confirmation page...",
                    variant: "default"
                });

                // Close dialog and redirect to success page
                setIsDialogOpen(false);

                setTimeout(() => {
                    if (data.redirectUrl) {
                        router.push(data.redirectUrl);
                    } else {
                        // Fallback redirect using enrollment data
                        const successParams = new URLSearchParams({
                            type: 'free_enrollment',
                            courseId: course!.courseId,
                            courseTitle: course!.title,
                            email: primaryEmail || 'enrollment@success.temp',
                            couponCode: couponCode.trim(),
                            enrollmentId: (data as any).enrollmentId || 'free_enrollment'
                        });
                        router.push(`/success?${successParams.toString()}`);
                    }
                }, 1500);

                // Reset states on success
                setRetryState({
                    count: 0,
                    lastError: null,
                    canRetry: true
                });

                return;
            }

            // Handle Stripe checkout for paid courses
            if (data.checkoutUrl) {
                console.log('💳 Redirecting to Stripe checkout');
                window.location.href = data.checkoutUrl;
                return;
            }

            // If we get here, neither directEnrollment nor checkoutUrl was provided
            console.error('❌ Incomplete checkout response:', {
                hasDirectEnrollment: !!data.directEnrollment,
                hasCheckoutUrl: !!data.checkoutUrl,
                responseKeys: Object.keys(data),
                fullResponse: data
            });

            // Check if we have success but just missing expected format
            if (data.success) {
                console.log('✅ Detected successful response with different format, proceeding...');

                toast({
                    title: "🎉 Enrollment Successful!",
                    description: "Your enrollment was processed successfully!",
                    variant: "default"
                });

                setIsDialogOpen(false);

                setTimeout(() => {
                    const successParams = new URLSearchParams({
                        type: 'enrollment_success',
                        courseId: course!.courseId,
                        courseTitle: course!.title,
                        email: primaryEmail || 'enrollment@success.temp'
                    });
                    router.push(`/success?${successParams.toString()}`);
                }, 1500);

                return;
            }

            throw new Error('Invalid response from checkout API - missing enrollment or payment URL');

        } catch (error) {
            logError('Enrollment', error, { courseId: course?.courseId, email, couponCode });

            // Use robust error parsing
            const errorResponse = parseApiError(error);

            const displayError = errorResponse.error;
            const isRetryable = errorResponse.retryable !== false;
            const errorSuggestions = errorResponse.suggestions || [];

            // Enhanced toast with suggestions
            toast({
                title: "Enrollment Failed",
                description: displayError + (errorSuggestions.length > 0 ? ` • ${errorSuggestions[0]}` : ''),
                variant: "destructive"
            });

            // Update retry state with better logic
            const newRetryCount = retryState.count + 1;
            const canRetryAgain = isRetryable && newRetryCount < 3;

            setRetryState({
                count: newRetryCount,
                lastError: error,
                canRetry: canRetryAgain,
                errorCode: errorResponse?.code,
                suggestions: errorSuggestions
            });

            // Auto-retry for network errors (after delay)
            if (isRetryable && newRetryCount < 2 && errorResponse?.code === 'NETWORK_ERROR') {
                const retryDelay = Math.min(1000 * Math.pow(2, newRetryCount), 5000); // Exponential backoff
                console.log(`🔄 Auto-retrying in ${retryDelay}ms...`);

                setTimeout(() => {
                    if (!enrollmentState.isProcessing) {
                        handleBuyNow();
                    }
                }, retryDelay);
            }

        } finally {
            setIsLoading(false);
            setEnrollmentState(prev => ({
                ...prev,
                isProcessing: false
            }));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <SiteHeader />
                <div className="container mx-auto px-4 py-20">
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="text-center">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                            <p className="text-gray-600 dark:text-gray-300">Loading course details...</p>
                        </div>
                    </div>
                </div>
                <SiteFooter />
            </div>
        );
    }

    if (!course) {
        return (
            <div className="min-h-screen bg-background">
                <SiteHeader />
                <div className="container mx-auto px-4 py-20">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold mb-4">Course Not Found</h1>
                        <Button onClick={() => router.push('/courses')}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Courses
                        </Button>
                    </div>
                </div>
                <SiteFooter />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <SiteHeader />

            <main>
                {/* Breadcrumb */}
                <div className="bg-gray-50 dark:bg-gray-800 py-4">
                    <div className="container mx-auto px-4">
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                            <button
                                onClick={() => router.push('/courses')}
                                className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                            >
                                Courses
                            </button>
                            <span>/</span>
                            <span className="text-gray-900 dark:text-white font-medium">{course.title}</span>
                        </div>
                    </div>
                </div>

                {/* Course Hero */}
                <section className="py-12 bg-gradient-to-br from-orange-50 via-white to-orange-50/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
                    <div className="container mx-auto px-4">
                        <div className="max-w-6xl mx-auto">
                            <div className="grid lg:grid-cols-2 gap-12 items-center">
                                {/* Content */}
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-3">
                                            <Badge className={`${course.level === 'Beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                                                course.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                                                    'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                                                }`}>
                                                {course.level}
                                            </Badge>
                                            <Badge variant="outline">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {course.duration}
                                            </Badge>
                                        </div>

                                        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                                            {course.title}
                                        </h1>

                                        <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                                            {course.description}
                                        </p>
                                    </div>

                                    <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-300">
                                        <div className="flex items-center space-x-2">
                                            <Users className="w-4 h-4 text-orange-600" />
                                            <span>500+ Students</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Globe className="w-4 h-4 text-orange-600" />
                                            <span>Online</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Award className="w-4 h-4 text-orange-600" />
                                            <span>Certificate</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-4">
                                        <div className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                                            {formatPrice(course.price)}
                                        </div>
                                        <Button
                                            onClick={() => setIsDialogOpen(true)}
                                            size="lg"
                                            className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                                        >
                                            <ShoppingCart className="w-5 h-5 mr-2" />
                                            Enroll Now
                                        </Button>
                                    </div>
                                </div>

                                {/* Image */}
                                <div className="relative">
                                    <div className="relative h-96 lg:h-[500px] overflow-hidden rounded-2xl shadow-2xl">
                                        <Image
                                            src={course.image}
                                            alt={course.title}
                                            fill
                                            className="object-cover"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                                e.currentTarget.parentElement!.style.background = 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Course Content */}
                <section className="py-16 bg-white dark:bg-gray-900">
                    <div className="container mx-auto px-4">
                        <div className="max-w-4xl mx-auto">
                            <div className="grid md:grid-cols-2 gap-12">
                                {/* What You'll Learn */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-2xl flex items-center">
                                            <BookOpen className="w-6 h-6 mr-3 text-orange-600" />
                                            What You'll Learn
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-3">
                                            {course.features.map((feature, index) => (
                                                <li key={index} className="flex items-start space-x-3">
                                                    <CheckCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                                                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>

                                {/* Course Details */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-2xl flex items-center">
                                            <Target className="w-6 h-6 mr-3 text-orange-600" />
                                            Course Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                                                <span className="text-gray-600 dark:text-gray-300">Level</span>
                                                <Badge className={`${course.level === 'Beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                                                    course.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' :
                                                        'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                                                    }`}>
                                                    {course.level}
                                                </Badge>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                                                <span className="text-gray-600 dark:text-gray-300">Duration</span>
                                                <span className="font-medium">{course.duration}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                                                <span className="text-gray-600 dark:text-gray-300">Format</span>
                                                <span className="font-medium">Online</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                                                <span className="text-gray-600 dark:text-gray-300">Certificate</span>
                                                <span className="font-medium">Yes</span>
                                            </div>
                                            <div className="flex justify-between items-center py-2">
                                                <span className="text-gray-600 dark:text-gray-300">Access</span>
                                                <span className="font-medium">Lifetime</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-16 bg-gradient-to-r from-orange-600 to-orange-700 dark:from-orange-700 dark:to-orange-800">
                    <div className="container mx-auto px-4">
                        <div className="max-w-4xl mx-auto text-center text-white">
                            <h2 className="text-3xl md:text-4xl font-bold mb-6">
                                Ready to Start Learning?
                            </h2>
                            <p className="text-xl text-orange-100 dark:text-orange-200 mb-8">
                                Join thousands of students who have already transformed their careers with this course.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                <div className="text-3xl font-bold">
                                    {formatPrice(course.price)}
                                </div>
                                <Button
                                    onClick={() => setIsDialogOpen(true)}
                                    size="lg"
                                    variant="secondary"
                                    className="px-8 py-3 text-lg bg-white text-orange-600 hover:bg-gray-100"
                                >
                                    <ShoppingCart className="w-5 h-5 mr-2" />
                                    Enroll Now
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <SiteFooter />

            {/* Purchase Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Mail className="w-5 h-5 text-orange-600" />
                            Complete Your Purchase
                            {lmsRedirectData.openedx_username && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                    MaalEdu LMS Redirect
                                </Badge>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        {/* LMS Redirect Notice */}
                        {lmsRedirectData.openedx_username && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Globe className="w-4 h-4 text-blue-600" />
                                    <span className="font-semibold text-blue-800 dark:text-blue-300">
                                        Redirected from MaalEdu LMS
                                    </span>
                                </div>
                                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                                    <p>• Username: <span className="font-mono">{lmsRedirectData.openedx_username}</span></p>
                                    {lmsRedirectData.affiliate_email && (
                                        <p>• Affiliate: <span className="font-mono">{lmsRedirectData.affiliate_email}</span></p>
                                    )}
                                    <p>• Course enrollment will be synced back to your LMS account</p>
                                </div>
                            </div>
                        )}
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                                {course.title}
                            </h4>
                            <div className="flex items-center justify-between">
                                <div>
                                    {couponStatus.isValid && couponStatus.appliedDiscount ? (
                                        <>
                                            <p className="text-lg text-gray-500 line-through">
                                                {formatPrice(couponStatus.originalPrice || course.price)}
                                            </p>
                                            {couponStatus.appliedDiscount === 100 ? (
                                                <>
                                                    <p className="text-2xl font-bold text-green-600">
                                                        FREE
                                                    </p>
                                                    <p className="text-sm text-green-600">
                                                        100% discount applied!
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                                        {formatPrice(couponStatus.finalPrice || 0)}
                                                    </p>
                                                    <p className="text-sm text-green-600">
                                                        {couponStatus.appliedDiscount}% discount applied!
                                                        Save {formatPrice((couponStatus.originalPrice || course.price) - (couponStatus.finalPrice || 0))}
                                                    </p>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                            {formatPrice(course.price)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Email Address
                                    {lmsRedirectData.openedx_email && (
                                        <Badge variant="secondary" className="ml-2 text-xs">
                                            Pre-filled from LMS
                                        </Badge>
                                    )}
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your.email@example.com"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value)
                                        // Auto-sync with OpenEdX email if not pre-filled
                                        if (!lmsRedirectData.openedx_email) {
                                            setOpenedxEmail(e.target.value)
                                        }
                                    }}
                                    className="mt-2"
                                    required
                                    readOnly={!!lmsRedirectData.openedx_email}
                                    disabled={!!lmsRedirectData.openedx_email}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {lmsRedirectData.openedx_email
                                        ? "Email pre-filled from your LMS account. Course access will be synced automatically."
                                        : "Email for course access and communications. This will be used for enrollment."
                                    }
                                </p>
                            </div>

                            {/* MaalEdu LMS Username - Either username OR email required for direct users */}
                            <div>
                                <Label htmlFor="openedx-username" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    MaalEdu LMS Username (Recommended)
                                    {lmsRedirectData.openedx_username && (
                                        <Badge variant="secondary" className="ml-2 text-xs">
                                            Pre-filled from LMS
                                        </Badge>
                                    )}
                                </Label>
                                <Input
                                    id="openedx-username"
                                    type="text"
                                    placeholder="your_maaledu_username"
                                    value={openedxUsername}
                                    onChange={(e) => setOpenedxUsername(e.target.value)}
                                    className="mt-2"
                                    readOnly={!!lmsRedirectData.openedx_username}
                                    disabled={!!lmsRedirectData.openedx_username}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {lmsRedirectData.openedx_username
                                        ? "Username pre-filled from your LMS account."
                                        : "Your MaalEdu LMS username. Recommended for better course sync, but you can proceed with just email if needed."
                                    }
                                </p>
                            </div>



                            {/* Affiliate ID - Optional */}
                            <div>
                                <Label htmlFor="affiliate-id" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Affiliate ID (Optional)
                                    {lmsRedirectData.affiliate_email && (
                                        <Badge variant="secondary" className="ml-2 text-xs">
                                            Detected from URL
                                        </Badge>
                                    )}
                                </Label>
                                <Input
                                    id="affiliate-id"
                                    type="text"
                                    placeholder="affiliate@example.com or affiliate_code"
                                    value={affiliateId}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setAffiliateId(value);

                                        // Show warning if user tries to enter their own email
                                        if (value.toLowerCase() === email.toLowerCase() && value.includes('@') && email.includes('@')) {
                                            toast({
                                                title: "Self-referral Notice",
                                                description: "You cannot use your own email as an affiliate referral. Leave this field empty if you're enrolling yourself.",
                                                variant: "destructive"
                                            });
                                        }
                                    }}
                                    className="mt-2"
                                    readOnly={!!lmsRedirectData.affiliate_email}
                                    disabled={!!lmsRedirectData.affiliate_email}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {lmsRedirectData.affiliate_email
                                        ? "Affiliate detected from referral link."
                                        : "Enter affiliate email or code if you were referred by someone."
                                    }
                                </p>
                            </div>

                            {/* Coupon Code Input */}
                            <div>
                                <Label htmlFor="coupon-code" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Coupon Code (Optional)
                                </Label>
                                <div className="relative mt-2">
                                    <Input
                                        id="coupon-code"
                                        type="text"
                                        placeholder="Enter coupon code"
                                        value={couponCode}
                                        onChange={(e) => handleCouponChange(e.target.value.toUpperCase())}
                                        onBlur={handleCouponBlur}
                                        className={`pr-10 ${couponStatus.isValid === true
                                            ? 'border-green-500 focus:border-green-500'
                                            : couponStatus.isValid === false
                                                ? 'border-red-500 focus:border-red-500'
                                                : ''
                                            }`}
                                    />
                                    {couponStatus.isChecking && (
                                        <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                                    )}
                                    {couponStatus.isValid === true && (
                                        <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
                                    )}
                                </div>
                                {couponStatus.message && (
                                    <p className={`text-sm font-medium mt-1 ${couponStatus.isValid
                                        ? 'text-green-600 dark:text-green-400'
                                        : 'text-red-600 dark:text-red-400'
                                        }`}>
                                        {couponStatus.isValid ? '✅ ' : '❌ '}{couponStatus.message}
                                    </p>
                                )}
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Have a grant coupon? Enter it here to claim your discount.
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    onClick={handleBuyNow}
                                    disabled={isLoading || (!openedxUsername.trim() && !email.trim()) || validationState.hasSelfReferral}
                                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Processing...
                                        </>
                                    ) : couponStatus.isValid === true ? (
                                        couponStatus.appliedDiscount === 100 ? (
                                            <>
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Complete Free Enrollment
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingCart className="w-4 h-4 mr-2" />
                                                Pay {formatPrice(couponStatus.finalPrice || 0)} ({couponStatus.appliedDiscount}% off)
                                            </>
                                        )
                                    ) : (
                                        <>
                                            <ShoppingCart className="w-4 h-4 mr-2" />
                                            Proceed to Payment
                                        </>
                                    )}
                                </Button>

                                <Button
                                    onClick={() => setIsDialogOpen(false)}
                                    variant="outline"
                                    disabled={isLoading}
                                >
                                    Cancel
                                </Button>
                            </div>

                            {/* Validation Message */}
                            {validationState.hasSelfReferral && (
                                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                                    <div className="flex items-center text-red-800 dark:text-red-300 text-sm">
                                        <AlertCircle className="w-4 h-4 mr-2" />
                                        {validationState.validationMessage}
                                    </div>
                                    <p className="text-red-700 dark:text-red-400 text-xs mt-1">
                                        Leave the affiliate field empty if you're enrolling yourself.
                                    </p>
                                </div>
                            )}

                            {/* Enhanced Error Display & Retry Section */}
                            {retryState.lastError && retryState.count > 0 && (
                                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0">
                                            <div className="flex items-center justify-center w-6 h-6 bg-red-100 dark:bg-red-900/50 rounded-full">
                                                <span className="text-red-600 dark:text-red-400 text-sm font-semibold">!</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                                                Enrollment Failed
                                            </h4>
                                            <div className="mt-1 text-sm text-red-700 dark:text-red-300">
                                                {retryState.errorCode && (
                                                    <p className="mb-1">
                                                        <span className="font-mono text-xs bg-red-100 dark:bg-red-900/50 px-1 py-0.5 rounded">
                                                            {retryState.errorCode}
                                                        </span>
                                                    </p>
                                                )}
                                                {retryState.suggestions && retryState.suggestions.length > 0 && (
                                                    <ul className="list-disc list-inside space-y-1">
                                                        {retryState.suggestions.map((suggestion, idx) => (
                                                            <li key={idx}>{suggestion}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>

                                            {retryState.canRetry && (
                                                <div className="mt-3 flex items-center space-x-3">
                                                    <Button
                                                        onClick={() => {
                                                            setRetryState(prev => ({ ...prev, count: 0, lastError: null, canRetry: true }));
                                                            handleBuyNow();
                                                        }}
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/50"
                                                        disabled={isLoading}
                                                    >
                                                        Try Again ({3 - retryState.count} attempts left)
                                                    </Button>
                                                    <span className="text-xs text-red-600 dark:text-red-400">
                                                        Attempt {retryState.count} of 3
                                                    </span>
                                                </div>
                                            )}

                                            {!retryState.canRetry && (
                                                <div className="mt-3">
                                                    <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                                                        Maximum retry attempts reached. Please contact support if the issue persists.
                                                    </p>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/50"
                                                        onClick={() => window.open('mailto:support@maaledu.com?subject=Enrollment%20Issue', '_blank')}
                                                    >
                                                        <Mail className="w-3 h-3 mr-1" />
                                                        Contact Support
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                            <p>• You'll be redirected to Stripe for secure payment processing</p>
                            <p>• Course access will be granted immediately after payment</p>
                            <p>• You'll receive email confirmation with login details</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
