/**
 * EstilistaIA · Cámara y detección de pose
 * ------------------------------------------------------------
 * - openCamera / stopCamera: getUserMedia con mensajes de error en castellano simple.
 * - loadPoseLandmarker: carga MediaPipe Pose Landmarker SOLO cuando se usa el escaneo
 *   (import dinámico: no pesa en la carga inicial de la app).
 * Todo corre en el dispositivo: ninguna imagen se envía a un servidor.
 */

const MP_VERSION = '1.0.1'; // igual que en package.json
const WASM_URL = import.meta.env.VITE_MEDIAPIPE_WASM_URL || `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MODEL_URL = import.meta.env.VITE_POSE_MODEL_URL || 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';

export const canUseCamera = () => typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;

/** Teléfonos y tablets: el input con capture abre la cámara nativa directo. */
export const isTouchDevice = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

export async function openCamera(video, facingMode = 'user') {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1280 } },
    audio: false,
  });
  video.srcObject = stream;
  video.setAttribute('playsinline', ''); // iOS: no abrir en pantalla completa
  video.muted = true;
  await video.play();
  return stream;
}

export function stopCamera(stream) {
  stream?.getTracks().forEach((t) => t.stop());
}

export function cameraErrorMessage(err) {
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'No tenemos permiso para usar la cámara. Tocá el candado junto a la dirección de la página, permití la cámara y probá de nuevo.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No encontramos una cámara en este dispositivo.';
    case 'NotReadableError':
      return 'Otra app está usando la cámara. Cerrala y probá de nuevo.';
    default:
      return 'No pudimos abrir la cámara. Probá de nuevo o elegí una foto de la galería.';
  }
}

/** Saca una foto del video como Blob JPEG (para el modal de cámara en computadoras). */
export function grabFrame(video, { mirror = false, type = 'image/jpeg', quality = 0.9 } = {}) {
  const c = document.createElement('canvas');
  c.width = video.videoWidth;
  c.height = video.videoHeight;
  const ctx = c.getContext('2d');
  if (mirror) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(video, 0, 0);
  return new Promise((resolve) => c.toBlob(resolve, type, quality));
}

const landmarkers = {};

/**
 * Crea (una sola vez por modo) el detector de pose. GPU si se puede, si no CPU.
 * @param {'VIDEO'|'IMAGE'} runningMode  VIDEO para el escaneo en vivo (con silueta), IMAGE para fotos sueltas.
 */
export function loadPoseLandmarker(runningMode = 'VIDEO') {
  if (!landmarkers[runningMode]) {
    landmarkers[runningMode] = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      const create = (delegate) => PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode,
        numPoses: 1,
        outputSegmentationMasks: runningMode === 'VIDEO',
      });
      try { return await create('GPU'); } catch { return await create('CPU'); }
    })();
    landmarkers[runningMode].catch(() => { delete landmarkers[runningMode]; }); // permitir reintento
  }
  return landmarkers[runningMode];
}

const withTimeout = (promise, ms) => Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/**
 * Centra una foto de cuerpo entero subida a mano: detecta a la persona y recorta
 * para que quede en el medio, de la cabeza a los pies, igual que la foto del escaneo.
 * Si no puede (sin conexión, sin persona visible), devuelve la foto tal cual.
 * @returns {Promise<{ photo: string, centered: boolean }>}
 */
export async function autoCenterPhoto(dataUrl) {
  try {
    const { normFromLandmarks, cropForAvatar } = await import('./bodyMeasure.js');
    const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = dataUrl; });
    const landmarker = await withTimeout(loadPoseLandmarker('IMAGE'), 12000);
    const result = landmarker.detect(img);
    const norm = normFromLandmarks(result.landmarks?.[0]);
    if (!norm) return { photo: dataUrl, centered: false };
    return { photo: cropForAvatar(img, norm), centered: true };
  } catch {
    return { photo: dataUrl, centered: false };
  }
}
