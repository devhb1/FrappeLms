export interface Course {
    courseId: string  // Changed from 'id' to 'courseId' for consistency
    title: string
    description: string
    price: number
    duration: string
    level: 'Beginner' | 'Intermediate' | 'Advanced'
    image: string
    features: string[]
}

export interface CourseEnrollment {
    courseId: string
    email: string
    paymentId: string
    amount: number
    status: 'paid' | 'pending' | 'failed'
    timestamp: string

    // Legacy top-level fields (for backward compatibility)
    referralSource?: string  // Source of referral (e.g., "affiliate_link", "direct", "social")
    hasReferral?: boolean   // Quick flag to identify referral enrollments

    // Enhanced fields for Frappe LMS integration
    enrollmentType?: 'paid_stripe' | 'free_grant' | 'partial_grant' | 'affiliate_referral' | 'lms_redirect'

    // LMS integration data (FrappeLMS)
    lmsContext?: {
        frappeUsername?: string
        frappeEmail?: string
        redirectSource?: 'lms_redirect' | 'direct' | 'affiliate'
        frappeCourseId?: string
    }

    // Enhanced affiliate data structure
    affiliateData?: {
        affiliateEmail?: string
        referralSource?: 'affiliate_link' | 'grant_with_affiliate' | 'lms_redirect_affiliate'
        commissionEligible?: boolean
        referralTimestamp?: Date
        commissionAmount?: number
        referrerUrl?: string
        utmSource?: string
        utmMedium?: string
        utmCampaign?: string
        commissionRate?: number
    }

    // Grant/coupon data - enhanced for partial discounts
    grantData?: {
        grantId?: string
        couponCode?: string
        approvalDate?: Date
        grantVerified?: boolean
        // New fields for partial discount support
        discountPercentage?: number
        originalPrice?: number
        finalPrice?: number
        discountAmount?: number
        grantType?: 'free' | 'partial'
    }

    // Verification data for access decisions
    verification?: {
        paymentVerified?: boolean
        courseEligible?: boolean
        accessLevel?: 'verified' | 'audit' | 'honor' | 'basic' | 'premium'
        stripePaymentId?: string
        grantVerified?: boolean
        emailVerified?: boolean
        frappeSynced?: boolean
        verificationAttempts?: number
    }

    // FrappeLMS integration status (Primary)
    frappeSync?: {
        synced?: boolean
        lastSyncAttempt?: Date
        syncStatus?: 'pending' | 'success' | 'failed' | 'retrying'
        enrollmentId?: string
        errorMessage?: string
        retryCount?: number
        syncCompletedAt?: Date
        retryJobId?: string  // Reference to RetryJob for active retry attempts
    }

    // Payment and transaction metadata
    paymentMethod?: string
    currency?: string
    originalAmount?: number
    discountAmount?: number
    couponCode?: string

    // Additional tracking metadata
    metadata?: {
        userAgent?: string
        ipAddress?: string
        timezone?: string
        deviceType?: string
        source?: string
    }

    // Stripe webhook idempotency tracking
    stripeEvents?: Array<{
        eventId: string
        eventType: string
        processedAt: Date
        status: 'processed' | 'failed'
    }>
}

export interface CheckoutRequest {
    courseId: string
    email?: string
    couponCode?: string

    // Enhanced fields for LMS redirect and affiliate tracking
    affiliateEmail?: string
    username?: string  // Frappe LMS username
    redirectSource?: 'lms_redirect' | 'direct' | 'affiliate'

    // Request deduplication
    requestId?: string
}

export interface CheckoutResponse {
    checkoutUrl?: string
    sessionId?: string

    // For 100% coupon bypass (legacy)
    bypassStripe?: boolean
    directEnrollmentUrl?: string
    enrollmentData?: any

    // For direct enrollment (new approach)
    success?: boolean
    directEnrollment?: boolean
    enrollment?: {
        id: string
        courseId: string
        email: string
        enrolledAt: Date
        accessMethod: string
        couponCode: string
    }
    redirectUrl?: string
}

export interface EnrollmentRequest {
    courseId: string
    email: string
}

export interface EnrollmentResponse {
    success: boolean
    message: string
    enrollmentId?: string
}
