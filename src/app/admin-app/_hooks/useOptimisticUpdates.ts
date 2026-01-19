'use client';

import { useState, useCallback } from 'react';
import { showToast } from '../../../components/ToastManager';

interface OptimisticUpdateOptions<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: any) => void;
  onComplete?: () => void;
  successMessage?: string;
  errorMessage?: string;
  loadingMessage?: string;
}

interface OptimisticState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  jobId: string | null;
}

/**
 * Hook for managing optimistic UI updates with background job processing
 */
export function useOptimisticUpdates<T>() {
  const [state, setState] = useState<OptimisticState<T>>({
    data: null,
    isLoading: false,
    error: null,
    jobId: null,
  });

  const executeOptimisticUpdate = useCallback(async <P extends any[]>(
    operation: (...args: P) => Promise<{ jobId?: string; result?: T; immediate?: boolean }>,
    options: OptimisticUpdateOptions<T> = {},
    ...args: P
  ) => {
    const {
      onSuccess,
      onError,
      onComplete,
      successMessage,
      errorMessage = 'Có lỗi xảy ra',
      loadingMessage,
    } = options;

    // Set loading state
    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    // Show loading message if provided
    if (loadingMessage) {
      showToast.info(loadingMessage);
    }

    try {
      const response = await operation(...args);

      if (response.immediate) {
        // Immediate result - update state directly
        setState(prev => ({
          ...prev,
          data: response.result || null,
          isLoading: false,
          jobId: null,
        }));

        if (successMessage) {
          showToast.success(successMessage);
        }

        onSuccess?.(response.result!);
      } else if (response.jobId) {
        // Background job - set job ID for polling
        setState(prev => ({
          ...prev,
          isLoading: false,
          jobId: response.jobId!,
        }));

        // Start polling job status
        pollJobStatus<T>(response.jobId, {
          onSuccess: (result: T) => {
            setState(prev => ({
              ...prev,
              data: result,
              jobId: null,
            }));

            if (successMessage) {
              showToast.success(successMessage);
            }

            onSuccess?.(result);
          },
          onError: (error) => {
            setState(prev => ({
              ...prev,
              error: error.message || errorMessage,
              jobId: null,
            }));

            showToast.error(error.message || errorMessage);
            onError?.(error);
          },
          onComplete,
        });
      }

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || errorMessage,
        jobId: null,
      }));

      showToast.error(error.message || errorMessage);
      onError?.(error);
    } finally {
      onComplete?.();
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
      jobId: null,
    });
  }, []);

  return {
    ...state,
    executeOptimisticUpdate,
    reset,
  };
}

/**
 * Poll background job status
 */
async function pollJobStatus<T>(
  jobId: string,
  callbacks: {
    onSuccess?: (result: T) => void;
    onError?: (error: any) => void;
    onComplete?: () => void;
  }
) {
  const maxRetries = 60; // 5 minutes with 5 second intervals
  let retries = 0;

  const poll = async () => {
    try {
      const response = await fetch(`/api/admin-app/job-status/${jobId}`);

      if (!response.ok) {
        throw new Error('Failed to check job status');
      }

      const jobStatus = await response.json();

      switch (jobStatus.status) {
        case 'completed':
          callbacks.onSuccess?.(jobStatus.result);
          callbacks.onComplete?.();
          return;

        case 'failed':
          callbacks.onError?.(new Error(jobStatus.error || 'Job failed'));
          callbacks.onComplete?.();
          return;

        case 'running':
        case 'pending':
          // Continue polling
          if (retries < maxRetries) {
            retries++;
            setTimeout(poll, 5000); // Poll every 5 seconds
          } else {
            callbacks.onError?.(new Error('Job timed out'));
            callbacks.onComplete?.();
          }
          return;

        default:
          callbacks.onError?.(new Error('Unknown job status'));
          callbacks.onComplete?.();
          return;
      }
    } catch (error) {
      if (retries < maxRetries) {
        retries++;
        setTimeout(poll, 5000);
      } else {
        callbacks.onError?.(error);
        callbacks.onComplete?.();
      }
    }
  };

  // Start polling
  poll();
}

/**
 * Hook for optimistic product list updates
 */
export function useOptimisticProductList() {
  const [optimisticProducts, setOptimisticProducts] = useState<any[]>([]);
  const [isOptimisticallyUpdated, setIsOptimisticallyUpdated] = useState(false);

  const addProductOptimistically = useCallback((product: any) => {
    setOptimisticProducts(prev => [...prev, { ...product, isOptimistic: true }]);
    setIsOptimisticallyUpdated(true);

    // Auto-clear optimistic state after 30 seconds if not confirmed
    setTimeout(() => {
      setOptimisticProducts(prev =>
        prev.filter(p => p.id !== product.id || !p.isOptimistic)
      );
      setIsOptimisticallyUpdated(false);
    }, 30000);
  }, []);

  const confirmProduct = useCallback((productId: string) => {
    setOptimisticProducts(prev =>
      prev.map(p =>
        p.id === productId
          ? { ...p, isOptimistic: false, isSodCreated: true }
          : p
      )
    );
    setIsOptimisticallyUpdated(false);
  }, []);

  const revertOptimisticProduct = useCallback((productId: string) => {
    setOptimisticProducts(prev => prev.filter(p => p.id !== productId));
    setIsOptimisticallyUpdated(false);
  }, []);

  return {
    optimisticProducts,
    isOptimisticallyUpdated,
    addProductOptimistically,
    confirmProduct,
    revertOptimisticProduct,
    clearOptimisticState: () => {
      setOptimisticProducts([]);
      setIsOptimisticallyUpdated(false);
    },
  };
}
