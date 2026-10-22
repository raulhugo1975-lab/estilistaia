/**
 * EstilistaIA · Medición corporal (funciones puras, sin cámara ni React)
 * ------------------------------------------------------------
 * Entrada: la silueta (máscara de segmentación) y los 33 puntos del cuerpo
 * que devuelve MediaPipe Pose Landmarker, más la altura que escribe el usuario.
 *
 * Cómo se mide:
 *   1. Escala: altura real (cm) ÷ altura de la silueta (de la coronilla al talón, en píxeles).
 *   2. Ancho de frente en tres alturas: pecho, cintura (la parte más angosta del torso)
 *      y cadera (la más ancha entre la articulación de la cadera y el muslo).
 *   3. Profundidad de perfil en las mismas alturas (si se sacó la foto de costado;
 *      si no, se estima con proporciones promedio).
 *   4. Contorno ≈ perímetro de una elipse ancho × profundidad (fórmula de Ramanujan).
 * Precisión esperable: ±3–5 cm con foto de frente y perfil; por eso el usuario
 * siempre puede corregir el resultado.
 */

export const LM = {
  NOSE: 0, L_SHOULDER: 11, R_SHOULDER: 12, L_WRIST: 15, R_WRIST: 16,
  L_HIP: 23, R_HIP: 24, L_KNEE: 25, R_KNEE: 26, L_ANKLE: 27, R_ANKLE: 28, L_HEEL: 29, R_HEEL: 30,
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const avg = (...v) => v.reduce((a, b) => a + b, 0) / v.length;
const visible = (lm, i) => (lm?.[i]?.visibility ?? 0) > 0.5;

/* ─────────────── 1. Guía de encuadre en vivo ─────────────── */

/**
 * Revisa si la persona está bien ubicada para la foto.
 * @param lm   landmarks normalizados (0–1) de una persona
 * @param view 'front' | 'side'
 * @returns {{ ok: boolean, msg: string }} mensaje corto y amable para mostrar en pantalla
 */
export function checkFraming(lm, view) {
  if (!lm || lm.length < 33) return { ok: false, msg: 'Ponete frente a la cámara, que se vea todo tu cuerpo.' };
  if (!visible(lm, LM.NOSE)) return { ok: false, msg: 'No vemos tu cabeza. Alejate un paso.' };
  if (!visible(lm, LM.L_ANKLE) && !visible(lm, LM.R_ANKLE)) return { ok: false, msg: 'No vemos tus pies. Alejate un poco o bajá el teléfono.' };

  const top = lm[LM.NOSE].y - 0.09;
  const bottom = Math.max(lm[LM.L_HEEL].y, lm[LM.R_HEEL].y, lm[LM.L_ANKLE].y, lm[LM.R_ANKLE].y);
  if (top < 0.01 || bottom > 0.99) return { ok: false, msg: 'Estás muy cerca. Da un paso atrás.' };
  const h = bottom - lm[LM.NOSE].y;
  if (h < 0.5) return { ok: false, msg: 'Estás lejos. Acercate un paso.' };

  const shoulderSpan = Math.abs(lm[LM.L_SHOULDER].x - lm[LM.R_SHOULDER].x) / h;
  if (view === 'front') {
    if (shoulderSpan < 0.13) return { ok: false, msg: 'Ponete de frente a la cámara.' };
    const cx = avg(lm[LM.L_HIP].x, lm[LM.R_HIP].x);
    const halfShoulders = Math.abs(lm[LM.L_SHOULDER].x - lm[LM.R_SHOULDER].x) / 2;
    const armsOpen = Math.abs(lm[LM.L_WRIST].x - cx) > halfShoulders * 1.05 && Math.abs(lm[LM.R_WRIST].x - cx) > halfShoulders * 1.05;
    if (!armsOpen) return { ok: false, msg: 'Separá un poco los brazos del cuerpo, como una letra A.' };
  } else if (shoulderSpan > 0.09) {
    return { ok: false, msg: 'Girá hasta quedar de costado.' };
  }
  return { ok: true, msg: 'Perfecto. Quedate quieto un momento…' };
}

/* ─────────────── 2. Lectura de la silueta ─────────────── */

/** Ancho de la silueta en la fila y, partiendo del centro del cuerpo. */
function runWidth(mask, w, h, y, cx, th = 0.5) {
  const row = clamp(Math.round(y), 0, h - 1) * w;
  let x = clamp(Math.round(cx), 0, w - 1);
  if (mask[row + x] < th) {
    // El centro puede caer en un hueco: buscar el cuerpo más cercano.
    let found = -1;
    for (let d = 1; d < w * 0.08 && found < 0; d++) {
      if (x - d >= 0 && mask[row + x - d] >= th) found = x - d;
      else if (x + d < w && mask[row + x + d] >= th) found = x + d;
    }
    if (found < 0) return 0;
    x = found;
  }
  let l = x, r = x;
  while (l > 0 && mask[row + l - 1] >= th) l--;
  while (r < w - 1 && mask[row + r + 1] >= th) r++;
  return r - l + 1;
}

/** Ancho promedio de 3 filas, para que una fila con ruido no arruine la medida. */
const width3 = (mask, w, h, y, cx) => avg(runWidth(mask, w, h, y - 1, cx), runWidth(mask, w, h, y, cx), runWidth(mask, w, h, y + 1, cx));

/** Primera fila (desde arriba) con cuerpo cerca del centro: la coronilla. */
function topOfHead(mask, w, h, cx) {
  const band = Math.round(w * 0.05);
  for (let y = 0; y < h; y++) {
    for (let x = Math.max(0, cx - band); x <= Math.min(w - 1, cx + band); x++) if (mask[y * w + x] >= 0.5) return y;
  }
  return 0;
}

/**
 * Mide una toma (frente o perfil).
 * @param {{ mask: Float32Array, w: number, h: number, lm: Array }} shot  máscara 0–1 de w×h y landmarks
 * @returns anchos en píxeles de la máscara + posiciones normalizadas para recortar la foto
 */
export function measureShot({ mask, w, h, lm }) {
  const cxN = avg(lm[LM.L_SHOULDER].x, lm[LM.R_SHOULDER].x, lm[LM.L_HIP].x, lm[LM.R_HIP].x);
  const cx = Math.round(cxN * w);
  const shoulderY = avg(lm[LM.L_SHOULDER].y, lm[LM.R_SHOULDER].y) * h;
  const hipY = avg(lm[LM.L_HIP].y, lm[LM.R_HIP].y) * h;
  const kneeY = avg(lm[LM.L_KNEE].y, lm[LM.R_KNEE].y) * h;
  const heelY = Math.max(lm[LM.L_HEEL].y, lm[LM.R_HEEL].y, lm[LM.L_ANKLE].y, lm[LM.R_ANKLE].y) * h;
  const top = topOfHead(mask, w, h, cx);
  const torso = hipY - shoulderY;

  const chest = width3(mask, w, h, shoulderY + torso * 0.3, cx);

  let waist = Infinity;
  for (let y = shoulderY + torso * 0.5; y <= hipY - torso * 0.02; y++) waist = Math.min(waist, width3(mask, w, h, y, cx));

  let hip = 0;
  for (let y = hipY; y <= hipY + (kneeY - hipY) * 0.35; y++) hip = Math.max(hip, width3(mask, w, h, y, cx));

  // Los puntos del hombro están en la articulación; el ancho visible suma el deltoides.
  const shoulder = Math.abs(lm[LM.L_SHOULDER].x - lm[LM.R_SHOULDER].x) * w * 1.18;

  return {
    pxHeight: heelY - top,
    widths: { shoulder, chest, waist: Number.isFinite(waist) ? waist : 0, hip },
    norm: { top: top / h, heel: heelY / h, cx: cxN }, // para recortar la foto
  };
}

/* ─────────────── 3. Medidas y silueta ─────────────── */

/** Perímetro de una elipse (Ramanujan) a partir de ancho y profundidad. */
export function ellipsePerimeter(width, depth) {
  const a = width / 2, b = depth / 2;
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
}

/** Proporción profundidad/ancho promedio, usada cuando no hay foto de perfil. */
const DEPTH_RATIO = { chest: 0.72, waist: 0.74, hip: 0.68 };

/** Clasifica la silueta con las reglas habituales de asesoría de imagen. */
export function classifyShape({ bust, waist, hip }) {
  if (waist >= bust * 0.92 && waist >= hip * 0.92) return 'oval';
  if (Math.abs(bust - hip) / Math.max(bust, hip) <= 0.05 && waist <= Math.min(bust, hip) * 0.78) return 'reloj';
  if (hip > bust * 1.05) return 'triangulo';
  if (bust > hip * 1.05) return 'invertido';
  return 'recta';
}

/**
 * Combina frente (+ perfil opcional) en el modelo corporal que usa la app.
 * @returns {{ source:'scan', heightCm, widthsCm, measures:{bust,waist,hip}, shape, precision:'alta'|'media', warnings:string[] }}
 */
export function computeBody({ front, side, heightCm }) {
  const warnings = [];
  const sF = heightCm / front.pxHeight;
  const W = Object.fromEntries(Object.entries(front.widths).map(([k, v]) => [k, v * sF]));

  let D;
  if (side) {
    const sS = heightCm / side.pxHeight;
    D = { chest: side.widths.chest * sS, waist: side.widths.waist * sS, hip: side.widths.hip * sS };
  } else {
    D = { chest: W.chest * DEPTH_RATIO.chest, waist: W.waist * DEPTH_RATIO.waist, hip: W.hip * DEPTH_RATIO.hip };
    warnings.push('Sin foto de perfil, la profundidad del cuerpo se estimó con proporciones promedio.');
  }

  const measures = {
    bust: Math.round(ellipsePerimeter(W.chest, D.chest)),
    waist: Math.round(ellipsePerimeter(W.waist, D.waist)),
    hip: Math.round(ellipsePerimeter(W.hip, D.hip)),
  };
  for (const [k, v] of Object.entries(measures)) {
    if (v < 50 || v > 200) warnings.push(`La medida de ${k === 'bust' ? 'busto o pecho' : k === 'waist' ? 'cintura' : 'cadera'} salió rara: revisala.`);
  }

  return {
    source: 'scan',
    heightCm,
    widthsCm: Object.fromEntries(Object.entries(W).map(([k, v]) => [k, Math.round(v * 10) / 10])),
    measures,
    shape: classifyShape(measures),
    precision: side ? 'alta' : 'media',
    warnings,
    scannedAt: new Date().toISOString(),
  };
}

/* ─────────────── 4. Avatar del probador ─────────────── */

const AVATAR_BODY_PX = 413; // de la coronilla (y≈33) al talón (y≈446) en el lienzo 300×480 del maniquí

/** Ancho frontal estimado a partir de un contorno (cuando no hay escaneo). */
const widthFromCirc = (c, ratio) => c / ((Math.PI * (1 + ratio)) / 2 * 1.008);

/**
 * Semianchos (px) del maniquí SVG: S hombros · B pecho · W cintura · H cadera.
 * Usa los anchos escaneados si existen; si no, los deriva de las medidas escritas a mano.
 */
export function dimsFromBody({ heightCm = 165, widthsCm, measures }) {
  const k = AVATAR_BODY_PX / clamp(heightCm, 120, 220);
  const w = widthsCm ?? {
    chest: widthFromCirc(measures.bust, DEPTH_RATIO.chest),
    waist: widthFromCirc(measures.waist, DEPTH_RATIO.waist),
    hip: widthFromCirc(measures.hip, DEPTH_RATIO.hip),
  };
  const shoulder = w.shoulder ?? w.chest * 1.15;
  return {
    S: clamp((shoulder * k) / 2, 38, 68),
    B: clamp((w.chest * k) / 2, 34, 66),
    W: clamp((w.waist * k) / 2, 26, 66),
    H: clamp((w.hip * k) / 2, 36, 68),
  };
}

/**
 * Recorta y escala la foto de frente para que el cuerpo quede donde el probador
 * dibuja las prendas (coronilla arriba, talones abajo, centrado). Así las capas
 * se alinean solas sobre la foto.
 * @param {HTMLCanvasElement|HTMLImageElement} img  foto completa
 * @param {{top:number, heel:number, cx:number}} norm  posiciones normalizadas de measureShot()
 * @returns {string} dataURL JPEG de 600×960
 */
export function cropForAvatar(img, norm, background = '#E5E3ED') {
  const iw = img.width, ih = img.height;
  const c = document.createElement('canvas');
  c.width = 600; c.height = 960;
  const ctx = c.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, c.width, c.height);
  const s = (AVATAR_BODY_PX * 2) / ((norm.heel - norm.top) * ih);
  const dx = 300 - norm.cx * iw * s;
  const dy = 66 - norm.top * ih * s;
  ctx.drawImage(img, dx, dy, iw * s, ih * s);
  return c.toDataURL('image/jpeg', 0.85);
}
