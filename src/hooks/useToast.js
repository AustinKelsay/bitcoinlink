import React, { createContext, useContext, useRef } from 'react';
import { Toast } from 'primereact/toast';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const toast = useRef(null);

    const showToast = (severity, summary, detail) => {
        toast.current.show({ severity, summary, detail });
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            <Toast life={10000} ref={toast} />
            {children}
        </ToastContext.Provider>
    );
};