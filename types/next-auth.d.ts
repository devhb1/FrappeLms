// need this incase of ts for next-Auth

import { DefaultSession } from "next-auth"

// Extend `next-auth` types
declare module "next-auth" {

    interface User {
        _id: string
        isVerified?: boolean
        isAcceptingMessages?: boolean
        username?: string
        role?: string
    }
    interface Session {
        user: {
            _id: string
            isVerified?: boolean
            role?: string
            username?: string
        } & DefaultSession["user"]
    }

}