"use client";

import React, {
  createContext,
  useEffect,
  useState,
  useRef,
  useCallback
} from "react";
import { CoreTransport } from "../core/core-transport";
import { ActionBuilder } from "../core/action-builder";
import {
  AuthTransition,
  AuthTransitionType
} from "../../../components/transitions/AuthTransition";

interface StremioCoreContextType {
  transport: CoreTransport | null;
  isTransportReady: boolean;
  isAppSyncing: boolean;
  error: Error | null;
  triggerAuthReload: (type: AuthTransitionType) => void;
}

interface StremioCoreContextType {
  transport: CoreTransport | null;
  isTransportReady: boolean;
  isAppSyncing: boolean;
  error: Error | null;
  triggerAuthReload: (type: AuthTransitionType) => void;
}

export const StremioCoreContext = createContext<StremioCoreContextType>({
  transport: null,
  isTransportReady: false,
  isAppSyncing: true,
  error: null,
  triggerAuthReload: () => {}
});

export function StremioCoreProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const [transport, setTransport] = useState<CoreTransport | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isAppSyncing, setIsAppSyncing] = useState(true);

  const [authTransition, setAuthTransition] =
    useState<AuthTransitionType>(null);

  const hasBootstrapped = useRef(false);
  const isEnforcing = useRef(false);

  const triggerAuthReload = useCallback((type: AuthTransitionType) => {
    if (!type) return;
    console.log(`🛑 [Provider] Triggering Auth Reload Sequence: ${type}`);
    setAuthTransition(type);
    setTimeout(() => {
      console.log("🔄 [Provider] HARD RELOAD");
      window.location.reload();
    }, 2000);
  }, []);

  useEffect(() => {
    let mounted = true;

    const initCore = async () => {
      try {
        const transportInstance = new CoreTransport({
          appVersion: "5.0.0-beta.26.40",
          shellVersion: "5.0.20"
        });

        await transportInstance.init();

        if (mounted) {
          console.log("✅ Stremio Core Worker initialized");
          setTransport(transportInstance);

          const enforceProxy = async (ctxOverride?: any) => {
            if (isEnforcing.current) return;
            isEnforcing.current = true;
            try {
              const ctx =
                ctxOverride || (await transportInstance.getState("ctx"));
              const settings = ctx?.profile?.settings;
              if (settings) {
                const currentUrl = settings.streamingServerUrl;
                const proxyUrl = `${window.location.origin}/stremio-server/`;
                const isHttps =
                  typeof window !== "undefined" &&
                  window.location.protocol.startsWith("https");

                if (isHttps && currentUrl !== proxyUrl) {
                  console.warn(`🛡️ [Provider] Enforcing Proxy: ${proxyUrl}`);
                  const newSettings = {
                    ...settings,
                    streamingServerUrl: proxyUrl
                  };
                  const action = JSON.parse(
                    ActionBuilder.User.updateSettings(newSettings)
                  );
                  await transportInstance.dispatch(action, "ctx");
                }
              }
            } catch (e) {
              console.error("Failed to enforce proxy", e);
            } finally {
              isEnforcing.current = false;
            }
          };

          if (!hasBootstrapped.current) {
            hasBootstrapped.current = true;
            console.log("🚀 [Provider] Bootstrapping...");

            const handleNewState = (args: any) => {
              const changedModels = Array.isArray(args)
                ? args.map((m) => (typeof m === "string" ? m : m.model))
                : [args?.model];

              if (changedModels.includes("ctx")) {
                enforceProxy();
                if (mounted) setIsAppSyncing(false);
              }
            };

            const handleCoreEvent = (event: any) => {
              if (event?.event === "Error") {
                if (mounted) setIsAppSyncing(false);
              }
              if (
                event?.event === "UserAuthenticated" ||
                event?.event === "UserPulledFromAPI"
              ) {
                enforceProxy();
              }
            };

            transportInstance.events.on("NewState", handleNewState);
            transportInstance.events.on("CoreEvent", handleCoreEvent);

            await enforceProxy();

            try {
              await transportInstance.dispatch(
                JSON.parse(ActionBuilder.User.pullUser()),
                "ctx"
              );

              console.log(" 📚 [Provider] Pulling User");
              await transportInstance.dispatch(
                JSON.parse(ActionBuilder.User.syncLibrary()),
                "ctx"
              );
            } catch (e) {
              console.error("❌ [Provider] Bootstrap Dispatch Failed:", e);
            } finally {
              setTimeout(() => {
                if (mounted) {
                  setIsAppSyncing(false);
                  enforceProxy();
                }
              }, 1000);
            }
          }
        }
      } catch (err) {
        console.error("❌ Failed to initialize Stremio Core:", err);
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsAppSyncing(false);
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
    <StremioCoreContext.Provider
      value={{
        transport,
        isTransportReady: !!transport,
        isAppSyncing,
        error,
        triggerAuthReload
      }}
    >
      <AuthTransition type={authTransition} />
      {children}
    </StremioCoreContext.Provider>
  );
}
