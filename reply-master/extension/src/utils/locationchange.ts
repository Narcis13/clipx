// X is a SPA — it does not reload on navigation.
// Patch pushState/replaceState so they emit a 'locationchange' event.
export function installLocationChange() {
  const fire = () => window.dispatchEvent(new Event('locationchange'));
  for (const k of ['pushState', 'replaceState'] as const) {
    const orig = history[k];
    history[k] = function (...args: any[]) {
      const r = orig.apply(this, args as any);
      fire();
      return r;
    };
  }
  window.addEventListener('popstate', fire);
}
