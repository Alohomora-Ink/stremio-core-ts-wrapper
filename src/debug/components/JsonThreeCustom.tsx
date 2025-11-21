import { CheckCircle2, Copy } from "lucide-react";
import React, { useState } from "react";
import { JSONTree } from "react-json-tree";

import { cn } from "../../../../lib/utils";

export function JSONTreeCustom({ data }: { data: unknown }) {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const theme = {
    scheme: "stremio-dark",
    author: "custom",
    base00: "transparent",
    base01: "#18181b",
    base02: "#27272a",
    base03: "#52525b",
    base04: "#71717a",
    base05: "#e4e4e7",
    base06: "#f4f4f5",
    base07: "#fafafa",
    base08: "#ef4444",
    base09: "#f97316",
    base0A: "#eab308",
    base0B: "#22c55e",
    base0C: "#06b6d4",
    base0D: "#3b82f6",
    base0E: "#a855f7",
    base0F: "#ec4899"
  };

  return (
    <div className="relative w-full">
      <style>{`
        .json-tree-container {
          font-size: 11px !important;
        }
        .json-tree-container .object-key-val,
        .json-tree-container .object-key-val > span {
          font-size: 11px !important;
          line-height: 1.6 !important;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
          white-space: nowrap !important;
        }
        .json-tree-container .object-key-val > span:first-child {
          font-weight: 600 !important;
          color: #60a5fa !important;
        }
        .json-tree-container .object-key-val {
          position: relative !important;
          padding-right: 48px !important;
          display: flex !important;
          align-items: center !important;
          gap: 4px !important;
          height: 20px !important;
          overflow: visible !important;
          transition: background-color 0.2s ease !important;
          border-radius: 4px !important;
        }
        .json-tree-container .object-key-val:hover {
          background-color: rgba(59, 130, 246, 0.2) !important;
        }
     
    
        .json-tree-container > ul > li {
          margin-bottom: 2px !important;
        }
          

   
      `}</style>
      <div className="json-tree-container m-0 w-full p-0">
        <JSONTree
          data={data}
          theme={theme}
          invertTheme={false}
          hideRoot={false}
          shouldExpandNodeInitially={(keyPath, data, level) => level < 2}
          labelRenderer={(
            keyPath: readonly (string | number)[],
            nodeType: string,
            expanded: boolean,
            expandable: boolean
          ): React.ReactNode => {
            const displayKey = String(keyPath[0] ?? "root");
            const pathFromRoot = [...keyPath].reverse();
            const effectivePath =
              pathFromRoot.length > 0 && pathFromRoot[0] === "root"
                ? pathFromRoot.slice(1)
                : pathFromRoot;
            const pathId =
              effectivePath.length === 0 ? "root" : effectivePath.join(".");
            const currentValue =
              effectivePath.length === 0
                ? data
                : effectivePath.reduce(
                    (obj: any, k) =>
                      obj != null ? obj[k as keyof typeof obj] : undefined,
                    data as any
                  );
            const isSyntheticRoot = effectivePath.length === 0;
            const canCopy = true;
            const isCopied = copiedPath === pathId;
            const onCopyClick = async (ev: React.MouseEvent) => {
              ev.stopPropagation();
              try {
                let payload: any;
                if (effectivePath.length === 0) {
                  payload = currentValue;
                } else {
                  const lastKey = effectivePath[effectivePath.length - 1];
                  const lastKeyIsIndex = /^\d+$/.test(String(lastKey));
                  const parentValue =
                    effectivePath.length <= 1
                      ? undefined
                      : effectivePath
                          .slice(0, -1)
                          .reduce(
                            (obj: any, k) =>
                              obj != null
                                ? obj[k as keyof typeof obj]
                                : undefined,
                            data as any
                          );

                  if (
                    lastKeyIsIndex &&
                    parentValue &&
                    Array.isArray(parentValue)
                  ) {
                    const parentKey = effectivePath[effectivePath.length - 2];
                    payload = { [String(parentKey)]: [currentValue] };
                  } else {
                    payload = { [String(lastKey)]: currentValue };
                  }
                }

                const text = JSON.stringify(payload, null, 2);
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  await navigator.clipboard.writeText(text);
                } else {
                  void window.prompt("Copy JSON (fallback):", text);
                }

                setCopiedPath(pathId);
                setTimeout(
                  () => setCopiedPath((p) => (p === pathId ? null : p)),
                  1400
                );
              } catch (err) {
                setCopiedPath(pathId);
                setTimeout(
                  () => setCopiedPath((p) => (p === pathId ? null : p)),
                  1400
                );
              }
            };

            return (
              <div
                className="flex w-full items-center gap-2 rounded-lg pr-2 pl-2"
                style={{
                  backgroundColor:
                    hoveredPath === pathId ? "rgba(59, 130, 246, 0.2)" : ""
                }}
                onMouseEnter={() => setHoveredPath(pathId)}
                onMouseLeave={() =>
                  setHoveredPath((p) => (p === pathId ? null : p))
                }
                onClick={onCopyClick}
              >
                <span className="flex items-center pr-2 pl-2">
                  {displayKey}
                </span>
                {isCopied ? (
                  <CheckCircle2
                    className="transition-color w-5"
                    type="button"
                  />
                ) : (
                  <Copy
                    style={{
                      width:
                        hoveredPath === pathId
                          ? "calc(var(--spacing) * 5)"
                          : "0"
                    }}
                    onClick={onCopyClick}
                    onMouseEnter={() => setHoveredPath(pathId)}
                    onMouseLeave={() =>
                      setHoveredPath((p) => (p === pathId ? null : p))
                    }
                    className={cn(
                      "w-5 transition-colors",
                      isCopied
                        ? "text-green-400"
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                    type="button"
                  />
                )}
              </div>
            );
          }}
          valueRenderer={(raw, value) => {
            if (typeof value === "string") {
              return (
                <span className="font-mono text-xs whitespace-nowrap text-green-400">
                  "{value}"
                </span>
              );
            }
            if (typeof value === "number") {
              return (
                <span className="font-mono text-xs whitespace-nowrap text-cyan-400">
                  {value}
                </span>
              );
            }
            if (typeof value === "boolean") {
              return (
                <span className="font-mono text-xs whitespace-nowrap text-orange-400">
                  {String(value)}
                </span>
              );
            }
            if (value === null) {
              return (
                <span className="font-mono text-xs whitespace-nowrap text-red-600">
                  null
                </span>
              );
            }
            return (
              <span className="font-mono text-xs whitespace-nowrap text-zinc-400">
                {String(value)}
              </span>
            );
          }}
        />
      </div>
    </div>
  );
}
