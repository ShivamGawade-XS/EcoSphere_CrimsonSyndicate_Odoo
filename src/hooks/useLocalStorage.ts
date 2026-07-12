import { useState, useEffect, useCallback } from 'react'

/**
 * Persistent state backed by localStorage.
 * Automatically serializes/deserializes JSON.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      setStoredValue((prev) => {
        const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value
        window.localStorage.setItem(key, JSON.stringify(next))
        return next
      })
    } catch {
      // silently fail on storage quota exceeded
    }
  }, [key])

  const removeValue = useCallback(() => {
    window.localStorage.removeItem(key)
    setStoredValue(initialValue)
  }, [key, initialValue])

  return [storedValue, setValue, removeValue] as const
}

/**
 * Debounced value — delays updating until input stops changing.
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

/**
 * Track whether the component is mounted (useful for async callbacks).
 */
export function useIsMounted(): boolean {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])
  return mounted
}

/**
 * Returns a toggled boolean state with helpers.
 */
export function useToggle(initial = false) {
  const [value, setValue] = useState(initial)
  const toggle = useCallback(() => setValue((v) => !v), [])
  const on = useCallback(() => setValue(true), [])
  const off = useCallback(() => setValue(false), [])
  return { value, toggle, on, off }
}

/**
 * Tracks previous value of a prop/state between renders.
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useState<T | undefined>(undefined)
  useEffect(() => {
    ref[1](value)
  }, [value]) // eslint-disable-line
  return ref[0]
}
