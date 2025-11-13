/**
 * ===============================
 * SIMPLE ERROR PARSING UTILITY
 * ===============================
 * 
 * Provides basic error parsing for frontend applications
 */

export interface ParsedError {
    error: string;
    code?: string;
    retryable?: boolean;
    suggestions?: string[];
    statusCode?: number;
}

/**
 * Parse API error responses
 */
export function parseApiError(error: unknown): ParsedError {
    // Handle Response objects (fetch API errors)
    if (error instanceof Response) {
        return {
            error: `HTTP ${error.status}: ${error.statusText}`,
            code: `HTTP_${error.status}`,
            retryable: error.status >= 500 || error.status === 429,
            statusCode: error.status,
            suggestions: getHttpErrorSuggestions(error.status)
        };
    }

    // Handle Error objects
    if (error instanceof Error) {
        // Network/fetch errors
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return {
                error: 'Network connection failed. Please check your internet connection.',
                code: 'NETWORK_ERROR',
                retryable: true,
                suggestions: ['Check your internet connection', 'Try again in a few moments']
            };
        }

        return {
            error: error.message,
            code: error.name || 'JAVASCRIPT_ERROR',
            retryable: true,
            suggestions: ['Try again in a few moments', 'Refresh the page if the issue persists']
        };
    }

    // Handle string errors
    if (typeof error === 'string') {
        return {
            error: error,
            code: 'STRING_ERROR',
            retryable: true,
            suggestions: ['Try again in a few moments']
        };
    }

    // Handle null/undefined
    if (error == null) {
        return {
            error: 'An unexpected error occurred',
            code: 'NULL_ERROR',
            retryable: true,
            suggestions: ['Try again in a few moments', 'Refresh the page']
        };
    }

    // Handle objects (including parsed JSON)
    if (typeof error === 'object') {
        const errorObj = error as any;
        return {
            error: errorObj.error || errorObj.message || 'An unexpected error occurred',
            code: errorObj.code || 'OBJECT_ERROR',
            retryable: errorObj.retryable !== false,
            suggestions: Array.isArray(errorObj.suggestions) ? errorObj.suggestions : []
        };
    }

    // Fallback for any other type
    return {
        error: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
        retryable: true,
        suggestions: ['Try again in a few moments', 'Contact support if the issue persists']
    };
}

/**
 * Get suggestions based on HTTP status codes
 */
function getHttpErrorSuggestions(status: number): string[] {
    switch (status) {
        case 400:
            return ['Check that all required fields are filled correctly', 'Verify your input data'];
        case 401:
            return ['Please sign in to continue', 'Your session may have expired'];
        case 403:
            return ['You do not have permission to perform this action', 'Contact support if you believe this is an error'];
        case 404:
            return ['The requested resource was not found', 'Check the URL and try again'];
        case 409:
            return ['This action conflicts with current data', 'Refresh the page and try again'];
        case 429:
            return ['Too many requests - please wait a moment', 'Try again in 30 seconds'];
        case 500:
        case 502:
        case 503:
        case 504:
            return ['Server error - please try again later', 'Contact support if the issue persists'];
        default:
            return ['Try again in a few moments', 'Contact support if the issue persists'];
    }
}

/**
 * Parse fetch response error
 */
export async function parseResponseError(response: Response): Promise<ParsedError> {
    try {
        const errorData = await response.json();
        return parseApiError(errorData);
    } catch {
        return parseApiError(response);
    }
}

/**
 * Enhanced error logging with better object serialization
 */
export function logError(context: string, error: unknown, additionalData?: any): void {
    const parsed = parseApiError(error);

    console.group(`❌ ${context} Error`);

    // Better error logging with proper serialization
    if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
    } else if (typeof error === 'object' && error !== null) {
        console.error('Error object keys:', Object.keys(error));
        console.error('Error JSON:', JSON.stringify(error, null, 2));
    } else {
        console.error('Raw error:', error);
    }

    console.error('Parsed error:', parsed);

    if (additionalData) {
        console.error('Additional data:', typeof additionalData === 'object'
            ? JSON.stringify(additionalData, null, 2)
            : additionalData
        );
    }
    console.groupEnd();
}