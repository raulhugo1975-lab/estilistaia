/**
 * Probador virtual simulado.
 * ------------------------------------------------------------
 * Dibuja una silueta (o la foto del usuario) y superpone cada prenda como
 * una capa SVG. La forma de cada capa depende de:
 *   - la fisionomía (anchos de hombros, busto, cintura y cadera),
 *   - el corte de la prenda (ajustado → holgado),
 *   - el nivel de inflamación (la cintura del maniquí crece levemente).
 * Orden de capas: cuerpo → abajo → arriba → pretina (si va por dentro)
 *                 → vestido → abrigo → calzado → indicadores.
 */
import React from 'react';
import { BODY_SHAPES } from '../data/seed.js';
import { shade } from '../lib/utils.js';

const C = 150; // eje central del lienzo 300 × 480
const LOOSENESS = { ajustado: 0.05, regular: 0.4, holgado: 0.9 };

/** @param custom  semianchos medidos (escaneo o medidas propias); si no hay, se usa la silueta tipo. */
export function bodyDims(shapeId, comfort = 1, custom = null) {
  const base = custom || (BODY_SHAPES.find((s) => s.id === shapeId) || BODY_SHAPES[0]).dims;
  const swell = (comfort - 1) * 1.6;
  return { ...base, W: base.W + swell, H: base.H + swell * 0.4 };
}

/* ─── Trazados ─── */

const bodyPath = ({ S, B, W, H }) =>
  `M ${C - 11} 86 L ${C - 11} 97 Q ${C - S + 6} 99 ${C - S} 112 L ${C - B} 146 Q ${C - W - 2} 176 ${C - W} 202 ` +
  `Q ${C - H - 4} 226 ${C - H} 252 Q ${C - H + 4} 280 ${C - H + 14} 312 L ${C - 24} 446 L ${C - 8} 446 L ${C - 3} 284 ` +
  `L ${C + 3} 284 L ${C + 8} 446 L ${C + 24} 446 L ${C + H - 14} 312 Q ${C + H - 4} 280 ${C + H} 252 ` +
  `Q ${C + H + 4} 226 ${C + W} 202 Q ${C + W + 2} 176 ${C + B} 146 L ${C + S} 112 Q ${C + S - 6} 99 ${C + 11} 97 L ${C + 11} 86 Z`;

function topPath(d, L, tucked) {
  const e = L * 20;
  const hem = tucked ? 214 : 236 + L * 14;
  const hx = tucked ? d.W + e * 0.6 : Math.max(d.W, d.H * 0.92) + e;
  return `M ${C - 14} 96 Q ${C} 114 ${C + 14} 96 L ${C + d.S + 3} 105 L ${C + d.S + 20 + e * 0.5} 158 L ${C + d.S + 5} 166 ` +
    `L ${C + d.B + e * 0.6} 148 Q ${C + d.W + e} 192 ${C + hx} ${hem} L ${C - hx} ${hem} Q ${C - d.W - e} 192 ${C - d.B - e * 0.6} 148 ` +
    `L ${C - d.S - 5} 166 L ${C - d.S - 20 - e * 0.5} 158 L ${C - d.S - 3} 105 Z`;
}

function bottomPath(d, L, shape, name) {
  const e = L * 12;
  const wx = d.W + e * 0.3;
  if (shape === 'falda') {
    const flare = d.H + 10 + L * 28;
    const len = L > 0.6 ? 372 : 336;
    return `M ${C - wx} 204 L ${C + wx} 204 Q ${C + d.H + e} 238 ${C + flare} ${len} L ${C - flare} ${len} Q ${C - d.H - e} 238 ${C - wx} 204 Z`;
  }
  const leg = 7 + L * 22;          // semiancho de la botamanga
  const inner = Math.max(2, 16 - leg);
  const hem = shape === 'short' || /bermuda|short/i.test(name || '') ? 336 : 444; // short y bermuda: a la rodilla
  return `M ${C - wx} 204 L ${C + wx} 204 Q ${C + d.H + e} 232 ${C + d.H + e * 0.6} 262 L ${C + 16 + leg} ${hem} L ${C + inner} ${hem} ` +
    `L ${C + 3} 288 L ${C - 3} 288 L ${C - inner} ${hem} L ${C - 16 - leg} ${hem} L ${C - d.H - e * 0.6} 262 Q ${C - d.H - e} 232 ${C - wx} 204 Z`;
}

function dressPath(d, L) {
  const e = L * 18;
  const flare = d.H + 14 + L * 30;
  return `M ${C - 14} 96 Q ${C} 114 ${C + 14} 96 L ${C + d.S + 3} 105 L ${C + d.S + 18 + e * 0.5} 156 L ${C + d.S + 5} 164 ` +
    `L ${C + d.B + e * 0.6} 148 Q ${C + d.W + e} 196 ${C + d.W + e + 2} 206 Q ${C + d.H + e * 1.4} 250 ${C + flare} 362 ` +
    `L ${C - flare} 362 Q ${C - d.H - e * 1.4} 250 ${C - d.W - e - 2} 206 Q ${C - d.W - e} 196 ${C - d.B - e * 0.6} 148 ` +
    `L ${C - d.S - 5} 164 L ${C - d.S - 18 - e * 0.5} 156 L ${C - d.S - 3} 105 Z`;
}

