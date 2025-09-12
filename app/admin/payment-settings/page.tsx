"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedAdminRoute from '@/components/auth/protected-admin-route';

interface PaymentSettings {
  codEnabled: boolean;
  instaPayEnabled: boolean;
}

const PaymentSettingsPage = () => {
  const router = useRouter();
  const [settings, setSettings] = useState<PaymentSettings>({
    codEnabled: true,
    instaPayEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch current payment settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/payment-settings');
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
      } else {
        setMessage({ type: 'error', text: 'Failed to load payment settings' });
      }
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      setMessage({ type: 'error', text: 'Failed to load payment settings' });
    } finally {
      setLoading(false);
    }
  };

  // Save payment settings
  const saveSettings = async () => {
    try {
      setSaving(true);
      setMessage(null);
      
      const response = await fetch('/api/admin/payment-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          codEnabled: settings.codEnabled,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
        setMessage({ type: 'success', text: '✅ Payment settings updated successfully!' });
        
        // Clear message after 3 seconds
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update settings' });
      }
    } catch (error) {
      console.error('Error saving payment settings:', error);
      setMessage({ type: 'error', text: 'Failed to save payment settings' });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <ProtectedAdminRoute>
        <div className="min-h-screen bg-black text-white p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          </div>
        </div>
      </ProtectedAdminRoute>
    );
  }

  return (
    <ProtectedAdminRoute>
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/admin')}
              className="text-gray-400 hover:text-white mb-4 flex items-center"
            >
              ← Back to Dashboard
            </button>
            
            <h1 className="text-3xl font-bold mb-2">Payment Settings</h1>
            <p className="text-gray-400">
              Control which payment methods are available to customers during checkout.
            </p>
          </div>

          {/* Success/Error Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-600/20 border border-green-600/30 text-green-400' 
                : 'bg-red-600/20 border border-red-600/30 text-red-400'
            }`}>
              {message.text}
            </div>
          )}

          {/* Payment Methods Control */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-xl font-semibold mb-6">Payment Methods</h2>
            
            <div className="space-y-6">
              
              {/* InstaPay - Always Enabled */}
              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    💳
                  </div>
                  <div>
                    <h3 className="font-medium">InstaPay</h3>
                    <p className="text-sm text-gray-400">Mobile payment with screenshot verification</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-green-400 text-sm font-medium">Always Enabled</span>
                  <div className="w-12 h-6 bg-green-600 rounded-full flex items-center justify-end px-1">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Cash on Delivery - Admin Controlled */}
              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center">
                    💵
                  </div>
                  <div>
                    <h3 className="font-medium">Cash on Delivery (COD)</h3>
                    <p className="text-sm text-gray-400">Pay when the product is delivered</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`text-sm font-medium ${settings.codEnabled ? 'text-green-400' : 'text-red-400'}`}>
                    {settings.codEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, codEnabled: !prev.codEnabled }))}
                    className={`w-12 h-6 rounded-full flex items-center transition-colors duration-300 ${
                      settings.codEnabled ? 'bg-green-600 justify-end' : 'bg-gray-600 justify-start'
                    } px-1`}
                  >
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Info Section */}
          <div className="mt-8 p-4 bg-blue-600/20 border border-blue-600/30 rounded-lg">
            <h3 className="font-medium text-blue-400 mb-2">ℹ️ How it works:</h3>
            <ul className="text-sm text-blue-300 space-y-1">
              <li>• <strong>InstaPay:</strong> Always available to customers (cannot be disabled)</li>
              <li>• <strong>Cash on Delivery:</strong> You can enable/disable this option anytime</li>
              <li>• Changes take effect immediately on the checkout page</li>
              <li>• PayMob has been completely removed as requested</li>
            </ul>
          </div>

        </div>
      </div>
    </ProtectedAdminRoute>
  );
};

export default PaymentSettingsPage;
