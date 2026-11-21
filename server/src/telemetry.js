import { EventEmitter } from "node:events";

class TelemetryBus extends EventEmitter {
  constructor() {
    super();
    this.history = [];
    this.maxHistory = 60;
  }

  record(event) {
    const entry = {
      id: `tel-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      ...event,
    };
    this.history.unshift(entry);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
    this.emit("event", entry);
    return entry;
  }

  getRecent(limit = 40) {
    return this.history.slice(0, limit);
  }
}

export const telemetry = new TelemetryBus();