/** Mitad izquierda de un abrigo abierto; la derecha se obtiene espejando. */
function outerHalfPath(d, L) {
  const e = L * 14 + 6;
  return `M ${C - 9} 130 L ${C - 15} 95 L ${C - d.S - 5} 103 Q ${C - d.S - 18 - e * 0.6} 170 ${C - d.S - 17 - e * 0.5} 254 ` +
    `L ${C - d.S - 3} 256 Q ${C - d.S + 1} 190 ${C - d.B - e * 0.5} 152 Q ${C - d.W - e - 6} 210 ${C - d.H - e * 0.7} 274 L ${C - 13} 274 Z`;
}

function zigzag(x0, x1, y) {
  let s = `M ${x0} ${y}`;
  let up = true;
  for (let x = x0 + 3; x <= x1; x += 3) { s += ` L ${x} ${y + (up ? -1.8 : 1.8)}`; up = !up; }
  return s;
}

/* ─── Capas ─── */

function Waistband({ d, item }) {
  const L = LOOSENESS[item.fit] ?? 0.4;
  const half = d.W + L * 12 * 0.3;
  const x0 = C - half;
  return (
    <g className="garment-layer">
      <rect x={x0} y={203} width={half * 2} height={9} rx={2} fill={shade(item.color, -0.18)} />
      {item.waistband === 'RIGID_BUTTON' && <circle cx={C} cy={207.5} r={2.8} fill="#C9A24A" stroke={shade(item.color, -0.5)} strokeWidth=".8" />}
      {item.waistband === 'ELASTIC_BAND' && <path d={zigzag(x0 + 2, x0 + half * 2 - 2, 207.5)} fill="none" stroke={shade(item.color, 0.35)} strokeWidth="1" />}
      {item.waistband === 'DRAWSTRING' && <path d={`M ${C - 3} 211 q -2 10 -5 16 M ${C + 3} 211 q 2 10 5 16`} stroke={shade(item.color, 0.45)} strokeWidth="1.4" fill="none" strokeLinecap="round" />}
    </g>
  );
}

function Layer({ item, children }) {
  return (
    <path className="garment-layer garment-path" d={children} fill={item.color}
      stroke={shade(item.color, -0.35)} strokeWidth="1.3" strokeLinejoin="round" />
  );
}

/**
 * @param {object} props
 * @param {string} props.shapeId     fisionomía
 * @param {number} props.comfort     nivel 1–5
 * @param {object} props.pieces      { top, bottom, dress, outer, shoes }
 * @param {string|null} props.photo  foto de cuerpo entero (opcional)
 * @param {{dx:number, dy:number, s:number}} props.align  ajuste de las capas sobre la foto (izq./der., arriba/abajo, tamaño)
 * @param {{S,B,W,H}|null} props.custom       avatar con las medidas de la persona (ver dimsFromBody)
 */
