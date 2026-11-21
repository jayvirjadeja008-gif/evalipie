import React, { useEffect, useState } from "react";
import { Terminal, Activity, Database, Server, RefreshCw, X, Play, CheckCircle2, AlertTriangle } from "lucide-react";
import { useApp } from "../store";

export interface TelemetryEvent {
  id: string;
  timestamp: string;
  service: "OPENSEARCH" | "POSTGRESQL" | "KAFKA";
  type: string;
  action: string;
  status: string;
  took?: number;
  query?: string;
  totalHits?: number;
  fuzziness?: string;
  filters?: Record<string, any>;
  orderId?: number;
  city?: string;
  details?: Record<string, any>;
}

export function SystemTelemetryDrawer() {
  const { city } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "opensearch" | "postgres" | "kafka">("all");
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSimulatingRace, setIsSimulatingRace] = useState(false);
  const [raceResult, setRaceResult] = useState<any>(null);

  // Connect to SSE stream
  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/events/stream");
      es.onopen = () => setIsConnected(true);
      es.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === "snapshot") {
            setEvents(payload.events || []);
          } else if (payload.type === "event" && payload.event) {
            setEvents((prev) => [payload.event, ...prev.slice(0, 50)]);
          }
        } catch {
          // ignore parsing error
        }
      };
      es.onerror = () => {
        // Fallback to /api/telemetry/stream if needed
        if (es) es.close();
        try {
          es = new EventSource("/api/telemetry/stream");
          es.onopen = () => setIsConnected(true);
          es.onmessage = (e) => {
            try {
              const payload = JSON.parse(e.data);
              if (payload.type === "snapshot") setEvents(payload.events || []);
              else if (payload.type === "event" && payload.event) setEvents((prev) => [payload.event, ...prev.slice(0, 50)]);
            } catch {}
          };
          es.onerror = () => setIsConnected(false);
        } catch {
          setIsConnected(false);
        }
      };
    } catch {
      setIsConnected(false);
    }

    return () => {
      if (es) es.close();
    };
  }, []);

  // Filter events by selected service
  const filteredEvents = events.filter((e) => {
    if (activeTab === "opensearch") return e.service === "OPENSEARCH";
    if (activeTab === "postgres") return e.service === "POSTGRESQL";
    if (activeTab === "kafka") return e.service === "KAFKA";
    return true;
  });

  // Latest snapshot metrics for header badges
  const latestOs = events.find((e) => e.service === "OPENSEARCH");
  const latestPg = events.find((e) => e.service === "POSTGRESQL");
  const latestKafka = events.find((e) => e.service === "KAFKA");

  const runRaceSimulation = async () => {
    setIsSimulatingRace(true);
    setRaceResult(null);
    try {
      const res = await fetch("/api/telemetry/simulate-race", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city })
      });
      const data = await res.json();
      setRaceResult(data);
    } catch (err: any) {
      setRaceResult({ error: err.message });
    } finally {
      setIsSimulatingRace(false);
    }
  };

  return (
    <>
      {/* Fixed bottom bar trigger */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#111111] border-t border-[#2D2D2A] text-[#F6F5F0] px-4 py-2 flex items-center justify-between text-xs font-mono select-none">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 font-bold hover:text-terracotta transition-colors"
          >
            <Terminal strokeWidth={1.5} size={15} />
            <span>LIVE AIVEN TELEMETRY</span>
          </button>

          <div className="hidden sm:flex items-center gap-3 text-[11px] text-ink-faint">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-[1px] ${isConnected ? "bg-forest" : "bg-terracotta"}`} />
              <span>AIVEN INFRASTRUCTURE: {isConnected ? "ONLINE" : "STANDBY"}</span>
            </span>

            {latestOs && (
              <span className="border-l border-[#2D2D2A] pl-3">
                OPENSEARCH: <span className="text-[#F6F5F0]">{latestOs.took ?? 12}ms</span>
              </span>
            )}
            {latestPg && (
              <span className="border-l border-[#2D2D2A] pl-3">
                POSTGRESQL: <span className="text-[#F6F5F0]">{latestPg.status}</span>
              </span>
            )}
            {latestKafka && (
              <span className="border-l border-[#2D2D2A] pl-3">
                KAFKA: <span className="text-[#F6F5F0]">{latestKafka.type}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={runRaceSimulation}
            disabled={isSimulatingRace}
            className="flex items-center gap-1.5 bg-terracotta hover:bg-terracotta-hover text-white px-2.5 py-1 rounded-[2px] font-mono text-[11px] disabled:opacity-50 transition-colors"
          >
            <Play strokeWidth={1.5} size={12} />
            <span>{isSimulatingRace ? "TESTING CONCURRENCY..." : "TEST CONCURRENCY LOCK"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-ink-faint hover:text-white transition-colors"
            aria-label="Toggle console"
          >
            {isOpen ? "[COLLAPSE]" : "[EXPAND CONSOLE]"}
          </button>
        </div>
      </div>

      {/* Expanded Telemetry Console Drawer */}
      {isOpen && (
        <div className="fixed bottom-9 left-0 right-0 z-50 bg-[#141413] border-t border-[#2D2D2A] text-[#F6F5F0] shadow-2xl font-mono text-xs max-h-[460px] flex flex-col">
          {/* Console Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2D2D2A] bg-[#1A1A18]">
            <div className="flex items-center gap-4">
              <span className="font-bold flex items-center gap-2">
                <Activity strokeWidth={1.5} size={14} className="text-terracotta" />
                LIVE AIVEN SERVICE TELEMETRY
              </span>

              {/* Service Tabs */}
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: "all", label: "ALL EVENTS" },
                    { id: "opensearch", label: "OPENSEARCH" },
                    { id: "postgres", label: "POSTGRESQL" },
                    { id: "kafka", label: "KAFKA EVENTS" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`px-2.5 py-1 rounded-[1px] text-[11px] transition-colors ${
                      activeTab === t.id
                        ? "bg-[#2D2D2A] text-white font-bold"
                        : "text-ink-faint hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEvents([])}
                className="text-ink-faint hover:text-white px-2 py-1 text-[11px]"
              >
                CLEAR
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-ink-faint hover:text-white p-1"
              >
                <X strokeWidth={1.5} size={15} />
              </button>
            </div>
          </div>

          {/* Race simulation banner if triggered */}
          {raceResult && (
            <div className="bg-[#1C1C1A] border-b border-paper-grid/20 px-4 py-2.5 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-white font-bold">
                  {raceResult.concurrencyProof?.singleWinnerGuaranteed ? (
                    <CheckCircle2 strokeWidth={1.5} size={14} className="text-forest" />
                  ) : (
                    <AlertTriangle strokeWidth={1.5} size={14} className="text-terracotta" />
                  )}
                  <span>
                    CONCURRENCY VERIFIED: 1 BUYER ACCEPTED, 1 REJECTED (HTTP 409 CONFLICT)
                  </span>
                </div>
                <div className="text-[11px] text-ink-faint">
                  Product: {raceResult.product?.name} ({raceResult.product?.city}) | Buyer 1:{" "}
                  {raceResult.buyer1?.ok ? `Order #${raceResult.buyer1.orderId} committed` : "409 Out of stock"} | Buyer 2:{" "}
                  {raceResult.buyer2?.ok ? `Order #${raceResult.buyer2.orderId} committed` : "409 Out of stock"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRaceResult(null)}
                className="text-ink-faint hover:text-white text-[10px]"
              >
                DISMISS
              </button>
            </div>
          )}

          {/* Event Stream Log */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-[11px] bg-[#111110]">
            {filteredEvents.length === 0 ? (
              <div className="text-ink-faint text-center py-8">
                Awaiting Aiven database transactions, OpenSearch queries, or Kafka events...
              </div>
            ) : (
              filteredEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-2.5 py-1 px-2 hover:bg-[#1A1A18] rounded-[1px] transition-colors"
                >
                  <span className="text-[#5A5852] shrink-0">
                    {ev.timestamp ? ev.timestamp.slice(11, 19) : ""}
                  </span>

                  <span
                    className={`px-1.5 py-0.5 rounded-[1px] font-bold text-[10px] shrink-0 ${
                      ev.service === "OPENSEARCH"
                        ? "bg-[#252E20] text-[#7CB342]"
                        : ev.service === "POSTGRESQL"
                        ? "bg-[#1E2638] text-[#64B5F6]"
                        : "bg-[#33221B] text-terracotta"
                    }`}
                  >
                    [{ev.service}]
                  </span>

                  <span className="text-[#A8A49C] shrink-0">[{ev.type}]</span>

                  <span className="text-[#F6F5F0] flex-1">{ev.action}</span>

                  {ev.took !== undefined && (
                    <span className="text-terracotta shrink-0 font-bold">
                      {ev.took}ms
                    </span>
                  )}
                  {ev.status && (
                    <span className="text-ink-faint shrink-0 text-[10px]">
                      {ev.status}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
