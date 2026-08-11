'use client';
import React from 'react';
import { motion, Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

export type TextEffectProps = {
  children: string;
  per?: 'char' | 'word' | 'line';
  as?: keyof React.JSX.IntrinsicElements;
  variants?: {
    container?: Variants;
    item?: Variants;
  };
  className?: string;
  preset?: 'fade' | 'slide' | 'scale' | 'blur';
  delay?: number;
};

const defaultContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const defaultItemVariants: Record<string, Variants> = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  slide: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
  },
  blur: {
    hidden: { opacity: 0, filter: 'blur(8px)' },
    visible: { opacity: 1, filter: 'blur(0px)' },
  },
};

export function TextEffect({
  children,
  per = 'word',
  as: Component = 'p',
  variants,
  className,
  preset = 'fade',
  delay = 0,
}: TextEffectProps) {
  const words = children.split(' ');

  const containerVariants = variants?.container || {
    ...defaultContainerVariants,
    visible: {
      ...defaultContainerVariants.visible,
      transition: {
        staggerChildren: per === 'char' ? 0.02 : 0.08,
        delayChildren: delay,
      },
    },
  };

  const itemVariants = variants?.item || defaultItemVariants[preset];

  const MotionComponent = motion[Component as keyof typeof motion] as typeof motion.div;

  if (per === 'word') {
    return (
      <MotionComponent
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className={cn('inline-flex flex-wrap gap-x-[0.25em]', className)}
      >
        {words.map((word, index) => (
          <motion.span key={index} variants={itemVariants} className="inline-block">
            {word}
          </motion.span>
        ))}
      </MotionComponent>
    );
  }

  if (per === 'char') {
    const chars = Array.from(children);
    return (
      <MotionComponent
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className={cn('inline-flex flex-wrap', className)}
      >
        {chars.map((char, index) => (
          <motion.span key={index} variants={itemVariants} className="inline-block">
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
      </MotionComponent>
    );
  }

  return (
    <MotionComponent
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={className}
    >
      <motion.span variants={itemVariants} className="inline-block">
        {children}
      </motion.span>
    </MotionComponent>
  );
}
