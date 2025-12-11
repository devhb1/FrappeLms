import Stripe from 'stripe'

// Log Stripe initialization for debugging
console.log('🔧 Initializing Stripe...', {
    hasKey: !!process.env.STRIPE_SECRET_KEY,
    keyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7) || 'MISSING'
});

if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY is not defined in environment variables');
    throw new Error('STRIPE_SECRET_KEY is not defined in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    // @ts-ignore - Different Stripe versions between local and Vercel
    apiVersion: '2025-08-27.basil',
    typescript: true,
})

console.log('✅ Stripe initialized successfully');
