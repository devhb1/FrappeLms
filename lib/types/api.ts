/**
 * =====================================================
 *  STANDARDIZED API RESPONSE SYSTEM
 * =====================================================
 *
 * Provides consistent API response format across all endpoints.
 * Ensures predictable error handling and response structure.
 */

export interface ApiResponse<T = any> {
    success: boolean
    message: string
    data?: T
    error?: string
    timestamp: string
    requestId?: string
}

export interface ApiError {
    code: string
    message: string
    details?: any
}

export function createApiResponse<T>(
    success: boolean,
    message: string,
    data?: T,
    error?: string,
    requestId?: string
): ApiResponse<T> {
    return {
        success,
        message,
        data,
        error,
        timestamp: new Date().toISOString(),
        requestId
    }
}

export function createSuccessResponse<T>(
    message: string,
    data?: T,
    requestId?: string
): ApiResponse<T> {
    return createApiResponse(true, message, data, undefined, requestId)
}

export function createErrorResponse(
    message: string,
    error?: string,
    requestId?: string
): ApiResponse<null> {
    return createApiResponse(false, message, null, error, requestId)
}

// Common HTTP status codes for API responses
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
} as const

// Common error codes
export const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
    DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR'
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]