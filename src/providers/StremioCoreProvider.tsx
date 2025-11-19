"use client";

import React, { createContext, useEffect, useState } from "react";
import { CoreTransport } from "../core/core-transport";
import { ActionBuilder } from "../core/action-builder";

interface StremioCoreContextType {
  transport: CoreTransport | null;
  isLoading: boolean;
  error: Error | null;
}

export const StremioCoreContext = createContext<StremioCoreContextType>({
  transport: null,
  isLoading: true,
  error: null,
});

export function StremioCoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [transport, setTransport] = useState<CoreTransport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const initCore = async () => {
      try {
        const transportInstance = new CoreTransport({
          appVersion: "5.0.0-beta.26.40",
          shellVersion: "5.0.20",
        });

        await transportInstance.init();

        if (mounted) {
          console.log("✅ Stremio Core Worker initialized");
          await transportInstance.dispatch(
            JSON.parse(ActionBuilder.User.pullAddons()),
            "ctx",
          );
          setTransport(transportInstance);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("❌ Failed to initialize Stremio Core:", err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    };

    initCore();

    return () => {
      mounted = false;
      if (transport) transport.destroy();
    };
  }, []);

  return (
    <StremioCoreContext.Provider value={{ transport, isLoading, error }}>
      {children}
    </StremioCoreContext.Provider>
  );
}
