import connectToDatabase from "@/lib/db";
import { User } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/emails";

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
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        await connectToDatabase();

        // Find user and explicitly select verifyCode field for updating
        const user = await User.findOne({ email }).select('+verifyCode +verifyCodeExpiry');

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (user.isVerified) {
            return NextResponse.json({ error: "Email already verified" }, { status: 400 });
        }

        // Generate new OTP
        const verifyCode = generateOTP();
        const verifyCodeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Update user with new OTP
        user.verifyCode = verifyCode;
        user.verifyCodeExpiry = verifyCodeExpiry;
        await user.save();

        // Send OTP email
        const otpSuccess = await safeEmailSend(
            sendEmail.otp(email, user.username, verifyCode),
            'OTP resend'
        );

        return NextResponse.json({
            message: "OTP sent successfully",
            emailSent: otpSuccess
        }, { status: 200 });

    } catch (error) {
        console.error("Resend OTP error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
