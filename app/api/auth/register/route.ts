import connectToDatabase from "@/lib/db";
import { User } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/emails";
import bcrypt from "bcryptjs";

// Generate OTP
function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Safe email sending wrapper
async function safeEmailSend(emailPromise: Promise<boolean>, context: string): Promise<boolean> {
    try {
        const success = await emailPromise;
        if (!success) {
            console.warn(`⚠️ Email failed: ${context}`);
        }
        return success;
    } catch (error) {
        console.error(`❌ Email error: ${context}`, error);
        return false;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password, username } = body;

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }

        // Validate password strength
        if (password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }

        await connectToDatabase();

        // Check if email already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return NextResponse.json({ error: "Email already exists" }, { status: 409 });
        }

        // Generate unique username if not provided
        let finalUsername = username;
        if (!finalUsername) {
            const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '');
            finalUsername = baseUsername;

            // Check if username exists and add suffix if needed
            let usernameExists = await User.findOne({ username: finalUsername });
            let counter = 1;
            while (usernameExists) {
                finalUsername = `${baseUsername}${counter}`;
                usernameExists = await User.findOne({ username: finalUsername });
                counter++;
            }
        } else {
            // Check if provided username already exists
            const usernameExists = await User.findOne({ username: finalUsername });
            if (usernameExists) {
                return NextResponse.json({
                    error: "Username already exists",
                    suggestion: `Try ${finalUsername}${Math.floor(Math.random() * 1000)}`
                }, { status: 409 });
            }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Generate OTP for email verification
        const verifyCode = generateOTP();
        const verifyCodeExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour (increased from 10 minutes)

        // Create user
        const user = await User.create({
            email: email.toLowerCase(),
            username: finalUsername,
            password: hashedPassword,
            verifyCode,
            verifyCodeExpiry,
            isVerified: false,
            role: "user"
        });

        // Send only OTP verification email during registration
        // Welcome email will be sent after verification
        const otpSuccess = await safeEmailSend(
            sendEmail.otp(email.toLowerCase(), finalUsername, verifyCode),
            'user registration - OTP verification'
        );

        return NextResponse.json({
            message: "User registered successfully. Please check your email for verification code.",
            userId: user._id,
            emailSent: { otp: otpSuccess }
        }, { status: 201 });

    } catch (error: any) {
        console.error("❌ Registration error:", error);

        // Provide more detailed error information
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map((err: any) => err.message);
            return NextResponse.json({
                error: "Validation failed",
                details: validationErrors,
                message: validationErrors.join(', ')
            }, { status: 400 });
        }

        if (error.code === 11000) {
            // Duplicate key error (unique constraint violation)
            const field = Object.keys(error.keyPattern)[0];
            return NextResponse.json({
                error: `${field} already exists`,
                field: field
            }, { status: 409 });
        }

        return NextResponse.json({
            error: "Internal Server Error",
            message: error.message || "Unknown error occurred"
        }, { status: 500 });
    }

}