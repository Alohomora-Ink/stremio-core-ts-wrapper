import {
  Activity,
  Beaker,
  CalendarArrowDown,
  CheckCircle,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  FileBox,
  Flame,
  History,
  Layout,
  Loader2,
  Logs,
  Play,
  PlayCircle,
  Search,
  Send,
  Server,
  Terminal,
  Trash2,
  User,
  X,
  Zap
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions
} from "@headlessui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cn } from "../../../../lib/utils";
import { CoreTransport } from "../../core/core-transport";
import { JSONTreeCustom } from "./JsonThreeCustom";
import { useAggregatedMeta } from "../../hooks/use-aggregated-meta";
import {
  StremioCoreContext,
  StremioCoreProvider,
  useStremioCore
} from "../../providers/StremioCoreProvider";
import { useAggregatedStreams } from "../../hooks/use-aggregated-streams";
import { MetaItem, MetaVideo } from "../../types/models";
import { ActionBuilder } from "../../core/action-builder";
import { useDispatch } from "../../hooks/use-dispatch";

// ============================================================================
// TYPES & CONSTANTS
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
// HOOK TESTERS (LEGACY)
// ============================================================================

function AggregatedMetaTester({ args }: { args: any }) {
  const { meta, isLoading } = useAggregatedMeta(args.type, args.id);

  const simplifyVideos = (metaItem: any) => {
    if (!metaItem?.videos) return "No Videos";
    const v = metaItem.videos;
    const sample = [...v.slice(0, 2), ...v.slice(-2)];
    return {
      count: v.length,
      sample: sample.map((vid: any) => ({
        id: vid.id,
        season: vid.season,
        episode: vid.episode,
        title: vid.name
      }))
    };
  };

  const comparison = meta
    ? Object.entries(meta).reduce(
        (acc, [name, data]) => {
          acc[name] = simplifyVideos(data);
          return acc;
        },
        {} as Record<string, any>
      )
    : {};

  const displayData = {
    STATUS: isLoading ? "LOADING..." : "READY",
    META_NAME: meta?.name,
    VIDEO_STRUCTURE_COMPARISON: comparison
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`rounded p-2 text-xs font-bold ${isLoading ? "bg-yellow-900/30 text-yellow-500" : "bg-green-900/30 text-green-500"}`}
      >
        {isLoading ? "Loading..." : "Done"}
      </div>
      <JSONTreeCustom data={displayData} />
    </div>
  );
}

function StreamAggregatorTester({
  type,
  meta,
  episode
}: {
  type: string;
  meta: MetaItem;
  episode?: MetaVideo;
}) {
  const { streams, isLoading } = useAggregatedStreams({
    type,
    meta,
    episode
  });

  const displayData = {
    STATUS: isLoading ? "LOADING..." : "READY",
    TOTAL_STREAMS: streams.length,
    STREAMS: streams
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`rounded p-2 text-xs font-bold ${isLoading ? "bg-yellow-900/30 text-yellow-500" : "bg-green-900/30 text-green-500"}`}
      >
        {isLoading
          ? "Fetching Streams..."
          : `Fetched ${streams.length} streams.`}
      </div>
      <JSONTreeCustom data={displayData} />
    </div>
  );
}

const HOOK_REGISTRY = [
  {
    id: "useAggregatedMeta",
    label: "useAggregatedMeta (Details)",
    description: "Fetches metadata.",
    defaultArgs: { type: "movie", id: "tt0133093" },
    Component: AggregatedMetaTester,
    type: "meta",
    meta: {
      type: "movie",
      id: "tt0133093",
      _id: "tt0133093",
      name: "tt0133093"
    }
  },
  {
    id: "useAggregatedStreams",
    label: "useAggregatedStreams (Streams)",
    description: "Fetches streams from all supported addons.",
    defaultArgs: { type: "movie", id: "tt0133093" },
    Component: StreamAggregatorTester,
    type: "streams",
    meta: {
      type: "movie",
      id: "tt0133093",
      _id: "tt0133093",
      name: "tt0133093"
    }
  }
];

// ============================================================================
// AGGREGATION COMPONENTS (NEW)
// ============================================================================

