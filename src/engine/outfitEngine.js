/**
 * EstilistaIA · Motor de sugerencia de outfits (el "cerebro")
 * ------------------------------------------------------------
 * Flujo:
 *   1. checkGarment()  → regla de ergonomía: decide si una prenda es apta hoy
 *                         y explica por qué no.
 *   2. itemScore()     → puntúa cada prenda apta según confort, ocasión,
 *                         síntomas y fisionomía.
 *   3. suggestOutfits()→ arma combinaciones (arriba+abajo o vestido) + calzado
 *                         + abrigo, puntúa armonía de color y devuelve las
 *                         mejores con justificación.
 * Es determinista y local: no necesita IA externa para funcionar.
 */
import { WAISTBANDS } from '../data/seed.js';
import { colorHarmony, hexToHsl } from '../lib/utils.js';

export const SLOTS = ['outer', 'top', 'bottom', 'dress', 'shoes'];
const FLEX_WAIST = ['ELASTIC_BAND', 'DRAWSTRING'];
const waistLabel = (id) => WAISTBANDS.find((w) => w.id === id)?.label ?? '';

/**
 * Regla crítica de ergonomía.
 * Nivel 3–5: fuera botones rígidos y cortes ceñidos abajo.
 * Nivel 4–5: además, fuera prendas superiores ceñidas y prendas poco amigables.
 * @returns {{ ok: boolean, reasons: string[] }}
 */
export function checkGarment(item, { comfort, symptoms = [] }) {
  const reasons = [];
  const lower = item.category === 'bottom' || item.category === 'dress';

  if (item.waistband === 'RIGID_BUTTON' && comfort >= 3) {
    reasons.push(`Cierra con botón rígido: en nivel ${comfort} presiona el abdomen.`);
  } else if (item.waistband === 'RIGID_BUTTON' && symptoms.includes('abdomen')) {
    reasons.push('Marcaste hinchazón abdominal y cierra con botón rígido.');
  }
  if (comfort >= 3 && lower && item.fit === 'ajustado') {
    reasons.push('Corte ceñido en cintura y cadera.');
  }
  if (comfort >= 4 && !lower && item.category !== 'shoes' && item.fit === 'ajustado') {
    reasons.push('Ceñida en el torso: en nivel 4–5 conviene que el cuerpo respire.');
  }
  if (comfort >= 4 && item.comfort < comfort - 1) {
    reasons.push(`Su amigabilidad (${item.comfort}/5) es baja para tu nivel ${comfort}.`);
  }
  if (symptoms.includes('piel') && ['Lana', 'Sintético'].includes(item.fabric)) {
    reasons.push(`${item.fabric}: puede irritar la piel sensible.`);
  }
  if (symptoms.includes('dolor') && item.fit === 'ajustado') {
    reasons.push('Con dolor o rigidez cuesta ponerse prendas ceñidas.');
  }
  return { ok: reasons.length === 0, reasons };
}

/** Pequeño ajuste según la fisionomía elegida en el perfil. */
function shapeBonus(item, shapeId) {
  const { l } = hexToHsl(item.color);
  switch (shapeId) {
    case 'triangulo':
      if (item.category === 'top' && l > 0.6) return 0.06;
      if (item.category === 'bottom' && l < 0.4) return 0.06;
      return 0;
    case 'invertido':
      if (item.category === 'bottom' && (item.shape === 'falda' || item.fit === 'holgado')) return 0.06;
      if (item.category === 'top' && l < 0.4) return 0.04;
      return 0;
    case 'reloj':
      return item.fit === 'regular' ? 0.05 : 0;
    case 'oval':
      if (item.category === 'outer' && item.fit === 'holgado') return 0.06;
      if (item.category === 'dress') return 0.05;
      return 0;
    default:
      return 0;
  }
}

/** Puntaje individual de una prenda apta (≈0–1.5). */
function itemScore(item, ctx) {
  const { comfort, symptoms = [], occasion, bodyShape } = ctx;
  let s = 1 - Math.abs(item.comfort - comfort) / 4; // cercanía al nivel de confort
  if (comfort >= 3 && FLEX_WAIST.includes(item.waistband)) s += 0.3; // prioridad a pretinas que acompañan
  if (comfort <= 2 && ['trabajo', 'evento'].includes(occasion) && item.fit !== 'holgado') s += 0.15;
  if (symptoms.includes('calor') && ['Lino', 'Algodón'].includes(item.fabric)) s += 0.15;
  if (symptoms.includes('ciclo') && item.category === 'bottom' && hexToHsl(item.color).l < 0.35) s += 0.15;
  // Lluvia: calzado abierto y gamuza quedan atrás; botas y calzado cerrado suman.
  if (ctx.rain && item.category === 'shoes') s += /sandalia|ojota|alpargata/i.test(item.name) ? -0.6 : /bota/i.test(item.name) ? 0.2 : 0;
  return s + shapeBonus(item, bodyShape);
}

