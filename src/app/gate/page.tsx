"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function GateForm() {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const params = useSearchParams();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/gate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: pw, from: params.get("from") ?? "/" }),
    });
    if (res.ok) {
      const { to } = await res.json();
      window.location.href = to;
    } else {
      setErr(true);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] bg-violet-400 font-mono font-bold text-white">
          C
        </span>
        <span className="text-lg font-semibold text-ink">Coverage Index</span>
      </div>
      <p className="text-sm text-subtle">access code is in the memo</p>
      <input
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        autoFocus
        className="metric w-56 rounded-md border border-line-strong px-3 py-2 text-center text-ink outline-none focus:border-ink"
      />
      {err && <p className="text-xs text-error">not it — check the memo</p>}
      <button
        type="submit"
        className="rounded-md bg-ink px-6 py-2 text-sm font-medium text-white hover:bg-ink-hover"
      >
        enter
      </button>
    </form>
  );
}

export default function GatePage() {
  return (
    <div className="page-grain flex min-h-screen items-center justify-center">
      <Suspense>
        <GateForm />
      </Suspense>
    </div>
  );
}
