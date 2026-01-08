"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Generic hook for localStorage-backed state with SSR safety.
 * Replaces repetitive useState + useEffect patterns throughout the app.
 *
 * @param key - localStorage key
 * @param defaultValue - default value if nothing saved
 * @param options - optional serialization/validation options
 */
export function useLocalStorageState<T>(
    key: string,
    defaultValue: T,
    options?: {
        serialize?: (value: T) => string;
        deserialize?: (stored: string) => T;
        validate?: (value: unknown) => value is T;
    }
): [T, (value: T | ((prev: T) => T)) => void] {
    const serialize = options?.serialize ?? JSON.stringify;
    const deserialize = options?.deserialize ?? JSON.parse;
    const validate = options?.validate;

    // Initialize from localStorage (SSR-safe)
    const [value, setValue] = useState<T>(() => {
        if (typeof window === "undefined") return defaultValue;
        try {
            const stored = localStorage.getItem(key);
            if (stored === null) return defaultValue;
            const parsed = deserialize(stored);
            if (validate && !validate(parsed)) return defaultValue;
            return parsed as T;
        } catch (e) {
            console.error(`Error reading localStorage key "${key}":`, e);
            return defaultValue;
        }
    });

    // Sync to localStorage when value changes
    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            localStorage.setItem(key, serialize(value));
        } catch (e) {
            console.error(`Error saving to localStorage key "${key}":`, e);
        }
    }, [key, value, serialize]);

    // Wrapped setter that handles function updates
    const setStoredValue = useCallback(
        (newValue: T | ((prev: T) => T)) => {
            setValue((prev) => {
                const resolved =
                    typeof newValue === "function"
                        ? (newValue as (prev: T) => T)(prev)
                        : newValue;
                return resolved;
            });
        },
        []
    );

    return [value, setStoredValue];
}

/**
 * Simplified version for boolean values
 */
export function useLocalStorageBool(
    key: string,
    defaultValue: boolean
): [boolean, (value: boolean) => void] {
    return useLocalStorageState(key, defaultValue, {
        serialize: (v) => String(v),
        deserialize: (s) => s === "true",
    });
}

/**
 * Simplified version for number values
 */
export function useLocalStorageNumber(
    key: string,
    defaultValue: number,
    options?: { min?: number; max?: number }
): [number, (value: number) => void] {
    return useLocalStorageState(key, defaultValue, {
        serialize: (v) => String(v),
        deserialize: (s) => {
            const parsed = Number(s);
            if (!Number.isFinite(parsed)) return defaultValue;
            if (options?.min !== undefined && parsed < options.min) return defaultValue;
            if (options?.max !== undefined && parsed > options.max) return defaultValue;
            return parsed;
        },
    });
}

/**
 * Simplified version for string values with validation
 */
export function useLocalStorageString<T extends string>(
    key: string,
    defaultValue: T,
    allowedValues?: readonly T[]
): [T, (value: T) => void] {
    return useLocalStorageState(key, defaultValue, {
        serialize: (v) => v,
        deserialize: (s) => {
            if (allowedValues && !allowedValues.includes(s as T)) {
                return defaultValue;
            }
            return s as T;
        },
    });
}
