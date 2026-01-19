/**
 * Lazy CSS Loading Utility
 * Loads component-specific CSS only when needed
 */

interface StyleModule {
  loaded: boolean;
  promise: Promise<void> | null;
}

const loadedStyles = new Map<string, StyleModule>();

/**
 * Load CSS file dynamically
 */
export function loadStyle(href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (document.querySelector(`link[href="${href}"]`)) {
      resolve();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));

    document.head.appendChild(link);
  });
}

/**
 * Lazy load component styles
 */
export function loadComponentStyles(componentName: string): Promise<void> {
  if (loadedStyles.has(componentName)) {
    const styleModule = loadedStyles.get(componentName)!;
    if (styleModule.loaded) {
      return Promise.resolve();
    }
    return styleModule.promise || Promise.resolve();
  }

  const styleModule: StyleModule = {
    loaded: false,
    promise: null,
  };

  styleModule.promise = loadStyle(`/admin-app/styles/${componentName}.css`)
    .then(() => {
      styleModule.loaded = true;
    })
    .catch((error) => {
      console.warn(`Failed to load styles for ${componentName}:`, error);
      styleModule.loaded = true; // Don't retry on failure
    });

  loadedStyles.set(componentName, styleModule);
  return styleModule.promise;
}

/**
 * Preload critical component styles
 */
export function preloadCriticalStyles(): void {
  // Load core styles immediately
  loadStyle('/admin-app/styles/core.css');

  // Preload commonly used component styles
  loadComponentStyles('ProductEntryForm');
  loadComponentStyles('ProductTable');
  loadComponentStyles('SalesOrderForm');
}

/**
 * React hook for lazy loading component styles
 */
export function useLazyStyles(componentName: string): void {
  React.useEffect(() => {
    loadComponentStyles(componentName);
  }, [componentName]);
}

// Re-export React for the hook
import React from 'react';
