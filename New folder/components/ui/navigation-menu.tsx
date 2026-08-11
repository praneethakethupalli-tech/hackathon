"use client";

import * as React from "react";
import { motion, useScroll, useMotionValueEvent, type Variants } from "framer-motion";
import { Navigation, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Home", href: "#top" },
  { name: "History", href: "#sample-diagnosis" },
  { name: "How It Works", href: "#how" },
];

const EXPAND_SCROLL_THRESHOLD = 80;

const containerVariants: Variants = {
  expanded: {
    y: 0,
    opacity: 1,
    width: "auto",
    transition: {
      y: { type: "spring" as const, damping: 18, stiffness: 250 },
      opacity: { duration: 0.3 },
      type: "spring" as const,
      damping: 20,
      stiffness: 300,
      staggerChildren: 0.07,
      delayChildren: 0.2,
    },
  },
  collapsed: {
    y: 0,
    opacity: 1,
    width: "3rem",
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 300,
      when: "afterChildren",
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

const logoVariants: Variants = {
  expanded: { opacity: 1, x: 0, rotate: 0, transition: { type: "spring" as const, damping: 15 } },
  collapsed: { opacity: 0, x: -25, rotate: -180, transition: { duration: 0.3 } },
};

const itemVariants: Variants = {
  expanded: { opacity: 1, x: 0, scale: 1, transition: { type: "spring" as const, damping: 15 } },
  collapsed: { opacity: 0, x: -20, scale: 0.95, transition: { duration: 0.2 } },
};

const collapsedIconVariants: Variants = {
  expanded: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
  collapsed: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      damping: 15,
      stiffness: 300,
      delay: 0.15,
    },
  },
};

export function AnimatedNavFramer() {
  const [isExpanded, setExpanded] = React.useState(true);

  const { scrollY } = useScroll();
  const lastScrollY = React.useRef(0);
  const scrollPositionOnCollapse = React.useRef(0);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = lastScrollY.current;

    if (isExpanded && latest > previous && latest > 150) {
      setExpanded(false);
      scrollPositionOnCollapse.current = latest;
    } else if (
      !isExpanded &&
      latest < previous &&
      scrollPositionOnCollapse.current - latest > EXPAND_SCROLL_THRESHOLD
    ) {
      setExpanded(true);
    }

    lastScrollY.current = latest;
  });

  const handleNavClick = (e: React.MouseEvent) => {
    if (!isExpanded) {
      e.preventDefault();
      setExpanded(true);
    }
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.stopPropagation();
    if (href.startsWith("#")) {
      e.preventDefault();
      if (href === "#top" || href === "#") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const target = document.querySelector(href);
      if (target) {
        const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - 72);
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
  };

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-[92vw]">
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={isExpanded ? "expanded" : "collapsed"}
        variants={containerVariants}
        whileHover={!isExpanded ? { scale: 1.1 } : {}}
        whileTap={!isExpanded ? { scale: 0.95 } : {}}
        onClick={handleNavClick}
        className={cn(
          "flex items-center overflow-hidden rounded-full border border-[#D6CFBC] bg-white/90 shadow-md backdrop-blur-md h-12",
          !isExpanded && "cursor-pointer justify-center"
        )}
      >
        <motion.a
          href="#top"
          variants={logoVariants}
          onClick={(e) => handleLinkClick(e, "#top")}
          className="flex-shrink-0 flex items-center gap-2 pl-4 pr-3 text-decoration-none focus:outline-none"
        >
          <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M6 26c6-1 10-5 11-11 1 6 5 10 11 11-1 6-5 10-11 11-6-1-10-5-11-11Z" fill="#2E7D32"/>
            <path d="M16 26c0-6 3-10 8-12-1-6-4-10-8-11-4 1-7 5-8 11 5 2 8 6 8 12Z" fill="#A5D6A7"/>
          </svg>
          <span className="text-sm font-bold tracking-tight text-[#1F2A22] whitespace-nowrap">AgriShield AI</span>
        </motion.a>

        <motion.div
          className={cn(
            "flex items-center gap-1 sm:gap-3 pr-4",
            !isExpanded && "pointer-events-none"
          )}
        >
          {navItems.map((item) => (
            <motion.a
              key={item.name}
              href={item.href}
              variants={itemVariants}
              onClick={(e) => handleLinkClick(e, item.href)}
              className="text-xs sm:text-sm font-semibold text-[#56665A] hover:text-[#2E7D32] transition-colors px-2.5 py-1 rounded-full hover:bg-[#E8F5E9] whitespace-nowrap"
            >
              {item.name}
            </motion.a>
          ))}
        </motion.div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            variants={collapsedIconVariants}
            animate={isExpanded ? "expanded" : "collapsed"}
          >
            <Menu className="h-5 w-5 text-[#2E7D32]" />
          </motion.div>
        </div>
      </motion.nav>
    </div>
  );
}
