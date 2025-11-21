import {
  Activity,
  CalendarArrowDown,
  CheckCircle,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  FileBox,
  Flame,
  History,
  Loader2,
  Logs,
  Play,
  Send,
  Terminal,
  Trash2,
  User,
  X,
  Zap
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions
} from "@headlessui/react";

import { cn } from "../../../../lib/utils";
import { CoreTransport } from "../../core/core-transport";
import { JSONTreeCustom } from "./JsonThreeCustom";

// ============================================================================
// TYPES
// ============================================================================

type LogLevel = "info" | "error" | "success" | "warning" | "event";

interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  level: LogLevel;
  details?: any;
}

interface ActionHistoryItem {
  id: string;
  timestamp: string;
  action: string;
  model: string;
  status: "success" | "error";
  error?: string;
}

interface EventHistoryItem {
  id: string;
  timestamp: string;
  type: "NewState" | "CoreEvent";
  payload: any | { event: string; args: any };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VALID_MODELS = [
  "ctx",
  "auth_link",
  "data_export",
  "continue_watching_preview",
  "board",
  "discover",
  "library",
  "continue_watching",
  "calendar",
  "search",
  "local_search",
  "meta_details",
  "remote_addons",
  "installed_addons",
  "addon_details",
  "streaming_server",
  "player"
] as const;

const COMMON_ACTIONS = [
  {
    label: "Sync Addons & User",
    action: { action: "Ctx", args: { action: "PullAddonsFromAPI" } },
    model: "ctx",
    description: "Fetch available addons and user data"
  },
  {
    label: "Load Board",
    action: {
      action: "Load",
      args: {
        model: "CatalogsWithExtra",
        args: { extra: [] }
      }
    },
    model: "board",
    description: "Load the main catalog board"
  },
  {
    label: "Load Library",
    action: {
      action: "Load",
      args: {
        model: "LibraryWithFilters",
        args: {
          request: {
            type: null,
            sort: "lastwatched",
            page: 1
          }
        }
      }
    },
    model: "library",
    description: "Load user's library"
  },
  {
    label: "Load Calendar",
    action: {
      action: "Load",
      args: {
        model: "Calendar",
        args: {
          year: new Date().getFullYear(),
          month: new Date().getMonth() + 1,
          filters: []
        }
      }
    },
    model: "calendar",
    description: "Load calendar for current month"
  },
  {
    label: "Load Discover (Movies)",
    action: {
      action: "Load",
      args: {
        model: "CatalogWithFilters",
        args: {
          request: {
            base: "https://v3-cinemeta.strem.io/manifest.json",
            path: {
              resource: "catalog",
              type: "movie",
              id: "top",
              extra: []
            }
          }
        }
      }
    },
    model: "discover",
    description: "Load popular movies from Cinemeta"
  },
  {
    label: "Load Installed Addons",
    action: {
      action: "Load",
      args: {
        model: "InstalledAddonsWithFilters",
        args: {
          request: { type: null }
        }
      }
    },
    model: "installed_addons",
    description: "Get list of installed addons"
  },
  {
    label: "Logout",
    action: { action: "Ctx", args: { action: "Logout" } },
    model: "ctx",
    description: "Clear user session"
  }
];

// ============================================================================
// Event Row
// ============================================================================

function EventRow({ item }: { item: EventHistoryItem }) {
  const [isOpen, setIsOpen] = useState(false);

  const isNewState = item.type === "NewState";

  const textColor = isNewState ? "text-blue-400" : "text-purple-400";
  const borderColor = isNewState
    ? "border-blue-900/30"
    : "border-purple-900/30";
  const bgColor = isNewState ? "bg-blue-900/10" : "bg-purple-900/10";

  const bgAndBorderColor = bgColor + " " + borderColor;

  return (
    <div
      className={`border-b ${bgColor} ${borderColor} ${isOpen ? bgAndBorderColor : ""}`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex w-full items-center justify-between p-2 text-left transition-colors select-none hover:bg-zinc-800/50`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div
            className={`text-zinc-500 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
          >
            <Play className="h-2 w-2 fill-current" />
          </div>

          <div className="flex min-w-0 flex-col">
            <div
              className={`text-[11px] font-bold ${textColor} flex items-center gap-2 font-mono`}
            >
              {item.type}
              <span className="truncate text-[9px] font-normal text-zinc-500">
                {!isNewState && !isOpen && [item.payload.event]}
              </span>
              {!isOpen && isNewState && Array.isArray(item.payload) && (
                <span className="truncate text-[9px] font-normal text-zinc-500">
                  [
                  {item.payload
                    .map((m) => (typeof m === "string" ? m : m.model))
                    .join(", ")}
                  ]
                </span>
              )}
            </div>
          </div>
        </div>

        <span className="shrink-0 font-mono text-[9px] text-zinc-600 group-hover:text-zinc-500">
          {item.timestamp}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-zinc-800/50 bg-[#050505] p-2 pl-6 shadow-inner">
          <pre
            className={`overflow-x-auto font-mono text-[10px] ${isNewState ? "text-blue-300/80" : "text-purple-300/80"}`}
          >
            {JSON.stringify(item.payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StremioCoreWebDebugCenter() {
  // --- Core State ---
  const [transport, setTransport] = useState<CoreTransport | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // --- UI State ---
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("ctx");
  const [rawState, setRawState] = useState<any>(null);
  const [actionHistory, setActionHistory] = useState<ActionHistoryItem[]>([]);
  const [eventHistory, setEventHistory] = useState<EventHistoryItem[]>([]);

  // --- Advanced Feature State ---
  const [reactiveMode, setReactiveMode] = useState(true);
  const [heartbeatActive, setHeartbeatActive] = useState(false);
  const [magnetLink, setMagnetLink] = useState("");
  const [decodedStream, setDecodedStream] = useState<any>(null);

  // Auth Form
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");

  // Custom Action
  const [customActionJson, setCustomActionJson] = useState<string>(
    JSON.stringify(
      { action: "Ctx", args: { action: "PullAddonsFromAPI" } },
      null,
      2
    )
  );
  const [customTargetModel, setCustomTargetModel] = useState("ctx");

  // Refs
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  // Json tree
  const [copiedFullState, setCopiedFullState] = useState(false);

  // ============================================================================
  // LOGGING UTILITIES
  // ============================================================================

  const addLog = useCallback(
    (message: string, level: LogLevel = "info", details?: any) => {
      const timestamp = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });

      setLogs((prev) => [
        { id: crypto.randomUUID(), timestamp, message, level, details },
        ...prev.slice(0, 99)
      ]);

      if (level === "error") console.error(`[${level}]`, message, details);
      else console.log(`[${level}]`, message);
    },
    []
  );

  // ============================================================================
  // CORE INITIALIZATION
  // ============================================================================

  const initializeStremioCore = async () => {
    if (isInitializing || transport) return;

    setIsInitializing(true);
    addLog("=== STARTING CORE WORKER ===", "info");

    try {
      const core = new CoreTransport({
        appVersion: "5.0.0-beta.26.40",
        shellVersion: "5.0.20"
      });
      await core.init();
      setTransport(core);
      addLog("✓ Core Worker Ready", "success");
      const ctx = await core.getState("ctx");
      setRawState(ctx);
      addLog("Fetched initial Ctx state", "success");
    } catch (error: any) {
      addLog("=== ✗ INITIALIZATION FAILED ===", "error", error?.message);
    } finally {
      setIsInitializing(false);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (transport) {
        console.log("🧹 Destroying Worker");
        transport.destroy();
      }
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
    };
  }, [transport]);

  // ============================================================================
  // REACTIVE EVENT LISTENER
  // ============================================================================

  // Moved inside useEffect to handle "stale closure" on selectedModel
  useEffect(() => {
    if (!transport) return;

    const handleNewState = (args: any) => {
      setEventHistory((prev) => [
        {
          id: crypto.randomUUID(),
          timestamp: new Date().toLocaleTimeString(),
          type: "NewState",
          payload: args
        },
        ...prev.slice(0, 99)
      ]);

      if (!reactiveMode) return;

      let changedModels: string[] = [];
      if (Array.isArray(args)) {
        changedModels = args.map((m) => (typeof m === "string" ? m : m.model));
      } else if (args?.model) {
        changedModels = [args.model];
      }

      // Auto-refresh if the current model (or global ctx) changed
      if (
        changedModels.includes(selectedModel) ||
        changedModels.includes("ctx")
      ) {
        // Small delay to ensure worker processed it
        setTimeout(() => {
          transport
            .getState(selectedModel)
            .then(setRawState)
            .catch(console.error);
        }, 50);
      }
    };

    const handleCoreEvent = (args: any) => {
      setEventHistory((prev) => [
        {
          id: crypto.randomUUID(),
          timestamp: new Date().toLocaleTimeString(),
          type: "CoreEvent",
          payload: args
        },
        ...prev.slice(0, 49)
      ]);
      // Log significant events
      if (
        args?.event === "UserAuthenticated" ||
        args?.event === "UserPulledFromAPI"
      ) {
        addLog(`Event: ${args.event}`, "success", args);
      }
    };

    transport.events.on("NewState", handleNewState);
    transport.events.on("CoreEvent", handleCoreEvent);

    return () => {
      transport.events.off("NewState", handleNewState);
      transport.events.off("CoreEvent", handleCoreEvent);
    };
  }, [transport, selectedModel, reactiveMode, addLog]);

  // ============================================================================
  // CORE OPERATIONS
  // ============================================================================

  const getState = useCallback(
    async (model?: string) => {
      const targetModel = model || selectedModel;
      if (!transport) return;

      try {
        const state = await transport.getState(targetModel);
        setRawState(state);
        if (model) addLog(`✓ State: ${targetModel}`, "success");
        return state;
      } catch (error: any) {
        addLog(`✗ Get State Failed: ${targetModel}`, "error", error.message);
      }
    },
    [transport, selectedModel, addLog]
  );

  const dispatchAction = useCallback(
    async (action: any, model: string) => {
      if (!transport) return;
      setSelectedModel(model);
      addLog(`📤 Dispatching to ${model}...`, "info", action);
      try {
        await transport.dispatch(action, model);

        setActionHistory((prev) => [
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toLocaleTimeString(),
            action: action.action,
            model,
            status: "success"
          },
          ...prev.slice(0, 49)
        ]);
        setTimeout(() => getState(model), 100);
      } catch (error: any) {
        addLog(`✗ Dispatch Failed`, "error", error.message);
        setActionHistory((prev) => [
          {
            id: crypto.randomUUID(),
            timestamp: new Date().toLocaleTimeString(),
            action: action.action,
            model,
            status: "error",
            error: error.message
          },
          ...prev.slice(0, 49)
        ]);
      }
    },
    [transport, getState, addLog]
  );

  const handleCustomDispatch = () => {
    try {
      const action = JSON.parse(customActionJson);
      dispatchAction(action, customTargetModel);
    } catch (e) {
      addLog("Invalid JSON in custom action", "error");
    }
  };

  // ============================================================================
  // ADVANCED SCENARIOS
  // ============================================================================

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      addLog("Email and Password required", "warning");
      return;
    }
    const action = {
      action: "Ctx",
      args: {
        action: "Authenticate",
        args: {
          type: "Login",
          email: authEmail,
          password: authPassword
        }
      }
    };
    await dispatchAction(action, "ctx");
  };

  const handleDecode = async () => {
    if (!transport || !magnetLink) return;
    addLog("Decoding stream...", "info");
    try {
      const result = await transport.decodeStream(magnetLink);
      setDecodedStream(result);
      addLog("✓ Stream Decoded", "success");
    } catch (e: any) {
      addLog("✗ Decode Failed", "error", e.message);
    }
  };

  const toggleHeartbeat = () => {
    if (heartbeatActive) {
      setHeartbeatActive(false);
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
      addLog("Stopped Heartbeat", "info");
    } else {
      setHeartbeatActive(true);
      let time = 0;
      const duration = 120000;

      addLog("Starting Heartbeat...", "info");

      heartbeatInterval.current = setInterval(() => {
        if (!transport) return;
        time += 1000;
        const action = {
          action: "Player",
          args: {
            action: "TimeChanged",
            args: { time, duration, device: "web" }
          }
        };
        // Dispatch quietly (fire and forget)
        transport.dispatch(action, "player").catch(console.error);
      }, 1000);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-200 selection:bg-purple-500/30">
      {/* TOP BAR */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-6 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-purple-400" />
          <h1 className="text-lg font-bold tracking-tight text-white">
            Stremio Core Debugger
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs">
            <div
              className={`h-2 w-2 rounded-full ${transport ? "animate-pulse bg-green-500" : "bg-red-500"}`}
            />
            <span className="font-mono font-medium text-zinc-400">
              {transport ? "WORKER ACTIVE" : "OFFLINE"}
            </span>
          </div>

          <button
            onClick={initializeStremioCore}
            disabled={isInitializing || !!transport}
            className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
              transport
                ? "cursor-default border border-green-900 bg-green-900/20 text-green-400"
                : "bg-purple-600 text-white shadow-lg shadow-purple-900/20 hover:bg-purple-500"
            } `}
          >
            {isInitializing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : transport ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {transport ? "Initialized" : "Start Core"}
          </button>
        </div>
      </div>

      <div className="mx-auto grid h-[calc(100vh-80px)] max-w-[1600px] grid-cols-1 gap-6 p-6 lg:grid-cols-12">
        {/* LEFT: CONTROLS (3 Cols) */}
        <div className="custom-scrollbar col-span-3 flex h-full flex-col gap-4 overflow-y-auto pr-2">
          {/* Quick Actions */}
          <div className="flex shrink-0 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
            <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-800/30 px-4 py-3">
              <Zap className="h-4 w-4 text-yellow-500" />
              <h2 className="text-xs font-bold tracking-wider text-zinc-300 uppercase">
                Quick Actions
              </h2>
            </div>

            <div className="space-y-1 p-2">
              {COMMON_ACTIONS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => dispatchAction(item.action, item.model)}
                  disabled={!transport}
                  className="group flex w-full items-center rounded px-3 py-2 text-left transition-colors hover:bg-zinc-800 disabled:opacity-50"
                >
                  <Send className="mr-3 h-4 w-4 shrink-0 text-zinc-400 group-hover:text-white" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-zinc-300 group-hover:text-white">
                      {item.label}
                    </div>
                    <div className="truncate font-mono text-[10px] text-zinc-500">
                      {item.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Controls */}
          <div className="flex flex-col gap-4 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            {/* Auth */}
            <form onSubmit={handleLogin} className="space-y-2">
              <div className="mb-1 flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase">
                <User className="h-3 w-3 text-yellow-500" /> Auth Simulator
              </div>
              <input
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full rounded border border-zinc-700 bg-black/50 px-2 py-1.5 text-xs"
                autoComplete="email"
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full rounded border border-zinc-700 bg-black/50 px-2 py-1.5 text-xs"
                autoComplete="current-password"
              />
              <button
                type="submit"
                disabled={!transport}
                className="w-full rounded bg-zinc-800 py-1.5 text-xs font-medium hover:bg-zinc-700"
              >
                Login
              </button>
            </form>

            <div className="h-px bg-zinc-800" />

            {/* Decoder */}
            <div className="space-y-2">
              <div className="mb-1 flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase">
                <Database className="h-3 w-3 text-yellow-500" /> Stream Decoder
              </div>
              <div className="flex gap-2">
                <input
                  placeholder="magnet:?..."
                  value={magnetLink}
                  onChange={(e) => setMagnetLink(e.target.value)}
                  className="flex-1 rounded border border-zinc-700 bg-black/50 px-2 py-1.5 font-mono text-xs"
                />
                <button
                  onClick={handleDecode}
                  disabled={!transport}
                  className="rounded bg-zinc-800 px-3 text-xs hover:bg-zinc-700"
                >
                  <Send className="mt-0.5 mr-0.5 h-6 w-4 shrink-0 text-zinc-400" />
                </button>
              </div>
              {decodedStream && (
                <pre className="overflow-x-auto rounded bg-black/50 p-2 text-[9px] text-zinc-400">
                  {JSON.stringify(decodedStream, null, 2)}
                </pre>
              )}
            </div>

            <div className="h-px bg-zinc-800" />

            {/* Heartbeat */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase">
                <Clock className="h-3 w-3 text-yellow-500" /> Player Heartbeat
              </div>
              <button
                onClick={toggleHeartbeat}
                disabled={!transport}
                className={`rounded px-2 py-1 text-[10px] font-bold uppercase ${heartbeatActive ? "animate-pulse bg-red-900/50 text-red-400" : "bg-zinc-800 text-zinc-400"}`}
              >
                <div className="flex items-center gap-2">
                  {heartbeatActive ? (
                    <>
                      <Flame className="h-3 w-3 shrink-0 text-red-400" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <X className="h-3 w-3 shrink-0 text-zinc-400" />
                      <span>Inactive</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Custom Dispatch */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-800/30 px-4 py-2">
              <div className="flex items-center gap-2">
                <Terminal className="h-3 w-3 text-yellow-500" />
                <h2 className="text-xs font-bold tracking-wider text-zinc-300 uppercase">
                  Custom Dispatch Command
                </h2>
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-3">
              <select
                title="Target Model"
                value={customTargetModel}
                onChange={(e) => setCustomTargetModel(e.target.value)}
                className="w-full rounded border border-zinc-700 bg-black/50 px-2 py-1 text-xs"
              >
                {VALID_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <textarea
                title="Custom Action in Json Format"
                value={customActionJson}
                onChange={(e) => setCustomActionJson(e.target.value)}
                className="w-full flex-1 resize-none rounded border border-zinc-700 bg-black/50 p-2 font-mono text-[10px] outline-none focus:ring-1 focus:ring-purple-500"
              />
              <button
                onClick={handleCustomDispatch}
                disabled={!transport}
                className="w-full rounded bg-purple-700 py-1.5 text-xs font-bold text-white hover:bg-purple-600"
              >
                <div className="flex items-center justify-center gap-2">
                  <Send className="mr-2 h-4 w-4 shrink-0 text-zinc-400" />
                  <span className="tracking-wide uppercase">DISPATCH</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* MIDDLE: STATE INSPECTOR (5 Cols) */}
        <div className="col-span-5 flex h-full min-h-0 flex-col gap-4">
          {/* State Viewer  */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-800/30 px-4 py-3">
              <div className="flex items-center gap-2">
                <FileBox className="h-4 w-4 text-yellow-500" />
                <Listbox
                  value={selectedModel}
                  onChange={(value) => {
                    setSelectedModel(value);
                    getState(value);
                  }}
                >
                  <div className="relative">
                    <ListboxButton
                      title="Select Target Model"
                      className="cursor-pointer rounded-2xl border-none bg-zinc-900 px-3 py-2 text-sm font-bold text-yellow-500 transition-colors hover:text-blue-400 focus:ring-0 focus:outline-none"
                    >
                      <span className="block truncate">
                        {selectedModel?.toUpperCase() ?? "SELECT"}
                      </span>
                    </ListboxButton>

                    <ListboxOptions className="absolute z-50 mt-2 max-h-60 overflow-auto rounded-xl bg-zinc-800 shadow-lg focus:outline-none">
                      {VALID_MODELS.map((m) => (
                        <ListboxOption
                          key={m}
                          value={m}
                          className={({ active, selected }) =>
                            cn(
                              "cursor-pointer px-3 py-2 text-sm font-bold select-none",
                              selected ? "text-yellow-500" : "text-white",
                              active && "bg-zinc-700 text-yellow-500",
                              "hover:text-yellow-300"
                            )
                          }
                        >
                          {m.toUpperCase()}
                        </ListboxOption>
                      ))}
                    </ListboxOptions>
                  </div>
                </Listbox>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-400 hover:text-white">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full transition-colors",
                      reactiveMode ? "bg-blue-500" : "bg-zinc-700"
                    )}
                  />
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={reactiveMode}
                    onChange={(e) => setReactiveMode(e.target.checked)}
                  />
                  Auto Update
                </label>

                <button
                  disabled={reactiveMode}
                  onClick={() => getState(selectedModel)}
                  className={cn(
                    "flex items-center justify-center rounded p-1 transition-colors",
                    reactiveMode
                      ? "cursor-not-allowed bg-zinc-800 text-zinc-500 opacity-70"
                      : "bg-blue-600 text-white shadow-sm hover:bg-blue-500 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  )}
                >
                  <Activity
                    className={cn(
                      "h-4 w-4",
                      reactiveMode ? "text-zinc-500" : "text-white"
                    )}
                  />
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      JSON.stringify(rawState, null, 2)
                    );
                    setCopiedFullState(true);
                    setTimeout(() => setCopiedFullState(false), 2000);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition-all",
                    copiedFullState
                      ? "bg-green-900/30 text-green-400"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                  )}
                  title="Copy entire JSON"
                >
                  {copiedFullState ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="relative min-h-0 flex-1 overflow-auto bg-[#0D0D0D]">
              {rawState ? (
                <div className="inline-block min-w-full">
                  <JSONTreeCustom data={rawState} />
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-zinc-600">
                  <Database className="h-8 w-8 opacity-20" />
                  <span className="text-xs">No state loaded</span>
                </div>
              )}
            </div>
          </div>

          {/* Events History (Bottom Half - 50%) */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-800/30 px-3 py-2">
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase">
                <div className="flex items-center gap-2">
                  <CalendarArrowDown
                    className="h-4 w-4 shrink-0 text-yellow-500"
                    aria-hidden
                  />
                  <span>Events</span>
                </div>
              </h3>
              <div className="flex gap-2">
                <span className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[9px] text-zinc-600">
                  {eventHistory.length}
                </span>
                <button
                  onClick={() => setEventHistory([])}
                  className="text-zinc-500 hover:text-white"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-[#0a0a0a]">
              {eventHistory.length === 0 ? (
                <div className="flex h-full items-center justify-center text-xs text-zinc-700 italic">
                  Waiting for events...
                </div>
              ) : (
                <div>
                  {eventHistory.map((item) => (
                    <EventRow key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: TELEMETRY (4 Cols) */}
        <div className="col-span-4 flex h-full min-h-0 flex-col gap-4">
          {/* Logs (Top Half - 50%) */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-800/30 px-3 py-2">
              <h3 className="text-xs font-bold text-zinc-400 uppercase">
                <div className="flex items-center gap-2">
                  <Logs
                    className="h-4 w-4 shrink-0 text-yellow-500"
                    aria-hidden
                  />
                  <span>System Logs</span>
                </div>
              </h3>
              <button
                onClick={() => setLogs([])}
                className="text-zinc-500 hover:text-white"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-[#0a0a0a] p-3 font-mono text-[10px]">
              {logs.length === 0 && (
                <div className="mt-20 text-center text-zinc-700">
                  No logs recorded
                </div>
              )}
              {logs.map((l) => (
                <div key={l.id} className="flex gap-2 break-all">
                  <span className="shrink-0 text-zinc-600">
                    [{l.timestamp.split(" ")[0]}]
                  </span>
                  <span
                    className={
                      l.level === "error"
                        ? "text-red-400"
                        : l.level === "success"
                          ? "text-green-400"
                          : l.level === "event"
                            ? "text-blue-400"
                            : "text-zinc-300"
                    }
                  >
                    {l.message}{" "}
                    {l.details ? (
                      <span className="mt-1 ml-2 block border-l border-zinc-800 pl-2 text-zinc-600">
                        {JSON.stringify(l.details).slice(0, 200)}
                      </span>
                    ) : (
                      ""
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Action History (Bottom Half - 50%) */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-800/30 px-3 py-2">
              <h3 className="text-xs font-bold text-zinc-400 uppercase">
                <div className="flex items-center gap-2">
                  <History
                    className="h-4 w-4 shrink-0 text-yellow-500"
                    aria-hidden
                  />
                  <span>Dispatcher History</span>
                </div>
              </h3>
              <button
                onClick={() => setActionHistory([])}
                className="text-zinc-500 hover:text-white"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto bg-[#0a0a0a] p-2">
              {actionHistory.map((h) => (
                <div
                  key={h.id}
                  className="rounded border border-zinc-800/50 bg-zinc-900/50 p-2"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">
                      {h.timestamp}
                    </span>
                    <span
                      className={`rounded px-1.5 text-[9px] font-bold uppercase ${h.status === "success" ? "bg-green-900/30 text-green-500" : "bg-red-900/30 text-red-500"}`}
                    >
                      {h.status}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-purple-300">
                    {h.action}
                  </div>
                  <div className="mt-1 text-right text-[9px] text-zinc-500">
                    {h.model}
                  </div>
                  {h.error && (
                    <div className="mt-1 border-t border-red-900/30 pt-1 text-[9px] text-red-400">
                      {h.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
