// Deterministic SVG product illustrations (no external image hosting needed).
const palettes = {
  audio: ["#E8EEFF", "#3A55D6"], mobiles: ["#E6F6F1", "#0F8B6D"], laptops: ["#EEF0F6", "#2B3A67"],
  fashion: ["#FFF0E0", "#D9731A"], home: ["#F5EAFB", "#8A3FB5"], footwear: ["#FDEBEC", "#C23B5A"], default: ["#EEF1F5", "#4B5A75"],
};
const glyphs = {
  audio: `<path d="M60 150v-26a60 60 0 0 1 120 0v26" fill="none" stroke-width="12" stroke-linecap="round"/><rect x="46" y="138" width="30" height="52" rx="12"/><rect x="164" y="138" width="30" height="52" rx="12"/>`,
  mobiles: `<rect x="82" y="56" width="76" height="136" rx="16" fill="none" stroke-width="10"/><circle cx="120" cy="174" r="6"/><rect x="108" y="68" width="24" height="6" rx="3"/>`,
  laptops: `<rect x="60" y="70" width="120" height="84" rx="8" fill="none" stroke-width="10"/><path d="M40 172h160l-12 14H52z"/>`,
  fashion: `<path d="M84 64l-40 26 16 28 16-8v80h96v-80l16 8 16-28-40-26c-6 14-18 22-36 22s-30-8-36-22z" fill="none" stroke-width="9" stroke-linejoin="round"/>`,
  home: `<path d="M70 96h100l-10 82a14 14 0 0 1-14 12h-52a14 14 0 0 1-14-12z" fill="none" stroke-width="10" stroke-linejoin="round"/><path d="M62 96h116" stroke-width="10" stroke-linecap="round"/><path d="M104 72c8-12 24-12 32 0" fill="none" stroke-width="8" stroke-linecap="round"/>`,
  footwear: `<path d="M46 150c0-24 14-30 30-30 12 0 14-24 14-24l26 30c10 12 40 10 56 28v16H46z" fill="none" stroke-width="10" stroke-linejoin="round"/><path d="M46 172h164" stroke-width="10" stroke-linecap="round"/>`,
  default: `<rect x="70" y="80" width="100" height="100" rx="14" fill="none" stroke-width="10"/><path d="M70 110h100" stroke-width="10"/>`,
};
const esc = (s = "") => s.replace(/[<>&"]/g, "");
export function productSvg(sku, category, name = "") {
  const key = palettes[category] ? category : "default";
  const [bg, fg] = palettes[key];
  let h = 0; for (const ch of sku) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const tilt = (h % 7) - 3;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img" aria-label="${esc(name)}">
<rect width="240" height="240" fill="${bg}"/><circle cx="${40 + (h % 160)}" cy="${30 + (h % 50)}" r="${70 + (h % 30)}" fill="${fg}" opacity=".07"/>
<g transform="rotate(${tilt} 120 120)" fill="${fg}" stroke="${fg}">${glyphs[key]}</g></svg>`;
}
