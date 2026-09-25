import { Bebas_Neue, Cinzel, Oswald, Pacifico, Permanent_Marker, Playfair_Display } from "next/font/google";

const poster = Bebas_Neue({ subsets: ["latin"], weight: "400", display: "swap" });
const roman = Cinzel({ subsets: ["latin"], weight: ["700"], display: "swap" });
const condensed = Oswald({ subsets: ["latin"], weight: ["600"], display: "swap" });
const script = Pacifico({ subsets: ["latin"], weight: "400", display: "swap" });
const marker = Permanent_Marker({ subsets: ["latin"], weight: "400", display: "swap" });
const serif = Playfair_Display({ subsets: ["latin"], weight: ["700"], style: ["normal", "italic"], display: "swap" });

/** Families drawn on shop signs and billboards. */
export const SIGN_FONTS = {
  poster: poster.style.fontFamily,
  roman: roman.style.fontFamily,
  condensed: condensed.style.fontFamily,
  script: script.style.fontFamily,
  marker: marker.style.fontFamily,
  serif: serif.style.fontFamily,
};

export const signFontClass = [poster, roman, condensed, script, marker, serif].map((f) => f.className).join(" ");

export async function loadSignFonts() {
  if (typeof document === "undefined") return;
  await Promise.all(
    Object.values(SIGN_FONTS).map((family) => document.fonts.load(`700 64px ${family.split(",")[0]}`).catch(() => undefined)),
  );
  await document.fonts.ready;
}
