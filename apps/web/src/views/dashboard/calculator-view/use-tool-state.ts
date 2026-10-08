import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const STORAGE_PREFIX = 'oa_calc_';

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(STORAGE_PREFIX + key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    if (value === '') localStorage.removeItem(STORAGE_PREFIX + key);
    else localStorage.setItem(STORAGE_PREFIX + key, value);
  } catch {
    // storage unavailable (private mode…): the calculator still works
  }
}

export function readCalcPreference(key: string, fallback: string): string {
  return readStorage(key) ?? fallback;
}

export function writeCalcPreference(key: string, value: string) {
  writeStorage(key, value);
}

/**
 * State of a calculator tool. Every value is a raw string, initialised from
 * the URL (shared links), then from localStorage (last values typed, shared
 * between tools when they use the same key), then from the defaults.
 * Changes are mirrored to both so links stay shareable and values persist.
 */
export function useToolState<T extends Record<string, string>>(
  tool: string,
  defaults: T,
): [T, (patch: Partial<T>) => void, () => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultsRef = useRef(defaults);

  const [state, setState] = useState<T>(() => {
    const initial = { ...defaults };
    const fromUrl = searchParams.get('tool') === tool;
    (Object.keys(defaults) as (keyof T & string)[]).forEach((key) => {
      const urlValue = fromUrl ? searchParams.get(key) : null;
      const value = urlValue ?? readStorage(key);
      if (value !== null) initial[key] = value as T[typeof key];
    });
    return initial;
  });

  useEffect(() => {
    const params = new URLSearchParams({ tool });
    Object.entries(state).forEach(([key, value]) => {
      if (value !== '') params.set(key, value);
      writeStorage(key, value);
    });
    setSearchParams(params, { replace: true });
    // setSearchParams identity changes with location; only state matters here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, tool]);

  const patch = useCallback(
    (values: Partial<T>) => setState((prev) => ({ ...prev, ...values })),
    [],
  );

  const reset = useCallback(() => setState({ ...defaultsRef.current }), []);

  return [state, patch, reset];
}

/** Parses a raw numeric state value, returning null when empty/invalid. */
export function num(value: string | undefined): number | null {
  if (value === undefined || value === '') return null;
  const n = Number(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Serialises a number for the tool state ('' for null). */
export function str(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '';
  }
  return String(Math.round(value * 1000) / 1000);
}
