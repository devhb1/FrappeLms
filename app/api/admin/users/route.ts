/**
 * =============================
 * ADMIN USERS API - MVP VERSION
 * =============================
 * 
 * Simple API for admin to view and manage users
 * - List all users with basic info
 * - Search by email
 * - Basic pagination
 */

import connectToDatabase from "@/lib/db";
import { User } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET: List all users (admin only)
export async function GET(request: NextRequest) {
    try {
        // Check admin authentication
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const search = searchParams.get('search') || '';

        await connectToDatabase();

        // Build search filter
        const filter: any = {};
        if (search) {
            filter.$or = [
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }

        // Get users with pagination
        const users = await User.find(filter)
            .select('-password -verifyCode -verifyCodeExpiry')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const total = await User.countDocuments(filter);

        // Calculate user stats
        const userStats = users.map(user => ({
            _id: user._id,
            email: user.email,
            username: user.username,
            role: user.role,
            isVerified: user.isVerified,
            totalSpent: user.totalSpent || 0,
            coursesCount: user.purchasedCourses?.length || 0,
            lastLogin: user.lastLogin,
            createdAt: user.createdAt,
            status: user.isVerified ? 'Active' : 'Pending Verification'
        }));

        return NextResponse.json({
            users: userStats,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Admin users fetch error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PUT: Update user role or status (admin only)
export async function PUT(request: NextRequest) {
    try {
        // Check admin authentication
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const { userId, role, action } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        await connectToDatabase();

        const user = await User.findById(userId);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Update user based on action
        if (role && ['admin', 'user'].includes(role)) {
            user.role = role;
        }

        if (action === 'verify') {
            user.isVerified = true;
        } else if (action === 'suspend') {
            user.isVerified = false;
        }

        await user.save();

        return NextResponse.json({
            message: "User updated successfully",
            user: {
                _id: user._id,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified
            }
        });

    } catch (error) {
        console.error("Admin user update error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
