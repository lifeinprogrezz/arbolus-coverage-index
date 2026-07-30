"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// One click = one simulated searched-and-empty event. The queue reorders,
// the burst budget is authorised — demand-gating made clickable.
export default function RequestCoverage({ domain }: { domain: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "firing" | "fired">("idle");

  async function fire() {
    if (state !== "idle") return;
    setState("firing");
    const res = await fetch("/api/demand", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    setState(res.ok ? "fired" : "idle");
    router.refresh();
  }

  return (
    <button
      onClick={fire}
      disabled={state !== "idle"}
      title="fires a simulated searched-and-empty demand event"
      className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
        state === "fired"
          ? "border-city-london bg-city-london/40 text-ink"
          : "border-violet-200 bg-violet-50 text-violet-link hover:border-violet-400"
      }`}
    >
      {state === "fired" ? "demand fired ✓" : state === "firing" ? "…" : "request coverage"}
    </button>
  );
}
