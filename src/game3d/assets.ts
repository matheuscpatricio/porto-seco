import { preloadCast } from "@/game3d/cast";
import { preloadCar } from "@/game3d/vehicles";

/** Photos and meshes have to be ready before the city is built. */
export async function preloadScene() {
  await Promise.all([preloadCast(), preloadCar()]);
}
