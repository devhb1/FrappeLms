/**
 * =====================================================
 *  ENVIRONMENT CONFIGURATION & VALIDATION
 * =====================================================
 *
 * Centralized environment variable validation and configuration.
 * Ensures all required environment variables are present and valid.
 */

const REQUIRED_ENV_VARS = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'MONGODB_URI',
    'STRIPE_SECRET_KEY',
    'SMTP_HOST',
    'SMTP_MAIL',
    'SMTP_PASSWORD'
] as const

const OPTIONAL_ENV_VARS = [
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SMTP_PORT',
    'SENTRY_DSN',
    'REDIS_URL'
] as const

type RequiredEnvVar = typeof REQUIRED_ENV_VARS[number]
type OptionalEnvVar = typeof OPTIONAL_ENV_VARS[number]

interface ValidationResult {
    isValid: boolean
    missing: string[]
    warnings: string[]
}

export function validateEnvironment(): ValidationResult {
    const missing: string[] = []
    const warnings: string[] = []

    // Check required environment variables
    REQUIRED_ENV_VARS.forEach(key => {
        if (!process.env[key]) {
            missing.push(key)
        }
    })

    // Check optional but recommended variables
    OPTIONAL_ENV_VARS.forEach(key => {
        if (!process.env[key]) {
            warnings.push(`Optional environment variable ${key} is not set`)
        }
    })

    // Additional validations
    if (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb')) {
        missing.push('MONGODB_URI (invalid format - must start with mongodb)')
    }

    if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.startsWith('http')) {
        missing.push('NEXTAUTH_URL (invalid format - must be a valid URL)')
    }

    const isValid = missing.length === 0

    if (!isValid) {
        const errorMessage =
            `🔴 ENVIRONMENT VALIDATION FAILED\n` +
            `Missing required environment variables:\n` +
            missing.map(key => `  - ${key}`).join('\n') +
            `\n\nPlease check your .env.local file and ensure all required variables are set.`

        if (process.env.NODE_ENV === 'production') {
            throw new Error(errorMessage)
        } else {
            console.error(errorMessage)
        }
    }

    if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
        console.warn(
            `⚠️ ENVIRONMENT WARNINGS:\n` +
            warnings.map(warning => `  - ${warning}`).join('\n')
        )
    }

    if (isValid && process.env.NODE_ENV === 'development') {
        console.log('✅ All required environment variables are configured')
    }

    return {
        isValid,
        missing,
        warnings
    }
}

// Environment-specific configurations
export const config = {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',

    // Database
    mongodbUri: process.env.MONGODB_URI!,

    // Authentication
    nextAuthSecret: process.env.NEXTAUTH_SECRET!,
    nextAuthUrl: process.env.NEXTAUTH_URL!,

    // Payment
    stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
    stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

    // Email
    smtpHost: process.env.SMTP_HOST!,
    smtpMail: process.env.SMTP_MAIL!,
    smtpPassword: process.env.SMTP_PASSWORD!,
    smtpPort: parseInt(process.env.SMTP_PORT || '587'),

    // Optional services
    sentryDsn: process.env.SENTRY_DSN,
    redisUrl: process.env.REDIS_URL,
}

// Validate on module load
if (typeof window === 'undefined') { // Only run on server side
    validateEnvironment()
}

export default config