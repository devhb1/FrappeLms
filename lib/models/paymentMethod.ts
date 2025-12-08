/**
 * PAYMENT METHODS MODEL - User Payment Preferences
 * 
 * This model handles multiple payment methods for users, supporting both
 * affiliate payouts and general payment preferences that appear in profile settings.
 * 
 * DESIGN PRINCIPLE:
 * - Users can have multiple payment methods
 * - One method can be marked as default
 * - Payment methods are shared between affiliate system and profile settings
 * - Supports PayPal, Bank Transfer, and Cryptocurrency
 * 
 * INTEGRATION POINTS:
 * - Profile Settings Dashboard: Users can view/edit payment methods
 * - Affiliate Dashboard: Uses payment methods for commission payouts
 * - Admin Dashboard: Processes payouts using these methods
 */

import mongoose, { Schema, Document } from "mongoose";

// ===== PAYMENT METHOD INTERFACE =====
export interface IPaymentMethod extends Document {
    userId: mongoose.Types.ObjectId;
    methodId: string; // Unique identifier for this payment method
    type: 'paypal' | 'bank' | 'crypto';
    label: string; // User-friendly name like "Main PayPal", "Business Account"
    isDefault: boolean;
    isActive: boolean;

    // PayPal fields
    paypalEmail?: string;

    // Bank fields
    bankDetails?: {
        accountNumber: string;
        routingNumber: string;
        bankName: string;
        accountHolderName: string;
        accountType?: 'checking' | 'savings';
    };

    // Crypto fields
    cryptoWallet?: string;
    cryptoType?: 'bitcoin' | 'ethereum' | 'usdt' | 'other';
    cryptoNetwork?: string; // e.g., "Ethereum Mainnet", "Bitcoin"

    createdAt: Date;
    updatedAt: Date;
}

// ===== PAYMENT METHOD SCHEMA =====
const paymentMethodSchema: Schema<IPaymentMethod> = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
        // Index handled by compound indexes below
    },
    methodId: {
        type: String,
        required: [true, 'Method ID is required'],
        unique: true
    },
    type: {
        type: String,
        enum: {
            values: ['paypal', 'bank', 'crypto'],
            message: 'Payment type must be paypal, bank, or crypto'
        },
        required: [true, 'Payment type is required']
    },
    label: {
        type: String,
        required: [true, 'Label is required'],
        trim: true,
        maxlength: [50, 'Label cannot exceed 50 characters']
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },

    // PayPal fields
    paypalEmail: {
        type: String,
        validate: {
            validator: function (this: IPaymentMethod, value: string) {
                if (this.type === 'paypal') {
                    return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
                }
                return true;
            },
            message: 'Valid PayPal email is required for PayPal payment method'
        }
    },

    // Bank fields
    bankDetails: {
        accountNumber: {
            type: String,
            validate: {
                validator: function (this: IPaymentMethod) {
                    if (this.type === 'bank') {
                        return this.bankDetails?.accountNumber && this.bankDetails.accountNumber.length >= 5;
                    }
                    return true;
                },
                message: 'Account number is required for bank payment method'
            }
        },
        routingNumber: {
            type: String,
            validate: {
                validator: function (this: IPaymentMethod) {
                    if (this.type === 'bank') {
                        return this.bankDetails?.routingNumber && this.bankDetails.routingNumber.length >= 5;
                    }
                    return true;
                },
                message: 'Routing number is required for bank payment method'
            }
        },
        bankName: {
            type: String,
            validate: {
                validator: function (this: IPaymentMethod) {
                    if (this.type === 'bank') {
                        return this.bankDetails?.bankName && this.bankDetails.bankName.length > 0;
                    }
                    return true;
                },
                message: 'Bank name is required for bank payment method'
            }
        },
        accountHolderName: {
            type: String,
            validate: {
                validator: function (this: IPaymentMethod) {
                    if (this.type === 'bank') {
                        return this.bankDetails?.accountHolderName && this.bankDetails.accountHolderName.length > 0;
                    }
                    return true;
                },
                message: 'Account holder name is required for bank payment method'
            }
        },
        accountType: {
            type: String,
            enum: ['checking', 'savings'],
            validate: {
                validator: function (this: IPaymentMethod) {
                    if (this.type === 'bank') {
                        return this.bankDetails?.accountType;
                    }
                    return true;
                },
                message: 'Account type is required for bank payment method'
            }
        }
    },

    // Crypto fields
    cryptoWallet: {
        type: String,
        validate: {
            validator: function (this: IPaymentMethod, value: string) {
                if (this.type === 'crypto') {
                    return value && value.length >= 20;
                }
                return true;
            },
            message: 'Valid crypto wallet address is required for crypto payment method'
        }
    },
    cryptoType: {
        type: String,
        enum: ['bitcoin', 'ethereum', 'usdt', 'other'],
        validate: {
            validator: function (this: IPaymentMethod) {
                if (this.type === 'crypto') {
                    return this.cryptoType;
                }
                return true;
            },
            message: 'Crypto type is required for crypto payment method'
        }
    },
    cryptoNetwork: {
        type: String,
        validate: {
            validator: function (this: IPaymentMethod) {
                if (this.type === 'crypto') {
                    return this.cryptoNetwork && this.cryptoNetwork.length > 0;
                }
                return true;
            },
            message: 'Crypto network is required for crypto payment method'
        }
    }
}, {
    timestamps: true
});

// Indexes for performance
paymentMethodSchema.index({ userId: 1, isDefault: 1 });
paymentMethodSchema.index({ userId: 1, isActive: 1 });
paymentMethodSchema.index({ userId: 1, type: 1 });

// ===== MODEL EXPORT =====

// Clear existing model to prevent "Cannot overwrite model" errors
if (mongoose.models.PaymentMethod) {
    delete mongoose.models.PaymentMethod;
}

export const PaymentMethod = mongoose.model<IPaymentMethod>('PaymentMethod', paymentMethodSchema);
export const paymentMethodModel = PaymentMethod;
export default PaymentMethod;
