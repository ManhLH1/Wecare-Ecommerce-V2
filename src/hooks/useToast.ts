'use client';

import { useCallback } from 'react';
import { showToast } from '@/components/ToastManager';
import { toast } from 'react-toastify';
import { ToastOptions } from 'react-toastify';

// Custom hook for using toast notifications
export const useToast = () => {
  // Success toast
  const success = useCallback((message: string, options?: ToastOptions) => {
    return showToast.success(message, options);
  }, []);

  // Error toast
  const error = useCallback((message: string, options?: ToastOptions) => {
    return showToast.error(message, options);
  }, []);

  // Warning toast
  const warning = useCallback((message: string, options?: ToastOptions) => {
    return showToast.warning(message, options);
  }, []);

  // Info toast
  const info = useCallback((message: string, options?: ToastOptions) => {
    return showToast.info(message, options);
  }, []);

  // Custom toast
  const custom = useCallback((message: string, options?: ToastOptions) => {
    return showToast.custom(message, options);
  }, []);

  // Dismiss all toasts
  const dismiss = useCallback(() => {
    showToast.dismiss();
  }, []);

  // Dismiss specific toast
  const dismissToast = useCallback((toastId: string | number) => {
    showToast.dismissToast(toastId);
  }, []);

  // Promise-based toast (for async operations)
  const promise = useCallback(async <T>(
    promise: Promise<T>,
    messages: {
      pending: string;
      success: string;
      error: string;
    },
    options?: ToastOptions
  ) => {
    return toast.promise(promise, messages, {
      ...options,
      style: {
        ...options?.style,
      },
    });
  }, []);

  return {
    success,
    error,
    warning,
    info,
    custom,
    dismiss,
    dismissToast,
    promise,
  };
};

export default useToast;
