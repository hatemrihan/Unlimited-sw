"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const EmailCheck = () => {
  const router = useRouter();
  const [config, setConfig] = useState({
    hasSmtpUser: false,
    hasSmtpPassword: false
  });
  const [testEmail, setTestEmail] = useState({
    status: 'idle' as 'idle' | 'testing' | 'success' | 'error',
    message: '',
    email: ''
  });

  useEffect(() => {
    // Check environment variables (client-side can't access server env vars directly)
    // This will be checked via API call
    checkEmailConfig();
  }, []);

  const checkEmailConfig = async () => {
    try {
      const response = await fetch('/api/admin/email-config-check');
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Error checking email config:', error);
    }
  };

  const testEmailSending = async () => {
    if (!testEmail.email) {
      alert('Please enter an email address to test');
      return;
    }

    setTestEmail({ ...testEmail, status: 'testing', message: 'Testing email sending...' });

    try {
      const testOrderData = {
        customerEmail: testEmail.email,
        customerName: 'Test Customer',
        orderId: 'TEST-' + Date.now(),
        orderItems: [
          {
            name: 'Test Product',
            quantity: 1,
            price: 100
          }
        ],
        totalAmount: 120,
        shippingCost: 20,
        paymentMethod: 'Test Payment',
        shippingAddress: {
          governorate: 'Cairo',
          city: 'Cairo',
          address: 'Test Address'
        },
        customerPhone: '+201234567890'
      };

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'customer',
          orderData: testOrderData
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setTestEmail({
          ...testEmail,
          status: 'success',
          message: '✅ Test email sent successfully! Check your inbox.'
        });
      } else {
        setTestEmail({
          ...testEmail,
          status: 'error',
          message: `❌ Test email failed: ${result.message || result.error || 'Unknown error'}`
        });
      }
    } catch (error) {
      setTestEmail({
        ...testEmail,
        status: 'error',
        message: `❌ Test email failed: ${error instanceof Error ? error.message : 'Network error'}`
      });
    }
  };

  const isConfigured = config.hasSmtpUser && config.hasSmtpPassword;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">📧 Email Configuration Check</h1>
            <p className="text-gray-400 mt-2">Verify your order notification email setup</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Configuration Status */}
        <div className="bg-black border border-white/10 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Brevo Email Configuration Status</h2>
          
          <div className="space-y-3">
            <div className={`flex items-center space-x-3 p-3 rounded ${isConfigured ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
              <div className={`w-3 h-3 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <div>
                <h3 className="font-medium">Brevo SMTP Configuration</h3>
                <p className="text-sm text-gray-400">Required for sending order confirmation emails</p>
              </div>
            </div>

            <div className="ml-6 space-y-2 text-sm">
              <div className={`flex items-center space-x-2 ${config.hasSmtpUser ? 'text-green-400' : 'text-red-400'}`}>
                <span>{config.hasSmtpUser ? '✅' : '❌'}</span>
                <span>BREVO_SMTP_USER</span>
              </div>
              <div className={`flex items-center space-x-2 ${config.hasSmtpPassword ? 'text-green-400' : 'text-red-400'}`}>
                <span>{config.hasSmtpPassword ? '✅' : '❌'}</span>
                <span>BREVO_SMTP_PASSWORD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Test Email */}
        <div className="bg-black border border-white/10 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Email Sending</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Test Email Address</label>
              <input
                type="email"
                value={testEmail.email}
                onChange={(e) => setTestEmail({ ...testEmail, email: e.target.value })}
                placeholder="Enter email to test"
                className="w-full p-3 bg-transparent border border-white/20 text-white rounded focus:outline-none focus:border-white"
              />
            </div>
            
            <button
              onClick={testEmailSending}
              disabled={testEmail.status === 'testing' || !isConfigured}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {testEmail.status === 'testing' ? 'Sending Test Email...' : 'Send Test Email'}
            </button>
          </div>

          {testEmail.message && (
            <div className={`mt-4 p-3 rounded ${
              testEmail.status === 'success' ? 'bg-green-900/20 text-green-400' :
              testEmail.status === 'error' ? 'bg-red-900/20 text-red-400' :
              'bg-blue-900/20 text-blue-400'
            }`}>
              {testEmail.message}
            </div>
          )}
        </div>

        {/* Setup Instructions */}
        <div className="bg-gray-900 border border-white/10 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Setup Instructions</h2>
          
          {!isConfigured && (
            <div className="space-y-4">
              <div className="bg-yellow-900/20 border border-yellow-600/30 p-4 rounded">
                <h3 className="font-medium text-yellow-400 mb-2">⚠️ Email Configuration Needed</h3>
                <p className="text-sm">Order confirmation emails require Brevo SMTP configuration.</p>
              </div>

              <div className="space-y-3 text-sm">
                <h4 className="font-medium">Steps to configure:</h4>
                <ol className="list-decimal list-inside space-y-2 ml-4">
                  <li>Go to <a href="https://brevo.com" target="_blank" className="text-blue-400 underline">brevo.com</a> and create an account</li>
                  <li>Go to SMTP & API → SMTP settings</li>
                  <li>Get your SMTP credentials</li>
                  <li>Add to your <code className="bg-gray-800 px-1 rounded">.env.local</code> file:</li>
                </ol>
                
                <div className="bg-gray-800 p-3 rounded mt-2">
                  <pre className="text-xs">
{`BREVO_SMTP_USER=your_brevo_email@domain.com
BREVO_SMTP_PASSWORD=your_brevo_smtp_password`}
                  </pre>
                </div>
                
                <p className="text-xs text-gray-400 mt-2">
                  * Restart your development server after adding environment variables
                </p>
              </div>
            </div>
          )}

          {isConfigured && (
            <div className="bg-green-900/20 border border-green-600/30 p-4 rounded">
              <h3 className="font-medium text-green-400 mb-2">✅ Configuration Complete</h3>
              <p className="text-sm">Your Brevo email configuration looks good! Order confirmation emails should work properly.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailCheck;
