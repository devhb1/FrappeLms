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

        const { email, password, username } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
        }

        await connectToDatabase();

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return NextResponse.json({ error: "email already exists" }, { status: 409 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Generate OTP for email verification
        const verifyCode = generateOTP();
        const verifyCodeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Create user
        const user = await User.create({
            email,
            username: username || email.split('@')[0],
            password: hashedPassword,
            verifyCode,
            verifyCodeExpiry,
            isVerified: false,
            role: "user"
        });

        // Send only OTP verification email during registration
        // Welcome email will be sent after verification
        const otpSuccess = await safeEmailSend(
            sendEmail.otp(email, user.username, verifyCode),
            'user registration - OTP verification'
        );

        return NextResponse.json({
            message: "User registered successfully. Please check your email for verification code.",
            userId: user._id,
            emailSent: { otp: otpSuccess }
        }, { status: 201 });

    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }

}