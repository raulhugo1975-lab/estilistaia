/**
 * EstilistaIA · Traductor y comparador de talles
 * ------------------------------------------------------------
 * 1. Calcula las medidas "de hoy" sumando la variación por inflamación
 *    proporcional al nivel de confort (nivel 1 = 0 %, nivel 5 = 100 %).
 * 2. Busca en cada tabla el primer talle que entra con medidas normales
 *    (talle base) y con las de hoy.
 * 3. Semáforo: margen del talle base frente a las medidas de hoy.
 *    Verde ≥ 2 cm · Amarillo 0–2 cm · Rojo < 0 cm (aprieta).
 */
import { SIZE_CHARTS, PLUS_LINES } from '../data/seed.js';

/** Centímetros que la tela "perdona" por encima de la medida de la tabla. */
export const FABRIC_TOLERANCE = { rigida: 0, elastica: 3, holgada: 6 };
export const FABRIC_OPTIONS = [
  { id: 'rigida', label: 'Tela rígida' },
  { id: 'elastica', label: 'Con elastano' },
  { id: 'holgada', label: 'Corte holgado' },
];

const DIMS = ['bust', 'waist', 'hip'];
export const DIM_LABELS = { bust: 'busto o pecho', waist: 'cintura', hip: 'cadera' };

export function swollenMeasures(m, comfort, swellCm) {
  const k = (comfort - 1) / 4;
  return { bust: m.bust, waist: +(m.waist + swellCm * k).toFixed(1), hip: +(m.hip + swellCm * 0.5 * k).toFixed(1) };
}

const fits = (row, m, tol) => DIMS.every((d) => row[d] + tol >= m[d]);

function tightest(row, m, tol) {
  return DIMS.map((d) => ({ dim: d, margin: row[d] + tol - m[d] })).sort((a, b) => a.margin - b.margin)[0];
}

/**
 * @returns {Array<{brand, base, today, status:'ok'|'warn'|'bad', margin, message}>}
 */
export function recommendSizes({ measures, cut, fabric, comfort, swellCm }) {
  const tol = FABRIC_TOLERANCE[fabric] ?? 0;
  const today = swollenMeasures(measures, comfort, swellCm);

  return Object.entries(SIZE_CHARTS[cut]).map(([brand, rows]) => {
    const baseIdx = rows.findIndex((r) => fits(r, measures, tol));
    const todayIdx = rows.findIndex((r) => fits(r, today, tol));
    const todaySize = todayIdx >= 0 ? rows[todayIdx].size : null;

    if (baseIdx === -1) {
      return { brand, base: null, today: null, status: 'bad', margin: null, message: `Tus medidas superan esta tabla. Buscá en ${PLUS_LINES[brand]}.` };
    }

    const base = rows[baseIdx];
    const { dim, margin } = tightest(base, today, tol);
    const m = margin.toFixed(1).replace('.', ',');
    const status = margin >= 2 ? 'ok' : margin >= 0 ? 'warn' : 'bad';
    let message;
    if (status === 'ok') {
      message = `El ${base.size} te queda bien hoy, con ${m} cm de margen en ${DIM_LABELS[dim]}.`;
    } else if (status === 'warn') {
      message = `El ${base.size} va justo en ${DIM_LABELS[dim]} (${m} cm). ` +
        (todaySize && todayIdx > baseIdx ? `Para días de inflamación, subí a ${todaySize}.` : 'Elegí una tela con elastano.');
    } else {
      message = `El ${base.size} va a apretar en ${DIM_LABELS[dim]} hoy (faltan ${(-margin).toFixed(1).replace('.', ',')} cm). ` +
        (todaySize ? `Subí a ${todaySize}.` : `Ningún talle de la tabla alcanza: probá ${PLUS_LINES[brand]}.`);
    }
    return { brand, base: base.size, today: todaySize, status, margin, message };
  });
}
