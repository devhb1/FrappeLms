# MaalEdu - Blockchain Education Platform

![MaalEdu Logo](Homepage.png)

A modern, full-stack blockchain education platform built with Next.js 15, featuring comprehensive course management, Stripe payment integration, and MongoDB data persistence. MaalEdu empowers learners to master blockchain technology through structured courses and hands-on projects.

## 🚀 Features

### 🎓 Education Platform
- **Interactive Course Catalog** - Browse blockchain and Web3 courses with detailed descriptions
- **Multi-level Learning Paths** - From beginner fundamentals to advanced smart contract development
- **Professional Certifications** - Industry-recognized certificates upon course completion
- **Responsive Design** - Optimized for desktop, tablet, and mobile devices
- **Dark/Light Theme** - Complete theme switching with system preference detection

### 💳 E-Commerce Integration
- **Stripe Payment Processing** - Secure checkout with multiple payment methods
- **Course Enrollment System** - Automated enrollment upon successful payment
- **Webhook Integration** - Real-time payment verification and processing
- **Transaction Management** - Complete payment history and invoice tracking
- **Test & Production Ready** - Comprehensive testing with Stripe test cards

### 🔧 Technical Excellence
- **Next.js 15 App Router** - Latest React features with server-side rendering
- **TypeScript** - Type-safe development with comprehensive error checking
- **MongoDB Integration** - Scalable database with Mongoose ODM
- **Modern UI/UX** - shadcn/ui components with Tailwind CSS
- **API Architecture** - RESTful API design with proper error handling

### 🔗 Future-Ready Architecture
- **Open edX Integration** - Ready for LMS platform connection
- **Microservices Ready** - Modular API design for easy scaling
- **Cloud Deployment** - Vercel-optimized with environment configurations

## �️ Tech Stack

### Frontend
- **Framework**: Next.js 15.2.4 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4.1.9 + shadcn/ui components
- **UI Components**: Radix UI primitives
- **State Management**: React Hook Form + Zod validation
- **Theme**: next-themes with dark/light mode support

### Backend
- **API Routes**: Next.js API routes with TypeScript
- **Database**: MongoDB Atlas with Mongoose ODM
- **Payment Processing**: Stripe API with webhook handling
- **Authentication**: Ready for NextAuth.js integration
- **Validation**: Zod schema validation

### Development Tools
- **Package Manager**: pnpm
- **Code Quality**: ESLint + TypeScript strict mode
- **Styling**: PostCSS + Autoprefixer
- **Icons**: Lucide React icon library

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18.0.0 or higher)
- **pnpm** (v8.0.0 or higher)
- **Git** for version control

