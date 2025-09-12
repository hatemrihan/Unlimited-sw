"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

export default function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;

    console.log("ProtectedAdminRoute - Session:", session);
    console.log("ProtectedAdminRoute - Status:", status);

    if (!session) {
      console.log("No session, redirecting to login");
      router.push("/admin/login");
      return;
    }

    // Check if user has admin privileges
    console.log("User email:", session.user?.email);
    console.log("Is admin:", session.user?.isAdmin);
    
    if (!session.user?.isAdmin) {
      console.log("User not authorized as admin, redirecting to access denied");
      router.push("/access-denied");
      return;
    }

    console.log("Email authorized, allowing access");
    setIsLoading(false);
  }, [session, status, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl font-bold text-black mb-2">
                WELCOME Mohamed!
              </CardTitle>
              <CardDescription className="text-gray-600 text-sm leading-relaxed">
                Please login to access the dashboard. Only authorized
                personnel can proceed.
              </CardDescription>
              <CardDescription className="text-gray-500 text-xs mt-2">
                If you are not an administrator, please return to the main site.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="px-8 pb-6">
              <div className="flex justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </CardContent>
            
            <CardFooter className="text-center pt-0 pb-8">
              <p className="text-xs text-gray-400">
                Verifying authentication...
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}
