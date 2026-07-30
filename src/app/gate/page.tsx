"use client";

import Image from "next/image";
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
    <div className="pane reveal relative z-[1] w-full max-w-sm p-8">
      <div className="flex flex-col items-center gap-2.5">
        <Image
          src="/brand/Arbolus-full-logo-standard.png"
          alt="Arbolus"
          width={116}
          height={30}
          priority
          className="h-7 w-auto"
        />
        <span className="eyebrow">Coverage Index</span>
      </div>

      <form onSubmit={submit} className="mt-7 flex flex-col gap-3">
        <p className="text-center text-control text-subtle">
          Access code is in the memo.
        </p>
        <div className="well">
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
            aria-label="Access code"
            className="metric w-full bg-transparent px-3 py-2.5 text-center text-ink outline-none"
          />
        </div>
        {err && (
          <p className="text-center text-caption text-warn-text">
            Not it. Check the memo.
          </p>
        )}
        <button
          type="submit"
          className="rounded-[10px] bg-ink px-6 py-2.5 text-control font-medium text-white transition-colors duration-150 hover:bg-ink-hover active:bg-ink-active"
        >
          Enter
        </button>
      </form>
    </div>
  );
}

export default function GatePage() {
  return (
    <div className="page-grain flex min-h-screen items-center justify-center px-6">
      <Suspense>
        <GateForm />
      </Suspense>
    </div>
  );
}
