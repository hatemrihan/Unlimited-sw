"use client";

import dynamic from "next/dynamic";

// Lazy-load FeedbackForm client-side only (heavy interactive component)
// This wrapper must be "use client" because next/dynamic with ssr:false
// is only valid inside Client Components.
const FeedbackForm = dynamic(() => import("./FeedbackForm"), { ssr: false });

export default function FeedbackFormLazy() {
  return <FeedbackForm />;
}
