'use client';

import { useEffect, useState, useRef } from 'react';

/**
 * Custom hook to detect scroll direction and distance from top.
 * Useful for building dynamic/sticky headers.
 */
export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState('none'); // 'up', 'down', 'none'
  const [isAtTop, setIsAtTop] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      const currentY = window.scrollY;
      const atTop = currentY < 80;
      
      setIsAtTop(atTop);
      setScrollY(currentY);

      if (Math.abs(currentY - lastScrollY.current) < 5) {
        return;
      }

      const direction = currentY > lastScrollY.current ? 'down' : 'up';
      
      if (direction !== scrollDirection && (currentY > 0 || direction === 'up')) {
        setScrollDirection(direction);
      }
      
      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollDirection]);

  return {
    scrollDirection,
    isAtTop,
    scrollY,
    isScrollingUp: scrollDirection === 'up',
    isScrollingDown: scrollDirection === 'down',
  };
}
