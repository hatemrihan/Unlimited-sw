import { useState, ChangeEvent } from 'react';
import { CheckoutFormData } from '../types';

export function useCheckoutForm() {
  const [formData, setFormData] = useState<CheckoutFormData>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    apartment: '',
    city: '',
    notes: '',
    promoCode: '',
    paymentMethod: 'cashOnDelivery',
    transactionScreenshot: null, // this will hold the image url directly
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [screenShotPreview, setScreenShotPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, transactionScreenshot: 'File size must be less than 5MB' }));
        return;
      }
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, transactionScreenshot: 'Only image files are allowed' }));
        return;
      }

      // Pre-upload the image instantly
      setIsUploading(true);
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.transactionScreenshot;
        return newErrors;
      });

      try {
        const uploadForm = new FormData();
        uploadForm.append('file', file);
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: uploadForm,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          setFormData(prev => ({ ...prev, transactionScreenshot: uploadData.url }));
          setScreenShotPreview(uploadData.url); // Show preview from live URL
        } else {
          // The endpoint now refuses uploads for reasons the customer can act
          // on — too many attempts, or a file that is not really an image —
          // and a flat "Failed to upload image" hides which one happened.
          const failure = await uploadResponse.json().catch(() => null);
          setErrors(prev => ({
            ...prev,
            transactionScreenshot: failure?.error || 'Failed to upload image'
          }));
        }
      } catch (error) {
        setErrors(prev => ({ ...prev, transactionScreenshot: 'Upload error occurred' }));
      } finally {
        setIsUploading(false);
      }
    }
  };

  const validateForm = (cartItemCount: number, shippingConfigError: string | null) => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city) newErrors.city = 'Please select a governorate';

    // Email RegEx validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email';
    }

    // Egyptian Phone RegEx validation
    const phoneRegex = /^01[0125]\d{8}$/;
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Invalid Egyptian phone number';
    }

    // Payment validation
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Please select a payment method';
    } else if (formData.paymentMethod === 'instaPay' && !formData.transactionScreenshot) {
      newErrors.transactionScreenshot = 'Transaction screenshot is required for InstaPay';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return false;

    if (cartItemCount === 0 || shippingConfigError) {
      return false;
    }

    return true;
  };

  return {
    formData,
    setFormData,
    errors,
    setErrors,
    handleInputChange,
    handleFileChange,
    validateForm,
    screenShotPreview,
    isUploading
  };
}
