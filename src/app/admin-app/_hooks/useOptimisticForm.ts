'use client';

import { useState, useCallback, useRef } from 'react';
import { showToast } from '../../../components/ToastManager';

interface ProductItem {
  id: string;
  productCode: string;
  productName: string;
  unit: string;
  quantity: number;
  price: number;
  isOptimistic?: boolean;
}

interface OptimisticFormState<T> {
  items: T[];
  totalAmount: number;
  isLoading: boolean;
}

interface OptimisticUpdateOptions<T> {
  onAddItem?: (item: T) => Promise<any>;
  onUpdateItem?: (item: T) => Promise<any>;
  onDeleteItem?: (itemId: string) => Promise<any>;
  successMessage?: string;
  errorMessage?: string;
}

export function useOptimisticForm<T extends ProductItem>(
  options: OptimisticUpdateOptions<T> = {}
) {
  const [state, setState] = useState<OptimisticFormState<T>>({
    items: [],
    totalAmount: 0,
    isLoading: false,
  });

  const pendingOperations = useRef<Map<string, Promise<any>>>(new Map());

  const calculateTotal = useCallback((items: T[]) => {
    return items.reduce((sum, item) => {
      if (item.isOptimistic) return sum;
      return sum + (item.price * item.quantity);
    }, 0);
  }, []);

  const addItemOptimistically = useCallback((item: T) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const optimisticItem: T = {
      ...item,
      id: tempId,
      isOptimistic: true,
    };

    setState(prev => ({
      ...prev,
      items: [...prev.items, optimisticItem],
      totalAmount: prev.totalAmount + (item.price * item.quantity),
    }));

    if (options.onAddItem) {
      const operation = options.onAddItem(item);
      pendingOperations.current.set(tempId, operation);

      operation
        .then((confirmedItem) => {
          setState(prev => ({
            ...prev,
            items: prev.items.map(i =>
              i.id === tempId ? { ...confirmedItem, id: confirmedItem.id || tempId } : i
            ),
          }));
          pendingOperations.current.delete(tempId);
          showToast.success(options.successMessage || 'Đã thêm sản phẩm');
        })
        .catch((error) => {
          setState(prev => ({
            ...prev,
            items: prev.items.filter(i => i.id !== tempId),
            totalAmount: calculateTotal(prev.items.filter(i => i.id !== tempId)),
          }));
          pendingOperations.current.delete(tempId);
          showToast.error(options.errorMessage || 'Lỗi khi thêm sản phẩm');
          console.error('Add item error:', error);
        });
    }

    return tempId;
  }, [options, calculateTotal]);

  const updateItemOptimistically = useCallback((itemId: string, updates: Partial<T>) => {
    const originalItem = state.items.find(i => i.id === itemId);
    if (!originalItem) return;

    const updatedItem = { ...originalItem, ...updates };
    const priceDiff = (updatedItem.price * updatedItem.quantity) - (originalItem.price * originalItem.quantity);

    setState(prev => ({
      ...prev,
      items: prev.items.map(i => (i.id === itemId ? updatedItem : i)),
      totalAmount: prev.totalAmount + priceDiff,
    }));

    if (options.onUpdateItem && !originalItem.isOptimistic) {
      const operation = options.onUpdateItem(updatedItem);
      pendingOperations.current.set(itemId, operation);

      operation
        .then(() => {
          pendingOperations.current.delete(itemId);
        })
        .catch((error) => {
          setState(prev => ({
            ...prev,
            items: prev.items.map(i => (i.id === itemId ? originalItem : i)),
            totalAmount: prev.totalAmount - priceDiff,
          }));
          pendingOperations.current.delete(itemId);
          showToast.error('Lỗi khi cập nhật');
          console.error('Update item error:', error);
        });
    }
  }, [state.items, options, calculateTotal]);

  const deleteItemOptimistically = useCallback((itemId: string) => {
    const itemToDelete = state.items.find(i => i.id === itemId);
    if (!itemToDelete) return;

    const itemTotal = itemToDelete.price * itemToDelete.quantity;

    setState(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== itemId),
      totalAmount: prev.totalAmount - itemTotal,
    }));

    const pendingOp = pendingOperations.current.get(itemId);
    if (pendingOp) {
      pendingOperations.current.delete(itemId);
      return;
    }

    if (options.onDeleteItem && !itemToDelete.isOptimistic) {
      const operation = options.onDeleteItem(itemId);
      pendingOperations.current.set(itemId, operation);

      operation
        .then(() => {
          pendingOperations.current.delete(itemId);
          showToast.success('Đã xóa sản phẩm');
        })
        .catch((error) => {
          setState(prev => ({
            ...prev,
            items: [...prev.items, itemToDelete],
            totalAmount: prev.totalAmount + itemTotal,
          }));
          pendingOperations.current.delete(itemId);
          showToast.error('Lỗi khi xóa sản phẩm');
          console.error('Delete item error:', error);
        });
    }
  }, [state.items, options]);

  const cancelOptimisticOperation = useCallback((itemId: string) => {
    const pendingOp = pendingOperations.current.get(itemId);
    if (pendingOp) {
      pendingOperations.current.delete(itemId);
    }

    setState(prev => {
      const item = prev.items.find(i => i.id === itemId);
      if (!item) return prev;

      return {
        ...prev,
        items: prev.items.filter(i => i.id !== itemId),
        totalAmount: calculateTotal(prev.items.filter(i => i.id !== itemId)),
      };
    });
  }, [calculateTotal]);

  const optimisticItems = state.items.filter(item => item.isOptimistic);

  return {
    items: state.items,
    optimisticItems,
    totalAmount: state.totalAmount,
    isLoading: state.isLoading,
    addItemOptimistically,
    updateItemOptimistically,
    deleteItemOptimistically,
    cancelOptimisticOperation,
  };
}