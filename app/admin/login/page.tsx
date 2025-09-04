"use client";

import { signIn, getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for error parameter
    const errorParam = searchParams.get("error");
    if (errorParam === "AccessDenied") {
      setError("Access denied. Your email is not authorized for admin access.");
    } else if (errorParam === "OAuthCallback") {
      setError("OAuth callback error. Please check your Google OAuth configuration and try again.");
    } else if (errorParam === "Configuration") {
      setError("Authentication configuration error. Please contact the administrator.");
    } else if (errorParam === "AccessDenied") {
      setError("Access denied. Your email is not authorized for admin access.");
    } else if (errorParam === "Verification") {
      setError("Email verification failed. Please try again.");
    }

    // Check if user is already logged in
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        router.push("/admin");
      }
    };
    checkSession();
  }, [router, searchParams]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(""); // Clear any previous errors
      
      console.log("Attempting Google sign in...");
      const result = await signIn("google", {
        callbackUrl: "/admin",
        redirect: false, // We'll handle redirect manually
      });
      
      console.log("Sign in result:", result);
      
      if (result?.error) {
        console.log("Sign in error:", result.error);
        if (result.error === "AccessDenied") {
          setError("Access denied. Your email is not authorized for admin access.");
        } else {
          setError("An error occurred during sign in. Please try again.");
        }
        setIsLoading(false);
      } else if (result?.ok) {
        console.log("Sign in successful, redirecting to admin...");
        router.push("/admin");
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setError("An error occurred during sign in. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-none">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-3xl font-bold text-black mb-2">
              UNLIMITED-SW ADMIN
            </CardTitle>
            <CardDescription className="text-gray-600 text-sm leading-relaxed">
              build, train and cross the limited to be UNLIMITED
            </CardDescription>
            <CardDescription className="text-gray-500 text-xs mt-2">
              If you are not an administrator, please return to the main site.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-8 pb-6">
            <div className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-red-800 text-sm font-medium">{error}</p>
                  </div>
                </div>
              )}
              
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full bg-black hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-3"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                {isLoading ? "Signing in..." : "Sign in with Google"}
              </Button>
            </div>
          </CardContent>
          
          <CardFooter className="text-center pt-0 pb-8">
            <p className="text-xs text-gray-400">
              Secure authentication required for admin access
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
