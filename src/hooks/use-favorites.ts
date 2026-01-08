import { useState, useEffect, useCallback, useRef, useMemo } from "react";

type GameMode = "pvp" | "pve";

// Type for the debounced function with specific parameter types
type DebouncedFunction<T> = {
  (arg: T): void;
  cancel: () => void;
};

// Enhanced debounce function with cancel capability and specific parameter type
function createDebouncer<T>(
  fn: (arg: T) => void,
  delay: number
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  const debouncedFn = function(arg: T): void {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn(arg);
      timeoutId = null;
    }, delay);
  } as DebouncedFunction<T>;
  
  debouncedFn.cancel = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return debouncedFn;
}

export function useFavorites(gameMode: GameMode) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const pendingWrites = useRef<Map<string, () => void>>(new Map());
  const isMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    const currentPendingWrites = pendingWrites.current;
    return () => {
      isMounted.current = false;
      // Flush any pending writes on unmount
      currentPendingWrites.forEach((write) => write());
      currentPendingWrites.clear();
    };
  }, []);

  // Load favorites from localStorage on mount or when gameMode changes
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const savedFavorites = localStorage.getItem(`favorites_${gameMode}`);
        if (savedFavorites) {
          setFavorites(new Set(JSON.parse(savedFavorites)));
        }
      } catch (error) {
        console.error("Failed to load favorites:", error);
        localStorage.removeItem(`favorites_${gameMode}`);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [gameMode]);

  // Memoize the save function to prevent recreation on every render
  const saveFavorites = useCallback((favoritesToSave: Set<string>) => {
    try {
      if (favoritesToSave.size > 0) {
        localStorage.setItem(
          `favorites_${gameMode}`,
          JSON.stringify(Array.from(favoritesToSave))
        );
      } else {
        localStorage.removeItem(`favorites_${gameMode}`);
      }
    } catch (error) {
      console.error("Failed to save favorites:", error);
    }
  }, [gameMode]);

  // Create a debounced version of saveFavorites
  const debouncedSaveFavorites = useMemo(() => {
    return createDebouncer((favoritesToSave: Set<string>) => {
      saveFavorites(favoritesToSave);
    }, 150);
  }, [saveFavorites]);

  // Save favorites to localStorage when they change
  useEffect(() => {
    if (!isMounted.current) return;
    
    const writeKey = `favorites_${gameMode}`;
    
    // Cancel any pending write for this game mode
    const cancelPending = pendingWrites.current.get(writeKey);
    if (cancelPending) {
      cancelPending();
    }
    
    // Schedule a new write
    debouncedSaveFavorites(favorites);
    
    // Store the cancel function
    pendingWrites.current.set(writeKey, debouncedSaveFavorites.cancel);
    
    // Cleanup function
    return () => {
      debouncedSaveFavorites.cancel();
    };
  }, [favorites, gameMode, debouncedSaveFavorites]);

  const toggleFavorite = useCallback((itemId: string) => {
    setFavorites((prevFavorites) => {
      const newFavorites = new Set(prevFavorites);
      if (newFavorites.has(itemId)) {
        newFavorites.delete(itemId);
      } else {
        newFavorites.add(itemId);
      }
      return newFavorites;
    });
  }, []);

  const isFavorite = useCallback(
    (itemId: string) => {
      return favorites.has(itemId);
    },
    [favorites]
  );

  return {
    isFavorite,
    toggleFavorite,
    showOnlyFavorites,
    setShowOnlyFavorites,
    hasFavorites: favorites.size > 0,
  };
}
