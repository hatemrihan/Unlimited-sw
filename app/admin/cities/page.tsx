"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface City {
  _id: string;
  cityName: string;
  governorate: string;
  shippingCost: number;
  codFee: number;
  isActive: boolean;
}

interface GovernorateData {
  name: string;
  shippingCost: number;
  codFee: number;
  cities: City[];
}

const CitiesManagement = () => {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [governorates, setGovernorates] = useState<GovernorateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGovernorate, setEditingGovernorate] = useState<string | null>(null);
  const [tempValues, setTempValues] = useState<{[key: string]: {shippingCost: number, codFee: number}}>({});

  // Egyptian Governorates
  const egyptianGovernorates = [
    'Cairo', 'Giza', 'Alexandria', 'Dakahlia', 'Red Sea', 'Beheira',
    'Fayoum', 'Gharbia', 'Ismailia', 'Menofia', 'Minya', 'Qaliubiya',
    'New Valley', 'Suez', 'Aswan', 'Assiut', 'Beni Suef', 'Port Said',
    'Damietta', 'Sharqia', 'South Sinai', 'Kafr El Sheikh', 'Matrouh',
    'Luxor', 'Qena', 'North Sinai', 'Sohag'
  ];

  // Fetch cities and group by governorate
  const fetchCities = async () => {
    try {
      const response = await fetch('/api/admin/cities');
      const data = await response.json();
      
      if (data.success) {
        setCities(data.cities);
        
        // Group cities by governorate
        const groupedData: GovernorateData[] = egyptianGovernorates.map(govName => {
          const govCities = data.cities.filter((city: City) => city.governorate === govName);
          
          // Get the first city's values or default
          const firstCity = govCities[0];
          return {
            name: govName,
            shippingCost: firstCity?.shippingCost || 100,
            codFee: firstCity?.codFee || 20,
            cities: govCities
          };
        });
        
        setGovernorates(groupedData);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCities();
  }, []);

  // Handle editing governorate
  const handleEditGovernorate = (govName: string) => {
    const gov = governorates.find(g => g.name === govName);
    if (gov) {
      setTempValues({
        [govName]: {
          shippingCost: gov.shippingCost,
          codFee: gov.codFee
        }
      });
      setEditingGovernorate(govName);
    }
  };

  // Handle save governorate
  const handleSaveGovernorate = async (govName: string) => {
    const values = tempValues[govName];
    if (!values) return;

    try {
      // Update all cities in this governorate
      const gov = governorates.find(g => g.name === govName);
      if (!gov) return;

      // If no cities exist for this governorate, create one
      if (gov.cities.length === 0) {
        const response = await fetch('/api/admin/cities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cityName: govName,
            governorate: govName,
            shippingCost: values.shippingCost,
            codFee: values.codFee,
            isActive: true
          })
        });
        
        if (response.ok) {
          alert('Governorate pricing saved!');
          fetchCities();
        }
      } else {
        // Update all existing cities
        for (const city of gov.cities) {
          await fetch(`/api/admin/cities/${city._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...city,
              shippingCost: values.shippingCost,
              codFee: values.codFee
            })
          });
        }
        alert('Governorate pricing updated!');
        fetchCities();
      }
      
      setEditingGovernorate(null);
      setTempValues({});
    } catch (error) {
      console.error('Error updating governorate:', error);
      alert('Failed to update governorate pricing');
    }
  };

  // Export functions
  const exportAsCSV = () => {
    const headers = ['Governorate', 'Shipping Cost', 'COD Fee'];
    const rows = governorates.map(gov => [
      gov.name,
      gov.shippingCost.toString(),
      gov.codFee.toString()
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
            <th>Shipping Cost (L.E)</th>
            <th>COD Fee (L.E)</th>
          </tr>
        </thead>
        <tbody>
          ${governorates.map(gov => `
            <tr>
              <td>${gov.name}</td>
              <td>${gov.shippingCost}</td>
              <td>${gov.codFee}</td>
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

  const exportAsPDF = () => {
    // Simple text-based PDF alternative
    const content = governorates.map(gov => 
      `${gov.name}: Shipping ${gov.shippingCost} L.E, COD ${gov.codFee} L.E`
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
          <div className="text-center py-12">
            <div className="text-xl">Loading governorates...</div>
          </div>
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
            <h1 className="text-3xl font-bold text-white">Governorate Pricing Management</h1>
            <p className="text-gray-400 mt-2">Manage shipping costs and COD fees by governorate</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Export Buttons */}
        <div className="mb-6 flex gap-4">
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
            onClick={exportAsPDF}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Export as TXT
          </button>
        </div>

        {/* Governorates Table */}
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Governorate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Shipping Cost (L.E)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  COD Fee (L.E)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {governorates.map((gov) => (
                <tr key={gov.name} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-white">{gov.name}</div>
                    <div className="text-xs text-gray-400">
                      {gov.cities.length > 0 ? `${gov.cities.length} cities` : 'No cities'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingGovernorate === gov.name ? (
                      <input
                        type="number"
                        value={tempValues[gov.name]?.shippingCost || gov.shippingCost}
                        onChange={(e) => setTempValues({
                          ...tempValues,
                          [gov.name]: {
                            ...tempValues[gov.name],
                            shippingCost: Number(e.target.value)
                          }
                        })}
                        className="w-24 px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                      />
                    ) : (
                      <span className="text-sm text-white">{gov.shippingCost}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingGovernorate === gov.name ? (
                      <input
                        type="number"
                        value={tempValues[gov.name]?.codFee || gov.codFee}
                        onChange={(e) => setTempValues({
                          ...tempValues,
                          [gov.name]: {
                            ...tempValues[gov.name],
                            codFee: Number(e.target.value)
                          }
                        })}
                        className="w-24 px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                      />
                    ) : (
                      <span className="text-sm text-white">{gov.codFee}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {editingGovernorate === gov.name ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveGovernorate(gov.name)}
                          className="text-green-400 hover:text-green-300"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingGovernorate(null);
                            setTempValues({});
                          }}
                          className="text-gray-400 hover:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditGovernorate(gov.name)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-400">Total Governorates</h3>
            <p className="text-2xl font-bold text-white mt-2">{governorates.length}</p>
          </div>
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-400">Average Shipping Cost</h3>
            <p className="text-2xl font-bold text-white mt-2">
              {Math.round(governorates.reduce((sum, g) => sum + g.shippingCost, 0) / governorates.length || 0)} L.E
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-400">Average COD Fee</h3>
            <p className="text-2xl font-bold text-white mt-2">
              {Math.round(governorates.reduce((sum, g) => sum + g.codFee, 0) / governorates.length || 0)} L.E
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitiesManagement;