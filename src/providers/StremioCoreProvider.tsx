"use client";

import React, {
  createContext,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import { useQueryClient } from "@tanstack/react-query";

import {
  AuthTransition,
  AuthTransitionType
} from "../../../components/transitions/AuthTransition";
import { ActionBuilder } from "../core/action-builder";
import { CoreTransport } from "../core/core-transport";
import { coreKeys } from "../queries/keys";

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

export function useStremioCore() {
  return React.useContext(StremioCoreContext);
}

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

  const queryClient = useQueryClient();
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
    if (!transport) return;

    const libraryEvents = [
      "LibraryItemAdded",
      "LibraryItemRemoved",
      "LibraryItemRewinded",
      "LibraryItemNotificationsToggled",
      "LibraryItemMarkedAsWatched",
      "NotificationsDismissed"
    ];

    const handleCoreEvent = (event: any) => {
      if (libraryEvents.includes(event?.event)) {
        console.log(`[Core] ♻️ Global Invalidation for: ${event.event}`);
        queryClient.invalidateQueries({ queryKey: coreKeys.ctx() });
        queryClient.invalidateQueries({ queryKey: coreKeys.library() });
        queryClient.invalidateQueries({
          queryKey: coreKeys.model("meta_details")
        });
      }
    };

    transport.events.on("CoreEvent", handleCoreEvent);
    return () => {
      transport.events.off("CoreEvent", handleCoreEvent);
    };
  }, [transport, queryClient]);

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
              }
            };

            const handleCoreEvent = (event: any) => {
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
              // 1. Pull User
              await transportInstance.dispatch(
                JSON.parse(ActionBuilder.User.pullUser()),
                "ctx"
              );
              console.log(" 📚 [User] Pulling User...");

              // 2. Syncing
              await transportInstance.dispatch(
                JSON.parse(ActionBuilder.Library.sync()),
                "ctx"
              );
              console.log(" 📚 [Provider] Syncing Library...");

              // 3. Load Library Model

              await transportInstance.dispatch(
                JSON.parse(ActionBuilder.Load.library(null, "lastwatched", 1)),
                "library"
              );
              console.log(" 📂 [Provider] Loading Library Model...");
            } catch (e) {
              console.error("❌ [Provider] Bootstrap Error:", e);
            } finally {
              setTimeout(() => {
                if (mounted) {
                  startTransition(() => {
                    setIsAppSyncing(false);
                  });
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