### Required Accounts
- **Stripe Account** - For payment processing ([stripe.com](https://stripe.com))
- **MongoDB Atlas** - For database hosting ([mongodb.com](https://mongodb.com))
- **Vercel Account** - For deployment (optional) ([vercel.com](https://vercel.com))

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/devhb1/MaalEdu_Frontend.git
cd MaalEdu_Frontend
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Open edX Configuration (for future use)
OPEN_EDX_BASE_URL=https://your-openedx-instance.com
OPEN_EDX_API_TOKEN=your_openedx_api_token_here
```

### 4. Start Development Server
```bash
pnpm dev
```

Visit `http://localhost:3000` to see the application running.

## 🔧 Configuration Guide

### Stripe Setup

1. **Create Stripe Account**
   - Sign up at [stripe.com](https://stripe.com)
   - Navigate to API keys in the dashboard
   - Copy your publishable and secret keys

2. **Configure Webhooks**
   - Go to Stripe Dashboard → Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhook`
   - Select events: `checkout.session.completed`, `payment_intent.succeeded`
   - Copy the webhook secret

3. **Test Mode**
   - Use test card: `4242 4242 4242 4242`
   - Any future expiry date and CVC

### MongoDB Setup

1. **Create MongoDB Atlas Account**
   - Sign up at [mongodb.com](https://mongodb.com)
   - Create a new cluster
   - Set up database user and whitelist IP addresses

2. **Connection String**
   - Get connection string from cluster dashboard
   - Replace `<username>` and `<password>` with your credentials
   - Add to `MONGODB_URI` in `.env.local`

### Deployment (Vercel)

1. **Connect Repository**
   - Push code to GitHub/GitLab
   - Connect repository to Vercel
   - Configure environment variables in Vercel dashboard

2. **Environment Variables**
   - Add all `.env.local` variables to Vercel
   - Update `NEXT_PUBLIC_APP_URL` to your production domain
   - Update Stripe webhook endpoint URL

## 📁 Project Structure

```
MaalEdu_Frontend/
├── app/                          # Next.js 15 App Router
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout component
│   ├── page.tsx                 # Homepage
│   ├── about-us/                # About page
│   ├── api/                     # API routes
│   │   ├── checkout/            # Stripe checkout session creation
│   │   ├── webhook/             # Stripe webhook handler
│   │   └── enroll/              # Course enrollment API
│   ├── cancel/                  # Payment cancellation page
│   ├── career-pathway/          # Career guidance page
│   ├── certification/           # Certification information
│   ├── contact-us/              # Contact form
│   ├── courses/                 # Course catalog page
│   ├── faqs/                    # Frequently asked questions
│   ├── policies/                # Privacy, terms, refund policies
│   └── success/                 # Payment success page
├── components/                   # Reusable React components
│   ├── ui/                      # shadcn/ui components
│   ├── hero-section.tsx         # Homepage hero component
│   ├── site-header.tsx          # Navigation header
│   ├── site-footer.tsx          # Footer component
│   ├── testimonials.tsx         # Student testimonials
│   ├── dual-diplomas-section.tsx # Dual diploma info
│   ├── key-features.tsx         # Feature highlights
│   ├── program-overview.tsx     # Program details
│   ├── certification-preview.tsx # Certificate preview
│   ├── career-pathways-preview.tsx # Career paths
│   ├── blockchain-revolution-section.tsx # Revolution section
│   ├── cta-section.tsx          # Call-to-action
│   ├── affiliate-section.tsx    # Affiliate program
│   └── theme-provider.tsx       # Dark/light theme provider
├── hooks/                       # Custom React hooks
├── lib/                         # Utility libraries
│   ├── courses.ts               # Course data and utilities
│   ├── db.ts                    # MongoDB connection
│   ├── models.ts                # Mongoose schemas
│   ├── stripe.ts                # Stripe configuration
│   ├── types.ts                 # TypeScript type definitions
│   └── utils.ts                 # General utilities
├── public/                      # Static assets
│   └── assets/                  # Images and media files
└── styles/                      # Additional stylesheets
```

## 🎯 Key Features Explained

### Course Management
- **Dynamic Course Catalog**: Courses are managed in `lib/courses.ts` with TypeScript interfaces
- **Flexible Course IDs**: Support for alphanumeric course identifiers (e.g., `blockchain-fundamentals-101`)
- **Rich Course Data**: Titles, descriptions, pricing, duration, difficulty levels, and feature lists
- **Professional Images**: High-quality course thumbnails from Unsplash

### Payment Processing
- **Secure Checkout**: Stripe-hosted checkout pages with SSL encryption
- **Multiple Payment Methods**: Credit cards, digital wallets, and international payment options
- **Webhook Verification**: Automatic enrollment processing upon successful payment
- **Error Handling**: Comprehensive error management for failed transactions
- **Test Mode**: Complete testing environment with Stripe test cards

### Database Operations
- **User Enrollments**: Track course purchases and user progress
- **Payment Records**: Store transaction history and metadata
- **Scalable Schema**: MongoDB collections designed for growth
- **Connection Caching**: Optimized database connections for serverless environments

### API Architecture
- **RESTful Design**: Clean API endpoints following REST principles
- **Type Safety**: Zod schema validation for all API requests
- **Error Handling**: Standardized error responses with proper HTTP status codes
- **Webhook Security**: Stripe signature verification for secure payment processing

## 🧪 Testing

### Payment Flow Testing
1. Navigate to `/courses`
2. Click "Buy Now" on any course
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout and verify redirect to success page

### API Testing
```bash
# Test checkout API
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"courseId": "blockchain-fundamentals-101", "email": "test@example.com"}'

# Test webhook (requires Stripe CLI)
stripe listen --forward-to localhost:3000/api/webhook
```

## 📝 Available Scripts

```bash
# Development server with hot reload
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Run ESLint for code quality
pnpm lint
```

## � Deployment

### Vercel Deployment (Recommended)
1. Push code to GitHub repository
2. Connect repository to Vercel
3. Configure environment variables
4. Deploy with automatic CI/CD

### Manual Deployment
```bash
# Build for production
pnpm build

# Start production server
pnpm start
```

## 🔒 Security Considerations

- **Environment Variables**: Never commit `.env.local` to version control
- **Stripe Keys**: Use test keys for development, live keys for production
- **Database Security**: Enable MongoDB authentication and IP whitelisting
- **HTTPS Required**: Always use SSL in production for payment processing
- **Webhook Verification**: Verify Stripe webhook signatures for security

## � Troubleshooting

### Common Issues

**Stripe Webhook Not Working**
- Verify webhook URL in Stripe dashboard
- Check `STRIPE_WEBHOOK_SECRET` environment variable
- Ensure webhook endpoint is publicly accessible

**Database Connection Failed**
- Verify MongoDB URI format
- Check database user permissions
- Ensure IP address is whitelisted in MongoDB Atlas

**Build Errors**
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && pnpm install`
- Check TypeScript errors: `pnpm build`

**Environment Variables Not Loading**
- Ensure `.env.local` is in project root
- Restart development server after changes
- Check variable names match exactly

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use Prettier for code formatting
- Write descriptive commit messages
- Test payment flows before submitting PRs

## 📚 Documentation Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

## � License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## � Team

- **Developer**: [Harshit](https://github.com/devhb1)
- **Project**: MaalEdu Blockchain Education Platform

## 🔮 Roadmap

### Phase 1 (Current) ✅
- ✅ Course catalog and payment processing
- ✅ MongoDB integration
- ✅ Responsive design with dark/light themes
- ✅ Stripe checkout and webhook handling
- ✅ TypeScript implementation with proper validation

### Phase 2 (Next)
- 🔄 Open edX LMS integration
- 🔄 User authentication and profiles
- 🔄 Course progress tracking
- 🔄 Email notifications and receipts

### Phase 3 (Future)
- 📋 Video streaming integration
- 📋 Interactive coding challenges
- 📋 Community features and forums
- 📋 Mobile app development
- 📋 Advanced analytics dashboard

---

For support, email: support@maaledu.com
