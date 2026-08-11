'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type GlowEffectProps = {
  className?: string;
  style?: React.CSSProperties;
  colors?: string[];
  mode?: 'rotate' | 'pulse' | 'static';
  blur?: 'soft' | 'medium' | 'strong' | number;
  duration?: number;
};

export function GlowEffect({
  className,
  style,
  colors = ['#2E7D32', '#00897B', '#E65100', '#2E7D32'],
  mode = 'rotate',
  blur = 'medium',
  duration = 4,
}: GlowEffectProps) {
  const blurAmount =
    typeof blur === 'number'
      ? `${blur}px`
      : blur === 'soft'
      ? '12px'
      : blur === 'medium'
      ? '24px'
      : '36px';

  const gradient = `conic-gradient(from 0deg, ${colors.join(', ')})`;

  if (mode === 'rotate') {
    return (
      <div
        className={cn('pointer-events-none absolute inset-0 -z-10 rounded-[inherit]', className)}
        style={{ ...style, filter: `blur(${blurAmount})` }}
      >
        <motion.div
          className="h-full w-full rounded-[inherit]"
          style={{ background: gradient }}
          animate={{ rotate: 360 }}
          transition={{
            duration,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </div>
    );
  }

  if (mode === 'pulse') {
    return (
      <div
        className={cn('pointer-events-none absolute inset-0 -z-10 rounded-[inherit]', className)}
        style={{ ...style, filter: `blur(${blurAmount})` }}
      >
        <motion.div
          className="h-full w-full rounded-[inherit]"
          style={{ background: gradient }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{
            duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 -z-10 rounded-[inherit]', className)}
      style={{
        ...style,
        filter: `blur(${blurAmount})`,
        background: gradient,
      }}
    />
  );
}
