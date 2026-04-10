import React, { createContext, useContext, useState, useEffect } from 'react';

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
    getConsolidatedMaterials: () => Record<string, { label: string, amount: number, resourceId?: string }>;
}

const AltarContext = createContext<AltarContextType | undefined>(undefined);

export const useAltar = () => {
    const context = useContext(AltarContext);
    if (!context) throw new Error("useAltar must be used within AltarProvider");
    return context;
};

export const AltarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cart, setCart] = useState<CartItem[]>(() => {
        const saved = localStorage.getItem('ancalagon_altar');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('ancalagon_altar', JSON.stringify(cart));
    }, [cart]);

    const addToAltar = (recipe: any) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === recipe.id);
            if (existing) {
                return prev.map(item => 
                    item.id === recipe.id 
                    ? { ...item, quantity: item.quantity + 1 } 
                    : item
                );
            }
            return [...prev, {
                id: recipe.id,
                name: recipe.name || recipe.label || 'Tomo Desconocido',
                parts: recipe.parts || [],
                quantity: 1
            }];
        });
    };

    const removeFromAltar = (id: string) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === id);
            if (existing && existing.quantity > 1) {
                return prev.map(item => 
                    item.id === id 
                    ? { ...item, quantity: item.quantity - 1 } 
                    : item
                );
            }
            return prev.filter(item => item.id !== id);
        });
    };

    const clearAltar = () => {
        setCart([]);
    };

    const getConsolidatedMaterials = () => {
        const consolidated: Record<string, { label: string, amount: number, resourceId?: string }> = {};
        cart.forEach(item => {
            item.parts.forEach(part => {
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
        <AltarContext.Provider value={{ cart, addToAltar, removeFromAltar, clearAltar, getConsolidatedMaterials }}>
            {children}
        </AltarContext.Provider>
    );
};
