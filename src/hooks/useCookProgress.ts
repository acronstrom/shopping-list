import { useCallback, useEffect, useMemo, useState } from 'react'

// Per-recipe cook-mode progress, kept in localStorage.
//
// Cooking is exactly when the phone locks itself, gets picked up by someone
// else, or gets reloaded by the service worker — losing which steps were done
// mid-recipe is the whole problem. Household-wide sync would be wrong here:
// two people cooking the same dish on different nights are separate sessions.

interface StoredProgress {
  ingredients: string[]
  steps: number[]
  savedAt: number
}

const KEY_PREFIX = 'shopping-list:cook:'

// A session is a single evening. Anything older is stale and reads as empty,
// so a recipe cooked last month doesn't open half-struck-through.
const MAX_AGE_MS = 24 * 60 * 60 * 1000

const EMPTY: StoredProgress = { ingredients: [], steps: [], savedAt: 0 }

function storageKey(recipeId: string) {
  return `${KEY_PREFIX}${recipeId}`
}

function read(recipeId: string): StoredProgress {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = window.localStorage.getItem(storageKey(recipeId))
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<StoredProgress>
    const savedAt = typeof parsed.savedAt === 'number' ? parsed.savedAt : 0
    if (Date.now() - savedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(storageKey(recipeId))
      return EMPTY
    }
    return {
      ingredients: Array.isArray(parsed.ingredients)
        ? parsed.ingredients.filter((v): v is string => typeof v === 'string')
        : [],
      steps: Array.isArray(parsed.steps)
        ? parsed.steps.filter((v): v is number => typeof v === 'number')
        : [],
      savedAt,
    }
  } catch {
    return EMPTY
  }
}

function write(recipeId: string, progress: StoredProgress) {
  if (typeof window === 'undefined') return
  try {
    if (progress.ingredients.length === 0 && progress.steps.length === 0) {
      window.localStorage.removeItem(storageKey(recipeId))
      return
    }
    window.localStorage.setItem(storageKey(recipeId), JSON.stringify(progress))
  } catch {
    // Private mode or a full quota — progress just stops surviving reloads.
  }
}

export function useCookProgress(recipeId: string | null, ingredientIds: string[], stepCount: number) {
  // Only recipes touched this session live in state; everything else is read
  // straight from storage. Nothing is synced in an effect, so there is no
  // window where an empty initial state could overwrite what was saved.
  const [edited, setEdited] = useState<Record<string, StoredProgress>>({})

  const stored = useMemo(() => (recipeId ? read(recipeId) : EMPTY), [recipeId])
  const current = (recipeId ? edited[recipeId] : null) ?? stored

  // Editing a recipe deletes and re-inserts its ingredient rows, so stored ids
  // can point at rows that no longer exist. Drop those, and any step index past
  // the end of a shortened instruction list. Derived, never stored: the stale
  // ids fall out of storage on the next toggle.
  const ingredientKey = ingredientIds.join(',')
  const progress = useMemo(() => {
    if (ingredientIds.length === 0 && stepCount === 0) return current
    const valid = new Set(ingredientIds)
    const ingredients = current.ingredients.filter(id => valid.has(id))
    const steps = current.steps.filter(i => i < stepCount)
    if (ingredients.length === current.ingredients.length && steps.length === current.steps.length) {
      return current
    }
    return { ...current, ingredients, steps }
    // ingredientIds is a fresh array each render; the joined key is the real dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, ingredientKey, stepCount])

  useEffect(() => {
    if (!recipeId) return
    const entry = edited[recipeId]
    // Untouched this session — nothing to write, and rewriting would only
    // refresh the timestamp on progress the user never came back to.
    if (!entry) return
    write(recipeId, entry)
  }, [recipeId, edited])

  const ingredientsDone = useMemo(() => new Set(progress.ingredients), [progress.ingredients])
  const stepsDone = useMemo(() => new Set(progress.steps), [progress.steps])

  const toggleIngredient = useCallback(
    (id: string) => {
      if (!recipeId) return
      const has = progress.ingredients.includes(id)
      const next: StoredProgress = {
        ingredients: has ? progress.ingredients.filter(v => v !== id) : [...progress.ingredients, id],
        steps: progress.steps,
        savedAt: Date.now(),
      }
      setEdited(prev => ({ ...prev, [recipeId]: next }))
    },
    [recipeId, progress],
  )

  const toggleStep = useCallback(
    (index: number) => {
      if (!recipeId) return
      const has = progress.steps.includes(index)
      const next: StoredProgress = {
        ingredients: progress.ingredients,
        steps: has ? progress.steps.filter(v => v !== index) : [...progress.steps, index],
        savedAt: Date.now(),
      }
      setEdited(prev => ({ ...prev, [recipeId]: next }))
    },
    [recipeId, progress],
  )

  const clear = useCallback(() => {
    if (!recipeId) return
    setEdited(prev => ({ ...prev, [recipeId]: { ingredients: [], steps: [], savedAt: Date.now() } }))
  }, [recipeId])

  return { ingredientsDone, stepsDone, toggleIngredient, toggleStep, clear }
}
