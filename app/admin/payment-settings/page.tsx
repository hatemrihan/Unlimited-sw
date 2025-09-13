"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedAdminRoute from '@/components/auth/protected-admin-route';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, CreditCard, Banknote, ArrowLeft, Save } from "lucide-react";

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
        <div className="min-h-screen bg-white">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </div>
      </ProtectedAdminRoute>
    );
  }

  return (
    <ProtectedAdminRoute>
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </div>

          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-2xl font-bold text-gray-900">Payment Settings</h1>
            <p className="text-gray-600 mt-1">
              Control payment ya doctor mn hena.
            </p>
          </div>

          {/* Success/Error Message */}
          {message && (
            <Card className={`border ${
              message.type === 'success' 
                ? 'border-green-200 bg-green-50' 
                : 'border-red-200 bg-red-50'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className={`h-5 w-5 ${
                    message.type === 'success' ? 'text-green-600' : 'text-red-600'
                  }`} />
                  <span className={`text-sm font-medium ${
                    message.type === 'success' ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {message.text}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Methods */}
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Payment Methods</CardTitle>
                <CardDescription>
                  Configure which payment options are available to your customers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* InstaPay - Always Enabled */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">InstaPay</h3>
                      <p className="text-sm text-gray-600">Mobile payment with screenshot verification</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-green-700 bg-green-100 px-2 py-1 rounded-md">
                      Always Enabled
                    </span>
                    <Switch checked={true} disabled className="opacity-50" />
                  </div>
                </div>

                {/* Cash on Delivery - Admin Controlled */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Banknote className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Cash on Delivery (COD)</h3>
                      <p className="text-sm text-gray-600">Pay when the product is delivered</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`text-sm font-medium px-2 py-1 rounded-md ${
                      settings.codEnabled 
                        ? 'text-green-700 bg-green-100' 
                        : 'text-red-700 bg-red-100'
                    }`}>
                      {settings.codEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                    <Switch
                      checked={settings.codEnabled}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, codEnabled: checked }))
                      }
                    />
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">ازاي بيشتغل</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>InstaPay:</strong> دايمًا متاح للعميل (ومينفعش يتقفل)</li>
                      <li>• <strong>Cash on Delivery:</strong> تقدر تفتحو أو تقفلو في أي وقت</li>
                      <li>• أي تعديل بيظهر فورًا في صفحة الدفع</li>
                      
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>

        </div>
      </div>
    </ProtectedAdminRoute>
  );
};

export default PaymentSettingsPage;
