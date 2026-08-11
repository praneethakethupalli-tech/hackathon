'use client';
import React, { createContext, useContext, useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

type MorphingDialogContextType = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  uniqueId: string;
};

const MorphingDialogContext = createContext<MorphingDialogContextType | null>(null);

function useMorphingDialog() {
  const context = useContext(MorphingDialogContext);
  if (!context) {
    throw new Error('useMorphingDialog must be used within MorphingDialog');
  }
  return context;
}

export function MorphingDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const uniqueId = useId();

  return (
    <MorphingDialogContext.Provider value={{ isOpen, setIsOpen, uniqueId }}>
      {children}
    </MorphingDialogContext.Provider>
  );
}

export function MorphingDialogTrigger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { setIsOpen, uniqueId } = useMorphingDialog();

  return (
    <motion.div
      layoutId={`dialog-trigger-${uniqueId}`}
      onClick={() => setIsOpen(true)}
      className={cn('cursor-pointer', className)}
    >
      {children}
    </motion.div>
  );
}

export function MorphingDialogContainer({ children }: { children: React.ReactNode }) {
  const { isOpen } = useMorphingDialog();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {children}
        </div>
      )}
    </AnimatePresence>
  );
}

export function MorphingDialogContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { setIsOpen, uniqueId } = useMorphingDialog();

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setIsOpen(false)}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
      />
      <motion.div
        layoutId={`dialog-trigger-${uniqueId}`}
        className={cn(
          'relative z-50 w-full max-w-lg overflow-hidden rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900',
          className
        )}
      >
        {children}
      </motion.div>
    </>
  );
}

export function MorphingDialogClose({ className }: { className?: string }) {
  const { setIsOpen } = useMorphingDialog();

  return (
    <button
      onClick={() => setIsOpen(false)}
      className={cn(
        'absolute right-4 top-4 rounded-full p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800',
        className
      )}
    >
      <X className="h-5 w-5" />
    </button>
  );
}

export function MorphingDialogTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h2 className={cn('text-xl font-bold text-neutral-900 dark:text-neutral-100', className)}>{children}</h2>;
}

export function MorphingDialogSubtitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn('text-sm text-neutral-500 dark:text-neutral-400', className)}>{children}</p>;
}

export function MorphingDialogDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn('mt-2 text-sm text-neutral-600 dark:text-neutral-300', className)}>{children}</div>;
}