function MetaExplorer({
  type,
  id,
  onSelectEpisode
}: {
  type: string;
  id: string;
  onSelectEpisode: (ep: MetaVideo) => void;
}) {
  const { meta, isLoading, rawSources: raw } = useAggregatedMeta(type, id);
  const [viewMode, setViewMode] = useState<"aggregated" | "raw">("aggregated");

  // LOGGING REQUESTED BY USER
  useEffect(() => {
    if (meta) {
      console.log(`[MetaExplorer] Aggregated Meta for ${type}:${id}:`, meta);
    }
  }, [meta, type, id]);

  const stats = useMemo(() => {
    if (!meta) return null;
    const sourceList = raw
      ? Object.entries(raw).map(([id, m]) => `${id} (${m.videos?.length || 0})`)
      : [];
    return {
      name: meta.name,
      year: meta.year,
      videos: meta.videos?.length || 0,
      sources: sourceList
    };
  }, [meta, raw]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold text-zinc-200">
            <Database className="h-4 w-4 text-blue-400" />
            Aggregated Metadata
          </h3>
          {isLoading && (
            <span className="flex items-center gap-2 text-xs text-yellow-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Fetching from addons...
            </span>
          )}
        </div>

        {stats && (
          <div className="mb-4 grid grid-cols-2 gap-4 text-xs">
            <div className="rounded bg-zinc-900 p-2">
              <div className="text-zinc-500">Name</div>
              <div className="font-bold text-white">{stats.name}</div>
            </div>
            <div className="rounded bg-zinc-900 p-2">
              <div className="text-zinc-500">Total Videos</div>
              <div className="font-bold text-white">{stats.videos}</div>
            </div>
            <div className="col-span-2 rounded bg-zinc-900 p-2">
              <div className="text-zinc-500">Sources</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {stats.sources.map((s, i) => (
                  <span
                    key={i}
                    className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mb-2 flex gap-2">
          <button
            onClick={() => setViewMode("aggregated")}
            className={cn(
              "rounded px-2 py-1 text-[10px] font-bold uppercase transition-colors",
              viewMode === "aggregated"
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            )}
          >
            Aggregated
          </button>
          <button
            onClick={() => setViewMode("raw")}
            className={cn(
              "rounded px-2 py-1 text-[10px] font-bold uppercase transition-colors",
              viewMode === "raw"
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            )}
          >
            Raw Sources
          </button>
        </div>

        <div className="h-[300px] overflow-y-auto rounded border border-zinc-800 bg-zinc-950 p-2">
          <JSONTreeCustom
            data={viewMode === "aggregated" ? meta || {} : raw || {}}
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-zinc-200">
          <Layout className="h-4 w-4 text-purple-400" />
          Episode List (Click to Test Streams)
        </h3>
        <div className="h-full overflow-y-auto pr-2">
          {meta?.videos?.map((video: any) => (
            <button
              key={video.id}
              onClick={() => onSelectEpisode(video)}
              className="mb-2 flex w-full flex-col gap-1 rounded border border-zinc-800 bg-zinc-900 p-2 text-left transition-colors hover:border-purple-500/50 hover:bg-zinc-800"
            >
              <div className="flex w-full items-center justify-between">
                <span className="font-mono text-xs font-bold text-purple-300">
                  S{video.season} : E{video.episode}
                </span>
                <span className="text-[10px] text-zinc-500">{video.id}</span>
              </div>
              <div className="text-xs text-zinc-300">
                {video.title || video.name || "No Title"}
              </div>
              {video._variants && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {video._variants.map((v: any, i: number) => (
                    <span
                      key={i}
                      className="rounded border border-blue-900/50 bg-blue-900/30 px-1.5 py-0.5 text-[9px] text-blue-300"
                    >
                      {v.addonId}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StreamTester({
  type,
  meta,
  episode
}: {
  type: string;
  meta: MetaItem | null;
  episode: MetaVideo | null;
}) {
  const { streams, isLoading } = useAggregatedStreams({
    type,
    meta: meta as MetaItem,
    episode: episode as MetaVideo
  });

  // LOGGING REQUESTED BY USER
  useEffect(() => {
    if (streams && streams.length > 0) {
      console.log(`[StreamTester] Streams for ${episode?.id}:`, streams);
    }
  }, [streams, episode]);

  if (!episode || !meta) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500">
        <div className="text-center">
          <PlayCircle className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">Select an episode to test streams</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold text-zinc-200">
            <Server className="h-4 w-4 text-green-400" />
            Stream Aggregation
          </h3>
          {isLoading ? (
            <span className="flex items-center gap-2 text-xs text-yellow-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              Querying addons...
            </span>
          ) : (
            <span className="text-xs text-green-500">
              Found {streams.length} streams
            </span>
          )}
        </div>

        <div className="mb-4 rounded bg-zinc-950 p-3">
          <div className="mb-2 text-xs font-bold text-zinc-400">
            Target Episode
          </div>
          <div className="flex items-center gap-2 text-sm text-white">
            <span className="font-mono text-purple-400">
              S{episode.season}:E{episode.episode}
            </span>
            <span>{episode.name || "No Title"}</span>
          </div>
          <div className="mt-1 font-mono text-[10px] text-zinc-600">
            {episode.id}
          </div>
        </div>

        <div className="h-[400px] overflow-y-auto rounded border border-zinc-800 bg-zinc-950 p-2">
          <JSONTreeCustom data={streams} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS (OLD)
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
                    .map((m: any) => (typeof m === "string" ? m : m.model))
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
// DASHBOARD COMPONENT
// ============================================================================

function DebugDashboard() {
  const { transport } = useStremioCore();

  // --- UI State ---
  const [mode, setMode] = useState<"inspector" | "aggregation">("aggregation");
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // --- Inspector State ---
  const [selectedModel, setSelectedModel] = useState<string>("ctx");
  const [rawState, setRawState] = useState<any>(null);
  const [actionHistory, setActionHistory] = useState<ActionHistoryItem[]>([]);
  const [eventHistory, setEventHistory] = useState<EventHistoryItem[]>([]);
  const [reactiveMode, setReactiveMode] = useState(true);
  const [customActionJson, setCustomActionJson] = useState<string>(
    '{"action":"Ctx","args":{"action":"PullAddonsFromAPI"}}'
  );
  const [customTargetModel, setCustomTargetModel] = useState("ctx");
  const [inspectorMode, setInspectorMode] = useState<"state" | "hook">("state");
  const [activeTest, setActiveTest] = useState<{
    meta: MetaItem;
    type: string;
    id: string;
    args: any;
  } | null>(null);
  const [hookInputJson, setHookInputJson] = useState("");
  const [selectedHookId, setSelectedHookId] = useState<string | null>(null);

  // --- Auth State ---
  const [authEmail, setAuthEmail] = useState("alikabbadj1994@gmail.com");
  const [authPassword, setAuthPassword] = useState("=+vgOqhv<J}d3IGla1J~");

  // --- Heartbeat State ---
  const [heartbeatActive, setHeartbeatActive] = useState(false);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  // --- Aggregation State ---
  const [inputType, setInputType] = useState("anime");
  const [inputId, setInputId] = useState("");
  const [selectedEpisode, setSelectedEpisode] = useState<MetaVideo | null>(
    null
  );

  // --- Logging ---
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
      console.log(`[${level}]`, message, details || "");
    },
    []
  );

  // --- Core Listeners ---
  useEffect(() => {
    if (!transport) return;
    addLog("Core Connected via Provider", "success");

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

      // Auto-update state viewer if model changed
      let changedModels: string[] = [];
      if (Array.isArray(args)) {
        changedModels = args.map((m) => (typeof m === "string" ? m : m.model));
      } else if (args?.model) {
        changedModels = [args.model];
      }

      if (
        changedModels.includes(selectedModel) ||
        changedModels.includes("ctx")
      ) {
        // Debounce slightly to allow core to settle
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
  }, [transport, reactiveMode, selectedModel, addLog]);

  // --- Actions ---
  const getState = useCallback(
    async (model?: string) => {
      const targetModel = model || selectedModel;
      if (!transport) return;
      try {
        const state = await transport.getState(targetModel);
        setRawState(state);
        addLog(`✓ State: ${targetModel}`, "success");
      } catch (error: any) {
        addLog(`✗ Get State Failed: ${targetModel}`, "error", error.message);
      }
    },
    [transport, selectedModel, addLog]
  );

  const dispatchAction = useCallback(
    async (action: any, model: string) => {
      if (!transport) return;
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
        // Force refresh state after dispatch
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
    [transport, addLog, getState]
  );

  const handleCustomDispatch = () => {
    try {
      const action = JSON.parse(customActionJson);
      dispatchAction(action, customTargetModel);
    } catch (e) {
      addLog("Invalid JSON in custom action", "error");
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      addLog("Email and password required", "error");
      return;
    }
    const action = ActionBuilder.Auth.login(authEmail, authPassword);
    dispatchAction(JSON.parse(action), "ctx");
  };

  const toggleHeartbeat = () => {
    if (heartbeatActive) {
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
      setHeartbeatActive(false);
      addLog("Heartbeat Stopped", "warning");
    } else {
      setHeartbeatActive(true);
      addLog("Heartbeat Started", "success");
      heartbeatInterval.current = setInterval(() => {
        dispatchAction(
          {
            action: "Player",
            args: { action: "TimeChanged", args: { time: Date.now() } }
          },
          "player"
        );
      }, 1000);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-zinc-950 font-sans text-zinc-200">
      {/* HEADER */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <Activity className="h-5 w-5 text-purple-500" />
          <h1 className="font-bold tracking-tight text-white">
            Stremio Core Debugger
          </h1>
          <div className="ml-4 flex rounded bg-zinc-800 p-1">
            <button
              onClick={() => setMode("aggregation")}
              className={cn(
                "rounded px-3 py-1 text-xs font-bold transition-colors",
                mode === "aggregation"
                  ? "bg-purple-600 text-white"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              AGGREGATION LAB
            </button>
            <button
              onClick={() => setMode("inspector")}
              className={cn(
                "rounded px-3 py-1 text-xs font-bold transition-colors",
                mode === "inspector"
                  ? "bg-blue-600 text-white"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              CORE INSPECTOR
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs">
            <div
              className={`h-2 w-2 rounded-full ${transport ? "animate-pulse bg-green-500" : "bg-red-500"}`}
            />
            <span className="font-mono font-medium text-zinc-400">
              {transport ? "CORE ONLINE" : "OFFLINE"}
            </span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="grid flex-1 grid-cols-12 overflow-hidden">
        {/* LEFT: SHARED CONTROLS (3 Cols) */}
        <div className="col-span-3 flex flex-col border-r border-zinc-800 bg-zinc-900/20">
          {/* AGGREGATION INPUTS (Visible in Aggregation Mode) */}
          {mode === "aggregation" && (
            <div className="border-b border-zinc-800 p-4">
              <h2 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-zinc-400 uppercase">
                <Search className="h-3 w-3" />
                Target Resource
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-zinc-500">
                    TYPE
                  </label>
                  <select
                    title="Type of resource to query"
                    value={inputType}
                    onChange={(e) => setInputType(e.target.value)}
                    className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-white focus:border-purple-500 focus:outline-none"
                  >
                    <option value="movie">Movie</option>
                    <option value="series">Series</option>
                    <option value="anime">Anime</option>
                    <option value="channel">Channel</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-zinc-500">
                    ID (IMDB/Kitsu/etc)
                  </label>
                  <input
                    title="ID of the resource to query"
                    type="text"
                    value={inputId}
                    onChange={(e) => setInputId(e.target.value)}
                    className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 font-mono text-sm text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* INSPECTOR CONTROLS (Visible in Inspector Mode) */}
          {mode === "inspector" && (
            <>
              {/* Quick Actions */}
              <div className="border-b border-zinc-800 p-4">
                <h2 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-zinc-400 uppercase">
                  <Zap className="h-3 w-3" />
                  Quick Actions
                </h2>
                <div className="space-y-1">
                  {COMMON_ACTIONS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => dispatchAction(item.action, item.model)}
                      disabled={!transport}
                      className="flex w-full items-center rounded px-2 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800"
                    >
                      <Send className="mr-2 h-3 w-3 shrink-0 text-zinc-500" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auth Form */}
              <div className="border-b border-zinc-800 p-4">
                <h2 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-zinc-400 uppercase">
                  <User className="h-3 w-3" />
                  Authentication
                </h2>
                <form onSubmit={handleLogin} className="space-y-2">
                  <input
                    type="email"
                    placeholder="Email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full rounded border border-zinc-700 bg-black/50 px-2 py-1 text-xs"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full rounded border border-zinc-700 bg-black/50 px-2 py-1 text-xs"
                  />
                  <button
                    type="submit"
                    className="w-full rounded bg-zinc-800 py-1 text-xs font-bold hover:bg-zinc-700"
                  >
                    Login
                  </button>
                </form>
              </div>

              {/* Heartbeat */}
              <div className="border-b border-zinc-800 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-xs font-bold tracking-wider text-zinc-400 uppercase">
                    <Clock className="h-3 w-3" />
                    Heartbeat
                  </h2>
                  <button
                    onClick={toggleHeartbeat}
                    className={cn(
                      "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                      heartbeatActive
                        ? "animate-pulse bg-red-900/50 text-red-400"
                        : "bg-zinc-800 text-zinc-400"
                    )}
                  >
                    {heartbeatActive ? "ACTIVE" : "INACTIVE"}
                  </button>
                </div>
              </div>

              {/* Hooks Lab Selector */}
              <div className="border-b border-zinc-800 p-4">
                <h2 className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wider text-zinc-400 uppercase">
                  <Beaker className="h-3 w-3" />
                  Hooks Lab
                </h2>
                <div className="space-y-2">
                  {HOOK_REGISTRY.map((hook) => (
                    <div
                      key={hook.id}
                      className="rounded border border-zinc-800 bg-zinc-900/50 p-2"
                    >
                      <div className="mb-1 text-xs font-bold text-zinc-300">
                        {hook.label}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedHookId(hook.id);
                          setHookInputJson(
                            JSON.stringify(hook.defaultArgs, null, 2)
                          );
                          setInspectorMode("hook");
                        }}
                        className="w-full rounded bg-purple-900/30 py-1 text-[10px] text-purple-300 hover:bg-purple-900/50"
                      >
                        Select
                      </button>
                      {selectedHookId === hook.id && (
                        <div className="mt-2 space-y-2">
                          <textarea
                            title="JSON arguments for the hook"
                            value={hookInputJson}
                            onChange={(e) => setHookInputJson(e.target.value)}
                            className="h-20 w-full resize-none rounded border border-zinc-700 bg-black/50 p-1 font-mono text-[10px]"
                          />
                          <button
                            onClick={() => {
                              try {
                                const args = JSON.parse(hookInputJson);
                                setActiveTest({
                                  id: hook.id,
                                  args,
                                  type: hook.type,
                                  meta: hook.meta
                                });
                                setInspectorMode("hook");
                              } catch (e) {
                                addLog("Invalid JSON args", "error");
                              }
                            }}
                            className="w-full rounded bg-green-900/30 py-1 text-[10px] text-green-300 hover:bg-green-900/50"
                          >
                            Run Test
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* LOGS (Shared) */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-4 py-2">
              <h2 className="flex items-center gap-2 text-xs font-bold tracking-wider text-zinc-400 uppercase">
                <Terminal className="h-3 w-3" />
                Logs
              </h2>
              <button
                onClick={() => setLogs([])}
                className="text-[10px] text-zinc-500 hover:text-white"
              >
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 font-mono text-[10px]">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="mb-1 flex gap-2 border-b border-zinc-800/50 pb-1 last:border-0"
                >
                  <span className="shrink-0 text-zinc-600">
                    {log.timestamp}
                  </span>
                  <span
                    className={cn(
                      "break-all",
                      log.level === "error"
                        ? "text-red-400"
                        : log.level === "success"
                          ? "text-green-400"
                          : log.level === "warning"
                            ? "text-yellow-400"
                            : "text-zinc-300"
                    )}
                  >
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* MANUAL DISPATCH (Shared) */}
          <div className="border-t border-zinc-800 p-4">
            <h2 className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-zinc-400 uppercase">
              <Terminal className="h-3 w-3" />
              Manual Dispatch
            </h2>
            <div className="flex flex-col gap-2">
              <select
                title="Target model for the action"
                value={customTargetModel}
                onChange={(e) => setCustomTargetModel(e.target.value)}
                className="w-full rounded border border-zinc-700 bg-black/50 px-2 py-1 text-[10px]"
              >
                {VALID_MODELS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <textarea
                title="JSON arguments for the action"
                value={customActionJson}
                onChange={(e) => setCustomActionJson(e.target.value)}
                className="h-16 w-full resize-none rounded border border-zinc-700 bg-black/50 p-2 font-mono text-[10px] outline-none"
              />
              <button
                onClick={handleCustomDispatch}
                className="w-full rounded bg-purple-700 py-1 text-xs font-bold text-white hover:bg-purple-600"
              >
                DISPATCH
              </button>
            </div>
          </div>
        </div>

        {/* CENTER/RIGHT: CONTENT AREA */}
        {mode === "aggregation" ? (
          <>
            {/* META EXPLORER (5 Cols) */}
            <div className="col-span-5 flex flex-col border-r border-zinc-800 bg-zinc-950 p-6">
              <MetaExplorer
                type={inputType}
                id={inputId}
                onSelectEpisode={setSelectedEpisode}
              />
            </div>

            {/* STREAM TESTER (4 Cols) */}
            <div className="col-span-4 flex flex-col bg-zinc-900/10 p-6">
              <CombinedTester
                type={inputType}
                id={inputId}
                selectedEpisode={selectedEpisode}
                onSelectEpisode={setSelectedEpisode}
              />
            </div>
          </>
        ) : (
          <>
            {/* STATE INSPECTOR / HOOK VIEWER (5 Cols) */}
            <div className="col-span-5 flex flex-col border-r border-zinc-800 bg-zinc-950 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setInspectorMode("state")}
                    className={cn(
                      "text-xs font-bold uppercase",
                      inspectorMode === "state" ? "text-white" : "text-zinc-500"
                    )}
                  >
                    Core State
                  </button>
                  <span className="text-zinc-700">|</span>
                  <button
                    onClick={() => setInspectorMode("hook")}
                    className={cn(
                      "text-xs font-bold uppercase",
                      inspectorMode === "hook" ? "text-white" : "text-zinc-500"
                    )}
                  >
                    Hook Results
                  </button>
                </div>

                {inspectorMode === "state" && (
                  <div className="flex gap-2">
                    <select
                      title="Model to inspect"
                      value={selectedModel}
                      onChange={(e) => {
                        setSelectedModel(e.target.value);
                        getState(e.target.value);
                      }}
                      className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs"
                    >
                      {VALID_MODELS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => getState()}
                      className="rounded bg-blue-600 p-1 text-white"
                    >
                      <Activity className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-auto rounded border border-zinc-800 bg-[#0D0D0D] p-2">
                {inspectorMode === "state" ? (
                  rawState ? (
                    <JSONTreeCustom data={rawState} />
                  ) : (
                    <div className="text-center text-xs text-zinc-600">
                      No State Loaded
                    </div>
                  )
                ) : activeTest ? (
                  <div>
                    <div className="mb-2 text-xs font-bold text-purple-400">
                      Running: {activeTest.id}
                    </div>
                    {HOOK_REGISTRY.map((h) => {
                      if (h.id === activeTest.id) {
                        const Component = h.Component;
                        return (
                          <Component
                            key={JSON.stringify(activeTest.args)}
                            args={activeTest.args}
                            type={activeTest.type}
                            meta={activeTest.meta}
                          />
                        );
                      }
                      return null;
                    })}
                  </div>
                ) : (
                  <div className="text-center text-xs text-zinc-600">
                    Select a hook from the left sidebar
                  </div>
                )}
              </div>
            </div>

            {/* EVENTS & HISTORY (4 Cols) */}
            <div className="col-span-4 flex flex-col bg-zinc-900/10 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xs font-bold text-zinc-400 uppercase">
                  Event History
                </h2>
                <button onClick={() => setEventHistory([])}>
                  <Trash2 className="h-3 w-3 text-zinc-500" />
                </button>
              </div>
              <div className="flex-1 overflow-auto rounded border border-zinc-800 bg-[#0a0a0a]">
                {eventHistory.map((item) => (
                  <EventRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT (ROOT)
// ============================================================================

export default function StremioCoreWebDebugCenter() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <StremioCoreProvider>
        <DebugDashboard />
      </StremioCoreProvider>
    </QueryClientProvider>
  );
}

// Helper to manage the shared state between Explorer and Tester
function CombinedTester({
  type,
  id,
  selectedEpisode,
  onSelectEpisode
}: {
  type: string;
  id: string;
  selectedEpisode: MetaVideo | null;
  onSelectEpisode: (ep: MetaVideo) => void;
}) {
  const { meta } = useAggregatedMeta(type, id);

  return (
    <>
      <StreamTester type={type} meta={meta} episode={selectedEpisode} />
    </>
  );
}
