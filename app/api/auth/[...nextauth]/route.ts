import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };


//s3 

// now issue is nextauth is for signup not signin so for that we need to build our register in api
//for signup we use our own startegy , here we using credential providers
