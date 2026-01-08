// Test setup file for vitest
import { beforeAll, afterAll } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
};

// Mock matchMedia for responsive hooks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => { }, // deprecated
    removeListener: () => { }, // deprecated
    addEventListener: () => { },
    removeEventListener: () => { },
    dispatchEvent: () => true,
  }),
});

// Mock localStorage for Supabase auth
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock Pointer events for Radix UI
if (typeof window !== 'undefined') {
  window.HTMLElement.prototype.hasPointerCapture = () => false;
  window.HTMLElement.prototype.setPointerCapture = () => { };
  window.HTMLElement.prototype.releasePointerCapture = () => { };
  window.HTMLElement.prototype.scrollIntoView = () => { };
}

// Load environment variables for testing
beforeAll(() => {
  // Setup code if needed
});

afterAll(() => {
  // Cleanup code if needed
});
