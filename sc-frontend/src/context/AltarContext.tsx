import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

export interface CartItem {
  id: string;
  name: string;
  parts: { name?: string; label?: string; amount: number; resourceId?: string }[];
  quantity: number;
}

interface AltarContextType {
  cart: CartItem[];
  addToAltar: (recipe: any) => void;
  removeFromAltar: (id: string) => void;
  clearAltar: () => void;
  getConsolidatedMaterials: () => Record<string, { label: string; amount: number; resourceId?: string }>;
  isSyncing: boolean;
}

const AltarContext = createContext<AltarContextType | undefined>(undefined);

export const useAltar = () => {
  const context = useContext(AltarContext);
  if (!context) throw new Error('useAltar must be used within AltarProvider');
  return context;
};

export const AltarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('ancalagon_altar');
    return saved ? JSON.parse(saved) : [];
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const initialLoadDone = useRef(false);

  // Sync from server when user logs in
  useEffect(() => {
    if (!user) {
      initialLoadDone.current = false;
      return;
    }

    let isMounted = true;
    setIsSyncing(true);

    axios
      .get('/me/altar')
      .then((res) => {
        if (!isMounted) return;
        const serverItems: CartItem[] = res.data.items || [];
        const localItems: CartItem[] = JSON.parse(localStorage.getItem('ancalagon_altar') || '[]');

        // Merge local items with server items
        const mergedMap = new Map<string, CartItem>();
        serverItems.forEach((item) => mergedMap.set(item.id, { ...item }));
        localItems.forEach((item) => {
          if (mergedMap.has(item.id)) {
            const existing = mergedMap.get(item.id)!;
            existing.quantity = Math.max(existing.quantity, item.quantity);
          } else {
            mergedMap.set(item.id, item);
          }
        });

        const merged = Array.from(mergedMap.values());
        setCart(merged);
        localStorage.setItem('ancalagon_altar', JSON.stringify(merged));

        // Save merged back to server
        if (localItems.length > 0) {
          axios.put('/me/altar', { items: merged }).catch(console.error);
        }
      })
      .catch((err) => {
        console.error('Error fetching Altar from server:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsSyncing(false);
          initialLoadDone.current = true;
        }
      });

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  // Save to localStorage and server on every change
  useEffect(() => {
    localStorage.setItem('ancalagon_altar', JSON.stringify(cart));

    if (user && initialLoadDone.current) {
      const timeout = setTimeout(() => {
        axios.put('/me/altar', { items: cart }).catch((err) => {
          console.error('Error auto-syncing Altar to server:', err);
        });
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [cart, user]);

  const addToAltar = (recipe: any) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === recipe.id);
      if (existing) {
        return prev.map((item) =>
          item.id === recipe.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          id: recipe.id,
          name: recipe.name || recipe.label || 'Tomo Desconocido',
          parts: recipe.parts || [],
          quantity: 1,
        },
      ];
    });
  };

  const removeFromAltar = (id: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === id);
      if (existing && existing.quantity > 1) {
        return prev.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - 1 } : item
        );
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const clearAltar = () => {
    setCart([]);
  };

  const getConsolidatedMaterials = () => {
    const consolidated: Record<string, { label: string; amount: number; resourceId?: string }> = {};
    cart.forEach((item) => {
      item.parts.forEach((part) => {
        const title = part.label || part.name || 'Desconocido';
        if (!consolidated[title]) {
          consolidated[title] = { label: title, amount: 0, resourceId: part.resourceId };
        }
        consolidated[title].amount += part.amount * item.quantity;
      });
    });
    return consolidated;
  };

  return (
    <AltarContext.Provider
      value={{
        cart,
        addToAltar,
        removeFromAltar,
        clearAltar,
        getConsolidatedMaterials,
        isSyncing,
      }}
    >
      {children}
    </AltarContext.Provider>
  );
};