/** Elige la prenda de una lista que mejor combina con las piezas principales. */
function pickBest(list, main) {
  let best = null, bestScore = -1;
  for (const it of list) {
    const h = main.reduce((a, m) => a + colorHarmony(it.color, m.color).score, 0) / main.length;
    const s = it._score * 0.5 + h * 0.5;
    if (s > bestScore) { bestScore = s; best = it; }
  }
  return best;
}

function buildNotes(pieces, pairs, ctx) {
  const notes = [];
  const items = SLOTS.map((s) => pieces[s]).filter(Boolean);
  const lower = pieces.dress || pieces.bottom;

  if (ctx.comfort >= 3 && lower) {
    if (FLEX_WAIST.includes(lower.waistband)) notes.push(`${lower.name}: ${waistLabel(lower.waistband).toLowerCase()}, acompaña la inflamación sin marcar.`);
    else if (lower.fit === 'holgado') notes.push(`${lower.name}: corte holgado, sin presión en el abdomen.`);
  }
  if (ctx.comfort <= 2 && ['trabajo', 'evento'].includes(ctx.occasion)) {
    notes.push('Día liviano: aprovechamos prendas con más estructura.');
  }
  if (ctx.symptoms?.includes('calor')) {
    const fresh = items.filter((i) => ['Lino', 'Algodón'].includes(i.fabric)).map((i) => i.name.toLowerCase());
    if (fresh.length) notes.push(`Telas frescas: ${fresh.join(', ')}.`);
  }
  const worst = pairs.reduce((m, p) => (!m || p.score < m.score ? p : m), null);
  if (worst) {
    if (worst.score >= 0.8) notes.push('Paleta armónica: neutros y tonos vecinos.');
    else if (worst.label === 'complementario') notes.push(`Contraste complementario entre ${worst.a.name.toLowerCase()} y ${worst.b.name.toLowerCase()}.`);
    else if (worst.score < 0.5) notes.push(`Contraste fuerte entre ${worst.a.name.toLowerCase()} y ${worst.b.name.toLowerCase()}: si buscás algo más sereno, mirá otra sugerencia.`);
    else notes.push('Colores en equilibrio triádico.');
  }
  // El consejo de silueta llega ya adaptado al género (ver lib/gender.js).
  if (ctx.shapeTip && ctx.bodyShape !== 'recta') notes.push(ctx.shapeTip);
  return notes.slice(0, 4);
}

function scoreOutfit(pieces, ctx) {
  const items = SLOTS.map((s) => pieces[s]).filter(Boolean);
  const base = items.reduce((a, i) => a + i._score, 0) / items.length;
  const pairs = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      pairs.push({ a: items[i], b: items[j], ...colorHarmony(items[i].color, items[j].color) });
    }
  }
  const harmony = pairs.length ? pairs.reduce((a, p) => a + p.score, 0) / pairs.length : 1;
  const total = base * 0.6 + harmony * 0.4;
  return {
    id: items.map((i) => i.id).join('-'),
    pieces,
    score: Math.round(Math.max(0, Math.min(1, total / 1.15)) * 100),
    notes: buildNotes(pieces, pairs, ctx),
  };
}

/**
 * Cruza ocasión + clima + estado físico con el guardarropa.
 * @param {import('../data/seed.js').Garment[]} wardrobe
 * @param {{comfort:number, symptoms:string[], occasion:string, season:string, bodyShape:string, shapeTip?:string, rain?:boolean}} ctx
 * @returns {{ outfits: Array, discarded: Array<{item, reasons:string[]}>, gaps: Array<{label, query}> }}
 */
