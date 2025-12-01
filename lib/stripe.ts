import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not defined in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    // @ts-ignore - Different Stripe versions between local and Vercel
    apiVersion: '2025-08-27.basil',
    typescript: true,
})
