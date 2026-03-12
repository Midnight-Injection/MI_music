export const pageTransition = {
  type: 'spring' as const,
  stiffness: 220,
  damping: 24,
  mass: 0.9,
}

export const pageVariants = {
  initial: { opacity: 0, y: 28, filter: 'blur(10px)' },
  enter: { opacity: 1, y: 0, filter: 'blur(0px)', transition: pageTransition },
  exit: { opacity: 0, y: -18, filter: 'blur(8px)', transition: { duration: 0.18 } },
}

export function staggeredEnter(index: number, distance = 20) {
  return {
    initial: { opacity: 0, y: distance },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        delay: index * 0.05,
        duration: 0.34,
        ease: 'easeOut' as const,
      },
    },
  }
}
