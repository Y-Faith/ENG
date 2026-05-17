import { useState, useCallback } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        const parsed = JSON.parse(item)
        const merged = { ...initialValue }
        for (const key of Object.keys(parsed as object)) {
          const val = (parsed as Record<string, unknown>)[key]
          if (val !== undefined) {
            ;(merged as Record<string, unknown>)[key] = val
          }
        }
        return merged as T
      }
      return initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value
        try {
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
        } catch {
          // storage full or unavailable
        }
        return valueToStore
      })
    },
    [key]
  )

  return [storedValue, setValue]
}