"use client";

import NumberFlow from "@number-flow/react";

// Animated numerals for costs / counts / elapsed — Fragment Mono,
// tabular-nums, number-flow count-ups.

export function MoneyTicker({ value, className }: { value: number; className?: string }) {
  return (
    <NumberFlow
      value={value}
      format={{ style: "currency", currency: "USD", minimumFractionDigits: 4 }}
      className={`metric ${className ?? ""}`}
    />
  );
}

export function CountTicker({ value, className }: { value: number; className?: string }) {
  return <NumberFlow value={value} className={`metric ${className ?? ""}`} />;
}

export function SecondsTicker({ ms, className }: { ms: number; className?: string }) {
  return (
    <span className={`metric ${className ?? ""}`}>
      <NumberFlow value={Math.round(ms / 100) / 10} format={{ minimumFractionDigits: 1 }} />
      s
    </span>
  );
}
