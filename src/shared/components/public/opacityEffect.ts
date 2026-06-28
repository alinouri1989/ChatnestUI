// @ts-nocheck
export default function opacityEffect(duration) {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration },
  };
}
