"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

export default function DebugAuthPage() {
  const { data: session, status } = useSession();
  const [envVars, setEnvVars] = useState<any>({});

  useEffect(() => {
    // Check environment variables
    setEnvVars({
      NEXTAUTH_URL: process.env.NEXT_PUBLIC_NEXTAUTH_URL,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    });
  }, []);

  const handleTestSignIn = async () => {
    try {
      console.log("Testing Google sign in...");
      const result = await signIn("google", {
        redirect: false,
        callbackUrl: "/admin"
      });
      console.log("Sign in result:", result);
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Authentication Debug Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Environment Variables */}
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Environment Variables</h2>
          <div className="space-y-2">
            <p><strong>NEXTAUTH_URL:</strong> {envVars.NEXTAUTH_URL || "Not set"}</p>
            <p><strong>GOOGLE_CLIENT_ID:</strong> {envVars.hasGoogleClientId ? "✅ Set" : "❌ Not set"}</p>
            <p><strong>GOOGLE_CLIENT_SECRET:</strong> {envVars.hasGoogleClientSecret ? "✅ Set" : "❌ Not set"}</p>
            <p><strong>NEXTAUTH_SECRET:</strong> {envVars.hasNextAuthSecret ? "✅ Set" : "❌ Not set"}</p>
          </div>
        </div>

        {/* Session Status */}
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Session Status</h2>
          <div className="space-y-2">
            <p><strong>Status:</strong> {status}</p>
            <p><strong>Authenticated:</strong> {session ? "✅ Yes" : "❌ No"}</p>
            {session && (
              <div>
                <p><strong>Email:</strong> {session.user?.email}</p>
                <p><strong>Name:</strong> {session.user?.name}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 space-x-4">
        {!session ? (
          <button
            onClick={handleTestSignIn}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
          >
            Test Google Sign In
          </button>
        ) : (
          <button
            onClick={() => signOut()}
            className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600"
          >
            Sign Out
          </button>
        )}
        
        <button
          onClick={() => window.location.href = "/admin"}
          className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600"
        >
          Go to Admin
        </button>
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800 mb-2">Setup Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
          <li>Create a <code>.env.local</code> file in your <code>my-app</code> directory</li>
          <li>Add: <code>NEXTAUTH_URL=http://localhost:3000</code></li>
          <li>Add: <code>NEXTAUTH_SECRET=your-long-random-secret</code></li>
          <li>Get Google OAuth credentials from Google Cloud Console</li>
          <li>Add: <code>GOOGLE_CLIENT_ID=your-client-id</code></li>
          <li>Add: <code>GOOGLE_CLIENT_SECRET=your-client-secret</code></li>
          <li>Restart your development server</li>
        </ol>
      </div>
    </div>
  );
}


