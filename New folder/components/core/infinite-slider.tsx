'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type InfiniteSliderProps = {
  children: React.ReactNode;
  gap?: number;
  duration?: number;
  durationOnHover?: number;
  direction?: 'horizontal' | 'vertical';
  reverse?: boolean;
  className?: string;
};

export function InfiniteSlider({
  children,
  gap = 16,
  duration = 20,
  durationOnHover,
  direction = 'horizontal',
  reverse = false,
  className,
}: InfiniteSliderProps) {
  const [currentDuration, setCurrentDuration] = React.useState(duration);

  return (
    <div
      className={cn('overflow-hidden flex', className)}
      onMouseEnter={() => durationOnHover && setCurrentDuration(durationOnHover)}
      onMouseLeave={() => durationOnHover && setCurrentDuration(duration)}
    >
      <motion.div
        className={cn('flex shrink-0', direction === 'vertical' && 'flex-col')}
        style={{
          gap: `${gap}px`,
        }}
        animate={{
          x: direction === 'horizontal' ? (reverse ? ['0%', '-50%'] : ['-50%', '0%']) : 0,
          y: direction === 'vertical' ? (reverse ? ['0%', '-50%'] : ['-50%', '0%']) : 0,
        }}
        transition={{
          duration: currentDuration,
          ease: 'linear',
          repeat: Infinity,
        }}
      >
        {children}
        {children}
      </motion.div>
    </div>
  );
}
