// useSmartRefresh.ts - Smart refresh hook for food items
import { useState, useEffect, useCallback } from 'react';

interface FoodItem {
  id: number;
  name: string;
  description: string;
  category: 'breakfast' | 'snack' | 'drink';
  carbs: number;
  protein: number;
  fiber: number;
  calories: number;
  impact: 'low' | 'medium' | 'high';
  gi: number;
  tags: string[];
  image: string;
  region: string;
  prepTime: string;
}

interface UseSmartRefreshProps {
  initialItems: FoodItem[];
  category: 'breakfast' | 'snacks' | 'all';
  count?: number;
  refreshInterval?: number; // in minutes
}

export const useSmartRefresh = ({ 
  initialItems, 
  category, 
  count = 3,
  refreshInterval = 60 
}: UseSmartRefreshProps) => {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshCount, setRefreshCount] = useState<number>(0);

  // Get different items (avoid repeats)
  const getFreshItems = useCallback((allItems: FoodItem[], itemCount: number): FoodItem[] => {
    // Filter by category if needed
    const filtered = category === 'all' 
      ? allItems 
      : allItems.filter(item => {
          if (category === 'breakfast') return item.category === 'breakfast';
          if (category === 'snacks') return item.category === 'snack' || item.category === 'drink';
          return false;
        });

    // Get items not shown recently (using localStorage)
    const recentlyShown = JSON.parse(localStorage.getItem(`recentlyShown_${category}`) || '[]');
    const available = filtered.filter(item => !recentlyShown.includes(item.id));

    // If we've shown most items, clear the history
    if (available.length < itemCount && recentlyShown.length > filtered.length * 0.7) {
      localStorage.setItem(`recentlyShown_${category}`, JSON.stringify([]));
      return getFreshItems(allItems, itemCount);
    }

    // Select random items
    const selected: FoodItem[] = [];
    const temp = [...available];
    
    while (selected.length < itemCount && temp.length > 0) {
      const randomIndex = Math.floor(Math.random() * temp.length);
      selected.push(temp[randomIndex]);
      temp.splice(randomIndex, 1);
    }

    // Update recently shown
    const newRecentlyShown = [...recentlyShown, ...selected.map(item => item.id)];
    localStorage.setItem(`recentlyShown_${category}`, JSON.stringify(newRecentlyShown.slice(-10))); // Keep last 10

    return selected;
  }, [category]);

  // Manual refresh
  const refreshItems = useCallback(() => {
    const freshItems = getFreshItems(initialItems, count);
    setItems(freshItems);
    setLastRefresh(new Date());
    setRefreshCount(prev => prev + 1);
    
    // Store last refresh time
    localStorage.setItem(`lastRefresh_${category}`, Date.now().toString());
    
    // Trigger animation feedback
    if (typeof window !== 'undefined') {
      document.dispatchEvent(new CustomEvent('refreshComplete', { detail: category }));
    }
  }, [initialItems, getFreshItems, category, count]);

  // Auto-refresh on interval
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const minutesSinceRefresh = (now.getTime() - lastRefresh.getTime()) / (1000 * 60);
      
      if (minutesSinceRefresh >= refreshInterval) {
        refreshItems();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [lastRefresh, refreshInterval, refreshItems]);

  // Auto-refresh when user returns to app (Runtime Auto-Refresh Strategy)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const lastView = localStorage.getItem(`lastView_${category}`);
        const now = Date.now();
        
        // Refresh if more than 2 hours of inactivity
        if (!lastView || (now - parseInt(lastView)) > 2 * 60 * 60 * 1000) {
          refreshItems();
        }
        
        localStorage.setItem(`lastView_${category}`, now.toString());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [category, refreshItems]);

  // Check for 24-hour refresh on mount
  useEffect(() => {
    const lastAutoRefresh = localStorage.getItem('lastAutoRefresh');
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (!lastAutoRefresh || (now - parseInt(lastAutoRefresh)) > oneDay) {
      refreshItems();
      localStorage.setItem('lastAutoRefresh', now.toString());
    } else {
      // Initial load
      const freshItems = getFreshItems(initialItems, count);
      setItems(freshItems);
    }
  }, []); // Run only on mount

  return {
    items,
    refreshItems,
    lastRefresh,
    refreshCount,
    canRefresh: refreshCount < 20 // Limit refreshes per session
  };
};
