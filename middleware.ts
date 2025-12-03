import { withAuth } from "next-auth/middleware";
import { NextRequest, NextResponse } from "next/server";

export default withAuth(
    function middleware(request: NextRequest) {
        const { pathname } = request.nextUrl;

        // Allow static files and assets
        if (
            pathname.startsWith("/_next/") ||
            pathname.startsWith("/assets/") ||
            pathname.startsWith("/api/auth/") ||
            pathname.includes(".") ||
            pathname === "/favicon.ico"
        ) {
            return NextResponse.next();
        }

        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const { pathname } = req.nextUrl;

                // API routes that need authentication
                if (pathname.startsWith("/api/")) {
                    // Allow auth endpoints
                    if (pathname.startsWith("/api/auth/")) return true;
                    // Allow webhook endpoints (fixed pattern to match actual endpoint)
                    if (pathname.startsWith("/api/webhook")) return true;
                    // Allow public API endpoints
                    if (pathname.includes("/api/courses") && req.method === "GET") return true;
                    // Allow enrollments API for LMS team access
                    if (pathname.startsWith("/api/enrollments") && req.method === "GET") return true;
                    // Allow checkout endpoints (for guest purchases)
                    if (pathname.startsWith("/api/checkout")) return true;
                    // Allow complete-enrollment endpoint (fallback for webhook failures)
                    if (pathname.startsWith("/api/complete-enrollment")) return true;
                    // Allow manual-sync endpoint (for admin/debug)
                    if (pathname.startsWith("/api/manual-sync")) return true;
                    // Allow debug endpoints (for development)
                    if (pathname.startsWith("/api/debug-")) return true;
                    // Allow test enrollment endpoint (for development)
                    if (pathname.startsWith("/api/test-simple-enrollment")) return true;
                    // Allow coupon validation (for checkout flow)
                    if (pathname.startsWith("/api/coupons/validate")) return true;
                    // Allow grants application (for public access)
                    if (pathname.startsWith("/api/grants")) return true;
                    // Allow health check endpoint
                    if (pathname.startsWith("/api/health")) return true;
                    // Require auth for other API endpoints
                    return !!token;
                }

                // Public pages that don't require authentication
                const publicPages = [
                    "/",
                    "/home",
                    "/about-us",
                    "/career-pathway",
                    "/courses",
                    "/certification",
                    "/contact-us",
                    "/faqs",
                    "/grants",
                    "/policies/privacy-policy",
                    "/policies/refund-policy",
                    "/policies/terms-and-conditions",
                    "/signin",
                    "/register",
                    "/verify-email",
                    "/success",
                    "/cancel"
                ];

                // Check for exact matches and dynamic routes
                if (publicPages.includes(pathname) || pathname.startsWith("/courses/")) {
                    return true; // Allow access without auth
                }

                // Admin routes require admin role
                if (pathname.startsWith("/admin-dashboard") || pathname.startsWith("/admin/")) {
                    return token?.role === "admin";
                }

                // Affiliate routes require authentication
                if (pathname.startsWith("/affiliate-dashboard")) {
                    return !!token;
                }

                // Protected dashboard routes
                if (pathname.startsWith("/dashboard") || pathname.startsWith("/profile")) {
                    return !!token;
                }

                // Default: allow for unmatched routes (they might be 404s)
                return true;
            }
        }
    }
);

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files) 
         * - favicon.ico (favicon file)
         * - All files in /assets/ directory
         * - All files with extensions (images, css, js, etc.)
         */
        "/((?!_next/static|_next/image|favicon.ico|assets/).*)",
        "/((?!.*\\.).*)" // Exclude files with extensions
    ]
};
