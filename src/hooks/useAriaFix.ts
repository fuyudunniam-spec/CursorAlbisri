import { useEffect, useRef } from 'react';

export const useAriaFix = () => {
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const fixAriaHiddenIssues = () => {
      // Remove aria-hidden from all elements in the subtree
      const allElements = element.querySelectorAll('*');
      allElements.forEach((el) => {
        const htmlElement = el as HTMLElement;
        if (htmlElement.getAttribute('aria-hidden') === 'true') {
          htmlElement.removeAttribute('aria-hidden');
        }
      });
      
      // Ensure the element itself is not aria-hidden
      element.removeAttribute('aria-hidden');
    };

    // Fix immediately
    fixAriaHiddenIssues();

    // Set up mutation observer to watch for aria-hidden changes
    const observer = new MutationObserver((mutations) => {
      let shouldFix = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
          const target = mutation.target as HTMLElement;
          if (target.getAttribute('aria-hidden') === 'true' && 
              (target === element || element.contains(target))) {
            shouldFix = true;
          }
        }
      });
      
      if (shouldFix) {
        fixAriaHiddenIssues();
      }
    });

    observer.observe(element, {
      attributes: true,
      attributeFilter: ['aria-hidden'],
      subtree: true
    });

    // Also fix on focus events
    const handleFocusIn = (e: FocusEvent) => {
      const focusedElement = e.target as HTMLElement;
      if (element.contains(focusedElement)) {
        fixAriaHiddenIssues();
      }
    };

    element.addEventListener('focusin', handleFocusIn);

    // Periodic check as backup
    const interval = setInterval(fixAriaHiddenIssues, 200);

    return () => {
      observer.disconnect();
      element.removeEventListener('focusin', handleFocusIn);
      clearInterval(interval);
    };
  }, []);

  return elementRef;
};
