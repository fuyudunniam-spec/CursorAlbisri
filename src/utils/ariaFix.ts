// Utility function to fix ARIA accessibility issues
export const fixAriaHiddenIssues = () => {
  // Find all dialog content elements
  const dialogContents = document.querySelectorAll('[data-radix-dialog-content]');
  
  dialogContents.forEach((dialog) => {
    const dialogElement = dialog as HTMLElement;
    
    // If dialog is open, ensure it's not aria-hidden
    if (dialogElement.getAttribute('data-state') === 'open') {
      dialogElement.removeAttribute('aria-hidden');
      dialogElement.setAttribute('aria-hidden', 'false');
      
      // Remove aria-hidden from all child elements
      const allElements = dialogElement.querySelectorAll('*');
      allElements.forEach((element) => {
        const htmlElement = element as HTMLElement;
        if (htmlElement.getAttribute('aria-hidden') === 'true') {
          htmlElement.removeAttribute('aria-hidden');
        }
      });
    }
  });
  
  // Also check for any focused elements that are aria-hidden
  const activeElement = document.activeElement as HTMLElement;
  if (activeElement) {
    let currentElement = activeElement;
    
    // Check all ancestors
    while (currentElement && currentElement !== document.body) {
      if (currentElement.getAttribute('aria-hidden') === 'true') {
        currentElement.removeAttribute('aria-hidden');
        currentElement.setAttribute('aria-hidden', 'false');
      }
      currentElement = currentElement.parentElement as HTMLElement;
    }
  }
};

// Set up automatic fixing
export const setupAriaFix = () => {
  // Fix immediately
  fixAriaHiddenIssues();
  
  // Fix on focus events
  document.addEventListener('focusin', fixAriaHiddenIssues);
  
  // Fix on mutation events (when DOM changes)
  const observer = new MutationObserver((mutations) => {
    let shouldFix = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && 
          (mutation.attributeName === 'aria-hidden' || mutation.attributeName === 'data-state')) {
        shouldFix = true;
      }
    });
    
    if (shouldFix) {
      fixAriaHiddenIssues();
    }
  });
  
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['aria-hidden', 'data-state'],
    subtree: true
  });
  
  // Periodic check as backup
  setInterval(fixAriaHiddenIssues, 500);
  
  return () => {
    document.removeEventListener('focusin', fixAriaHiddenIssues);
    observer.disconnect();
  };
};
