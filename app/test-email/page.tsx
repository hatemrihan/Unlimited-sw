'use client';

import { useState } from 'react';

export default function TestEmailPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSend = async () => {
    if (!email) {
      alert("Please enter an email address");
      return;
    }
    
    setLoading(true);
    setResult(null);

    // Create a very realistic fake order to inject into the email template
    const dummyOrder = {
      customerEmail: email,
      customerName: 'Hatem Rihan',
      customerFirstName: 'Hatem',
      customerLastName: 'Rihan',
      orderId: `TEST-ORD-${Math.floor(Math.random() * 10000)}`,
      orderItems: [
        { name: 'Wall-mounted pull-up bar', quantity: 1, price: 4999 },
        { 
          name: 'Premium Parallettes', 
          quantity: 2, 
          price: 1500, 
          variant: { name: 'Black', size: '', color: 'Black' } 
        }
      ],
      totalAmount: 8350, // (4999x1) + (1500x2) + 285 + 66
      subtotal: 7999,
      shippingCost: 285,
      codFee: 66,
      paymentMethod: 'cashOnDelivery',
      shippingAddress: {
        governorate: 'Cairo',
        city: 'Nasr City',
        address: '123 Fake Street',
        apartment: 'Apt 4B'
      },
      customerPhone: '01012345678',
      customerNotes: 'Please call before delivery. Testing my email templates!'
    };

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'both', // Sends to BOTH the customer (your input email) AND your admin email!
          orderData: dummyOrder
        })
      });
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-xl w-full bg-stone-800 p-8 rounded-xl border border-stone-700 shadow-2xl">
        <h1 className="text-3xl font-bold mb-2">Email Testing Panel</h1>
        <p className="text-stone-400 mb-8">
          Send a fully compiled "realistic" Order Confirmation directly to any inbox to verify Brevo delivery and formatting.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-2">
              Send Customer Receipt To:
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. hatemrihan22@gmail.com"
              className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white transition-colors"
            />
          </div>

          <button 
            onClick={handleSend}
            disabled={loading}
            className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-stone-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending Emails...' : 'Fire Test Emails Now 🚀'}
          </button>
        </div>

        {result && (
          <div className={`mt-6 p-4 rounded-lg border ${result.success ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700'}`}>
            <h3 className={`font-bold mb-2 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
              {result.success ? '✅ Dispatch Success!' : '❌ Dispatch Failed'}
            </h3>
            <pre className="text-xs font-mono text-stone-300 overflow-x-auto p-2 bg-black/30 rounded">
              {JSON.stringify(result, null, 2)}
            </pre>
            {result.success && (
              <p className="mt-4 text-xs text-stone-400">
                Check both <strong>{email}</strong> (Customer view) and your Admin inboxes. Look in the Promotions/Spam tabs!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
