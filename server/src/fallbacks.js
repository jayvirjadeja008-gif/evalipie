export const CATEGORY_FALLBACK_IMAGES = {
  audio: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
  mobiles: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
  laptops: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
  fashion: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
  home: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=900&q=80",
  footwear: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
};

export function getCategoryFallback(category = "", name = "", sku = "") {
  const cat = String(category).toLowerCase();
  const n = String(name).toLowerCase();
  const s = String(sku).toUpperCase();

  if (cat.includes("lap") || s.startsWith("LAP") || n.includes("laptop") || n.includes("macbook") || n.includes("notebook")) {
    return CATEGORY_FALLBACK_IMAGES.laptops;
  }
  if (cat.includes("mob") || cat.includes("phone") || s.startsWith("MOB") || n.includes("phone") || n.includes("galaxy") || n.includes("pixel") || n.includes("iphone")) {
    return CATEGORY_FALLBACK_IMAGES.mobiles;
  }
  if (cat.includes("aud") || cat.includes("sound") || cat.includes("head") || s.startsWith("AUD") || n.includes("headphone") || n.includes("earphone") || n.includes("earbud") || n.includes("speaker") || n.includes("airpod")) {
    return CATEGORY_FALLBACK_IMAGES.audio;
  }
  if (cat.includes("foot") || cat.includes("shoe") || s.startsWith("FTW") || n.includes("shoe") || n.includes("sneaker") || n.includes("slide") || n.includes("crocs")) {
    return CATEGORY_FALLBACK_IMAGES.footwear;
  }
  if (cat.includes("fash") || cat.includes("cloth") || s.startsWith("FAS") || n.includes("shirt") || n.includes("tee") || n.includes("hoodie") || n.includes("jeans") || n.includes("jacket")) {
    return CATEGORY_FALLBACK_IMAGES.fashion;
  }
  if (cat.includes("home") || cat.includes("kitch") || s.startsWith("HOM") || n.includes("cooker") || n.includes("kettle") || n.includes("blender") || n.includes("iron") || n.includes("pan")) {
    return CATEGORY_FALLBACK_IMAGES.home;
  }

  return CATEGORY_FALLBACK_IMAGES.audio;
}
