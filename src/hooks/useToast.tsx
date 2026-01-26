import React, { createContext, useContext, useRef, ReactNode } from 'react';
import { Toast } from 'primereact/toast';

type ToastSeverity = 'success' | 'info' | 'warn' | 'error';

interface ToastContextValue {
  showToast: (severity: ToastSeverity, summary: string, detail: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const toast = useRef<Toast>(null);

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
