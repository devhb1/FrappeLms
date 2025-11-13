/**
 * =====================================================
 *  CENTRALIZED LOGGING SYSTEM
 * =====================================================
 *
 * Provides secure, structured logging with sensitive data sanitization.
 * Replaces scattered console.log statements throughout the application.
 */

interface LogData {
    [key: string]: any
}

const SENSITIVE_FIELDS = [
    'password',
    'cryptoWallet',
    'accountNumber',
    'routingNumber',
    'swiftCode',
    'verifyCode',
    'paypalEmail',
    'token',
    'secret',
    'key'
]

function sanitizeLogData(data?: LogData): LogData | undefined {
    if (!data) return undefined

    const sanitized = { ...data }

    // Remove or redact sensitive fields
    SENSITIVE_FIELDS.forEach(field => {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]'
        }
    })

    // Handle nested objects
    Object.keys(sanitized).forEach(key => {
        if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
            sanitized[key] = sanitizeLogData(sanitized[key])
        }
    })

    return sanitized
}

function sanitizeError(error?: any): any {
    if (!error) return undefined

    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
    }

    return sanitizeLogData(error)
}

export const logger = {
    info: (message: string, data?: LogData) => {
        const sanitized = sanitizeLogData(data)
        console.log(`ℹ️ ${new Date().toISOString()} ${message}`, sanitized || '')
    },

    error: (message: string, error?: any) => {
        const sanitized = sanitizeError(error)
        console.error(`❌ ${new Date().toISOString()} ${message}`, sanitized || '')
    },

    warn: (message: string, data?: LogData) => {
        const sanitized = sanitizeLogData(data)
        console.warn(`⚠️ ${new Date().toISOString()} ${message}`, sanitized || '')
    },

    debug: (message: string, data?: LogData) => {
        if (process.env.NODE_ENV === 'development') {
            const sanitized = sanitizeLogData(data)
            console.debug(`🐛 ${new Date().toISOString()} ${message}`, sanitized || '')
        }
    },

    success: (message: string, data?: LogData) => {
        const sanitized = sanitizeLogData(data)
        console.log(`✅ ${new Date().toISOString()} ${message}`, sanitized || '')
    }
}

export default logger