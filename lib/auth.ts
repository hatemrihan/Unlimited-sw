import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Allowed emails array
const allowedEmails = ["hatemrihan100@gmail.com"];

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "missing-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "missing-client-secret",
    }),
  ],
  callbacks: {
          async signIn({ user }) {
      console.log("SignIn callback - User email:", user.email);
      console.log("Allowed emails:", allowedEmails);
      
      // Check if user's email is in the allowed list
      if (user.email && allowedEmails.includes(user.email)) {
        console.log("Email authorized, allowing sign in");
        return true;
      } else {
        console.log("Email not authorized, denying sign in");
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = token.picture;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log("Redirect callback - URL:", url, "Base URL:", baseUrl);
      // If it's a relative URL, make it absolute
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // If it's the same origin, allow it
      else if (new URL(url).origin === baseUrl) return url;
      // Otherwise, redirect to admin
      return `${baseUrl}/admin`;
    },
  },
  pages: {
    signIn: "/admin/login",
    error: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
  debug: true, // Enable debug mode
};