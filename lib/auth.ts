
/**
 * =============================
 *  NEXTAUTH CONFIGURATION FILE
 * =============================
 *
 * This file configures authentication for the MaalEdu platform using NextAuth.js.
 *
 * - Uses CredentialsProvider for email/password login
 * - Connects to MongoDB for user lookup
 * - Handles JWT and session callbacks to enrich session with user info
 * - Implements role-based redirection after sign-in
 * - Custom error handling and page overrides
 */

import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import connectToDatabase from './db'
import { userModel } from './models'


/**
 * Main NextAuth configuration object
 */
export const authOptions: NextAuthOptions = {


    /**
     * ===============
     * AUTH PROVIDERS
     * ===============
     *
     * Currently only CredentialsProvider is used for email/password login.
     * You can add OAuth providers here if needed.
     */
    providers: [
        CredentialsProvider({
            id: "credentials",
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
            },
            /**
             * Custom authorize function for credentials login
             * - Connects to MongoDB
             * - Looks up user by email
             * - Checks if user is verified
             * - Compares password using bcrypt
             * - Returns user object for session
             */
            async authorize(credentials: any): Promise<any> {
                if (!credentials?.email || !credentials?.password) {
                    console.error('❌ Missing credentials');
                    return null;
                }

                try {
                    await connectToDatabase();

                    const user = await userModel.findOne({
                        email: credentials.email.toLowerCase()
                    }).select('+password');

                    if (!user) {
                        console.error('❌ User not found:', credentials.email);
                        return null;
                    }

                    if (!user.isVerified) {
                        console.error('❌ User not verified:', credentials.email);
                        return null;
                    }

                    const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);
                    if (!isPasswordCorrect) {
                        console.error('❌ Invalid password for:', credentials.email);
                        return null;
                    }

                    console.log('✅ User authenticated successfully:', credentials.email);

                    // Return minimal user info for JWT
                    return {
                        id: user._id.toString(),
                        email: user.email,
                        username: user.username,
                        role: user.role
                    }
                } catch (error: any) {
                    console.error('❌ Authentication error:', error.message);
                    return null;
                }
            }
        })
    ],



    /**
     * ===============
     * CALLBACKS
     * ===============
     *
     * - jwt: Enriches JWT token with user info (id, role, username)
     * - session: Makes user info available on client side
     * - redirect: Handles post-login redirection (defaults to /dashboard)
     */
    callbacks: {
        /**
         * JWT callback
         * - Runs on sign-in and whenever a session is checked
         * - Adds user id, role, and username to the token
         */
        async jwt({ token, user }) {
            if (user) {
                token._id = user.id?.toString();
                token.role = user.role;
                token.username = user.username;
            }
            return token;
        },
        /**
         * Session callback
         * - Runs whenever a session is checked (client/server)
         * - Adds user id, role, and username to session.user
         */
        async session({ session, token }) {
            if (token) {
                session.user._id = token._id as string;
                session.user.role = token.role as string;
                session.user.username = token.username as string;
            }
            return session;
        },
        /**
         * Redirect callback
         * - Handles where to send users after sign-in
         * - Defaults to /dashboard for all authenticated users
         */
        async redirect({ url, baseUrl }) {
            if (url.startsWith('/')) {
                return `${baseUrl}${url}`;
            } else if (new URL(url).origin === baseUrl) {
                return url;
            }
            return `${baseUrl}/dashboard`;
        }
    },


    /**
     * ===============
     * PAGE OVERRIDES
     * ===============
     *
     * Custom sign-in and error pages
     */
    pages: {
        signIn: '/signin',
        error: '/signin' // Error code passed in query string as ?error=
    },

    /**
     * ===============
     * SESSION CONFIG
     * ===============
     *
     * - Uses JWT strategy
     * - Session lasts 7 days
     */
    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60 // 7 days
    },

    /**
     * ===============
     * JWT CONFIG
     * ===============
     *
     * JWT configuration for better security
     */
    jwt: {
        maxAge: 7 * 24 * 60 * 60, // 7 days
    },

    /**
     * ===============
     * SECRET
     * ===============
     *
     * Secret for NextAuth JWT encryption
     */
    secret: process.env.NEXTAUTH_SECRET,

    /**
     * ===============
     * DEBUG MODE
     * ===============
     *
     * Enable debug logging in development
     */
    debug: process.env.NODE_ENV === 'development',

}

// End of NextAuth configuration

//this is part 2 of auth