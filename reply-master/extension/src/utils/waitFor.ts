export function waitFor<T extends Element>(
  selector: string,
  timeout = 5000,
  root: ParentNode = document
): Promise<T> {
  return new Promise((resolve, reject) => {
    const found = root.querySelector<T>(selector);
    if (found) return resolve(found);

    const obs = new MutationObserver(() => {
      const el = root.querySelector<T>(selector);
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });

    obs.observe(root instanceof Document ? document.body : (root as Node), {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      obs.disconnect();
      reject(new Error(`waitFor timeout: ${selector}`));
    }, timeout);
  });
}
