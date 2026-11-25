import { createContext, useContext } from 'react';

export interface AltarRecipePart {
  name?: string;
  label?: string;
  amount: number;
  resourceId?: string | null;
}

export interface AltarRecipeInput {
  id: string;
  name?: string;
  label?: string;
  parts?: AltarRecipePart[];
}

export interface CartItem {
  id: string;
  name: string;
  parts: { name?: string; label?: string; amount: number; resourceId?: string }[];
  quantity: number;
}

export interface AltarContextType {
  cart: CartItem[];
  addToAltar: (recipe: AltarRecipeInput) => void;
  removeFromAltar: (id: string) => void;
  clearAltar: () => void;
  getConsolidatedMaterials: () => Record<string, { label: string; amount: number; resourceId?: string }>;
  isSyncing: boolean;
}

export const AltarContext = createContext<AltarContextType | undefined>(undefined);

export const useAltar = () => {
  const context = useContext(AltarContext);
  if (!context) throw new Error('useAltar must be used within AltarProvider');
  return context;
};
