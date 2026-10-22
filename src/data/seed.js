/**
 * EstilistaIA · Datos base
 * ------------------------------------------------------------
 * Catálogos usados por toda la app. Todo es local: no hay backend.
 * Para conectar una API real, reemplazá SEED_WARDROBE por un fetch
 * y mantené la misma forma de objeto (ver typedef Garment).
 */

/**
 * @typedef {Object} Garment
 * @property {string} id
 * @property {string} name
 * @property {'top'|'bottom'|'dress'|'outer'|'shoes'} category
 * @property {'pantalon'|'falda'} [shape]       Solo para category === 'bottom'
 * @property {string} color                      HEX, ej. '#2E3F6E'
 * @property {string[]} seasons                  'calido' | 'templado' | 'frio'
 * @property {string[]} occasions                ids de OCCASIONS
 * @property {number} comfort                    Amigabilidad ante la inflamación 1–5
 * @property {'ELASTIC_BAND'|'DRAWSTRING'|'RIGID_BUTTON'|'NONE'} waistband
 * @property {'ajustado'|'regular'|'holgado'} fit
 * @property {string} fabric
 * @property {string|null} [photo]               dataURL de la miniatura
 */

export const OCCASIONS = [
  { id: 'casa', label: 'En casa' },
  { id: 'trabajo', label: 'Trabajo' },
  { id: 'casual', label: 'Salida casual' },
  { id: 'evento', label: 'Evento o cena' },
  { id: 'deporte', label: 'Actividad física' },
];

export const SEASONS = [
  { id: 'calido', label: 'Cálido' },
  { id: 'templado', label: 'Templado' },
  { id: 'frio', label: 'Frío' },
];

export const CATEGORIES = [
  { id: 'top', label: 'Arriba', long: 'Parte de arriba', search: 'remera' },
  { id: 'bottom', label: 'Abajo', long: 'Parte de abajo', search: 'pantalon' },
  { id: 'dress', label: 'Vestido', long: 'Vestido o enterito', search: 'vestido' },
  { id: 'outer', label: 'Abrigo', long: 'Abrigo o capa externa', search: 'campera' },
  { id: 'shoes', label: 'Calzado', long: 'Calzado', search: 'zapatillas' },
];

export const WAISTBANDS = [
  { id: 'ELASTIC_BAND', label: 'Pretina elástica' },
  { id: 'DRAWSTRING', label: 'Cordón ajustable' },
  { id: 'RIGID_BUTTON', label: 'Botón rígido' },
  { id: 'NONE', label: 'Sin pretina' },
];

export const FITS = [
  { id: 'ajustado', label: 'Ajustado' },
  { id: 'regular', label: 'Regular' },
  { id: 'holgado', label: 'Holgado' },
];

export const FABRICS = ['Algodón', 'Lino', 'Denim', 'Punto', 'Lana', 'Sintético', 'Cuero'];

/** Escala de la cinta de confort (módulo 1). */
export const COMFORT_LEVELS = [
  { level: 1, name: 'Estructurado', hint: 'Cuerpo liviano: podés usar prendas ajustadas y con estructura.' },
  { level: 2, name: 'Entallado cómodo', hint: 'Bien, aunque preferís un poco de margen en la cintura.' },
  { level: 3, name: 'Intermedio', hint: 'Algo de hinchazón: sin botones rígidos ni cortes ceñidos abajo.' },
  { level: 4, name: 'Suelto', hint: 'Prendas fluidas y pretinas que acompañen el cuerpo.' },
  { level: 5, name: 'Confort total', hint: 'Día de cuidado: solo prendas holgadas y elásticas.' },
];

export const SYMPTOMS = [
  { id: 'abdomen', label: 'Hinchazón abdominal' },
  { id: 'retencion', label: 'Retención de líquidos' },
  { id: 'piel', label: 'Piel sensible' },
  { id: 'ciclo', label: 'Ciclo menstrual' },
  { id: 'dolor', label: 'Dolor o rigidez' },
  { id: 'calor', label: 'Mucho calor' },
];

