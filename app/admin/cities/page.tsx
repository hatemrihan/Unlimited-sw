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

const CitiesManagement = () => {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCity, setEditingCity] = useState<City | null>(null);
  
  const [formData, setFormData] = useState({
    cityName: '',
    governorate: '',
    shippingCost: 0,
    codFee: 0,
    isActive: true
  });

  // Fetch cities
  const fetchCities = async () => {
    try {
      const response = await fetch('/api/admin/cities');
      const data = await response.json();
      
      if (data.success) {
        setCities(data.cities);
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

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingCity ? `/api/admin/cities/${editingCity._id}` : '/api/admin/cities';
      const method = editingCity ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(editingCity ? 'City updated successfully!' : 'City created successfully!');
        fetchCities();
        resetForm();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error saving city:', error);
      alert('Failed to save city');
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      cityName: '',
      governorate: '',
      shippingCost: 0,
      codFee: 0,
      isActive: true
    });
    setEditingCity(null);
    setShowAddForm(false);
  };

  // Edit city
  const handleEdit = (city: City) => {
    setFormData({
      cityName: city.cityName,
      governorate: city.governorate,
      shippingCost: city.shippingCost,
      codFee: city.codFee,
      isActive: city.isActive
    });
    setEditingCity(city);
    setShowAddForm(true);
  };

  // Delete city
  const handleDelete = async (cityId: string) => {
    if (!confirm('Are you sure you want to delete this city?')) return;
    
    try {
      const response = await fetch(`/api/admin/cities/${cityId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('City deleted successfully!');
        fetchCities();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error deleting city:', error);
      alert('Failed to delete city');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-300 hover:text-white mb-4"
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-4xl font-bold">Cities Management</h1>
            <p className="text-gray-400 mt-2">Manage shipping costs and COD fees for each city</p>
          </div>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-white text-black px-6 py-3 font-medium hover:bg-gray-200 transition-colors"
          >
            Add New City
          </button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-black border border-white p-6 rounded-lg max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold mb-4">
                {editingCity ? 'Edit City' : 'Add New City'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">City Name *</label>
                  <input
                    type="text"
                    value={formData.cityName}
                    onChange={(e) => setFormData({ ...formData, cityName: e.target.value })}
                    className="w-full p-3 bg-transparent border border-white text-white focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Governorate *</label>
                  <input
                    type="text"
                    value={formData.governorate}
                    onChange={(e) => setFormData({ ...formData, governorate: e.target.value })}
                    className="w-full p-3 bg-transparent border border-white text-white focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Shipping Cost (LE) *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.shippingCost}
                    onChange={(e) => setFormData({ ...formData, shippingCost: Number(e.target.value) })}
                    className="w-full p-3 bg-transparent border border-white text-white focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">COD Fee (LE) *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.codFee}
                    onChange={(e) => setFormData({ ...formData, codFee: Number(e.target.value) })}
                    className="w-full p-3 bg-transparent border border-white text-white focus:outline-none focus:border-gray-400"
                    required
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="isActive" className="text-sm">Active for delivery</label>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-white text-black py-3 font-medium hover:bg-gray-200 transition-colors"
                  >
                    {editingCity ? 'Update City' : 'Create City'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 border border-white text-white py-3 font-medium hover:bg-white hover:text-black transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cities List */}
        <div className="bg-black border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white text-black">
                <tr>
                  <th className="px-6 py-4 text-left font-medium">City</th>
                  <th className="px-6 py-4 text-left font-medium">Governorate</th>
                  <th className="px-6 py-4 text-left font-medium">Shipping Cost</th>
                  <th className="px-6 py-4 text-left font-medium">COD Fee</th>
                  <th className="px-6 py-4 text-left font-medium">Status</th>
                  <th className="px-6 py-4 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((city) => (
                  <tr key={city._id} className="border-b border-white/10">
                    <td className="px-6 py-4 font-medium">{city.cityName}</td>
                    <td className="px-6 py-4 text-gray-300">{city.governorate}</td>
                    <td className="px-6 py-4 text-gray-300">{city.shippingCost} LE</td>
                    <td className="px-6 py-4 text-gray-300">{city.codFee} LE</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        city.isActive 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-600 text-gray-300'
                      }`}>
                        {city.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(city)}
                          className="bg-blue-600 text-white px-3 py-1 text-xs hover:bg-blue-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(city._id)}
                          className="bg-red-600 text-white px-3 py-1 text-xs hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {cities.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">No cities found</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="bg-white text-black px-6 py-2 font-medium hover:bg-gray-200 transition-colors"
                >
                  Add Your First City
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitiesManagement;
