"use client";

import React from 'react';
import Nav from '../sections/Nav';

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <Nav />
      
      <div className="pt-20 lg:pt-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Contact Us
            </h1>
            <div className="h-1 w-20 sm:w-24 mx-auto md:w-32 bg-white"></div>
          </div>

          {/* Business Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            
            {/* Contact Information */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-white mb-6">Get in Touch</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">Business Name</h3>
                  <p className="text-gray-300">UNLIMITED-SW Store</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">Email</h3>
                  <p className="text-gray-300">orders@unlimited-sw.com</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">Website</h3>
                  <p className="text-gray-300">https://unlimited-sw.com</p>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-white mb-2">Business Type</h3>
                  <p className="text-gray-300">E-commerce Store - Sports & Fitness Equipment</p>
                </div>
              </div>
            </div>

            {/* About Us */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-white mb-6">About Our Business</h2>
              
              <div className="space-y-4 text-gray-300">
                <p>
                  UNLIMITED-SW is a legitimate e-commerce store specializing in high-quality 
                  sports and fitness equipment. We are committed to providing our customers 
                  with authentic products and excellent service.
                </p>
                
                <p>
                  Our business operates with full transparency and follows all e-commerce 
                  best practices. We use secure payment processing and maintain customer 
                  data protection standards.
                </p>
                
                <p>
                  If you have any questions about our products or services, please don't 
                  hesitate to contact us through the information provided.
                </p>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-12 p-6 bg-gray-900/50 border border-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Security & Trust</h3>
            <div className="space-y-2 text-gray-300">
              <p>• SSL Certificate: Active and Valid</p>
              <p>• Payment Processing: Secure and Encrypted</p>
              <p>• Data Protection: Customer information is protected</p>
              <p>• Business Verification: Legitimate e-commerce operation</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;


