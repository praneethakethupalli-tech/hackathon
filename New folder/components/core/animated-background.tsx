'use client';
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export type AnimatedBackgroundProps = {
  children: React.ReactNode[];
  defaultValue?: string;
  onValueChange?: (newActiveId: string | null) => void;
  className?: string;
  transition?: any;
  enableHover?: boolean;
};

export function AnimatedBackground({
  children,
  defaultValue,
  onValueChange,
  className,
  transition = { type: 'spring', bounce: 0.2, duration: 0.6 },
  enableHover = false,
}: AnimatedBackgroundProps) {
  const [activeId, setActiveId] = React.useState<string | null>(defaultValue || null);

  const handleSelect = (id: string | null) => {
    setActiveId(id);
    if (onValueChange) {
      onValueChange(id);
    }
  };

  return (
    <div className="relative inline-flex items-center">
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;

        const id = (child.props as any)['data-id'] || String(index);
        const isActive = activeId === id;

        return (
          <div
            key={id}
            className="relative flex items-center justify-center cursor-pointer"
            onMouseEnter={() => enableHover && handleSelect(id)}
            onMouseLeave={() => enableHover && handleSelect(null)}
            onClick={() => !enableHover && handleSelect(id)}
          >
            <AnimatePresence>
              {isActive && (
                <motion.div
                  layoutId="animated-bg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={transition}
                  className={cn(
                    'absolute inset-0 bg-neutral-100 dark:bg-neutral-800 rounded-lg -z-10',
                    className
                  )}
                />
              )}
            </AnimatePresence>
            {child}
          </div>
        );
      })}
    </div>
  );
}
