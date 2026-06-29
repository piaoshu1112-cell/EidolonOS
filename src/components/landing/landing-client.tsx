'use client';

import * as React from "react";
import { motion, type Variants } from "framer-motion";
import { ParticleBg } from "@/components/shared/particle-bg";

/**
 * LandingClient — client-side wrappers used by the server-rendered landing
 * page at `/`. Everything here MUST stay client-only (framer-motion, canvas).
 *
 * The page itself (src/app/page.tsx) is a Server Component so crawlers get
 * the full HTML. The text content lives in the server tree; these wrappers
 * only add visual flair (background particles, scroll-triggered reveals).
 */

export function LandingBackground() {
  return <ParticleBg />;
}

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Optional stagger delay in seconds. */
  delay?: number;
  /** Render as a different element via `as` (defaults to div). */
  as?: "div" | "section" | "article" | "li" | "header";
}

/**
 * Reveal — fade-in + slide-up on scroll into view (one-shot).
 *
 * SEO note: the children are rendered server-side and present in the initial
 * HTML; framer-motion only mutates opacity/transform via CSS. Crawlers see
 * the full text content.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
}: RevealProps) {
  const MotionTag = motion[as];
  return (
    <MotionTag
      className={className}
      variants={revealVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  );
}

const heroVariants: Variants = {
  hidden: { opacity: 0, scale: 0.94, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
  },
};

/** HeroReveal — heavier entrance for the hero logo + title. */
export function HeroReveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={heroVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}
