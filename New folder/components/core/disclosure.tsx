'use client';
import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

type DisclosureContextType = {
  isOpen: boolean;
  toggle: () => void;
};

const DisclosureContext = createContext<DisclosureContextType | null>(null);

function useDisclosure() {
  const context = useContext(DisclosureContext);
  if (!context) {
    throw new Error('useDisclosure must be used within Disclosure');
  }
  return context;
}

export function Disclosure({
  children,
  open: controlledOpen,
  onOpenChange,
  className,
}: {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const toggle = () => {
    const next = !isOpen;
    if (controlledOpen === undefined) {
      setInternalOpen(next);
    }
    if (onOpenChange) {
      onOpenChange(next);
    }
  };

  return (
    <DisclosureContext.Provider value={{ isOpen, toggle }}>
      <div className={cn('border-b border-neutral-200 dark:border-neutral-800', className)}>
        {children}
      </div>
    </DisclosureContext.Provider>
  );
}

export function DisclosureTrigger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isOpen, toggle } = useDisclosure();

  return (
    <button
      onClick={toggle}
      className={cn(
        'flex w-full items-center justify-between py-4 text-left font-medium transition-all hover:underline',
        className
      )}
    >
      {children}
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
        className="shrink-0 text-neutral-500"
      >
        <ChevronDown className="h-4 w-4" />
      </motion.div>
    </button>
  );
}

export function DisclosureContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isOpen } = useDisclosure();

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          <div className={cn('pb-4 pt-0 text-sm text-neutral-600 dark:text-neutral-400', className)}>
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
