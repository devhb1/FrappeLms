
/**
 * =============================
 *  GRANT APPLICATION API ROUTE
 * =============================
 *
 * Handles POST requests for submitting new grant applications.
 * - Validates input fields
 * - Prevents duplicate applications for the same course
 * - Stores application in MongoDB
 * - Returns status and grant ID
 */
import connectToDatabase from "@/lib/db";
import { Grant } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        // Parse and destructure request body
        const { name, email, username, age, socialAccounts, reason, courseId } = await request.json();

        // 1. Validate required fields
        if (!name || !email || !username || !age || !socialAccounts || !reason || !courseId) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }

        // 2. Validate age range
        if (age < 16 || age > 100) {
            return NextResponse.json({ error: "Age must be between 16 and 100" }, { status: 400 });
        }

        // 3. Connect to database
        await connectToDatabase();

        // 4. Prevent duplicate applications for the same course (pending/approved only)
        const existingGrant = await Grant.findOne({
            email,
            courseId,
            status: { $in: ['pending', 'approved'] }
        });
        if (existingGrant) {
            return NextResponse.json({ error: "You have already applied for this course" }, { status: 409 });
        }

        // 5. Create and store the grant application
        const grant = await Grant.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            username: username.trim(),
            age: parseInt(age),
            socialAccounts: socialAccounts.trim(),
            reason: reason.trim(),
            courseId: courseId.trim(),
            status: 'pending'
        });

        // 6. Return success response with grant ID and status
        return NextResponse.json({
            message: "Grant application submitted successfully",
            grantId: grant._id,
            status: grant.status
        }, { status: 201 });

    } catch (error: any) {
        console.error("Grant application error:", error);

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const firstError = Object.values(error.errors)[0] as any;
            return NextResponse.json({
                error: firstError.message
            }, { status: 400 });
        }

        return NextResponse.json({
            error: "Internal Server Error"
        }, { status: 500 });
    }
}

// GET: Fetch grant applications (for admin)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const email = searchParams.get('email');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        await connectToDatabase();

        // Build filter
        const filter: any = {};
        if (status && ['pending', 'approved', 'rejected'].includes(status)) {
            filter.status = status;
        }
        if (email) {
            filter.email = email;
        }

        // Fetch grants with pagination
        const grants = await Grant.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const total = await Grant.countDocuments(filter);

        return NextResponse.json({
            grants,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }, { status: 200 });

    } catch (error) {
        console.error("Fetch grants error:", error);
        return NextResponse.json({
            error: "Internal Server Error"
        }, { status: 500 });
    }
}
