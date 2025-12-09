"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface FeedbackItem {
  _id: string;
  message: string;
  rating: number;
  name?: string;
  createdAt: string;
}

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
  const [reviews, setReviews] = useState<FeedbackItem[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await fetch('/api/feedback');
        if (response.ok) {
          const data = await response.json();
          setReviews(data.feedback || []);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoadingReviews(false);
      }
    };
    fetchReviews();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRatingChange = (rating: number) => {
    setFormData(prev => ({ ...prev, rating }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.message.trim() || !formData.name.trim() || !formData.email.trim()) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        setFormData({ name: '', email: '', phone: '', message: '', rating: 0 });
        setTimeout(() => window.location.reload(), 2000);
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
          width="22"
          height="22"
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

  const renderReviewStars = (rating: number) => {
    return [1, 2, 3, 4, 5].map((star) => (
      <svg
        key={star}
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={star <= rating ? "#FFD700" : "none"}
        stroke={star <= rating ? "#FFD700" : "#666"}
        strokeWidth="1"
      >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ));
  };

  // Clean message to remove email/phone/from info from old data
  const cleanMessage = (message: string): string => {
    // Split by common patterns and take only the actual review
    const clean = message
      .split(/From:/i)[0]
      .split(/Email:/i)[0]
      .split(/Phone:/i)[0]
      .trim();
    return clean || message;
  };

  // Extract name from old message format if not in separate field
  const extractName = (review: FeedbackItem): string => {
    if (review.name && review.name.trim()) return review.name;
    const fromMatch = review.message.match(/From:\s*([^\n]+)/i);
    if (fromMatch) return fromMatch[1].split(/Email:/i)[0].trim();
    return '';
  };

  return (
    <div id="feedbackform" className="w-full bg-stone-900 py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header + Form Row */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-16 mb-20">
          {/* Left - Large Title */}
          <motion.div
            className="lg:flex-1 mb-10 lg:mb-0"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-white leading-tight text-center mb-10 lg:mb-0">
              Share
              <br />
              <span className="font-normal">Your</span>
              <br />
              <span className="ml-4 lg:ml-8">Feedback</span>
            </h2>
          </motion.div>

          {/* Right - Compact Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="lg:flex-1 lg:max-w-md  sm:mx-0 lg:mx-26 "
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            suppressHydrationWarning
          >
            {/* Name and Email */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center lg:text-left">
                <label htmlFor="name" className="block text-xs text-white/60 uppercase tracking-wider mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-[50%] lg:w-full mx-auto lg:mx-0 px-0 py-2 bg-transparent border-0 border-b border-white/30
                    text-white text-sm placeholder-white/30 text-center lg:text-left
                    focus:border-white focus:outline-none transition-colors"
                  placeholder="Your name"
                  suppressHydrationWarning
                />
              </div>
              <div className="text-center lg:text-left">
                <label htmlFor="email" className="block text-xs text-white/60 uppercase tracking-wider mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-[50%] lg:w-full mx-auto lg:mx-0 px-0 py-2 bg-transparent border-0 border-b border-white/30
                    text-white text-sm placeholder-white/30 text-center lg:text-left
                    focus:border-white focus:outline-none transition-colors"
                  placeholder="your@email.com"
                  suppressHydrationWarning
                />
              </div>
            </div>

            {/* Phone */}
            <div className="mb-6 text-center lg:text-left">
              <label htmlFor="phone" className="block text-xs text-white/60 uppercase tracking-wider mb-1">
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-[50%] lg:w-full mx-auto lg:mx-0 px-0 py-2 bg-transparent border-0 border-b border-white/30
                  text-white text-sm placeholder-white/30 text-center lg:text-left
                  focus:border-white focus:outline-none transition-colors"
                placeholder="+20 123456789"
                suppressHydrationWarning
              />
            </div>

            {/* Rating */}
            <div className="mb-6 text-center lg:text-left">
              <label className="block text-xs text-white/60 uppercase tracking-wider mb-2">
                Rate Your Experience
              </label>
              <div className="flex items-center justify-center lg:justify-start space-x-1">
                {renderStars()}
              </div>
            </div>

            {/* Message */}
            <div className="mb-6 text-center lg:text-left">
              <label htmlFor="message" className="block text-xs text-white/60 uppercase tracking-wider mb-1">
                Your Feedback *
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={3}
                value={formData.message}
                onChange={handleChange}
                className="w-[50%] lg:w-full mx-auto lg:mx-0 px-0 py-2 bg-transparent border-0 border-b border-white/30
                  text-white text-sm placeholder-white/30 text-center lg:text-left
                  focus:border-white focus:outline-none transition-colors resize-none"
                placeholder="Share your experience..."
                suppressHydrationWarning
              />
            </div>

            {/* Submit */}
            <div className="flex justify-center lg:justify-start">
              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="w-[50%] lg:w-full py-3 bg-white text-black font-bold uppercase tracking-wider text-xs
                  hover:bg-white/90 disabled:opacity-50 transition-all"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {isSubmitting ? 'Sending...' : 'Submit'}
              </motion.button>
            </div>

            {submitStatus === 'success' && (
              <p className="text-green-400 text-xs mt-2">✓ Submitted successfully!</p>
            )}
            {submitStatus === 'error' && (
              <p className="text-red-400 text-xs mt-2">✗ Error. Please try again.</p>
            )}
          </motion.form>
        </div>

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-20"
          >
            {/* Reviews Grid - 3 columns on desktop, stacked on mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
              {reviews.slice(0, 6).map((review, index) => {
                const name = extractName(review);
                const message = cleanMessage(review.message);
                if (!name) return null; // Skip reviews without a name
                return (
                  <motion.div
                    key={review._id}
                    className="space-y-2"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                  >
                    {/* Name Only */}
                    <h4 className="text-sm font-medium text-white">
                      {name}
                    </h4>

                    {/* Clean Review Message */}
                    <p className="text-white/50 text-xs leading-relaxed">
                      {message}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {loadingReviews && (
          <div className="text-white/30 text-sm">Loading reviews...</div>
        )}
      </div>
    </div>
  );
};

export default FeedbackForm;
