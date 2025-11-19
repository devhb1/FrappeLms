'use client';

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

interface AuthProviderProps {
    children: ReactNode;
}

/**
 * Client-side Authentication Provider
 * 
 * Wraps the NextAuth SessionProvider for use in the app.
 * This component runs on the client-side to provide session context.
 */
export function AuthProvider({ children }: AuthProviderProps) {
    return (
        <SessionProvider
            refetchInterval={5 * 60}
            refetchOnWindowFocus={true}
        >
            {children}
        </SessionProvider>
    );
}
