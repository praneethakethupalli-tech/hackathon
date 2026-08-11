'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type TextShimmerProps = {
  children: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  duration?: number;
  spread?: number;
};

export function TextShimmer({
  children,
  as: Component = 'p',
  className,
  duration = 2,
}: TextShimmerProps) {
  const MotionComponent = motion[Component as keyof typeof motion] as typeof motion.p;

  return (
    <MotionComponent
      className={cn(
        'relative inline-block bg-[length:250%_100%] bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 via-neutral-500 to-neutral-900 dark:from-neutral-100 dark:via-neutral-400 dark:to-neutral-100',
        className
      )}
      initial={{ backgroundPosition: '100% 0' }}
      animate={{ backgroundPosition: '0% 0' }}
      transition={{
        repeat: Infinity,
        duration: duration,
        ease: 'linear',
      }}
    >
      {children}
    </MotionComponent>
  );
}
