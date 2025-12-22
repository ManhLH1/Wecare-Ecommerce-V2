'use client';

import React from 'react';
import { ToastContainer, toast, ToastOptions } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './ToastStyles.css';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

// Toast configuration
const defaultToastOptions: ToastOptions = {
  position: "top-right",
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "light",
  pauseOnFocusLoss: false,
};


// Custom toast components with subtle icons
const SuccessIcon = () => (
  <div style={{
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#10B981',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  }}>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>
  </div>
);

const ErrorIcon = () => (
  <div style={{
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#EF4444',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  }}>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
  </div>
);

const WarningIcon = () => (
  <div style={{
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#F59E0B',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  }}>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
    </svg>
  </div>
);

const InfoIcon = () => (
  <div style={{
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    backgroundColor: '#3B82F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  }}>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
    </svg>
  </div>
);

// Toast functions
export const showToast = {
  success: (message: string, options?: ToastOptions) => {
    return toast.success(
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <SuccessIcon />
        <span>{message}</span>
      </div>,
      {
        ...defaultToastOptions,
        ...options,
      }
    );
  },
  
  error: (message: string, options?: ToastOptions) => {
    return toast.error(
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <ErrorIcon />
        <span>{message}</span>
      </div>,
      {
        ...defaultToastOptions,
        ...options,
      }
    );
  },
  
  warning: (message: string, options?: ToastOptions) => {
    return toast.warning(
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <WarningIcon />
        <span>{message}</span>
      </div>,
      {
        ...defaultToastOptions,
        ...options,
      }
    );
  },
  
  info: (message: string, options?: ToastOptions) => {
    return toast.info(
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <InfoIcon />
        <span>{message}</span>
      </div>,
      {
        ...defaultToastOptions,
        ...options,
      }
    );
  },
  
  // Custom toast with custom styling
  custom: (message: string, options?: ToastOptions) => {
    return toast(message, {
      ...defaultToastOptions,
      ...options,
    });
  },
  
  // Dismiss all toasts
  dismiss: () => {
    toast.dismiss();
  },
  
  // Dismiss specific toast
  dismissToast: (toastId: string | number) => {
    toast.dismiss(toastId);
  },
};

// Toast Manager Component
const ToastManager: React.FC = () => {
  return (
    <ToastContainer
      position="top-right"
      autoClose={4000}
      hideProgressBar={false}
      newestOnTop={true}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss={false}
      draggable
      pauseOnHover
      theme="light"
      limit={3}
      className="toast-container"
      toastClassName="toast-item"
      style={{
        top: '140px',
        right: '16px',
      }}
    />
  );
};

export default ToastManager;
