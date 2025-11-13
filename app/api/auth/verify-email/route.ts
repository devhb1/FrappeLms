import connectToDatabase from "@/lib/db";
import { User } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/emails";

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
        const { email, otp } = await request.json();

        if (!email || !otp) {
            return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
        }

        await connectToDatabase();

        // Find user and explicitly select verifyCode and verifyCodeExpiry fields
        const user = await User.findOne({ email }).select('+verifyCode +verifyCodeExpiry');

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (user.isVerified) {
            return NextResponse.json({ error: "Email already verified" }, { status: 400 });
        }

        // Check if OTP is valid and not expired
        if (user.verifyCode !== otp) {
            console.error(`❌ OTP mismatch - DB: "${user.verifyCode}" vs Input: "${otp}"`);
            return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
        }

        if (user.verifyCodeExpiry && new Date() > user.verifyCodeExpiry) {
            return NextResponse.json({ error: "OTP has expired" }, { status: 400 });
        }

        // Verify the user using MongoDB $unset to properly remove fields
        await User.findByIdAndUpdate(user._id, {
            $set: { isVerified: true },
            $unset: { verifyCode: "", verifyCodeExpiry: "" }
        });

        // Send welcome email after successful verification
        const welcomeSuccess = await safeEmailSend(
            sendEmail.welcome(user.email, user.username),
            'email verification - welcome email'
        );

        return NextResponse.json({
            message: "Email verified successfully! Welcome to MaalEdu.",
            isVerified: true,
            welcomeEmailSent: welcomeSuccess
        }, { status: 200 });

    } catch (error) {
        console.error("Email verification error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
