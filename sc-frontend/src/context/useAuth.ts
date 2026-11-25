import { createContext, useContext } from 'react';
import type { BrotherProfile } from '../types';

export interface AuthContextType {
  user: BrotherProfile | null;
  loading: boolean;
  token: string | null;
  loginWithDiscord: () => void;
  devLogin: (roleOrHandle: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<BrotherProfile>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
