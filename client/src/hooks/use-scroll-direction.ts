import { useState, useEffect, useRef } from 'react';

export function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      const difference = scrollY - lastScrollY.current;
      
      // Only update if we've scrolled more than 10px to prevent jitter
      if (Math.abs(difference) > 10) {
        const direction = difference > 0 ? 'down' : 'up';
        if (direction !== scrollDirection) {
          setScrollDirection(direction);
        }
      }
      
      lastScrollY.current = scrollY > 0 ? scrollY : 0;
      ticking.current = false;
    };

    const handleScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(updateScrollDirection);
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrollDirection]);

  return scrollDirection;
}