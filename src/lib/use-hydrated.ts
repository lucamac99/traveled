"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during SSR and before hydration. Used to keep useActionState forms from submitting
 * natively before React takes over: with Cache Components, that no-JS response renders blank.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
