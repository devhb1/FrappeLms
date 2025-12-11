import nodemailer, { Transporter } from 'nodemailer';
import ejs from 'ejs';
import path from 'path';

// ===== PRODUCTION-READY EMAIL SERVICE =====

interface EmailData {
    [key: string]: any;
}

class SimpleEmailService {
    private transporter: Transporter;
    private templatesPath: string;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT as string) || 587,
            secure: process.env.SMTP_PORT === '465',
            auth: {
                user: process.env.SMTP_USER || process.env.SMTP_MAIL,
                pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
            },
        });

        this.templatesPath = path.join(process.cwd(), 'lib', 'emails', 'templates');
        this.verifyConnection();
    }

    private async verifyConnection(): Promise<void> {
        try {
            await this.transporter.verify();
            console.log('✅ Email service ready');
        } catch (error) {
            console.error('❌ SMTP connection failed:', (error as any)?.message || error);
            // Don't throw - let app continue even if email fails
        }
    }

    // Core email sending method
    private async sendTemplateEmail(
        to: string,
        subject: string,
        templateName: string,
        data: EmailData
    ): Promise<boolean> {
        try {
            // Render template
            const templatePath = path.join(this.templatesPath, `${templateName}.ejs`);
            const html = await ejs.renderFile(templatePath, data);

            // Send email
            await this.transporter.sendMail({
                from: `${process.env.EMAIL_FROM || 'MaalEdu'} <${process.env.SMTP_MAIL}>`,
                to,
                subject,
                html,
            });

            console.log(`✅ Email sent: ${templateName} to ${to}`);
            return true;
        } catch (error) {
            console.error(`❌ Email failed (${templateName}):`, (error as any)?.message || error);
            throw error;
        }
    }

    // Simple email methods
    async otp(email: string, userName: string, otp: string): Promise<boolean> {
        return this.sendTemplateEmail(
            email,
            'Verify Your Email - MaalEdu',
            'verification',
            { userName, otpCode: otp }
        );
    }

    async welcome(email: string, userName: string): Promise<boolean> {
        return this.sendTemplateEmail(
            email,
            '🎉 Welcome to MaalEdu!',
            'welcome',
            { userName }
        );
    }

    async grantApproval(
        email: string,
        userName: string,
        courseTitle: string,
        couponCode: string
    ): Promise<boolean> {
        return this.sendTemplateEmail(
            email,
            '🎉 Your Grant Has Been Approved!',
            'grant-approval',
            { userName, courseTitle, couponCode }
        );
    }

    async partialGrantApproval(
        email: string,
        userName: string,
        courseTitle: string,
        couponCode: string,
        discountPercentage: number,
        originalPrice: number,
        finalPrice: number,
        discountAmount: number,
        expirationDate?: string
    ): Promise<boolean> {
        return this.sendTemplateEmail(
            email,
            `🎉 Your Grant Approved - ${discountPercentage}% Discount!`,
            'partial-grant-approval',
            {
                userName,
                courseTitle,
                couponCode,
                discountPercentage,
                originalPrice: originalPrice.toFixed(2),
                finalPrice: finalPrice.toFixed(2),
                discountAmount: discountAmount.toFixed(2),
                savingsAmount: discountAmount.toFixed(2),
                expirationDate: expirationDate || 'No expiration',
                paymentRequired: true
            }
        );
    }

    async partialGrantEnrollment(
        email: string,
        customerName: string,
        courseName: string,
        enrollmentDate: string,
        originalPrice: number,
        finalPrice: number,
        discountPercentage: number,
        couponCode: string
    ): Promise<boolean> {
        return this.sendTemplateEmail(
            email,
            '🎉 Partial Grant Enrollment Confirmed - MaalEdu',
            'partial-grant-enrollment',
            {
                customerName,
                courseName,
                enrollmentDate,
                originalPrice: originalPrice.toFixed(2),
                finalPrice: finalPrice.toFixed(2),
                discountPercentage,
                savingsAmount: (originalPrice - finalPrice).toFixed(2),
                couponCode
            }
        );
    }

    async grantRejection(
        email: string,
        userName: string,
        courseTitle: string,
        reason?: string
    ): Promise<boolean> {
        return this.sendTemplateEmail(
            email,
            'Grant Application Update - MaalEdu',
            'grant-rejection',
            { userName, courseTitle, reason }
        );
    }

    async affiliatePayout(
        email: string,
        affiliateName: string,
        amount: number,
        payoutMethod: string,
        transactionId: string = 'N/A',
        commissionsCount: number = 0
    ): Promise<boolean> {
        return this.sendTemplateEmail(
            email,
            '💰 Payout Processed - MaalEdu',
            'affiliate-payout',
            {
                affiliateName,
                payoutAmount: amount.toFixed(2),
                payoutMethod,
                processingDate: new Date().toLocaleDateString(),
                transactionId,
                commissionsCount
            }
        );
    }

    async coursePurchaseConfirmation(
        email: string,
        customerName: string,
        courseName: string,
        amount: number,
        purchaseDate: string
    ): Promise<boolean> {
        // Validate and provide safe defaults for template variables
        const safeCustomerName = (customerName && customerName.trim()) || 'Student';
        const safeCourseName = (courseName && courseName.trim()) || 'Your Course';
        const safeAmount = (typeof amount === 'number' && !isNaN(amount)) ? amount : 0;
        const safePurchaseDate = (purchaseDate && purchaseDate.trim()) || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        return this.sendTemplateEmail(
            email,
            '🎉 Course Purchase Confirmed - MaalEdu',
            'course-purchase-confirmation',
            {
                customerName: safeCustomerName,
                courseName: safeCourseName,
                amount: safeAmount.toFixed(2),
                purchaseDate: safePurchaseDate
            }
        );
    }

    async grantCourseEnrollment(
        email: string,
        customerName: string,
        courseName: string,
        enrollmentDate: string,
        originalAmount: number
    ): Promise<boolean> {
        // Validate and provide safe defaults
        const safeCustomerName = (customerName && customerName.trim()) || 'Student';
        const safeCourseName = (courseName && courseName.trim()) || 'Your Course';
        const safeEnrollmentDate = (enrollmentDate && enrollmentDate.trim()) || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const safeOriginalAmount = (typeof originalAmount === 'number' && !isNaN(originalAmount)) ? originalAmount : 0;

        return this.sendTemplateEmail(
            email,
            '🎉 Grant Course Enrollment Confirmed - MaalEdu',
            'grant-course-enrollment',
            {
                customerName: safeCustomerName,
                courseName: safeCourseName,
                enrollmentDate: safeEnrollmentDate,
                originalAmount: safeOriginalAmount.toFixed(2)
            }
        );
    }

    // Utility method for testing
    async test(email: string): Promise<boolean> {
        try {
            const result = await this.transporter.sendMail({
                from: `${process.env.EMAIL_FROM || 'MaalEdu'} <${process.env.SMTP_MAIL}>`,
                to: email,
                subject: '🧪 MaalEdu Email Test',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #ea580c;">📧 Email Service Test</h2>
                        <p>Email service is working correctly!</p>
                        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
                        <p style="color: #666;">MaalEdu Technical Team</p>
                    </div>
                `,
            });
            return true;
        } catch (error) {
            console.error(`❌ Test email failed:`, (error as any)?.message || error);
            return false;
        }
    }
}

// Export singleton instance
export const emailService = new SimpleEmailService();

// Clean API for easy use
export const sendEmail = {
    otp: (email: string, userName: string, otp: string) =>
        emailService.otp(email, userName, otp),

    welcome: (email: string, userName: string) =>
        emailService.welcome(email, userName),

    grantApproval: (email: string, userName: string, courseTitle: string, couponCode: string) =>
        emailService.grantApproval(email, userName, courseTitle, couponCode),

    partialGrantApproval: (
        email: string,
        userName: string,
        courseTitle: string,
        couponCode: string,
        discountPercentage: number,
        originalPrice: number,
        finalPrice: number,
        discountAmount: number,
        expirationDate?: string
    ) => emailService.partialGrantApproval(email, userName, courseTitle, couponCode, discountPercentage, originalPrice, finalPrice, discountAmount, expirationDate),

    partialGrantEnrollment: (
        email: string,
        customerName: string,
        courseName: string,
        enrollmentDate: string,
        originalPrice: number,
        finalPrice: number,
        discountPercentage: number,
        couponCode: string
    ) => emailService.partialGrantEnrollment(email, customerName, courseName, enrollmentDate, originalPrice, finalPrice, discountPercentage, couponCode),

    grantRejection: (email: string, userName: string, courseTitle: string, reason?: string) =>
        emailService.grantRejection(email, userName, courseTitle, reason),

    affiliatePayout: (
        email: string,
        affiliateName: string,
        amount: number,
        payoutMethod: string,
        transactionId?: string,
        commissionsCount?: number
    ) => emailService.affiliatePayout(email, affiliateName, amount, payoutMethod, transactionId, commissionsCount),

    coursePurchaseConfirmation: (
        email: string,
        customerName: string,
        courseName: string,
        amount: number,
        purchaseDate: string
    ) => emailService.coursePurchaseConfirmation(email, customerName, courseName, amount, purchaseDate),

    grantCourseEnrollment: (
        email: string,
        customerName: string,
        courseName: string,
        enrollmentDate: string,
        originalAmount: number
    ) => emailService.grantCourseEnrollment(email, customerName, courseName, enrollmentDate, originalAmount),

    test: (email: string) =>
        emailService.test(email)
};

export default sendEmail;
