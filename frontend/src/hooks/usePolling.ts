"use client";
import { useEffect, useRef } from "react";

type PollFn = (isActive: () => boolean) => Promise<void>;

interface UsePollingOptions {
  intervalMs?: number;
  enabled?: boolean;
  /** Changing this restarts polling immediately (e.g. a filter value). */
  resetKey?: unknown;
}

export function usePolling(callback: PollFn, { intervalMs = 5000, enabled = true, resetKey }: UsePollingOptions = {}) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const isActive = () => active;

    const run = async () => {
      if (document.visibilityState !== "hidden") {
        try {
          await callbackRef.current(isActive);
        } catch (err) {
          if (active) console.error("[usePolling]", err);
        }
      }
      if (active) timer = setTimeout(run, intervalMs);
    };

    run();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [intervalMs, enabled, resetKey]);
}

export function keepIfEqual<T>(prev: T, next: T): T {
  return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
}
