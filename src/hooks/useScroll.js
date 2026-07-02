import { useState, useEffect } from 'react';

/**
 * Custom hook to detect scroll state
 * @param {number} threshold - Scroll Y pixel threshold to toggle scroll state
 * @returns {boolean} Whether scroll offset is past threshold
 */
export const useScroll = (threshold = 20) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > threshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Check initial state
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold]);

  return isScrolled;
};
