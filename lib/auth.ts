import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Admin emails array (for admin dashboard access)
const adminEmails = ["hatemrihan100@gmail.com", "muhamed.alkady@gmail.com", "juwayriyahaminnoufaljee@gmail.com"];

export const authOptions: NextAuthOptions = {
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
      console.log("SignIn callback - User email:", user.email);

      // Allow ALL users to sign in with Google (not just admins)
      if (user.email) {
        console.log("Valid email, allowing sign in for:", user.email);
        return true;
      } else {
        console.log("No email provided, denying sign in");
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
        // Add admin flag to token
        token.isAdmin = user.email ? adminEmails.includes(user.email) : false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = token.picture;
        // Add admin flag to session
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log("Redirect callback - URL:", url, "Base URL:", baseUrl);
      // If it's a relative URL, make it absolute
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // If it's the same origin, allow it
      else if (new URL(url).origin === baseUrl) return url;
      // Otherwise, redirect to home page (not admin)
      return `${baseUrl}/`;
    },
  },
  session: {
    strategy: "jwt",
  },
  debug: true,
};