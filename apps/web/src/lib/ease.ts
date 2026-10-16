// Shared motion tokens. DESIGN.md › Motion sets one curve for everything; `MotionConfig`
// in __root.tsx applies it by default, and `EASE` is it for the places that spell a
// transition out (another duration, or the Web Animations API). The springs have no
// bounce: their damping ratios sit above 1.

/** Retry's one curve. */
export const EASE = [0.2, 0, 0, 1] as const

/** Content swaps — label/icon slots trading places inside a control. */
export const SPRING_SWAP = {
  damping: 30,
  mass: 0.55,
  stiffness: 460,
} as const

/** Shared-layout glides — pills, indicators and panels morphing between positions. */
export const SPRING_LAYOUT = {
  damping: 32,
  mass: 0.6,
  stiffness: 360,
} as const
