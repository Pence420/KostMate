import { createContext, useContext } from "react";
import type { User } from "./types";
export interface AppContextValue {
  user: User | null;
  favorites: number[];
  setUser: (u: User | null) => void;
  openAuth: () => void;
  toggleFavorite: (id: number) => Promise<void>;
  notify: (message: string) => void;
  requireAuth: () => boolean;
}
export const AppContext = createContext<AppContextValue>(null!);
export const useApp = () => useContext(AppContext);
