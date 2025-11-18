"use client";

import React, { createContext, useEffect, useState } from "react";
import type { StremioCore } from "@stremio/stremio-core-web";

interface StremioCoreContextType {
  core: StremioCore | null;
  isLoading: boolean;
  error: Error | null;
}

export const StremioCoreContext = createContext<StremioCoreContextType>({
  core: null,
  isLoading: true,
  error: null,
});

export function StremioCoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [core, setCore] = useState<StremioCore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const initCore = async () => {
      try {
        console.log("Loading Stremio Core WASM...");
        const StremioCore = (await import("@stremio/stremio-core-web")).default;
        console.log("Initializing Stremio Core...");
        const coreInstance = await StremioCore();
        if (mounted) {
          console.log("Stremio Core initialized successfully!");
          setCore(coreInstance);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to initialize Stremio Core:", err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    };
    initCore();
    return () => {
      mounted = false;
    };
  }, []);
  return (
    <StremioCoreContext.Provider value={{ core, isLoading, error }}>
      {children}
    </StremioCoreContext.Provider>
  );
}
