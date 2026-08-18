import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { adminEmails } from "./admins";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "missing-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "missing-client-secret",
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      // We allow the sign-in, but the middleware/session will handle actual access control
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        token.isAdmin = user.email ? adminEmails.includes(user.email.toLowerCase()) : false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = token.picture;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      // Falls back to the storefront, not /admin.
      //
      // Customers sign in with Google too, through this same configuration. The
      // old default sent every one of them to /admin, where the middleware
      // immediately bounced them to /access-denied — telling a paying shopper on
      // their own shop that they were not authorised.
      //
      // Admins are unaffected: the login page passes an explicit callbackUrl,
      // which is handled by the two lines above.
      return baseUrl;
    },
  },
  session: {
    strategy: "jwt",
    // Stated explicitly rather than relying on NextAuth's default, which happens
    // to be the same 30 days. Removing someone from ADMIN_EMAILS now takes
    // effect on their next request regardless of session age — see requireAdmin.
    maxAge: 30 * 24 * 60 * 60,
  },
};