import { Metadata } from "next";
import ContactClient from "./ConactClient";

export const metadata: Metadata = {
  title: "Contact Us - UNLIMITED | Customer Support",
  description: "Get in touch with UNLIMITED customer care team. We're here to help with orders, sizing, shipping, and any questions about our premium Egyptian  calisthenics collection.",
  alternates: {
    canonical: "https://unlimited-sw.com/contact",
  },
  openGraph: {
    title: "Contact Us - UNLIMITED | Customer Support",
    description: "Get in touch with UNLIMITED customer care team. We're here to help with orders, sizing, shipping, and any questions about our premium Egyptian  calisthenics collection.",
    url: "https://unlimited-sw.com/contact",
    siteName: "UNLIMITED",
    type: "website",
  },
};

export default function ContactPage() {
  return <ContactClient />;
}