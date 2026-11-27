// esbuild injects these module-scoped shims where the ExcelJS graph needs them.
export { Buffer } from 'buffer';
export { default as process } from 'process/browser.js';

export function setImmediate(callback, ...args) {
  return setTimeout(() => callback(...args), 0);
}

export function clearImmediate(handle) {
  clearTimeout(handle);
}
