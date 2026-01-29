/**
 * Toast notification hook and provider for displaying user feedback messages.
 * Uses PrimeReact Toast component for consistent UI notifications.
 */

import React, { createContext, useContext, useRef, ReactNode } from 'react';
import { Toast } from 'primereact/toast';

/** Severity levels for toast notifications */
type ToastSeverity = 'success' | 'info' | 'warn' | 'error';

/** Context value providing toast notification functionality */
interface ToastContextValue {
  /** Display a toast notification with the specified severity, summary, and detail message */
  showToast: (severity: ToastSeverity, summary: string, detail: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Hook to access toast notification functionality.
 * Must be used within a ToastProvider.
 *
 * @returns Toast context value with showToast function
 * @throws If used outside of ToastProvider
 */
export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

/** Props for the ToastProvider component */
interface ToastProviderProps {
  /** Child components that will have access to toast notifications */
  children: ReactNode;
}

/**
 * Provider component that enables toast notifications throughout the app.
 * Wraps the application to provide toast notification context to all child components.
 *
 * @param props - Provider props containing children
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const toast = useRef<Toast>(null);

  /**
   * Display a toast notification.
   *
   * @param severity - Notification severity level (success, info, warn, error)
   * @param summary - Short summary text for the notification
   * @param detail - Detailed message text
   */
  const showToast = (
    severity: ToastSeverity,
    summary: string,
    detail: string
  ): void => {
    toast.current?.show({ severity, summary, detail, life: 10000 });
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      <Toast ref={toast} />
      {children}
    </ToastContext.Provider>
  );
};
