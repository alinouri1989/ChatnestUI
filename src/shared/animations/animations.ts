// @ts-nocheck
export const createContainerVariants = (delayChildren = 0.3, staggerChildren = 0.2) => ({
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            delayChildren,
            staggerChildren,
        },
    },
});

export const createItemVariants = (y = 20, opacity = 0) => ({
    hidden: { y, opacity },
    visible: {
        y: 0,
        opacity: 1
    }
});

export const opacityEffect = (duration = 0.8) => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration }
});

export const opacityAndTransformEffect = (duration = 0.8, translateY = 50, delay = 0.5) => ({
    initial: { opacity: 0, y: translateY },
    animate: { opacity: 1, y: 0 },
    transition: { duration, delay }
});
