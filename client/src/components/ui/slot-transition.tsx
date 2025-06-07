import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';

interface SlotTransitionProps {
  status: string;
  slotTime: string;
  isChanging?: boolean;
  className?: string;
}

const statusConfig = {
  active: {
    icon: CheckCircle2,
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    label: 'Active'
  },
  skipped: {
    icon: XCircle,
    color: 'bg-gray-500',
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-50',
    label: 'Paused'
  },
  available: {
    icon: Clock,
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    label: 'Available'
  },
  changing: {
    icon: AlertCircle,
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    label: 'Updating...'
  }
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const slideVariants = {
  enter: {
    opacity: 0,
    x: 20,
    scale: 0.9
  },
  center: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 300
    }
  },
  exit: {
    opacity: 0,
    x: -20,
    scale: 0.9,
    transition: {
      duration: 0.2
    }
  }
};

const statusChangeVariants = {
  initial: { scale: 1, opacity: 1 },
  changing: { 
    scale: [1, 1.1, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 0.6,
      repeat: 2,
      ease: "easeInOut"
    }
  },
  complete: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 200
    }
  }
};

export function SlotTransition({ status, slotTime, isChanging, className }: SlotTransitionProps) {
  const currentStatus = isChanging ? 'changing' : status;
  const config = statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig.available;
  const Icon = config.icon;

  return (
    <motion.div 
      className={`relative ${className}`}
      variants={statusChangeVariants}
      initial="initial"
      animate={isChanging ? "changing" : "complete"}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStatus}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className={`flex items-center gap-3 p-4 rounded-lg border-2 border-transparent ${config.bgColor} hover:border-blue-200 transition-colors duration-200`}
        >
          {/* Status Icon with Pulse Effect */}
          <motion.div 
            className={`p-2 rounded-full ${config.color} shadow-lg`}
            variants={currentStatus === 'changing' ? pulseVariants : {}}
            animate={currentStatus === 'changing' ? "pulse" : ""}
          >
            <Icon className="w-4 h-4 text-white" />
          </motion.div>

          {/* Slot Information */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <motion.span 
                className="font-semibold text-gray-900"
                layout
              >
                {slotTime}
              </motion.span>
              
              <motion.div layout>
                <Badge 
                  variant="secondary" 
                  className={`${config.textColor} ${config.bgColor} border-0`}
                >
                  {config.label}
                </Badge>
              </motion.div>
            </div>
            
            {isChanging && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2"
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    className="w-2 h-2 bg-yellow-500 rounded-full"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [1, 0.6, 1]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  <span className="text-sm text-yellow-700">Processing your request...</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Success Animation Overlay */}
          <AnimatePresence>
            {!isChanging && status === 'active' && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: [0, 1.2, 1], 
                  opacity: [0, 1, 0] 
                }}
                transition={{ 
                  duration: 1,
                  times: [0, 0.6, 1],
                  ease: "easeOut"
                }}
                className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}