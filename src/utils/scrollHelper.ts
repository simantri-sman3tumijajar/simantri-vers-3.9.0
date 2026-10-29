import { useEffect } from 'react';

/**
 * Robust scroll-to-top utility that smoothly scrolls the window, documentElement,
 * document.body, and any active scrollable container to the top.
 * Performs periodic staggered scrolling to handle asynchronous layout shifts,
 * animations, and dynamic re-renders.
 */
export function scrollToTop(options: {
  smooth?: boolean;
  delayMs?: number;
  periodic?: boolean;
  staggeredDelays?: number[];
} = {}) {
  const {
    smooth = true,
    delayMs = 0,
    periodic = true,
    staggeredDelays = [0, 60, 180, 350, 600],
  } = options;

  const behavior: ScrollBehavior = smooth ? 'smooth' : 'auto';

  const executeScroll = () => {
    try {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior });
      }

      if (typeof document !== 'undefined') {
        if (document.documentElement) {
          document.documentElement.scrollTo({ top: 0, left: 0, behavior });
        }
        if (document.body) {
          document.body.scrollTo({ top: 0, left: 0, behavior });
        }

        // Target scrollable elements like main view containers, portal containers, modals, and root
        const scrollableContainers = document.querySelectorAll<HTMLElement>(
          'main, [data-scroll-container], .overflow-y-auto, .overflow-y-scroll, #root, #root > div, [role="main"], body'
        );

        scrollableContainers.forEach((el) => {
          if (el) {
            try {
              el.scrollTo({ top: 0, left: 0, behavior });
            } catch {
              el.scrollTop = 0;
            }
          }
        });
      }
    } catch {
      // Safe fallback
      if (typeof window !== 'undefined') {
        window.scrollTo(0, 0);
      }
    }
  };

  if (periodic && staggeredDelays.length > 0) {
    staggeredDelays.forEach((delay) => {
      const targetDelay = delayMs + delay;
      if (targetDelay === 0) {
        executeScroll();
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(executeScroll);
        }
      } else {
        setTimeout(executeScroll, targetDelay);
      }
    });
  } else {
    if (delayMs > 0) {
      setTimeout(executeScroll, delayMs);
    } else {
      executeScroll();
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(executeScroll);
      }
    }
  }
}

/**
 * React hook that triggers a smooth auto-scroll to top whenever any dependency in `deps` changes,
 * executing periodically across frames to ensure smooth navigation.
 */
export function useAutoScrollToTop(
  deps: any[],
  options: { smooth?: boolean; delayMs?: number; periodic?: boolean; staggeredDelays?: number[] } = {}
) {
  useEffect(() => {
    scrollToTop(options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
