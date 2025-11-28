"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CitiesTableSkeleton } from '../../components/LoadingSkeleton';

interface GovernorateData {
  name: string;
  shippingCost: number;
  codFee: number;
  isActive: boolean;
}

const CitiesManagement = () => {
  const router = useRouter();
  const [governorates, setGovernorates] = useState<GovernorateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch governorates data
  const fetchGovernorates = async () => {
    try {
      const response = await fetch('/api/admin/cities');
      const data = await response.json();

      if (data.success) {
        // Convert aggregated data to governorate format
        const govData: GovernorateData[] = data.cities.map((item: any) => ({
          name: item.cityName, // This is actually governorate name from API
          shippingCost: item.shippingCost || 0,
          codFee: item.codFee || 0,
          isActive: item.isActive !== false
        }));

        setGovernorates(govData);
      }
    } catch (error) {
      console.error('Error fetching governorates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGovernorates();
  }, []);

  // Update governorate shipping cost
  const updateShippingCost = (govName: string, newCost: number) => {
    setGovernorates(prev => prev.map(gov =>
      gov.name === govName ? { ...gov, shippingCost: newCost } : gov
    ));
  };

  // Update governorate COD fee
  const updateCodFee = (govName: string, newFee: number) => {
    setGovernorates(prev => prev.map(gov =>
      gov.name === govName ? { ...gov, codFee: newFee } : gov
    ));
  };

  // Toggle governorate active status
  const toggleActive = (govName: string) => {
    setGovernorates(prev => prev.map(gov =>
      gov.name === govName ? { ...gov, isActive: !gov.isActive } : gov
    ));
  };

  // Add new governorates (Fayoum, Damietta + 5 Additional)
  const handleAddNewGovernorates = async () => {
    setSaving(true);

    try {
      const response = await fetch('/api/admin/cities/bulk-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Successfully added governorates!\n\n🏛️ New Governorates Added:\n• Fayoum, Damietta, Sohag, South Sinai (Sharm El Sheikh)\n• Qena, New Valley (Wadi El Gedid), Matrouh\n• Asyut, Minya, 6 October\n\n📊 Results:\n• Added: ${data.results.added.length} cities\n• Skipped: ${data.results.skipped.length} (already existed)\n• Errors: ${data.results.errors.length}\n\n🔄 Refreshing the page...`);
        // Refresh the governorates list
        await fetchGovernorates();
      } else {
        throw new Error(data.error || 'Failed to add governorates');
      }
    } catch (error) {
      console.error('Error adding governorates:', error);
      alert('❌ Failed to add governorates. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Save all changes - FIXED: Only update global default rates, not product-specific rates
  const handleSaveAll = async () => {
    setSaving(true);

    try {
      // Save each governorate's DEFAULT pricing (this will be the fallback for new products)
      for (const gov of governorates) {
        // Update the global default shipping costs for this governorate
        const response = await fetch('/api/admin/cities/global-defaults', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            governorate: gov.name,
            shippingCost: gov.shippingCost,
            codFee: gov.codFee,
            isActive: gov.isActive
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to update ${gov.name}`);
        }
      }

      alert('✅ Global default shipping rates updated successfully!\n\n📝 Note: This only affects NEW products. Existing products with custom shipping rates remain unchanged.');
    } catch (error) {
      console.error('Error saving governorates:', error);
      alert('❌ Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Export functions
  const exportAsCSV = () => {
    const headers = ['Governorate', 'Shipping Cost', 'COD Fee', 'Status'];
    const rows = governorates.map(gov => [
      gov.name,
      gov.shippingCost.toString(),
      gov.codFee.toString(),
      gov.isActive ? 'Active' : 'Inactive'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'governorate-pricing.csv';
    a.click();
  };

  const exportAsExcel = () => {
    // Create HTML table for Excel
    const table = `
      <table>
        <thead>
          <tr>
            <th>Governorate</th>
            <th>Shipping Cost (LE)</th>
            <th>COD Fee (LE)</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${governorates.map(gov => `
            <tr>
              <td>${gov.name}</td>
              <td>${gov.shippingCost}</td>
              <td>${gov.codFee}</td>
              <td>${gov.isActive ? 'Active' : 'Inactive'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const blob = new Blob([table], { type: 'application/vnd.ms-excel' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'governorate-pricing.xls';
    a.click();
  };

  const exportAsTXT = () => {
    const content = governorates.map(gov =>
      `${gov.name}: Shipping ${gov.shippingCost} LE, COD ${gov.codFee} LE (${gov.isActive ? 'Active' : 'Inactive'})`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'governorate-pricing.txt';
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header skeleton */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <div className="h-8 bg-gray-700 rounded w-80 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-700 rounded w-96 animate-pulse"></div>
            </div>
            <div className="flex gap-4">
              <div className="h-12 bg-gray-700 rounded w-32 animate-pulse"></div>
              <div className="h-10 bg-gray-700 rounded w-28 animate-pulse"></div>
            </div>
          </div>

          {/* Action buttons skeleton */}
          <div className="mb-6 flex gap-4 flex-wrap">
            <div className="h-10 bg-gray-700 rounded w-40 animate-pulse"></div>
            <div className="h-10 bg-gray-700 rounded w-28 animate-pulse"></div>
            <div className="h-10 bg-gray-700 rounded w-32 animate-pulse"></div>
            <div className="h-10 bg-gray-700 rounded w-28 animate-pulse"></div>
          </div>

          {/* Table skeleton */}
          <CitiesTableSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">🚨 Global Default Shipping Rates</h1>
            <p className="text-gray-400 mt-2">⚠️ These are DEFAULT rates for NEW products only. Each product can have custom shipping costs!</p>
            <p className="text-yellow-400 text-sm mt-1">💡 To set product-specific shipping costs, go to Products → [Product Name] → City Pricing</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="bg-white text-black px-6 py-3 font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Global Defaults'}
            </button>
            <button
              onClick={() => router.push('/admin')}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex gap-4 flex-wrap">
          {/* Add Governorates Button */}
          <button
            onClick={handleAddNewGovernorates}
            disabled={saving}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 font-medium"
          >
            {saving ? 'Adding...' : '➕ Add New Governorates (10 Total)'}
          </button>

          {/* Export Buttons */}
          <button
            onClick={exportAsCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Export as CSV
          </button>
          <button
            onClick={exportAsExcel}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Export as Excel
          </button>
          <button
            onClick={exportAsTXT}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Export as TXT
          </button>
        </div>

        {/* Governorates Table */}
        <div className="bg-black border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white text-black">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Governorate</th>
                  <th className="px-4 py-3 text-left font-medium">Shipping Cost (LE)</th>
                  <th className="px-4 py-3 text-left font-medium">COD Fee (LE)</th>
                  <th className="px-4 py-3 text-left font-medium">Total (COD)</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {governorates.map(gov => (
                  <tr key={gov.name} className="border-b border-white/10">
                    <td className="px-4 py-3 font-medium text-gray-300">{gov.name}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={gov.shippingCost}
                        min="0"
                        onChange={(e) => updateShippingCost(gov.name, Number(e.target.value))}
                        className="w-20 p-2 bg-transparent border border-white/20 text-white text-center focus:outline-none focus:border-white"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={gov.codFee}
                        min="0"
                        onChange={(e) => updateCodFee(gov.name, Number(e.target.value))}
                        className="w-20 p-2 bg-transparent border border-white/20 text-white text-center focus:outline-none focus:border-white"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-green-400">
                      {gov.shippingCost + gov.codFee} LE
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(gov.name)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${gov.isActive
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-700'
                          }`}
                      >
                        {gov.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-black border border-white/10 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Active Governorates</h3>
            <p className="text-2xl font-bold text-green-400">
              {governorates.filter(g => g.isActive).length}
            </p>
          </div>
          <div className="bg-black border border-white/10 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Average Shipping Cost</h3>
            <p className="text-2xl font-bold text-blue-400">
              {Math.round(governorates.reduce((sum, g) => sum + g.shippingCost, 0) / governorates.length || 0)} LE
            </p>
          </div>
          <div className="bg-black border border-white/10 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Average COD Fee</h3>
            <p className="text-2xl font-bold text-purple-400">
              {Math.round(governorates.reduce((sum, g) => sum + g.codFee, 0) / governorates.length || 0)} LE
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-gray-900 border border-white/10 p-6 rounded-lg">
          <h3 className="text-lg font-medium mb-4">💡 Important: How This Page Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-300">
            <div className="bg-yellow-900/20 p-4 rounded border border-yellow-600/30">
              <h4 className="font-medium text-yellow-400 mb-2">⚠️ Global Defaults Only:</h4>
              <p>This page sets DEFAULT shipping rates that apply to NEW products. Each product can override these with custom rates.</p>
            </div>
            <div className="bg-blue-900/20 p-4 rounded border border-blue-600/30">
              <h4 className="font-medium text-blue-400 mb-2">🎯 Product-Specific Rates:</h4>
              <p>To set custom shipping for a specific product, go to: Admin → Products → [Product] → City Pricing</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300 mt-4">
            <div>
              <h4 className="font-medium text-white mb-2">For Online Payment:</h4>
              <p>Customer pays: <strong>Product Price + Shipping Cost</strong></p>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">For Cash on Delivery (COD):</h4>
              <p>Customer pays: <strong>Product Price + Shipping Cost + COD Fee</strong></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitiesManagement;