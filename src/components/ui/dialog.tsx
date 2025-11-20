import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    aria-hidden="true"
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) return;

    // More aggressive approach to fix aria-hidden issues
    const fixAriaHiddenIssues = () => {
      // Remove all aria-hidden attributes from dialog and its children
      const allElements = contentElement.querySelectorAll('*');
      allElements.forEach((element) => {
        const htmlElement = element as HTMLElement;
        if (htmlElement.getAttribute('aria-hidden') === 'true') {
          htmlElement.removeAttribute('aria-hidden');
        }
      });
      
      // Ensure dialog content itself is not aria-hidden
      contentElement.removeAttribute('aria-hidden');
      
      // Use inert attribute instead for better accessibility
      if (contentElement.getAttribute('data-state') === 'closed') {
        contentElement.setAttribute('inert', '');
      } else {
        contentElement.removeAttribute('inert');
      }
    };

    // Monitor dialog state changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-state') {
          fixAriaHiddenIssues();
        }
      });
      
      // Also fix any aria-hidden attributes that get added
      if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
        const target = mutation.target as HTMLElement;
        if (target.getAttribute('aria-hidden') === 'true' && 
            (target === contentElement || contentElement.contains(target))) {
          target.removeAttribute('aria-hidden');
        }
      }
    });

    observer.observe(contentElement, {
      attributes: true,
      attributeFilter: ['data-state', 'aria-hidden'],
      subtree: true
    });

    // Initial fix
    fixAriaHiddenIssues();

    // Monitor focus events
    const handleFocusIn = (e: FocusEvent) => {
      const focusedElement = e.target as HTMLElement;
      let currentElement = focusedElement;
      
      // Remove aria-hidden from all ancestors
      while (currentElement && currentElement !== document.body) {
        if (currentElement.getAttribute('aria-hidden') === 'true') {
          currentElement.removeAttribute('aria-hidden');
        }
        currentElement = currentElement.parentElement as HTMLElement;
      }
    };

    contentElement.addEventListener('focusin', handleFocusIn);

    // Periodic check to ensure aria-hidden issues don't persist
    const interval = setInterval(fixAriaHiddenIssues, 100);

    return () => {
      observer.disconnect();
      contentElement.removeEventListener('focusin', handleFocusIn);
      clearInterval(interval);
    };
  }, []);

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={(node) => {
          contentRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          className,
        )}
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          
          // Use requestAnimationFrame to ensure DOM is ready
          requestAnimationFrame(() => {
            const dialogElement = contentRef.current;
            if (dialogElement) {
              // Remove all aria-hidden attributes
              dialogElement.removeAttribute('aria-hidden');
              const allElements = dialogElement.querySelectorAll('*');
              allElements.forEach((element) => {
                const htmlElement = element as HTMLElement;
                htmlElement.removeAttribute('aria-hidden');
              });
              
              // Focus first focusable element
              const focusableElements = dialogElement.querySelectorAll(
                'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
              );
              
              if (focusableElements.length > 0) {
                (focusableElements[0] as HTMLElement).focus();
              }
            }
          });
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
        }}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
