import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupAriaFix } from "./utils/ariaFix";

// Global error handler untuk menangkap error dari ekstensi browser
window.addEventListener('error', (event) => {
  // Filter out extension-related errors
  if (event.error?.message?.includes('chrome-extension://') || 
      event.error?.message?.includes('Could not establish connection') ||
      event.error?.message?.includes('Receiving end does not exist') ||
      event.filename?.includes('inject.js') ||
      event.error?.stack?.includes('inject.js')) {
    console.warn('Extension error caught and ignored:', event.error?.message || 'inject.js error');
    event.preventDefault();
    return false;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  // Filter out extension-related promise rejections
  if (event.reason?.message?.includes('chrome-extension://') || 
      event.reason?.message?.includes('Could not establish connection') ||
      event.reason?.message?.includes('Receiving end does not exist') ||
      event.reason?.stack?.includes('inject.js') ||
      (event.reason?.message && event.reason.message.includes('inject.js'))) {
    console.warn('Extension promise rejection caught and ignored:', event.reason?.message || 'inject.js rejection');
    event.preventDefault();
    return false;
  }
});

// Additional console error filtering
const originalConsoleError = console.error;
console.error = function(...args) {
  const message = args[0]?.toString() || '';
  if (message.includes('inject.js') || 
      message.includes('Could not establish connection') ||
      message.includes('Receiving end does not exist')) {
    console.warn('Console error suppressed (extension):', message);
    return;
  }
  originalConsoleError.apply(console, args);
};

// Setup ARIA fix for accessibility issues
setupAriaFix();

createRoot(document.getElementById("root")!).render(<App />);
