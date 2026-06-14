import type { Transition, Variants } from "framer-motion";

export const spring: Record<"snappy" | "bouncy" | "gentle", Transition> = {
  snappy: { type: "spring", stiffness: 400, damping: 28 },
  bouncy: { type: "spring", stiffness: 300, damping: 18 },
  gentle: { type: "spring", stiffness: 200, damping: 26 },
};

export const stagger: Variants = {
  animate: { transition: { staggerChildren: 0.06 } },
};

export const riseIn: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: spring.gentle },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.22, ease: "easeOut" } },
};

export const popIn: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: spring.bouncy },
};