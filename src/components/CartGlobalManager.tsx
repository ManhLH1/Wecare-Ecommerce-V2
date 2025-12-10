"use client";
import React, { useState, createContext, useContext, useMemo, useCallback } from "react";
import { useCart } from "@/components/CartManager";
import Cart from "@/app/product-list/_components/cart/cart";
import type { CartItem } from "@/model/interface/ProductCartData";

export const CartContext = createContext<{ openCart: () => void }>({ openCart: () => {} });

export default function CartGlobalManager({ children }: { children: React.ReactNode }) {
  const { cartItems, updateQuantity, removeItem, clearCart } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const openCart = useCallback(() => {
    setIsCartOpen(prev => !prev);
  }, [isCartOpen]);
  
  const closeCart = useCallback(() => {
    setIsCartOpen(false);
  }, []);
  
  // Debug cartItems changes
  React.useEffect(() => {
  }, [cartItems]);
  
  // Memoize items mapping để tránh re-creation mỗi render
  const memoizedItems = useMemo(() => {
    const mapped = (cartItems as CartItem[]).map(item => ({ 
      ...item, 
      isApplyPromotion: false 
    }));
    return mapped;
  }, [cartItems]);
  
  // Memoize customerId để tránh re-calculation
  const customerId = useMemo(() => {
    return typeof window !== 'undefined' ? (localStorage.getItem('id') || "") : "";
  }, []);
  return (
    <CartContext.Provider value={{ openCart }}>
      <Cart
        isOpen={isCartOpen}
        onClose={closeCart}
        items={memoizedItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        customerId={customerId}
        onClearCart={clearCart}
      />
      {children}
    </CartContext.Provider>
  );
} 