export const STYLES = [
  { id: 'femenino', label: 'Femenino' },
  { id: 'masculino', label: 'Masculino' },
  { id: 'androgino', label: 'Andrógino' },
  { id: 'sin-etiqueta', label: 'Sin etiqueta' },
];

/**
 * Fisionomías. `dims` son semianchos (px) del maniquí SVG:
 * S hombros · B busto/pecho · W cintura · H cadera.
 */
export const BODY_SHAPES = [
  { id: 'recta', label: 'Recta', dims: { S: 50, B: 46, W: 40, H: 47 }, tip: 'Capas abiertas o cinturones suaves dan forma sin apretar.' },
  { id: 'triangulo', label: 'Triángulo', dims: { S: 45, B: 43, W: 37, H: 57 }, tip: 'Luz o detalle arriba y partes de abajo con caída equilibran la silueta.' },
  { id: 'invertido', label: 'Triángulo invertido', dims: { S: 60, B: 53, W: 43, H: 46 }, tip: 'Volumen abajo (palazzos, faldas amplias) equilibra hombros anchos.' },
  { id: 'reloj', label: 'Reloj de arena', dims: { S: 52, B: 51, W: 34, H: 54 }, tip: 'Prendas que acompañan la cintura sin ceñirla funcionan muy bien.' },
  { id: 'oval', label: 'Ovalada', dims: { S: 52, B: 54, W: 55, H: 54 }, tip: 'Capas largas abiertas y telas con caída alargan la silueta.' },
];

export const DEFAULT_PROFILE = {
  name: '',
  style: 'sin-etiqueta',
  bodyShape: 'recta',
  measures: { bust: 92, waist: 76, hip: 98 },
  swellCm: 4,
  sizeCut: 'femenino',
  heightCm: 165,
  body: null,        // { source:'scan'|'manual', heightCm, measures, widthsCm?, shape, precision, scannedAt }
  onboarded: false,
};

