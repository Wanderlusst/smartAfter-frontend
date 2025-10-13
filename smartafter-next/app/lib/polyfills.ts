// Polyfills for server-side rendering
if (typeof window === 'undefined') {
  // Server-side polyfills
  (global as any).self = global;
  (global as any).window = global;
  (global as any).document = {
    createElement: () => ({}),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  (global as any).navigator = {
    userAgent: 'node',
  };
  (global as any).location = {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
  };
  (global as any).history = {
    pushState: () => {},
    replaceState: () => {},
  };
  (global as any).localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
  (global as any).sessionStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
} 