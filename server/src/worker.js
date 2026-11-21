import { ensureTopics } from "./kafka.js";
import { startRelay } from "./relay.js";
import { startAllConsumers } from "./consumers/index.js";

async function withRetry(label, fn, tries = 20) {
  for (let i = 1; ; i++) {
    try { return await fn(); }
    catch (e) {
      if (i >= tries) throw e;
      console.error(`[worker] ${label} failed (${e.message}); retry ${i}/${tries} in 3s`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

await withRetry("create topics", ensureTopics);
await withRetry("start consumers", startAllConsumers);
await withRetry("start relay", startRelay);
console.log("[worker] relay + 4 consumers running");
