/**
 * EstilistaIA · Adaptación por género
 * ------------------------------------------------------------
 * Un único lugar decide qué ve cada perfil. Las pantallas no preguntan
 * "¿es hombre?": piden la configuración con getGenderConfig(style).
 *
 *   femenino   → todas las opciones, tablas de talles de mujer, "busto".
 *   masculino  → sin vestidos ni faldas, sin síntomas del ciclo, siluetas
 *                masculinas, tablas de hombre, "pecho".
 *   neutro     → todas las opciones y el usuario elige la tabla de talles.
 */
import { BODY_SHAPES, CATEGORIES, SEED_WARDROBE, SYMPTOMS } from '../data/seed.js';

export const GENDERS = [
  { id: 'femenino', label: 'Femenino', hint: 'Ropa y talles de mujer' },
  { id: 'masculino', label: 'Masculino', hint: 'Ropa y talles de hombre' },
  { id: 'neutro', label: 'Neutro', hint: 'Todas las opciones' },
];

/** Perfiles guardados con versiones anteriores ('androgino', 'sin-etiqueta') se tratan como neutro. */
export const genderOf = (style) => (style === 'femenino' || style === 'masculino' ? style : 'neutro');

/** Siluetas masculinas: mismas claves que el motor, nombres y proporciones propias. */
const SHAPES_MASCULINO = [
  { id: 'recta', label: 'Rectangular', dims: { S: 54, B: 48, W: 44, H: 46 }, tip: 'Camisas con algo de estructura en los hombros y capas abiertas dan forma.' },
  { id: 'invertido', label: 'Atlética (en V)', dims: { S: 62, B: 54, W: 42, H: 44 }, tip: 'Pantalones rectos o algo más anchos equilibran los hombros.' },
  { id: 'triangulo', label: 'Triangular', dims: { S: 49, B: 47, W: 46, H: 52 }, tip: 'Hombros con estructura y pantalones rectos oscuros equilibran la figura.' },
  { id: 'oval', label: 'Ovalada', dims: { S: 54, B: 56, W: 57, H: 52 }, tip: 'Capas abiertas y un mismo color de arriba a abajo alargan la figura.' },
];

/** Ejemplos extra para el guardarropa masculino (reemplazan vestidos y faldas). */
const EXTRA_MASCULINO = [
  { id: 'gm1', example: true, name: 'Chomba azul marino', category: 'top', color: '#25324D', seasons: ['calido', 'templado'], occasions: ['casual', 'trabajo'], comfort: 4, waistband: 'NONE', fit: 'regular', fabric: 'Algodón' },
  { id: 'gm2', example: true, name: 'Pantalón chino beige', category: 'bottom', shape: 'pantalon', color: '#C8B48F', seasons: ['calido', 'templado', 'frio'], occasions: ['trabajo', 'casual', 'evento'], comfort: 2, waistband: 'RIGID_BUTTON', fit: 'regular', fabric: 'Algodón' },
  { id: 'gm3', example: true, name: 'Bermuda de jogging gris', category: 'bottom', shape: 'pantalon', color: '#8A8A8F', seasons: ['calido'], occasions: ['casa', 'casual', 'deporte'], comfort: 5, waistband: 'DRAWSTRING', fit: 'holgado', fabric: 'Algodón' },
];

const CONFIG = {
  femenino: {
    symptoms: ['abdomen', 'retencion', 'piel', 'ciclo', 'dolor', 'calor'],
    categories: ['top', 'bottom', 'dress', 'outer', 'shoes'],
    bottomShapes: [{ id: 'pantalon', label: 'Pantalón o short' }, { id: 'falda', label: 'Falda' }],
    chest: 'Busto',
    chestHint: 'Por la parte más ancha del busto.',
    shapes: BODY_SHAPES,
    sizeCut: 'femenino',
  },
  masculino: {
    symptoms: ['abdomen', 'piel', 'dolor', 'calor'],
    categories: ['top', 'bottom', 'outer', 'shoes'],
    bottomShapes: [{ id: 'pantalon', label: 'Pantalón' }, { id: 'short', label: 'Short o bermuda' }],
    chest: 'Pecho',
    chestHint: 'Por la parte más ancha del pecho, debajo de las axilas.',
    shapes: SHAPES_MASCULINO,
    sizeCut: 'masculino',
  },
  neutro: {
    symptoms: ['abdomen', 'retencion', 'piel', 'ciclo', 'dolor', 'calor'],
    categories: ['top', 'bottom', 'dress', 'outer', 'shoes'],
    bottomShapes: [{ id: 'pantalon', label: 'Pantalón o short' }, { id: 'falda', label: 'Falda' }],
    chest: 'Busto o pecho',
    chestHint: 'Por la parte más ancha.',
    shapes: BODY_SHAPES,
    sizeCut: null, // la persona elige la tabla
  },
};

/**
 * @param {string} style  profile.style
 * @param {string} [currentCategory] para no ocultar la categoría de una prenda que ya existe
 */
export function getGenderConfig(style, currentCategory) {
  const g = genderOf(style);
  const c = CONFIG[g];
  return {
    gender: g,
    symptoms: SYMPTOMS.filter((s) => c.symptoms.includes(s.id)),
    categories: CATEGORIES.filter((cat) => c.categories.includes(cat.id) || cat.id === currentCategory),
    bottomShapes: c.bottomShapes,
    chestLabel: c.chest,
    chestHint: c.chestHint,
    shapes: c.shapes,
    sizeCut: c.sizeCut,
    /** Silueta válida para este género (ej. "reloj de arena" no existe en la lista masculina). */
    shapeFor: (id) => (c.shapes.some((s) => s.id === id) ? id : g === 'masculino' && id === 'reloj' ? 'invertido' : c.shapes[0].id),
    shapeInfo: (id) => c.shapes.find((s) => s.id === id) || c.shapes[0],
  };
}

/** Guardarropa de ejemplo coherente con el género. */
export function examplesFor(style) {
  if (genderOf(style) !== 'masculino') return SEED_WARDROBE;
  return SEED_WARDROBE
    .filter((g) => g.category !== 'dress' && g.shape !== 'falda' && g.id !== 'g9') // sin vestidos, faldas ni top ajustado
    .concat(EXTRA_MASCULINO);
}

/** Síntomas que ya no aplican al cambiar de género se quitan de la selección del día. */
export const cleanSymptoms = (symptoms, style) => {
  const allowed = CONFIG[genderOf(style)].symptoms;
  return symptoms.filter((s) => allowed.includes(s));
};
