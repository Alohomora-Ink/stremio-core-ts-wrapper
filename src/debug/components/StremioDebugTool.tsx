import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  CheckCircle,
  Zap,
  Loader2,
  Play,
  Send,
  Activity,
  Database,
  User,
  Trash2,
  Clock,
  Terminal,
  History,
  X,
  Flame,
  FileBox,
  CalendarArrowDown,
  Logs,
} from "lucide-react";
import { CoreTransport } from "../../core/core-transport";

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
  "player",
] as const;

const COMMON_ACTIONS = [
  {
    label: "Sync Addons & User",
    action: { action: "Ctx", args: { action: "PullAddonsFromAPI" } },
    model: "ctx",
    description: "Fetch available addons and user data",
  },
  {
    label: "Load Board",
    action: {
      action: "Load",
      args: {
        model: "CatalogsWithExtra",
        args: { extra: [] },
      },
    },
    model: "board",
    description: "Load the main catalog board",
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
            page: 1,
          },
        },
      },
    },
    model: "library",
    description: "Load user's library",
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
          filters: [],
        },
      },
    },
    model: "calendar",
    description: "Load calendar for current month",
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
              extra: [],
            },
          },
        },
      },
    },
    model: "discover",
    description: "Load popular movies from Cinemeta",
  },
  {
    label: "Load Installed Addons",
    action: {
      action: "Load",
      args: {
        model: "InstalledAddonsWithFilters",
        args: {
          request: { type: null },
        },
      },
    },
    model: "installed_addons",
    description: "Get list of installed addons",
  },
  {
    label: "Logout",
    action: { action: "Ctx", args: { action: "Logout" } },
    model: "ctx",
    description: "Clear user session",
  },
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
        className={`w-full flex items-center justify-between p-2 text-left hover:bg-zinc-800/50 transition-colors select-none group`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div
            className={`text-zinc-500 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
          >
            <Play className="w-2 h-2 fill-current" />
          </div>

          <div className="flex flex-col min-w-0">
            <div
              className={`text-[11px] font-bold ${textColor}  font-mono flex items-center gap-2`}
            >
              {item.type}
              <span className="text-[9px] text-zinc-500 font-normal truncate">
                {!isNewState && !isOpen && [item.payload.event]}
              </span>
              {!isOpen && isNewState && Array.isArray(item.payload) && (
                <span className="text-[9px] text-zinc-500 font-normal truncate">
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

        <span className="text-[9px] text-zinc-600 font-mono shrink-0 group-hover:text-zinc-500">
          {item.timestamp}
        </span>
      </button>

      {isOpen && (
        <div className="p-2 pl-6 bg-[#050505] border-t border-zinc-800/50 shadow-inner">
          <pre
            className={`text-[10px] font-mono overflow-x-auto ${isNewState ? "text-blue-300/80" : "text-purple-300/80"}`}
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

export default function StremioDebugTool() {
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
      2,
    ),
  );
  const [customTargetModel, setCustomTargetModel] = useState("ctx");

  // Refs
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // LOGGING UTILITIES
  // ============================================================================

  const addLog = useCallback(
    (message: string, level: LogLevel = "info", details?: any) => {
      const timestamp = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      setLogs((prev) => [
        { id: crypto.randomUUID(), timestamp, message, level, details },
        ...prev.slice(0, 99),
      ]);

      if (level === "error") console.error(`[${level}]`, message, details);
      else console.log(`[${level}]`, message);
    },
    [],
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
        shellVersion: "5.0.20",
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
          payload: args,
        },
        ...prev.slice(0, 99),
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
          payload: args,
        },
        ...prev.slice(0, 49),
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
    [transport, selectedModel, addLog],
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
            status: "success",
          },
          ...prev.slice(0, 49),
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
            error: error.message,
          },
          ...prev.slice(0, 49),
        ]);
      }
    },
    [transport, getState, addLog],
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
          password: authPassword,
        },
      },
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
            args: { time, duration, device: "web" },
          },
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
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-purple-500/30">
      {/* TOP BAR */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur sticky top-0 z-10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-purple-400" />
          <h1 className="text-lg font-bold tracking-tight text-white">
            Stremio Core Debugger
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1 text-xs">
            <div
              className={`w-2 h-2 rounded-full ${transport ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
            />
            <span className="font-mono font-medium text-zinc-400">
              {transport ? "WORKER ACTIVE" : "OFFLINE"}
            </span>
          </div>

          <button
            onClick={initializeStremioCore}
            disabled={isInitializing || !!transport}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all
                 ${
                   transport
                     ? "bg-green-900/20 text-green-400 border border-green-900 cursor-default"
                     : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20"
                 }
              `}
          >
            {isInitializing ? (
              <Loader2 className="animate-spin w-4 h-4" />
            ) : transport ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {transport ? "Initialized" : "Start Core"}
          </button>
        </div>
      </div>

      <div className="p-6 max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-80px)]">
        {/* LEFT: CONTROLS (3 Cols) */}
        <div className="col-span-3 flex flex-col gap-4 h-full overflow-y-auto pr-2 custom-scrollbar">
          {/* Quick Actions */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex flex-col shrink-0">
            <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-800/30 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Quick Actions
              </h2>
            </div>

            <div className="p-2 space-y-1">
              {COMMON_ACTIONS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => dispatchAction(item.action, item.model)}
                  disabled={!transport}
                  className="flex items-center w-full text-left px-3 py-2 rounded hover:bg-zinc-800 disabled:opacity-50 transition-colors group"
                >
                  <Send className="w-4 h-4 shrink-0 text-zinc-400 group-hover:text-white mr-3" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-300 group-hover:text-white">
                      {item.label}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono truncate">
                      {item.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Controls */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex flex-col gap-4 p-4">
            {/* Auth */}
            <form onSubmit={handleLogin} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase mb-1">
                <User className="w-3 h-3" /> Auth Simulator
              </div>
              <input
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-black/50 border border-zinc-700 rounded px-2 py-1.5 text-xs"
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-black/50 border border-zinc-700 rounded px-2 py-1.5 text-xs"
              />
              <button
                type="submit"
                disabled={!transport}
                className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium rounded"
              >
                Login
              </button>
            </form>

            <div className="h-px bg-zinc-800" />

            {/* Decoder */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase mb-1">
                <Database className="w-3 h-3" /> Stream Decoder
              </div>
              <div className="flex gap-2">
                <input
                  placeholder="magnet:?..."
                  value={magnetLink}
                  onChange={(e) => setMagnetLink(e.target.value)}
                  className="flex-1 bg-black/50 border border-zinc-700 rounded px-2 py-1.5 text-xs font-mono"
                />
                <button
                  onClick={handleDecode}
                  disabled={!transport}
                  className="px-3 bg-zinc-800 hover:bg-zinc-700 rounded text-xs"
                >
                  <Send className="w-4 h-6 shrink-0 text-zinc-400 mr-0.5 mt-0.5" />
                </button>
              </div>
              {decodedStream && (
                <pre className="text-[9px] bg-black/50 p-2 rounded text-zinc-400 overflow-x-auto">
                  {JSON.stringify(decodedStream, null, 2)}
                </pre>
              )}
            </div>

            <div className="h-px bg-zinc-800" />

            {/* Heartbeat */}
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2">
                <Clock className="w-3 h-3" /> Player Heartbeat
              </div>
              <button
                onClick={toggleHeartbeat}
                disabled={!transport}
                className={`text-[10px] px-2 py-1 rounded uppercase font-bold ${heartbeatActive ? "bg-red-900/50 text-red-400 animate-pulse" : "bg-zinc-800 text-zinc-400"}`}
              >
                <div className="flex items-center gap-2">
                  {heartbeatActive ? (
                    <>
                      <Flame className="w-3 h-3 shrink-0 text-red-400" />
                      <span>Active</span>
                    </>
                  ) : (
                    <>
                      <X className="w-3 h-3 shrink-0 text-zinc-400" />
                      <span>Inactive</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* Custom Dispatch */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3 text-zinc-400" />
                <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Custom Dispatch Command
                </h2>
              </div>
            </div>
            <div className="p-3 flex flex-col gap-2 flex-1">
              <select
                title="Target Model"
                value={customTargetModel}
                onChange={(e) => setCustomTargetModel(e.target.value)}
                className="w-full bg-black/50 border border-zinc-700 rounded px-2 py-1 text-xs"
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
                className="w-full flex-1 bg-black/50 border border-zinc-700 rounded p-2 text-[10px] font-mono resize-none focus:ring-1 focus:ring-purple-500 outline-none"
              />
              <button
                onClick={handleCustomDispatch}
                disabled={!transport}
                className="w-full py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold rounded"
              >
                <div className="flex items-center justify-center gap-2">
                  <Send className="w-4 h-4 shrink-0 text-zinc-400 mr-2" />
                  <span className="uppercase tracking-wide">DISPATCH</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* MIDDLE: STATE INSPECTOR (5 Cols) */}
        <div className="col-span-5 flex flex-col gap-4 h-full min-h-0">
          {/* State Viewer  */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex-1 flex flex-col min-h-0 overflow-hidden shadow-2xl">
            <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileBox className="w-4 h-4 text-yellow-500" />
                <select
                  title="Select Target Model"
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    getState(e.target.value);
                  }}
                  className="bg-transparent border-none text-sm font-bold text-white focus:ring-0 cursor-pointer hover:text-blue-400 transition-colors"
                >
                  {VALID_MODELS.map((m) => (
                    <option key={m} value={m}>
                      {m.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer hover:text-white">
                  <div
                    className={`w-2 h-2 rounded-full transition-colors ${reactiveMode ? "bg-blue-500" : "bg-zinc-700"}`}
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
                  className={`p-1 rounded transition-colors flex items-center justify-center
                    ${
                      reactiveMode
                        ? "bg-zinc-800 text-zinc-500 opacity-70 cursor-not-allowed disabled:opacity-70 disabled:cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    }
                  `}
                >
                  <Activity
                    className={`w-4 h-4 ${reactiveMode ? "text-zinc-500" : "text-white"}`}
                  />
                </button>
              </div>
            </div>

            <div className="flex-1 relative bg-[#0D0D0D] min-h-0">
              {rawState ? (
                <textarea
                  title="load states view"
                  readOnly
                  value={JSON.stringify(rawState, null, 2)}
                  className="w-full h-full absolute inset-0 bg-transparent text-green-400 font-mono text-xs p-4 resize-none focus:outline-none"
                  spellCheck={false}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
                  <Database className="w-8 h-8 opacity-20" />
                  <span className="text-xs">No state loaded</span>
                </div>
              )}
            </div>
          </div>

          {/* Events History (Bottom Half - 50%) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between shrink-0">
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase">
                <div className="flex items-center gap-2">
                  <CalendarArrowDown
                    className="w-4 h-4 shrink-0 text-zinc-400"
                    aria-hidden
                  />
                  <span>Events</span>
                </div>
              </h3>
              <div className="flex gap-2">
                <span className="text-[9px] text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                  {eventHistory.length}
                </span>
                <button
                  onClick={() => setEventHistory([])}
                  className="text-zinc-500 hover:text-white"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-[#0a0a0a] min-h-0 overflow-y-auto custom-scrollbar">
              {eventHistory.length === 0 ? (
                <div className="flex items-center justify-center h-full text-zinc-700 text-xs italic">
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
        <div className="col-span-4 flex flex-col gap-4 h-full min-h-0">
          {/* Logs (Top Half - 50%) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold text-zinc-400 uppercase">
                <div className="flex items-center gap-2">
                  <Logs
                    className="w-4 h-4 shrink-0 text-zinc-400"
                    aria-hidden
                  />
                  <span>System Logs</span>
                </div>
              </h3>
              <button
                onClick={() => setLogs([])}
                className="text-zinc-500 hover:text-white"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#0a0a0a] font-mono text-[10px] min-h-0">
              {logs.length === 0 && (
                <div className="text-zinc-700 text-center mt-20">
                  No logs recorded
                </div>
              )}
              {logs.map((l) => (
                <div key={l.id} className="flex gap-2 break-all">
                  <span className="text-zinc-600 shrink-0">
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
                      <span className="text-zinc-600 block ml-2 border-l border-zinc-800 pl-2 mt-1">
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-800/30 flex items-center justify-between shrink-0">
              <h3 className="text-xs font-bold text-zinc-400 uppercase">
                <div className="flex items-center gap-2">
                  <History
                    className="w-4 h-4 shrink-0 text-zinc-400"
                    aria-hidden
                  />
                  <span>Dispatcher History</span>
                </div>
              </h3>
              <button
                onClick={() => setActionHistory([])}
                className="text-zinc-500 hover:text-white"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-[#0a0a0a] min-h-0">
              {actionHistory.map((h) => (
                <div
                  key={h.id}
                  className="border border-zinc-800/50 rounded p-2 bg-zinc-900/50"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-zinc-500">
                      {h.timestamp}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 rounded uppercase font-bold ${h.status === "success" ? "bg-green-900/30 text-green-500" : "bg-red-900/30 text-red-500"}`}
                    >
                      {h.status}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-purple-300">
                    {h.action}
                  </div>
                  <div className="text-[9px] text-zinc-500 text-right mt-1">
                    {h.model}
                  </div>
                  {h.error && (
                    <div className="text-[9px] text-red-400 mt-1 border-t border-red-900/30 pt-1">
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
