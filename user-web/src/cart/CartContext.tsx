import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const CART_KEY = "ticketx_cart";

export type CartItem = {
  eventId: number;
  eventTitle: string;
  eventDate: string;
  ticketCategoryId: number;
  ticketCategoryName: string;
  price: number;
  quantity: number;
  maxPerBooking: number;
};

type CartState = {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  addItems: (items: CartItem[]) => void;
  replaceItems: (items: CartItem[]) => void;
  updateQuantity: (ticketCategoryId: number, quantity: number) => void;
  removeItem: (ticketCategoryId: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartState | undefined>(undefined);

const readCart = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const mergeItems = (current: CartItem[], incoming: CartItem[]) => {
  const map = new Map<number, CartItem>();
  for (const item of current) {
    map.set(item.ticketCategoryId, item);
  }
  for (const item of incoming) {
    const existing = map.get(item.ticketCategoryId);
    const quantity = existing ? existing.quantity + item.quantity : item.quantity;
    map.set(item.ticketCategoryId, {
      ...item,
      quantity: Math.min(item.maxPerBooking, quantity),
    });
  }
  return Array.from(map.values()).filter((item) => item.quantity > 0);
};

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>(() => readCart());

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItems = useCallback((nextItems: CartItem[]) => {
    setItems((current) => mergeItems(current, nextItems));
  }, []);

  const replaceItems = useCallback((nextItems: CartItem[]) => {
    setItems(nextItems.filter((item) => item.quantity > 0));
  }, []);

  const updateQuantity = useCallback((ticketCategoryId: number, quantity: number) => {
    setItems((current) =>
      current
        .map((item) =>
          item.ticketCategoryId === ticketCategoryId
            ? { ...item, quantity: Math.max(1, Math.min(item.maxPerBooking, quantity)) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((ticketCategoryId: number) => {
    setItems((current) => current.filter((item) => item.ticketCategoryId !== ticketCategoryId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      totalAmount: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      addItems,
      replaceItems,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [addItems, clearCart, items, removeItem, replaceItems, updateQuantity]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
