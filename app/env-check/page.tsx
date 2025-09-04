"use client";

export default function EnvCheckPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Check</h1>
      
      <div className="space-y-2">
        <p><strong>NEXTAUTH_URL:</strong> {process.env.NEXT_PUBLIC_NEXTAUTH_URL || "Not set"}</p>
        <p><strong>GOOGLE_CLIENT_ID:</strong> {process.env.GOOGLE_CLIENT_ID ? "Set (hidden)" : "Not set"}</p>
        <p><strong>GOOGLE_CLIENT_SECRET:</strong> {process.env.GOOGLE_CLIENT_SECRET ? "Set (hidden)" : "Not set"}</p>
        <p><strong>NEXTAUTH_SECRET:</strong> {process.env.NEXTAUTH_SECRET ? "Set (hidden)" : "Not set"}</p>
      </div>
      
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">Instructions:</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li>Create a <code>.env.local</code> file in your <code>my-app</code> directory</li>
          <li>Add the required environment variables (see SETUP_AUTH.md)</li>
          <li>Restart your development server</li>
          <li>Refresh this page to see if variables are loaded</li>
        </ol>
      </div>
    </div>
  );
}

