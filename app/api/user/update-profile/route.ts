import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { User } from '@/lib/models/user';

export async function PUT(request: NextRequest) {
    try {
        // Check if user is authenticated
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json(
                { success: false, message: 'Authentication required' },
                { status: 401 }
            );
        }

        // Connect to database
        await connectToDatabase();

        // Parse request body
        const { username } = await request.json();

        // Validate input
        if (!username || username.trim().length === 0) {
            return NextResponse.json(
                { success: false, message: 'Username is required' },
                { status: 400 }
            );
        }

        if (username.trim().length < 3) {
            return NextResponse.json(
                { success: false, message: 'Username must be at least 3 characters' },
                { status: 400 }
            );
        }

        // Update user profile
        const updatedUser = await User.findOneAndUpdate(
            { email: session.user.email },
            {
                username: username.trim()
            },
            { new: true, runValidators: true }
        ); if (!updatedUser) {
            return NextResponse.json(
                { success: false, message: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                _id: updatedUser._id,
                email: updatedUser.email,
                username: updatedUser.username
            }
        });

    } catch (error: any) {
        console.error('Profile update error:', error);

        if (error.code === 11000) {
            return NextResponse.json(
                { success: false, message: 'Username already exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { success: false, message: 'Internal server error' },
            { status: 500 }
        );
    }
}
