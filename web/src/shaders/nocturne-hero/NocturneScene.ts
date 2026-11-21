export const NOCTURNE_VARIANTS = ["midnight", "moon", "mars", "earth"] as const;
export type NocturneVariant = (typeof NOCTURNE_VARIANTS)[number];
export const NOCTURNE_TITLES: Record<NocturneVariant, string> = {
  midnight: "Nocturne — midnight card background",
  moon: "Nocturne — moon and upright card background",
  mars: "Nocturne — Mars and upright card background",
  earth: "Nocturne — Earth and phone background",
};
export function buildNocturneDocument(_variant?: string): string {
  return "";
}
