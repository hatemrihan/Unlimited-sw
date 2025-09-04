"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../../../models/product';

interface ProductDetailsTabsProps {
  product: Product;
}

const ProductDetailsTabs: React.FC<ProductDetailsTabsProps> = ({ product }) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const tabs = [
    {
      id: 'details',
      label: 'DETAILS',
      content: product.specifications || 'Product specifications and technical details will be displayed here.',
      hasContent: !!product.specifications?.trim()
    },
    {
      id: 'description',
      label: 'DESCRIPTION',
      content: product.detailedDescription || product.description || 'Detailed product description will be displayed here.',
      hasContent: !!(product.detailedDescription?.trim() || product.description?.trim())
    },
    {
      id: 'shipping',
      label: 'SHIPPING',
      content: product.shippingInfo || 'Shipping information and delivery details will be displayed here.',
      hasContent: !!product.shippingInfo?.trim()
    },
    {
      id: 'faqs',
      label: 'FAQS',
      content: product.faqs && product.faqs.length > 0 ? (
        <div className="space-y-4">
          {product.faqs.map((faq, index) => (
            <div key={index} className="border-b border-gray-600 pb-4 last:border-b-0">
              <h4 className="font-medium text-[#b3b3b3] mb-2">{faq.question}</h4>
              <p className="text-[#b3b3b3]/70 text-sm leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      ) : 'Frequently asked questions will be displayed here.',
      hasContent: !!(product.faqs && product.faqs.length > 0)
    }
  ];

  const toggleTab = (tabId: string) => {
    setActiveTab(activeTab === tabId ? null : tabId);
  };

  return (
    <div className="space-y-4 pt-8 border-t border-gray-700">
      {tabs.map((tab) => (
        <div key={tab.id}>
          <button
            onClick={() => toggleTab(tab.id)}
            className="flex justify-between items-center w-full text-left py-4 border-b border-gray-700 hover:border-gray-500 transition-colors duration-300 group"
          >
            <span className="font-medium uppercase tracking-wider text-[#b3b3b3] group-hover:text-[#b3b3b3]/70 transition-colors duration-300">
              {tab.label}
            </span>
            <motion.span
              animate={{ rotate: activeTab === tab.id ? 180 : 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="text-xl text-[#b3b3b3]/50 group-hover:text-[#b3b3b3] transition-colors duration-300"
            >
              {activeTab === tab.id ? '−' : '+'}
            </motion.span>
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
                className="overflow-hidden"
              >
                <div className="py-6 text-[#b3b3b3] text-sm leading-relaxed">
                  {typeof tab.content === 'string' ? (
                    <div className="whitespace-pre-line">{tab.content}</div>
                  ) : (
                    tab.content
                  )}

                  {!tab.hasContent && (
                    <div className="text-[#b3b3b3]/50 italic mt-2">
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
