import { preloadCast } from "@/game3d/cast";
import { loadSignFonts } from "@/game/sign-fonts";
import { preloadBike, preloadCar } from "@/game3d/vehicles";

/** Photos and meshes have to be ready before the city is built. */
export async function preloadScene(onStatus?: (label: string, pct: number) => void) {
  onStatus?.("A maré encosta no cais", 0.08);
  await preloadCast((label, pct) => onStatus?.(label, 0.12 + pct * 0.62));
  onStatus?.("Os carros entram na avenida", 0.78);
  await preloadCar();
  onStatus?.("A moto encosta na calçada", 0.9);
  await preloadBike();
  onStatus?.("As placas da avenida acendem", 0.94);
  await loadSignFonts();
  onStatus?.("As luzes do porto acendem", 0.96);
}
