import NextAuth from "next-auth"

declare module "next-auth" {
  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string
    isAdmin?: boolean
  }

  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role?: string
      isAdmin?: boolean
    }
  }

  interface JWT {
    role?: string
    isAdmin?: boolean
  }
}