export function suggestOutfits(wardrobe, ctx, max = 3) {
  const { season, occasion, symptoms = [] } = ctx;
  const discarded = [];
  const pool = [];

  for (const item of wardrobe) {
    const inContext = item.seasons.includes(season) && item.occasions.includes(occasion);
    if (!inContext) continue; // no es para esta ocasión o clima: se omite sin ruido
    const check = checkGarment(item, ctx);
    if (!check.ok) discarded.push({ item, reasons: check.reasons });
    else pool.push({ ...item, _score: itemScore(item, ctx) });
  }

  const byCat = (c) => pool.filter((i) => i.category === c).sort((a, b) => b._score - a._score);
  const tops = byCat('top'), bottoms = byCat('bottom'), dresses = byCat('dress');
  const outers = byCat('outer'), shoes = byCat('shoes');

  const skipOuter = season === 'calido' || symptoms.includes('calor');
  const wantsOuter = !skipOuter && (season === 'frio' || (season === 'templado' && ['trabajo', 'evento'].includes(occasion)));

  const bases = [];
  for (const top of tops) for (const bottom of bottoms) bases.push({ top, bottom });
  for (const dress of dresses) bases.push({ dress });

  const candidates = bases
    .map((base) => {
      const main = Object.values(base);
      const pieces = { ...base };
      const shoe = pickBest(shoes, main);
      if (shoe) pieces.shoes = shoe;
      if (wantsOuter) {
        const outer = pickBest(outers, main);
        if (outer) pieces.outer = outer;
      }
      return scoreOutfit(pieces, ctx);
    })
    .sort((a, b) => b.score - a.score);

  // Diversidad: primero, combinaciones que no repitan la parte de abajo ni la de arriba.
  const outfits = [];
  const used = new Set();
  for (const c of candidates) {
    if (outfits.length >= max) break;
    const keys = [c.pieces.dress?.id, c.pieces.bottom?.id, c.pieces.top?.id].filter(Boolean);
    if (keys.some((k) => used.has(k))) continue;
    keys.forEach((k) => used.add(k));
    outfits.push(c);
  }
  for (const c of candidates) {
    if (outfits.length >= max) break;
    if (!outfits.includes(c)) outfits.push(c);
  }

  // Huecos del guardarropa → herramientas de compra instantánea.
  const gaps = [];
  if (ctx.comfort >= 3 && bottoms.length + dresses.length < 2) gaps.push({ label: 'Pantalón o falda con pretina elástica', query: 'pantalon pretina elastica' });
  if (!tops.length && !dresses.length) gaps.push({ label: 'Parte de arriba holgada', query: 'remera oversize algodon' });
  if (!shoes.length) gaps.push({ label: 'Calzado cómodo', query: 'zapatillas comodas' });
  if (wantsOuter && season === 'frio' && !outers.length) gaps.push({ label: 'Abrigo holgado', query: 'campera abrigo oversize' });

  return { outfits, discarded, gaps };
}

/* ─────────────── Escaneo en tienda ─────────────── */

const PARTNERS = {
  top: ['bottom', 'outer', 'shoes'],
  bottom: ['top', 'outer', 'shoes'],
  dress: ['outer', 'shoes'],
  outer: ['top', 'bottom', 'dress'],
  shoes: ['top', 'bottom', 'dress'],
};

/** Estima la amigabilidad ante la inflamación a partir del corte y la pretina. */
export function guessFriendliness({ fit, waistband }) {
  let v = { ajustado: 1, regular: 3, holgado: 5 }[fit] ?? 3;
  if (FLEX_WAIST.includes(waistband)) v += 1;
  if (waistband === 'RIGID_BUTTON') v -= 1;
  return Math.max(1, Math.min(5, v));
}

/**
 * Analiza una prenda vista en una tienda contra el guardarropa actual.
 * @param candidate prenda con category, color, fit, waistband
 * @param wardrobe  guardarropa
 * @param log       registro diario { 'AAAA-MM-DD': nivel }
 */
export function analyzeStoreItem(candidate, wardrobe, log = {}) {
  const partnerCats = PARTNERS[candidate.category] || [];
  const partners = wardrobe.filter((w) => partnerCats.includes(w.category));
  const matches = partners
    .map((item) => ({ item, ...colorHarmony(candidate.color, item.color) }))
    .filter((m) => m.score >= 0.65)
    .sort((a, b) => b.score - a.score);
  const versatility = partners.length ? Math.round((matches.length / partners.length) * 100) : 0;

  const warnings = [];
  const levels = Object.values(log);
  const highDays = levels.filter((v) => v >= 3).length;
  const lowerRigid = (candidate.category === 'bottom' || candidate.category === 'dress') && (candidate.waistband === 'RIGID_BUTTON' || candidate.fit === 'ajustado');
  if (lowerRigid) {
    warnings.push(levels.length
      ? `No la vas a poder usar en días de nivel 3 a 5. En tu registro, ${highDays} de ${levels.length} días estuvieron en ese rango.`
      : 'No la vas a poder usar en días de nivel 3 a 5 (botón rígido o corte ceñido).');
  }
  const similar = wardrobe.filter((w) => w.category === candidate.category && colorDistanceSafe(w.color, candidate.color) < 30);
  if (similar.length) warnings.push(`Ya tenés algo muy parecido: ${similar.map((s) => s.name).join(', ')}.`);

  let verdict;
  if (versatility >= 55 && !lowerRigid && !similar.length) verdict = { tone: 'ok', title: 'Buena compra', text: `Combina con ${matches.length} prendas que ya tenés.` };
  else if (versatility >= 30) verdict = { tone: 'warn', title: 'Pensalo un poco', text: `Combina con ${matches.length} de ${partners.length} prendas compatibles, con reparos.` };
  else verdict = { tone: 'bad', title: 'Poco compatible', text: `Solo combina con ${matches.length} de tus prendas actuales.` };

  return { matches, versatility, warnings, verdict, friendliness: guessFriendliness(candidate) };
}

function colorDistanceSafe(a, b) {
  const pa = hexToHsl(a), pb = hexToHsl(b);
  // Distancia perceptual simple en HSL (tono pesa más).
  const dh = Math.min(Math.abs(pa.h - pb.h), 360 - Math.abs(pa.h - pb.h)) / 180;
  return Math.hypot(dh * 120, (pa.s - pb.s) * 60, (pa.l - pb.l) * 120);
}
