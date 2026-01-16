// Test setup file for Vitest
// Commented out due to missing dependencies
// import '@testing-library/jest-dom/vitest';
// import { cleanup } from '@testing-library/react';
// import { afterEach } from 'vitest';

// // Clean up after each test to prevent memory leaks
// afterEach(() => {
//   cleanup();
// });

// // Mock any global objects if needed
// Object.defineProperty(window, 'matchMedia', {
//   writable: true,
//   value: vi.fn().mockImplementation((query) => ({
//     matches: false,
//     media: query,
//     onchange: null,
//     addEventListener: vi.fn(),
//     removeEventListener: vi.fn(),
//   })),
// });

// // Mock localStorage if needed
// const localStorageMock = (() => {
//   let store: Record<string, string> = {};
//   return {
//     getItem: vi.fn((key) => store[key] || null),
//     setItem: vi.fn((key, value) => {
//       store[key] = value.toString();
//     }),
//     clear: vi.fn(() => {
//       store = {};
//     }),
//     removeItem: vi.fn((key) => {
//       delete store[key];
//     }),
//   };
// })();

// Object.defineProperty(window, 'localStorage', {
//   value: localStorageMock,
// });