/** Guardarropa de ejemplo, pensado para cualquier género. `example: true` = no cuenta para el límite gratuito. */
export const SEED_WARDROBE = [
  { id: 'g1', example: true, name: 'Jean skinny índigo', category: 'bottom', shape: 'pantalon', color: '#2E3F6E', seasons: ['templado', 'frio'], occasions: ['casual', 'trabajo'], comfort: 1, waistband: 'RIGID_BUTTON', fit: 'ajustado', fabric: 'Denim' },
  { id: 'g2', example: true, name: 'Pantalón sastrero gris', category: 'bottom', shape: 'pantalon', color: '#6E6A73', seasons: ['templado', 'frio'], occasions: ['trabajo', 'evento'], comfort: 2, waistband: 'RIGID_BUTTON', fit: 'regular', fabric: 'Sintético' },
  { id: 'g3', example: true, name: 'Palazzo de lino arena', category: 'bottom', shape: 'pantalon', color: '#D8C7A6', seasons: ['calido', 'templado'], occasions: ['casual', 'trabajo', 'evento', 'casa'], comfort: 5, waistband: 'ELASTIC_BAND', fit: 'holgado', fabric: 'Lino' },
  { id: 'g4', example: true, name: 'Jogger de algodón negro', category: 'bottom', shape: 'pantalon', color: '#2A2A2E', seasons: ['templado', 'frio'], occasions: ['casa', 'casual', 'deporte', 'trabajo'], comfort: 5, waistband: 'DRAWSTRING', fit: 'holgado', fabric: 'Algodón' },
  { id: 'g5', example: true, name: 'Falda midi plisada verde', category: 'bottom', shape: 'falda', color: '#3F6B57', seasons: ['calido', 'templado'], occasions: ['trabajo', 'evento', 'casual'], comfort: 4, waistband: 'ELASTIC_BAND', fit: 'holgado', fabric: 'Sintético' },
  { id: 'g6', example: true, name: 'Bermuda cargo oliva', category: 'bottom', shape: 'pantalon', color: '#6B6B3A', seasons: ['calido'], occasions: ['casual', 'casa'], comfort: 4, waistband: 'DRAWSTRING', fit: 'regular', fabric: 'Algodón' },
  { id: 'g7', example: true, name: 'Remera oversize blanca', category: 'top', color: '#F4F4F2', seasons: ['calido', 'templado'], occasions: ['casa', 'casual', 'deporte', 'trabajo'], comfort: 5, waistband: 'NONE', fit: 'holgado', fabric: 'Algodón' },
  { id: 'g8', example: true, name: 'Camisa Oxford celeste', category: 'top', color: '#A9C4E4', seasons: ['calido', 'templado', 'frio'], occasions: ['trabajo', 'casual', 'evento'], comfort: 3, waistband: 'NONE', fit: 'regular', fabric: 'Algodón' },
  { id: 'g9', example: true, name: 'Top ajustado negro', category: 'top', color: '#1C1C20', seasons: ['calido', 'templado'], occasions: ['evento', 'casual'], comfort: 1, waistband: 'NONE', fit: 'ajustado', fabric: 'Sintético' },
  { id: 'g10', example: true, name: 'Sweater de punto bordó', category: 'top', color: '#7A2E3B', seasons: ['templado', 'frio'], occasions: ['trabajo', 'casual', 'casa'], comfort: 4, waistband: 'NONE', fit: 'holgado', fabric: 'Lana' },
  { id: 'g11', example: true, name: 'Musculosa deportiva coral', category: 'top', color: '#E8664A', seasons: ['calido', 'templado'], occasions: ['deporte'], comfort: 3, waistband: 'NONE', fit: 'ajustado', fabric: 'Sintético' },
  { id: 'g12', example: true, name: 'Blazer estructurado negro', category: 'outer', color: '#24232B', seasons: ['templado', 'frio'], occasions: ['trabajo', 'evento'], comfort: 2, waistband: 'NONE', fit: 'regular', fabric: 'Lana' },
  { id: 'g13', example: true, name: 'Kimono liviano terracota', category: 'outer', color: '#B8734A', seasons: ['calido', 'templado'], occasions: ['casual', 'evento', 'trabajo'], comfort: 5, waistband: 'NONE', fit: 'holgado', fabric: 'Lino' },
  { id: 'g14', example: true, name: 'Campera puffer pizarra', category: 'outer', color: '#3B4A5C', seasons: ['frio'], occasions: ['casual', 'casa', 'trabajo', 'deporte'], comfort: 4, waistband: 'NONE', fit: 'holgado', fabric: 'Sintético' },
  { id: 'g15', example: true, name: 'Vestido camisero mostaza', category: 'dress', color: '#C9962E', seasons: ['calido', 'templado'], occasions: ['casual', 'trabajo', 'evento'], comfort: 4, waistband: 'ELASTIC_BAND', fit: 'holgado', fabric: 'Algodón' },
  { id: 'g16', example: true, name: 'Túnica larga de lino azul', category: 'dress', color: '#6F7F9B', seasons: ['calido'], occasions: ['casual', 'casa'], comfort: 5, waistband: 'DRAWSTRING', fit: 'holgado', fabric: 'Lino' },
  { id: 'g17', example: true, name: 'Zapatillas blancas', category: 'shoes', color: '#ECECEA', seasons: ['calido', 'templado', 'frio'], occasions: ['casa', 'casual', 'deporte', 'trabajo'], comfort: 5, waistband: 'NONE', fit: 'regular', fabric: 'Cuero' },
  { id: 'g18', example: true, name: 'Mocasines marrones', category: 'shoes', color: '#6B4A32', seasons: ['calido', 'templado', 'frio'], occasions: ['trabajo', 'evento', 'casual'], comfort: 3, waistband: 'NONE', fit: 'regular', fabric: 'Cuero' },
  { id: 'g19', example: true, name: 'Botas negras', category: 'shoes', color: '#232227', seasons: ['templado', 'frio'], occasions: ['casual', 'evento', 'trabajo'], comfort: 3, waistband: 'NONE', fit: 'regular', fabric: 'Cuero' },
  { id: 'g20', example: true, name: 'Sandalias de cuero', category: 'shoes', color: '#C9B39A', seasons: ['calido'], occasions: ['casa', 'casual', 'evento'], comfort: 5, waistband: 'NONE', fit: 'regular', fabric: 'Cuero' },
];

