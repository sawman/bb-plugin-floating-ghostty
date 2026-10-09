// Node 26 exposes Web Storage globals even without a storage file. Vitest's
// jsdom environment leaves those globals in place; browser tests need jsdom's
// origin-scoped storage instead of the Node process-global implementation.
declare const jsdom: { window: Window } | undefined;
if (typeof jsdom !== "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: jsdom.window.localStorage,
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: jsdom.window.sessionStorage,
  });
}
