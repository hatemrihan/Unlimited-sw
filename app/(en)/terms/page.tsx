import { Metadata } from "next";
import TermsClient from "./TermsClient";

export const metadata: Metadata = {
  title: "Terms of Service - UNLIMITED | Legal Terms",
  description: "Read UNLIMITED terms of service. Learn about our policies on orders, payments, shipping, returns, intellectual property, and user accounts.",
  alternates: {
    canonical: "https://unlimited-sw.com/terms",
  },
  openGraph: {
    title: "Terms of Service - UNLIMITED | Legal Terms",
    description: "Read UNLIMITED terms of service. Learn about our policies on orders, payments, shipping, and returns.",
    url: "https://unlimited-sw.com/terms",
    siteName: "UNLIMITED",
    type: "website",
  },
};

export default function TermsPage() {
  return <TermsClient />;
}