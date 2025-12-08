/**
 * ===============================
 * ENVIRONMENT VARIABLE VALIDATION
 * ===============================
 * 
 * Centralized validation for all required environment variables.
 * Runs on application startup to provide clear error messages.
 * 
 * @module Environment Validation
 * @version 1.0
 */

const requiredEnvVars = {
    // Payment
    STRIPE_SECRET_KEY: 'Stripe secret key for payment processing',
    STRIPE_WEBHOOK_SECRET: 'Stripe webhook signature verification',

    // Database
    MONGODB_URI: 'MongoDB connection string',

    // Authentication
    NEXTAUTH_SECRET: 'NextAuth session encryption secret',
    NEXTAUTH_URL: 'Application base URL',

    // LMS Integration
    FRAPPE_LMS_BASE_URL: 'Frappe LMS API endpoint',

    // Email
    SMTP_HOST: 'Email SMTP server host',
    SMTP_PORT: 'Email SMTP server port',
    SMTP_USER: 'Email SMTP username',
    SMTP_PASS: 'Email SMTP password',
    SMTP_MAIL: 'Sender email address',
};

const optionalEnvVars = {
    FRAPPE_LMS_API_KEY: 'Optional Frappe LMS API key',
    REDIS_URL: 'Optional Redis cache URL',
    SENTRY_DSN: 'Optional Sentry error tracking',
    CRON_SECRET: 'Vercel cron authentication',
};

export function validateEnvironmentVariables() {
    const missing: string[] = [];
    const warnings: string[] = [];

    // Check required variables
    Object.entries(requiredEnvVars).forEach(([key, description]) => {
        if (!process.env[key]) {
            missing.push(`${key} (${description})`);
        }
    });

    // Check optional variables
    Object.entries(optionalEnvVars).forEach(([key, description]) => {
        if (!process.env[key]) {
            warnings.push(`${key} (${description}) - Feature may be disabled`);
        }
    });

    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(msg => console.error(`  - ${msg}`));
        throw new Error(`Missing ${missing.length} required environment variables. Check your .env.local file.`);
    }

    if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
        console.warn('⚠️  Optional environment variables not set:');
        warnings.forEach(msg => console.warn(`  - ${msg}`));
    }

    console.log('✅ Environment variables validated successfully');
}

// Validate on import (runs once at startup)
if (process.env.NODE_ENV !== 'test') {
    validateEnvironmentVariables();
}