export function Mannequin({ shapeId, comfort = 1, pieces = {}, photo = null, align = { dx: 0, dy: 0, s: 1 }, custom = null, className = '', label }) {
  const d = bodyDims(shapeId, comfort, custom);
  const { top, bottom, dress, outer, shoes } = pieces;
  const tucked = top && top.fit !== 'holgado';
  const L = (it) => LOOSENESS[it?.fit] ?? 0.4;
  const pressure = comfort >= 3 && ((bottom && (bottom.waistband === 'RIGID_BUTTON' || bottom.fit === 'ajustado')) || (dress && dress.fit === 'ajustado'));
  const names = [outer, top, bottom, dress, shoes].filter(Boolean).map((p) => p.name).join(', ');
  const garmentTransform = photo ? `translate(${C} 240) scale(${align.s ?? 1}) translate(${-C + (align.dx ?? 0)} ${-240 + (align.dy ?? 0)})` : undefined;

  return (
    <svg viewBox="0 0 300 480" className={className} role="img"
      aria-label={label || (names ? `Simulación con ${names}` : 'Silueta sin prendas')}>
      <defs>
        <radialGradient id="swell" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--bad)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="var(--bad)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {photo ? (
        <image href={photo} x="0" y="0" width="300" height="480" preserveAspectRatio="xMidYMid slice" />
      ) : (
        <g>
          <line x1={C - d.S + 3} y1={114} x2={C - d.S - 12} y2={250} stroke="var(--body-line)" strokeWidth="17" strokeLinecap="round" />
          <line x1={C + d.S - 3} y1={114} x2={C + d.S + 12} y2={250} stroke="var(--body-line)" strokeWidth="17" strokeLinecap="round" />
          <line x1={C - d.S + 3} y1={114} x2={C - d.S - 12} y2={250} stroke="var(--body)" strokeWidth="14.5" strokeLinecap="round" />
          <line x1={C + d.S - 3} y1={114} x2={C + d.S + 12} y2={250} stroke="var(--body)" strokeWidth="14.5" strokeLinecap="round" />
          <path className="garment-path" d={bodyPath(d)} fill="var(--body)" stroke="var(--body-line)" strokeWidth="1.2" />
          <circle cx={C} cy={57} r={24} fill="var(--body)" stroke="var(--body-line)" strokeWidth="1.2" />
        </g>
      )}

      <g transform={garmentTransform} opacity={photo ? 0.86 : 1}>
        {bottom && <Layer key={bottom.id} item={bottom}>{bottomPath(d, L(bottom), bottom.shape, bottom.name)}</Layer>}
        {top && <Layer key={top.id} item={top}>{topPath(d, L(top), tucked)}</Layer>}
        {bottom && (tucked || !top) && <Waistband key={`wb-${bottom.id}`} d={d} item={bottom} />}
        {dress && <Layer key={dress.id} item={dress}>{dressPath(d, L(dress))}</Layer>}
        {dress && dress.waistband !== 'NONE' && (
          <path key={`dw-${dress.id}`} className="garment-layer" d={zigzag(C - d.W - 6, C + d.W + 6, 206)} fill="none" stroke={shade(dress.color, -0.3)} strokeWidth="1.1" />
        )}
        {outer && (
          <g key={outer.id} className="garment-layer">
            <path className="garment-path" d={outerHalfPath(d, L(outer))} fill={outer.color} stroke={shade(outer.color, -0.35)} strokeWidth="1.3" strokeLinejoin="round" />
            <path className="garment-path" d={outerHalfPath(d, L(outer))} transform="translate(300 0) scale(-1 1)" fill={outer.color} stroke={shade(outer.color, -0.35)} strokeWidth="1.3" strokeLinejoin="round" />
            <path d={`M ${C - 9} 130 L ${C - 22} 110 M ${C + 9} 130 L ${C + 22} 110`} stroke={shade(outer.color, -0.45)} strokeWidth="1.2" fill="none" />
          </g>
        )}
        {shoes && (
          <g key={shoes.id} className="garment-layer" fill={shoes.color} stroke={shade(shoes.color, -0.4)} strokeWidth="1.2">
            <ellipse cx={C - 19} cy={451} rx={14} ry={7} />
            <ellipse cx={C + 19} cy={451} rx={14} ry={7} />
          </g>
        )}

        {/* Zona sensible: crece con el nivel de inflamación */}
        {comfort >= 2 && !photo && (
          <ellipse cx={C} cy={222} rx={d.W + 8} ry={24} fill="url(#swell)" opacity={(comfort - 1) * 0.06} pointerEvents="none" />
        )}

        {pressure && (
          <g className="garment-layer">
            <path d={`M ${C - d.W - 8} 209 Q ${C} 224 ${C + d.W + 8} 209`} stroke="var(--bad)" strokeWidth="3" strokeDasharray="5 4" fill="none" strokeLinecap="round" />
            <text x={C + d.W + 12} y={213} fontSize="12" fontWeight="700" fill="var(--bad)" fontFamily="Atkinson Hyperlegible, system-ui, sans-serif">presión</text>
          </g>
        )}
      </g>
    </svg>
  );
}

/* ─── Miniatura de prenda (para tarjetas) ─── */

const GLYPHS = {
  top: 'M16 8 L10 12 L5 20 L11 24 L14 21 L14 42 L34 42 L34 21 L37 24 L43 20 L38 12 L32 8 Q24 14 16 8Z',
  pantalon: 'M13 6 H35 L38 44 H27 L24 18 L21 44 H10 Z',
  falda: 'M15 8 H33 L41 40 H7 Z',
  dress: 'M18 5 L14 10 L17 18 L10 43 H38 L31 18 L34 10 L30 5 Q24 10 18 5Z',
  outer: 'M16 6 L8 12 L6 40 H12 L13 22 L14 44 H23 L24 14 L25 44 H34 L35 22 L36 40 H42 L40 12 L32 6 L24 14 Z',
  shoes: 'M6 30 Q6 22 14 22 L22 24 Q30 30 40 31 Q44 32 43 38 H6 Z',
};

export function GarmentThumb({ item, className = '' }) {
  if (item.photo) {
    return <img src={item.photo} alt="" className={`h-full w-full object-cover ${className}`} />;
  }
  const glyph = item.category === 'bottom' ? GLYPHS[item.shape === 'falda' ? 'falda' : 'pantalon'] : GLYPHS[item.category];
  return (
    <div className={`flex h-full w-full items-center justify-center bg-sunk ${className}`}>
      <svg viewBox="0 0 48 48" className="h-3/5 w-3/5" aria-hidden="true">
        <path d={glyph} fill={item.color} stroke={shade(item.color, -0.4)} strokeWidth="1" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
