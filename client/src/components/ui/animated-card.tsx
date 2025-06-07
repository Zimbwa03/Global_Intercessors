import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  isVisible?: boolean;
  animationType?: 'slideIn' | 'fadeIn' | 'scaleIn' | 'bounceIn';
  delay?: number;
  duration?: number;
}

const animationVariants = {
  slideIn: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 }
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 }
  },
  bounceIn: {
    hidden: { opacity: 0, scale: 0.3 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        type: "spring",
        damping: 10,
        stiffness: 200
      }
    },
    exit: { opacity: 0, scale: 0.3 }
  }
};

export function AnimatedCard({ 
  children, 
  isVisible = true, 
  animationType = 'fadeIn',
  delay = 0,
  duration = 0.3,
  className
}: AnimatedCardProps) {
  const variants = animationVariants[animationType];

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key={`animated-card-${animationType}-${Date.now()}`}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={variants}
          transition={{ 
            duration,
            delay,
            ease: "easeOut"
          }}
        >
          <Card className={className}>
            {children}
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}