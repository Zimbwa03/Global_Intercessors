import React from 'react';
import { Card } from '@/components/ui/card';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  isVisible?: boolean;
  animationType?: 'slideIn' | 'fadeIn' | 'scaleIn' | 'bounceIn';
  delay?: number;
  duration?: number;
}

// Animations disabled in production to avoid React 310 crash paths

export function AnimatedCard({ 
  children, 
  isVisible = true, 
  animationType = 'fadeIn',
  delay = 0,
  duration = 0.3,
  className
}: AnimatedCardProps) {
  if (!isVisible) return null;
  return <Card className={className}>{children}</Card>;
}