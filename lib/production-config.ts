/**
 * Production deployment configuration for Vercel
 * This file contains production-specific settings and optimizations
 */

// Environment Variables Required for Production
export const REQUIRED_ENV_VARS = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'MONGODB_URI',
    'STRIPE_SECRET_KEY',
    'SMTP_HOST',
    'SMTP_MAIL',
    'SMTP_PASSWORD'
];

// Validate environment variables in production
export function validateEnvironment() {
    const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(
            `🔴 PRODUCTION ERROR: Missing required environment variables:\n` +
            missing.map(key => `  - ${key}`).join('\n') +
            '\n\nPlease configure these in your Vercel dashboard.'
        );
    }

    console.log('✅ All required environment variables are configured');
}

// Production security headers
export const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// Database configuration for production
export const PRODUCTION_DB_CONFIG = {
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
    retryReads: true,
    maxConnecting: 2,
    connectTimeoutMS: 10000,
    family: 4,
};

// NextAuth configuration for production
export const NEXTAUTH_CONFIG = {
    session: {
        strategy: "jwt" as const,
        maxAge: 7 * 24 * 60 * 60, // 7 days
    },
    jwt: {
        maxAge: 7 * 24 * 60 * 60, // 7 days
    },
    pages: {
        signIn: '/signin',
        error: '/signin',
    },
    debug: false, // Disable debug in production
};

export default {
    validateEnvironment,
    SECURITY_HEADERS,
    PRODUCTION_DB_CONFIG,
    NEXTAUTH_CONFIG,
};
