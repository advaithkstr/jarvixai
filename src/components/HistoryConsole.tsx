import { Interaction } from "../types";
import { Brain, Terminal, Cpu, Database, RefreshCw, Layers } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

interface HistoryConsoleProps {
  interactions: Interaction[];
  aiSummary: string;
  preferredName: string;
  onSyncMemory: () => void;
  syncing: boolean;
}

export default function HistoryConsole({
  interactions,
  aiSummary,
  preferredName,
  onSyncMemory,
  syncing,
}: HistoryConsoleProps) {
  const [activeTab, setActiveTab] = useState<"memory" | "logs">("memory");

  return (
    <div className="scifi-glass border border-sky-500/20 rounded-2xl p-6 h-full relative flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-sky-500/10 pb-4 mb-4">
          <div>
            <h2 className="font-hud text-base font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-300">
              JARVIX Neural Core
            </h2>
            <span className="text-[9px] font-mono text-gray-500 uppercase">Preference Memory & Interaction Indices</span>
          </div>

          <div className="flex bg-[#030a13] border border-sky-450/20 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab("memory")}
              className={`px-3 py-1 text-[9px] font-hud tracking-widest uppercase rounded-md transition-all cursor-pointer ${
                activeTab === "memory" ? "bg-cyan-600 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              MEMORIES
            </button>
            <button
              onClick={() => setActiveTab("logs")}
              className={`px-3 py-1 text-[9px] font-hud tracking-widest uppercase rounded-md transition-all cursor-pointer ${
                activeTab === "logs" ? "bg-cyan-600 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              DIRECTIVES
            </button>
          </div>
        </div>

        {activeTab === "memory" ? (
          <div>
            {/* Core Memory Visual Plate */}
            <div className="p-4 bg-gradient-to-br from-cyan-950/20 to-[#030a13] border border-sky-400/25 rounded-xl shadow-[inset_0_0_15px_rgba(0,240,255,0.05)] relative mb-4">
              <div className="absolute top-3 right-3 flex items-center gap-1 text-[8px] font-mono text-emerald-400 bg-emerald-950/30 px-2 py-0.5 border border-emerald-500/10 rounded-full">
                <Database className="w-2.5 h-2.5 animate-pulse" />
                ACTIVE BUFFER
              </div>

              <div className="flex items-start gap-3 mt-1">
                <div className="p-2.5 bg-cyan-950/40 rounded-xl border border-sky-400/20 shrink-0">
                  <Brain className="w-5 h-5 text-[#00f0ff] drop-shadow-[0_0_8px_rgba(0,240,255,0.4)] animate-pulse" />
                </div>
                <div>
                  <h3 className="font-hud text-xs font-semibold uppercase text-sky-400 tracking-wider">
                    Cumulative Preferences Log
                  </h3>
                  <span className="text-[9px] font-mono text-gray-400">Synthesized habit profiles for {preferredName || "Sir"}</span>
                </div>
              </div>

              <p className="text-xs text-sky-100/90 font-sans italic mt-3 leading-relaxed border-t border-sky-450/10 pt-3">
                "{aiSummary || "Sensors clear. JARVIX is compiling habit analysis based on direct spoken instructions. State a few directives to feed deep memory caches!"}"
              </p>
            </div>

            {/* Explanatory telemetry readout */}
            <div className="text-[10px] text-gray-500 font-mono leading-relaxed space-y-1 bg-[#030a13] p-3 rounded-lg border border-sky-500/5">
              <div className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
                <span>Core Analytics: Adaptive Feedforwards Engine v3.55</span>
              </div>
              <p>JARVIX continuously gathers and summarizes spoken intent indexes, enabling contextual priority predictions. Feed verbal metrics to crystallize Stark profiles.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {interactions.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-sky-500/10 rounded-xl">
                <Terminal className="w-8 h-8 text-sky-500/20 mx-auto mb-2" />
                <p className="text-xs text-gray-500 font-mono">Telemetry database empty. Dispatch standard commands.</p>
              </div>
            ) : (
              interactions.map((log) => (
                <div
                  key={log.interactionId}
                  className="p-3 bg-slate-950/45 border border-sky-500/10 rounded-xl space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-hud bg-sky-950/40 text-sky-300 border border-sky-400/20 px-2 py-0.5 rounded-full uppercase">
                      {log.intent}
                    </span>
                    <span className="text-[8px] font-mono text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-gray-200">
                    <span className="text-[10px] uppercase font-hud text-gray-500 mr-1.5">User:</span>
                    {log.command}
                  </p>
                  <p className="text-xs font-normal text-sky-300/85">
                    <span className="text-[10px] uppercase font-hud text-gray-500 mr-1.5">Jarvix:</span>
                    {log.response}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <button
        onClick={onSyncMemory}
        disabled={syncing || interactions.length === 0}
        className={`w-full font-hud text-[10px] font-bold tracking-widest uppercase py-2.5 rounded-xl border mt-4 flex items-center justify-center gap-2 transition-all cursor-pointer ${
          interactions.length === 0
            ? "border-sky-500/5 text-gray-600 bg-transparent cursor-not-allowed"
            : "border-[#00f0ff]/40 bg-transparent hover:bg-sky-400/10 text-white hover:shadow-[0_0_12px_rgba(0,240,255,0.2)]"
        }`}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "CRYSTALLIZING NEURAL NODES..." : "SYNCHRONIZE BRAIN MATRIX"}
      </button>
    </div>
  );
}
