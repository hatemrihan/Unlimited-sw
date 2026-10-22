import { Metadata } from "next";
import ContactClient from "./ConactClient";
import { alternatesFor } from '@/lib/locale';

export const metadata: Metadata = {
  title: "Contact Us - UNLIMITED | Customer Support",
  description: "Get in touch with UNLIMITED customer care team. We're here to help with orders, sizing, shipping, and any questions about our premium Egyptian  calisthenics collection.",
  alternates: alternatesFor('/contact', '/ar/contact', 'en'),
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