import { Metadata } from "next";
import PrivacyClient from "./PrivacyClient";

export const metadata: Metadata = {
  title: "Privacy Policy - UNLIMITED | Your Data Protection",
  description: "Learn how UNLIMITED protects your personal information. Our privacy policy explains data collection, usage, security measures, and your rights.",
  alternates: {
    canonical: "https://unlimited-sw.com/privacy",
  },
  openGraph: {
    title: "Privacy Policy - UNLIMITED | Your Data Protection",
    description: "Learn how UNLIMITED protects your personal information. Our privacy policy explains data collection, usage, and security.",
    url: "https://unlimited-sw.com/privacy",
    siteName: "UNLIMITED",
    type: "website",
  },
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}