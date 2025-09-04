"use client";

import React, { useState } from 'react';
import { motion, useInView } from 'framer-motion';

const FeedbackForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    rating: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [hoveredRating, setHoveredRating] = useState(0);

  // Animation ref
  const formRef = React.useRef(null);
  const isInView = useInView(formRef, { once: true, margin: "-100px" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRatingChange = (rating: number) => {
    setFormData(prev => ({
      ...prev,
      rating
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.message.trim() || !formData.name.trim() || !formData.email.trim()) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: formData.message.trim(),
          rating: formData.rating,
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim()
        }),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({
          name: '',
          email: '',
          phone: '',
          message: '',
          rating: 0
        });

        // Refresh the page to show new feedback immediately
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return [1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => handleRatingChange(star)}
        onMouseEnter={() => setHoveredRating(star)}
        onMouseLeave={() => setHoveredRating(0)}
        className="focus:outline-none disabled:opacity-50"
        disabled={isSubmitting}
        suppressHydrationWarning
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={star <= (hoveredRating || formData.rating) ? "white" : "none"}
          stroke="white"
          strokeWidth="1"
          className="transition-all hover:scale-110"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </button>
    ));
  };

  return (
        <motion.div
      id="feedbackform"
      className="w-full max-w-2xl mx-auto mt-6 lg:mt-8 px-4 sm:px-6"
      ref={formRef}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
      {/* Feedback Form Header */}
      <motion.div
        className="text-center mb-4 sm:mb-6"
        initial={{opacity: 0, y: 30}}
        animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 30}}
        transition={{duration: 0.6, delay: 0.4}}
      >
        <h2 className="text-base sm:text-lg md:text-xl lg:text-3xl font-black uppercase text-[#b3b3b3] mb-2">
        — SHARE YOUR FEEDBACK
        </h2>

        <motion.p
          className="text-xs sm:text-sm lg:text-base text-[#b3b3b3]/70 mt-2"
          initial={{opacity: 0}}
          animate={isInView ? {opacity: 1} : {opacity: 0}}
          transition={{duration: 0.6, delay: 0.6}}
        >
          Help us improve and share your experience with others.
        </motion.p>
      </motion.div>

      {/* Feedback Form */}
      <motion.form
        onSubmit={handleSubmit}
        className="space-y-4 sm:space-y-6 mb-10"
        suppressHydrationWarning
        initial={{opacity: 0, y: 30}}
        animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 30}}
        transition={{duration: 0.6, delay: 0.8}}
      >
        {/* Name and Email Row - Centered on mobile/tablet */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 max-w-md mx-auto lg:max-w-none">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-white uppercase tracking-wider">
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full px-0 py-2 bg-transparent border-0 border-b-2 border-white/20
                text-white placeholder-white/50
                focus:border-white focus:outline-none transition-colors duration-300
                text-xs sm:text-sm"
              placeholder="Your full name"
              suppressHydrationWarning
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-white uppercase tracking-wider">
              Email *
            </label>
                        <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full px-0 py-2 bg-transparent border-0 border-b-2 border-white/20
                text-white placeholder-white/50
                focus:border-white focus:outline-none transition-colors duration-300
                text-xs sm:text-sm"
              placeholder="your.email@example.com"
              suppressHydrationWarning
            />
          </div>
        </div>

        {/* Phone Number - Centered on mobile/tablet */}
        <div className="space-y-2 max-w-md mx-auto lg:max-w-none">
          <label htmlFor="phone" className="block text-sm font-medium text-white uppercase tracking-wider">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-0 py-2 bg-transparent border-0 border-b-2 border-white/20
              text-white placeholder-white/50
              focus:border-white focus:outline-none transition-colors duration-300
              text-xs sm:text-sm"
            placeholder="+20 123456789"
            suppressHydrationWarning
          />
        </div>

        {/* Rating - Centered on mobile/tablet */}
        <div className="space-y-2 max-w-md mx-auto lg:max-w-none">
          <label className="block text-sm font-medium text-white uppercase tracking-wider">
            Rate Your Experience
          </label>
          <div className="flex justify-center space-x-2 py-2">
            {renderStars()}
            {formData.rating > 0 && (
              <span className="ml-4 text-white text-sm font-light self-center">
                {formData.rating} star{formData.rating > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Message - Centered on mobile/tablet */}
        <div className="space-y-2 max-w-md mx-auto lg:max-w-none">
          <label htmlFor="message" className="block text-sm font-medium text-white uppercase tracking-wider">
            Your Feedback *
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={4}
            value={formData.message}
            onChange={handleChange}
            className="w-full px-0 py-2 bg-transparent border-0 border-b-2 border-white/20
              text-white placeholder-white/50
              focus:border-white focus:outline-none transition-colors duration-300
              resize-none text-xs sm:text-sm"
            placeholder="Share your experience, suggestions, or any feedback you'd like to provide..."
            suppressHydrationWarning
          />
        </div>

        {/* Submit Button */}
        <motion.div
          className="flex flex-col items-center space-y-4 pt-6"
          initial={{opacity: 0, y: 30}}
          animate={isInView ? {opacity: 1, y: 0} : {opacity: 0, y: 30}}
          transition={{duration: 0.6, delay: 1.0}}
        >
          <motion.button
            type="submit"
            disabled={isSubmitting}
            className="group relative px-6 py-3 bg-white text-black
              font-bold uppercase tracking-wider text-xs sm:text-sm
              hover:bg-white/90
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-300 transform hover:scale-105
              border-2 border-white
              focus:outline-none focus:ring-2 focus:ring-white/20"
            suppressHydrationWarning
            initial={{scale: 0.9}}
            animate={isInView ? {scale: 1} : {scale: 0.9}}
            transition={{duration: 0.6, delay: 1.2}}
          >
            {isSubmitting ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Sending...</span>
              </span>
            ) : (
              'Submit Feedback'
            )}
          </motion.button>

          {/* Status Messages */}
          {submitStatus === 'success' && (
            <motion.p
              className="text-green-400 text-sm font-medium"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              ✓ Feedback submitted successfully! Thank you for your input.
            </motion.p>
          )}

          {submitStatus === 'error' && (
            <motion.p
              className="text-red-400 text-sm font-medium"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              ✗ Error submitting feedback. Please try again.
            </motion.p>
          )}
        </motion.div>
      </motion.form>
    </motion.div>
  );
};

export default FeedbackForm;