/**
 * Tablas de talles de referencia (medidas corporales en cm).
 * Son valores aproximados y promediados: cada producto de Shein o Temu
 * publica su propia tabla, que siempre manda sobre esta.
 */
const row = (size, bust, waist, hip) => ({ size, bust, waist, hip });

export const SIZE_CHARTS = {
  femenino: {
    Argentina: [row('1 (S)', 86, 66, 92), row('2 (M)', 90, 70, 96), row('3 (L)', 94, 74, 100), row('4 (XL)', 98, 78, 104), row('5 (XXL)', 104, 84, 110), row('6 (XXXL)', 110, 90, 116)],
    Shein: [row('XS', 82, 62, 88), row('S', 86, 66, 92), row('M', 90, 70, 96), row('L', 96, 76, 102), row('XL', 102, 82, 108), row('XXL', 108, 88, 114), row('XXXL', 114, 94, 120)],
    Temu: [row('XS', 80, 60, 86), row('S', 84, 64, 90), row('M', 88, 68, 94), row('L', 94, 74, 100), row('XL', 100, 80, 106), row('XXL', 106, 86, 112), row('XXXL', 112, 92, 118)],
    USA: [row('XS (0–2)', 83, 65, 90), row('S (4–6)', 88, 70, 95), row('M (8–10)', 93, 75, 100), row('L (12–14)', 99, 81, 106), row('XL (16–18)', 106, 88, 113), row('XXL (20)', 113, 95, 120)],
    Europa: [row('34', 80, 62, 86), row('36', 84, 66, 90), row('38', 88, 70, 94), row('40', 92, 74, 98), row('42', 96, 78, 102), row('44', 100, 82, 106), row('46', 106, 88, 112), row('48', 112, 94, 118)],
  },
  masculino: {
    Argentina: [row('S', 94, 80, 96), row('M', 100, 86, 102), row('L', 106, 92, 108), row('XL', 112, 98, 114), row('XXL', 118, 104, 120), row('XXXL', 124, 110, 126)],
    Shein: [row('S', 92, 76, 94), row('M', 98, 82, 100), row('L', 104, 88, 106), row('XL', 110, 94, 112), row('XXL', 116, 100, 118), row('XXXL', 122, 106, 124)],
    Temu: [row('S', 90, 74, 92), row('M', 96, 80, 98), row('L', 102, 86, 104), row('XL', 108, 92, 110), row('XXL', 114, 98, 116), row('XXXL', 120, 104, 122)],
    USA: [row('S', 91, 76, 94), row('M', 99, 84, 100), row('L', 107, 91, 107), row('XL', 117, 99, 115), row('XXL', 127, 109, 125)],
    Europa: [row('46', 92, 80, 96), row('48', 96, 84, 100), row('50', 100, 88, 104), row('52', 104, 92, 108), row('54', 108, 96, 112), row('56', 112, 100, 116), row('58', 116, 104, 120)],
  },
};

/** Nombre de la línea de talles grandes de cada marca, para sugerirla cuando la tabla no alcanza. */
export const PLUS_LINES = { Shein: 'SHEIN Curve', Temu: 'la sección de talles plus de Temu', USA: 'talles plus (1X–4X)', Europa: 'talles grandes (50+)', Argentina: 'talles especiales (Ley de Talles 27.521)' };
