/**
 * EstilistaIA · Clima automático
 * ------------------------------------------------------------
 * - Ubicación: geolocalización del navegador (se pide con un toque la primera vez;
 *   después es automática). Si la persona no da permiso, puede escribir su ciudad.
 * - Clima: Open-Meteo (gratis, sin clave). Nombre de la ciudad: BigDataCloud (gratis, sin clave).
 * - Privacidad: las coordenadas se redondean a 2 decimales (~1 km) antes de guardarlas o enviarlas.
 * - Caché: 30 minutos en el dispositivo.
 */
import { useCallback, useEffect, useState } from 'react';
import { usePersistentState } from '../hooks/usePersistentState.js';

const TTL = 30 * 60 * 1000;
const round = (n) => Math.round(n * 100) / 100;

/** Códigos WMO → texto corto, frase para la recomendación ("Hoy hace 18°C y está nublado") e ícono. */
export function describeWeather(code) {
  if (code === 0) return { label: 'Despejado', phrase: 'está despejado', icon: 'sun' };
  if (code <= 2) return { label: 'Parcialmente nublado', phrase: 'está parcialmente nublado', icon: 'partly' };
  if (code === 3) return { label: 'Nublado', phrase: 'está nublado', icon: 'cloud' };
  if (code === 45 || code === 48) return { label: 'Con niebla', phrase: 'hay niebla', icon: 'fog' };
  if (code >= 51 && code <= 57) return { label: 'Con llovizna', phrase: 'llovizna', icon: 'rain' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { label: 'Con lluvia', phrase: 'llueve', icon: 'rain' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { label: 'Con nieve', phrase: 'nieva', icon: 'snow' };
  if (code >= 95) return { label: 'Con tormenta', phrase: 'hay tormenta', icon: 'storm' };
  return { label: 'Variable', phrase: 'está variable', icon: 'partly' };
}

/** Temperatura "de vestir": promedio entre la sensación térmica actual y la máxima del día. */
export const dressTemp = (w) => Math.round((w.feels + w.max) / 2);

/** Clima del motor de outfits a partir de la temperatura. */
export function seasonFromWeather(w) {
  const t = dressTemp(w);
  return t >= 24 ? 'calido' : t >= 14 ? 'templado' : 'frio';
}

export const isRainy = (w) => !!w && (w.rainProb >= 50 || ['rain', 'storm', 'snow'].includes(describeWeather(w.code).icon));

export async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + '&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m'
    + '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1';
  const res = await fetch(url);
  if (!res.ok) throw new Error('clima');
  const d = await res.json();
  return {
    temp: Math.round(d.current.temperature_2m),
    feels: Math.round(d.current.apparent_temperature),
    code: d.current.weather_code,
    isDay: d.current.is_day === 1,
    wind: Math.round(d.current.wind_speed_10m),
    max: Math.round(d.daily.temperature_2m_max[0]),
    min: Math.round(d.daily.temperature_2m_min[0]),
    rainProb: d.daily.precipitation_probability_max?.[0] ?? 0,
    fetchedAt: Date.now(),
  };
}

async function placeName(lat, lon) {
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=es`);
    const d = await res.json();
    return d.city || d.locality || d.principalSubdivision || '';
  } catch {
    return '';
  }
}

/** Búsqueda de ciudades para quien no comparte su ubicación. */
export async function searchCity(q) {
  if (q.trim().length < 2) return [];
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=5&language=es&format=json`);
  const d = await res.json();
  return (d.results || []).map((r) => ({ name: r.name, detail: [r.admin1, r.country].filter(Boolean).join(', '), lat: round(r.latitude), lon: round(r.longitude) }));
}

/**
 * @returns {{ weather, place, status, season, rainy, locate: () => Promise<object|null>, setCity: (c) => Promise<object|null> }}
 * status: idle | locating | loading | ready | denied | error
 */
export function useWeather() {
  const [saved, setSaved] = usePersistentState('estilistaia:weather', { coords: null, place: '', data: null });
  const [status, setStatus] = useState(saved.data ? 'ready' : 'idle');

  const load = useCallback(async (coords, place) => {
    setStatus('loading');
    try {
      const [data, name] = await Promise.all([fetchWeather(coords.lat, coords.lon), place ? Promise.resolve(place) : placeName(coords.lat, coords.lon)]);
      setSaved({ coords, place: name, data });
      setStatus('ready');
      return data;
    } catch {
      setStatus('error');
      return null;
    }
  }, [setSaved]);

  /** Pide la ubicación (el navegador muestra su permiso la primera vez). */
  const locate = useCallback(() => new Promise((resolve) => {
    if (!navigator.geolocation) { setStatus('denied'); resolve(null); return; }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => load({ lat: round(pos.coords.latitude), lon: round(pos.coords.longitude) }).then(resolve),
      () => { setStatus('denied'); resolve(null); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: TTL },
    );
  }), [load]);

  const setCity = useCallback((c) => load({ lat: c.lat, lon: c.lon }, c.name), [load]);

  // Al abrir: si el clima guardado está viejo, se actualiza solo. Si nunca hubo, y el
  // permiso de ubicación ya fue dado antes, se detecta sin preguntar.
  useEffect(() => {
    if (saved.coords) {
      if (!saved.data || Date.now() - saved.data.fetchedAt > TTL) load(saved.coords, saved.place);
      return;
    }
    navigator.permissions?.query({ name: 'geolocation' })
      .then((p) => { if (p.state === 'granted') locate(); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const weather = saved.data;
  return {
    weather,
    place: saved.place,
    status,
    season: weather ? seasonFromWeather(weather) : null,
    rainy: isRainy(weather),
    locate,
    setCity,
  };
}
