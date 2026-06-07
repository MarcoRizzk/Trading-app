import { createContext, useContext } from "react";

export type AppOutletContextValue = {
  setPoliticianName: (name: string | null) => void;
};

export const AppOutletContext = createContext<AppOutletContextValue | null>(
  null,
);

export function useAppOutlet() {
  return useContext(AppOutletContext);
}
