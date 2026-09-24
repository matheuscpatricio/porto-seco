/** Fullscreen the whole page so mission results and the next level stay on screen. */
export function requestGameFullscreen() {
  const root = document.documentElement;
  if (document.fullscreenElement === root) return Promise.resolve();
  return root.requestFullscreen?.() ?? Promise.resolve();
}
