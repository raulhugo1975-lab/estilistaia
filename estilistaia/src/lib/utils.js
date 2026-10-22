/**
 * EstilistaIA · Utilidades puras (color, imagen, fechas, compras).
 * Sin dependencias: todo corre en el navegador.
 */

/* ─────────────── Color ─────────────── */

export function hexToRgb(hex) {
  let h = String(hex || '#000').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16) || 0;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function hexToHsl(hex) {
  let { r, g, b } = hexToRgb(hex);
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

/** Oscurece (amt < 0) o aclara (amt > 0) un color. amt en [-1, 1]. */
export function shade(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  return rgbToHex({ r: r + (t - r) * p, g: g + (t - g) * p, b: b + (t - b) * p });
}

export function colorDistance(a, b) {
  const x = hexToRgb(a), y = hexToRgb(b);
  return Math.hypot(x.r - y.r, x.g - y.g, x.b - y.b);
}

/**
 * ¿Funciona como neutro en moda? Incluye blanco, negro, grises,
 * beige/arena y el azul índigo del denim.
 */
export function isNeutral(hex) {
  const { h, s, l } = hexToHsl(hex);
  if (s < 0.2 || l < 0.15 || l > 0.9) return true;
  if (s < 0.5 && l > 0.65 && h >= 20 && h <= 60) return true; // beige, arena, crudo
  if (h >= 200 && h <= 240 && s < 0.5 && l < 0.4) return true; // índigo / denim / marino
  return false;
}

/** Armonía entre dos colores según la rueda cromática. */
export function colorHarmony(a, b) {
  if (isNeutral(a) || isNeutral(b)) return { score: 0.9, label: 'neutro' };
  const d = Math.abs(hexToHsl(a).h - hexToHsl(b).h);
  const dist = Math.min(d, 360 - d);
  if (dist <= 35) return { score: 0.85, label: 'análogo' };
  if (dist >= 150) return { score: 0.8, label: 'complementario' };
  if (dist >= 105 && dist <= 135) return { score: 0.65, label: 'triádico' };
  return { score: 0.35, label: 'arriesgado' };
}

/** Nombre aproximado en castellano, útil para búsquedas en tiendas. */
export function colorName(hex) {
  const { h, s, l } = hexToHsl(hex);
  if (l < 0.15) return 'negro';
  if (l > 0.9 && s < 0.4) return 'blanco';
  if (s < 0.15) return 'gris';
  if (h < 45 && l > 0.65 && s < 0.55) return 'beige';
  if (h >= 345 || h < 15) return l < 0.35 ? 'bordó' : l > 0.72 ? 'rosa' : 'rojo';
  if (h < 45) return l < 0.4 ? 'marrón' : 'naranja';
  if (h < 70) return 'amarillo';
  if (h < 170) return 'verde';
  if (h < 250) return l > 0.62 ? 'celeste' : 'azul';
  if (h < 290) return 'violeta';
  return 'rosa';
}

/* ─────────────── Imagen ─────────────── */

export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Reduce la foto para que entre en el almacenamiento local (≈20–60 kB). */
export async function resizeImage(file, max = 360, quality = 0.82) {
  const img = await loadImage(await readFileAsDataURL(file));
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', quality);
}

/**
 * Color dominante de la zona central de la foto (donde suele estar la prenda).
 * Cuantiza a 4 bits por canal e ignora fondos blancos.
 */
export async function dominantColor(dataUrl) {
  const img = await loadImage(dataUrl);
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const buckets = new Map();
  for (let y = 13; y < 51; y++) {
    for (let x = 13; x < 51; x++) {
      const i = (y * size + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx > 236 && mx - mn < 18) continue; // fondo blanco o muy claro
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      const e = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
      e.n++; e.r += r; e.g += g; e.b += b;
      buckets.set(key, e);
    }
  }
  let best = null;
  for (const e of buckets.values()) if (!best || e.n > best.n) best = e;
  return best ? rgbToHex({ r: best.r / best.n, g: best.g / best.n, b: best.b / best.n }) : '#EDEDED';
}

/* ─────────────── Fechas ─────────────── */

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Últimos n días, del más viejo al de hoy. */
export function lastDays(n = 7) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push({ key: dateKey(d), label: d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', ''), isToday: i === 0 });
  }
  return out;
}

/* ─────────────── Compras ─────────────── */

/** Links de búsqueda directa en tiendas (compra instantánea). */
export function shopLinks(query) {
  const q = encodeURIComponent(query.trim());
  const slug = encodeURIComponent(query.trim().toLowerCase().replace(/\s+/g, '-'));
  return [
    { label: 'Mercado Libre', url: `https://listado.mercadolibre.com.ar/${slug}` },
    { label: 'Shein', url: `https://www.shein.com/pdsearch/${q}/` },
    { label: 'Temu', url: `https://www.temu.com/search_result.html?search_key=${q}` },
    { label: 'Google Shopping', url: `https://www.google.com/search?tbm=shop&q=${q}` },
  ];
}

export const uid = () => 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
