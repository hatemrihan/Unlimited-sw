"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '@/product/model';
import { translator } from '@/i18n';
import type { Locale } from '@/lib/locale';
import { localized, localizedFaqs } from '@/product/seo';

interface ProductDetailsTabsProps {
  product: Product;
  /** Defaults to English, so the existing English route is unchanged. */
  locale?: Locale;
}

const ProductDetailsTabs: React.FC<ProductDetailsTabsProps> = ({ product, locale = 'en' }) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const tr = translator(locale);

  // Each field falls back to its English value, so a product with partial
  // Arabic copy shows a filled tab rather than a placeholder sentence.
  const specifications = localized(product, 'specifications', locale);
  const detailed = localized(product, 'detailedDescription', locale)
    || localized(product, 'description', locale);
  const faqs = localizedFaqs(product, locale);

  const tabs = [
    {
      id: 'details',
      label: tr('product.specifications'),
      content: specifications || tr('common.loading'),
      hasContent: !!specifications.trim()
    },
    {
      id: 'description',
      label: tr('product.description'),
      content: detailed || tr('common.loading'),
      hasContent: !!detailed.trim()
    },
    {
      id: 'shipping',
      label: tr('product.shipping'),
      // Shipping terms are the same for both languages until the owner writes
      // an Arabic version; there is no shippingInfoAr field.
      content: product.shippingInfo || '',
      hasContent: !!product.shippingInfo?.trim()
    },
    {
      id: 'faqs',
      label: tr('product.faqs'),
      content: faqs.length > 0 ? (
        <div className="space-y-2 w-full text-center">
          {faqs.map((faq: { question: string; answer: string }, index: number) => (
            <div key={index} className="border-b border-gray-600 pb-2 last:border-b-0 flex flex-col items-center text-center">
              <h4 className="font-medium text-[#b3b3b3] mb-1 text-xs text-center">{faq.question}</h4>
              <p className="text-[#b3b3b3]/70 text-xs leading-relaxed text-center">{faq.answer}</p>
            </div>
          ))}
        </div>
      ) : '',
      hasContent: faqs.length > 0
    }
  ];

  const toggleTab = (tabId: string) => {
    setActiveTab(activeTab === tabId ? null : tabId);
  };

  return (
    <div className="space-y-2 pt-4 border-t border-gray-700 text-center">
      {tabs.map((tab) => (
        <div key={tab.id}>
          <button
            onClick={() => toggleTab(tab.id)}
            className="flex justify-center items-center w-full text-center py-2 border-b border-gray-700 hover:border-gray-500 transition-colors duration-300 group"
          >
             <motion.span
              animate={{ rotate: activeTab === tab.id ? 180 : 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="text-sm text-center text-[#b3b3b3]/50 group-hover:text-[#b3b3b3] transition-colors duration-300 flex items-center justify-center px-2"
            >
              {activeTab === tab.id ? '-' : '+'}
            </motion.span>
            <span className="text-xs font-medium uppercase tracking-wider text-[#b3b3b3] group-hover:text-[#b3b3b3]/70 transition-colors duration-300">
              {tab.label}
            </span>
           
          </button>

          <AnimatePresence>
            {activeTab === tab.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{
                  duration: 0.2,
                  ease: "easeInOut",
                  opacity: { duration: 0.1 }
                }}
                className="overflow-hidden flex flex-col items-center justify-center w-full"
              >
                <div className="py-3 text-center text-[#b3b3b3] text-xs leading-relaxed w-full flex flex-col items-center justify-center">
                  {typeof tab.content === 'string' ? (
                    <div className="whitespace-pre-line text-center">{tab.content}</div>
                  ) : (
                    tab.content
                  )}

                  {!tab.hasContent && (
                    <div className="text-center text-[#b3b3b3]/50 italic mt-1 text-xs">
                      This information will be available once the admin adds content for this section.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

export default ProductDetailsTabs;
