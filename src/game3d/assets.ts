import { preloadCast } from "@/game3d/cast";
import { preloadCar } from "@/game3d/vehicles";

/** Photos and meshes have to be ready before the city is built. */
export async function preloadScene(onStatus?: (label: string, pct: number) => void) {
  onStatus?.("A maré encosta no cais", 0.08);
  await preloadCast((label, pct) => onStatus?.(label, 0.12 + pct * 0.62));
  onStatus?.("Os carros entram na avenida", 0.82);
  await preloadCar();
  onStatus?.("As luzes do porto acendem", 0.94);
}
