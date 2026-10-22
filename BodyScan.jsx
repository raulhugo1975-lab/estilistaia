/**
 * Escaneo corporal guiado (1 minuto)
 * ------------------------------------------------------------
 * Pasos: consejos + altura → foto de frente → foto de perfil (opcional)
 *        → resultado editable → guardar.
 * La app guía con mensajes en vivo ("alejate un paso", "girá de costado")
 * y saca la foto sola con una cuenta regresiva cuando el encuadre es correcto,
 * así se puede hacer con el teléfono apoyado y sin ayuda.
 * Alternativa sin cámara: escribir las medidas a mano.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BODY_SHAPES } from '../data/seed.js';
import { checkFraming, computeBody, cropForAvatar, dimsFromBody, measureShot, classifyShape } from '../lib/bodyMeasure.js';
import { cameraErrorMessage, canUseCamera, loadPoseLandmarker, openCamera, stopCamera } from '../lib/camera.js';
import { Mannequin } from './Mannequin.jsx';
import { Button, Icon, Modal, NumberField } from './ui.jsx';

const HOLD_MS = 1200;  // tiempo con buen encuadre antes de la cuenta regresiva
const COUNTDOWN = 3;

const TIPS = [
  { icon: 'shirt', title: 'Ropa que marque tu forma', text: 'Calza, remera o ropa deportiva. La ropa muy suelta agranda las medidas.' },
  { icon: 'today', title: 'Buena luz y fondo liso', text: 'Una pared clara, sin muebles ni personas detrás.' },
  { icon: 'phone', title: 'Apoyá el teléfono', text: 'A la altura de la cintura, a unos 2 o 3 pasos. La app saca la foto sola.' },
];

/* ─── Visor en vivo: detecta la pose, guía y captura ─── */
function LiveCapture({ view, onShot, onSkip, onError }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [guide, setGuide] = useState({ ok: false, msg: 'Preparando la cámara…' });
  const [count, setCount] = useState(null);
  const [facing, setFacing] = useState('user');

  useEffect(() => {
    let stream, raf, stopped = false;
    let okSince = 0, last = 0, countStart = 0, wantShot = false;
    const video = videoRef.current;

    (async () => {
      try {
        const [landmarker, s] = await Promise.all([loadPoseLandmarker(), openCamera(video, facing)]);
        stream = s;
        if (stopped) { stopCamera(s); return; }
        setGuide({ ok: false, msg: view === 'front' ? 'Ponete de frente, con los brazos un poco separados.' : 'Ahora girá y quedate de costado.' });

        const loop = () => {
          if (stopped) return;
          const now = performance.now();
          if (video.readyState >= 2 && now - last > 66) {
            last = now;
            landmarker.detectForVideo(video, now, (res) => {
              const lm = res.landmarks?.[0];
              drawSkeleton(canvasRef.current, video, lm);
              if (wantShot && lm && res.segmentationMasks?.[0]) {
                const m = res.segmentationMasks[0];
                const frame = document.createElement('canvas');
                frame.width = video.videoWidth; frame.height = video.videoHeight;
                frame.getContext('2d').drawImage(video, 0, 0);
                const shot = { mask: new Float32Array(m.getAsFloat32Array()), w: m.width, h: m.height, lm: lm.map((p) => ({ ...p })), frame };
                stopped = true;
                onShot(shot);
                return;
              }
              const g = checkFraming(lm, view);
              if (!g.ok) { okSince = 0; countStart = 0; setCount(null); setGuide(g); return; }
              if (!okSince) okSince = now;
              if (now - okSince < HOLD_MS) { setGuide(g); return; }
              if (!countStart) countStart = now;
              const left = COUNTDOWN - Math.floor((now - countStart) / 1000);
              setCount(left > 0 ? left : null);
              setGuide({ ok: true, msg: left > 0 ? 'No te muevas…' : '¡Listo!' });
              if (left <= 0) wantShot = true;
            });
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch (e) {
        onError(e?.name ? cameraErrorMessage(e) : 'No pudimos cargar el escáner. Revisá tu conexión y probá de nuevo, o escribí tus medidas.');
      }
    })();

    return () => { stopped = true; cancelAnimationFrame(raf); stopCamera(stream); };
  }, [view, facing]); // eslint-disable-line react-hooks/exhaustive-deps

  const mirror = facing === 'user' ? { transform: 'scaleX(-1)' } : undefined;
  return (
    <div className="space-y-4">
      <p className="text-sm font-bold text-muted">{view === 'front' ? 'Paso 1 de 2: de frente' : 'Paso 2 de 2: de costado'}</p>
      <div className="relative mx-auto overflow-hidden rounded-3xl bg-black" style={{ aspectRatio: '3 / 4', maxHeight: '62dvh' }}>
        <video ref={videoRef} className="h-full w-full object-contain" style={mirror} playsInline muted />
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" style={{ ...mirror, objectFit: 'contain' }} />
        {/* Silueta guía: dónde ubicarse */}
        <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <rect x="60" y="14" width="180" height="372" rx="90" fill="none" stroke={guide.ok ? '#5BD39A' : 'rgba(255,255,255,.55)'} strokeWidth="3" strokeDasharray="10 8" />
        </svg>
        {count && (
          <span className="absolute inset-0 flex items-center justify-center font-display text-[7rem] font-bold text-white" style={{ textShadow: '0 4px 24px rgba(0,0,0,.5)' }} aria-hidden="true">{count}</span>
        )}
        <p role="status" aria-live="polite" className={`absolute inset-x-3 bottom-3 rounded-2xl px-4 py-3 text-center text-[1.05rem] font-bold ${guide.ok ? 'bg-ok text-white' : 'bg-black/70 text-white'}`}>
          {count ? `Foto en ${count}…` : guide.msg}
        </p>
      </div>
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="ghost" onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}>Cambiar cámara</Button>
        {onSkip && <Button variant="secondary" onClick={onSkip}>Saltar este paso</Button>}
      </div>
    </div>
  );
}

/** Puntos del cuerpo sobre el video, para que la persona vea que la app la "ve". */
function drawSkeleton(canvas, video, lm) {
  if (!canvas || !video.videoWidth) return;
  if (canvas.width !== video.videoWidth) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!lm) return;
  const pairs = [[11, 12], [11, 23], [12, 24], [23, 24], [11, 13], [13, 15], [12, 14], [14, 16], [23, 25], [25, 27], [24, 26], [26, 28]];
  ctx.strokeStyle = 'rgba(243, 203, 78, .9)';
  ctx.lineWidth = Math.max(3, canvas.width / 200);
  ctx.lineCap = 'round';
  for (const [a, b] of pairs) {
    if ((lm[a].visibility ?? 0) < 0.5 || (lm[b].visibility ?? 0) < 0.5) continue;
    ctx.beginPath();
    ctx.moveTo(lm[a].x * canvas.width, lm[a].y * canvas.height);
    ctx.lineTo(lm[b].x * canvas.width, lm[b].y * canvas.height);
    ctx.stroke();
  }
}

/* ─── Flujo completo ─── */

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {number} props.initialHeight
 * @param {object} props.initialMeasures  { bust, waist, hip }
 * @param {(body: object, photo: string|null) => void} props.onSave
 * @param {'scan'|'manual'} [props.startWith]
 */
export function BodyScan({ open, onClose, onSave, initialHeight = 165, initialMeasures, startWith = 'scan' }) {
  const [step, setStep] = useState('intro');   // intro | front | side | result | manual | error
  const [height, setHeight] = useState(initialHeight);
  const [front, setFront] = useState(null);     // { m: medición, shot }
  const [body, setBody] = useState(null);
  const [usePhoto, setUsePhoto] = useState(true);
  const [error, setError] = useState('');
  const [manual, setManual] = useState(initialMeasures || { bust: 92, waist: 76, hip: 98 });
  const cameraOk = canUseCamera();

  useEffect(() => {
    if (!open) return;
    setStep(startWith === 'manual' || !cameraOk ? 'manual' : 'intro');
    setFront(null); setBody(null); setError('');
    setHeight(initialHeight);
    if (initialMeasures) setManual(initialMeasures);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = useCallback((frontData, sideMeasure) => {
    const result = computeBody({ front: frontData.m, side: sideMeasure, heightCm: height });
    result.photo = cropForAvatar(frontData.shot.frame, frontData.m.norm);
    setBody(result);
    setStep('result');
  }, [height]);

  function onFrontShot(shot) {
    try {
      const m = measureShot(shot);
      if (m.pxHeight < shot.h * 0.4) throw new Error('lejos');
      const data = { m, shot };
      setFront(data);
      setStep('side');
    } catch {
      setError('No pudimos medir bien esa foto. Probá de nuevo con más luz y que se vea todo tu cuerpo.');
      setStep('error');
    }
  }
  function onSideShot(shot) {
    try { finish(front, measureShot(shot)); } catch { finish(front, null); }
  }

  const editMeasure = (k, v) => setBody((b) => {
    const measures = { ...b.measures, [k]: v };
    return { ...b, measures, shape: classifyShape(measures) };
  });

  function save() {
    const { photo, ...rest } = body;
    onSave(rest, usePhoto ? photo : null);
    onClose();
  }
  function saveManual() {
    const measures = { bust: manual.bust, waist: manual.waist, hip: manual.hip };
    onSave({ source: 'manual', heightCm: height, measures, shape: classifyShape(measures), precision: 'manual', scannedAt: new Date().toISOString() }, null);
    onClose();
  }

  const shapeInfo = body && BODY_SHAPES.find((s) => s.id === body.shape);
  const previewDims = (b) => dimsFromBody(b);

  return (
    <Modal open={open} onClose={onClose} title={step === 'manual' ? 'Tus medidas' : 'Escaneá tu cuerpo'} wide>
      {step === 'intro' && (
        <div className="space-y-6">
          <p className="text-[1.1rem] leading-relaxed">En 1 minuto armamos un avatar con tus medidas. Lo usamos en el probador y para recomendarte talles.</p>
          <ol className="grid gap-3 sm:grid-cols-3">
            {TIPS.map((t, i) => (
              <li key={t.title} className="rounded-2xl bg-sunk p-4">
                <p className="font-display text-3xl font-semibold text-accent">{i + 1}</p>
                <p className="mt-1 font-bold">{t.title}</p>
                <p className="mt-1 text-[0.95rem] text-muted">{t.text}</p>
              </li>
            ))}
          </ol>
          <div className="max-w-[16rem]">
            <NumberField label="¿Cuánto medís?" value={height} min={120} max={220} onChange={setHeight} hint="La usamos para convertir la foto en centímetros." />
          </div>
          <p className="flex gap-2 rounded-2xl border border-line p-4 text-[0.95rem]">
            <Icon name="lock" className="mt-0.5 h-5 w-5 shrink-0 text-ok" />
            Las fotos se procesan en tu teléfono y no se suben a internet. Podés borrarlas cuando quieras.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" className="sm:flex-1" disabled={height < 120 || height > 220} onClick={() => setStep('front')}><Icon name="camera" className="h-6 w-6" /> Empezar el escaneo</Button>
            <Button size="lg" variant="secondary" onClick={() => setStep('manual')}>Prefiero escribir mis medidas</Button>
          </div>
        </div>
      )}

      {step === 'front' && <LiveCapture view="front" onShot={onFrontShot} onError={(m) => { setError(m); setStep('error'); }} />}
      {step === 'side' && <LiveCapture view="side" onShot={onSideShot} onSkip={() => finish(front, null)} onError={() => finish(front, null)} />}

      {step === 'error' && (
        <div className="space-y-5 py-2">
          <p role="alert" className="rounded-2xl bg-warn-soft px-5 py-4 text-[1.05rem]">{error}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {cameraOk && <Button size="lg" onClick={() => setStep('front')}>Probar de nuevo</Button>}
            <Button size="lg" variant="secondary" onClick={() => setStep('manual')}>Escribir mis medidas</Button>
          </div>
        </div>
      )}

      {step === 'result' && body && (
        <div className="grid gap-6 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
          <div className="mx-auto w-full max-w-[13rem] space-y-2">
            <div className="rounded-3xl bg-sunk p-2"><Mannequin shapeId={body.shape} custom={previewDims(body)} className="h-auto w-full" label="Tu avatar con las medidas del escaneo" /></div>
            <p className="text-center text-sm text-muted">Tu avatar</p>
          </div>
          <div className="space-y-5">
            <div>
              <p className="font-display text-2xl font-semibold">¡Listo! Tu silueta es {shapeInfo?.label.toLowerCase()}.</p>
              <p className="mt-1 text-muted">{shapeInfo?.tip}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <NumberField label="Busto o pecho" value={body.measures.bust} onChange={(v) => editMeasure('bust', v)} />
              <NumberField label="Cintura" value={body.measures.waist} onChange={(v) => editMeasure('waist', v)} />
              <NumberField label="Cadera" value={body.measures.hip} onChange={(v) => editMeasure('hip', v)} />
            </div>
            <p className="text-[0.95rem] text-muted">
              {body.precision === 'alta' ? 'Medimos de frente y de perfil: el margen es de unos 3 cm.' : 'Medimos solo de frente: el margen es de unos 5 cm.'} Si tenés un centímetro a mano, podés corregir los números.
            </p>
            {body.warnings.filter((w) => !w.startsWith('Sin foto')).map((w) => <p key={w} className="rounded-xl bg-warn-soft px-4 py-2 text-[0.95rem]">{w}</p>)}
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4">
              <input type="checkbox" checked={usePhoto} onChange={(e) => setUsePhoto(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--accent)]" />
              <span><b>Usar mi foto de frente en el probador</b><br /><span className="text-[0.95rem] text-muted">Queda guardada solo en este dispositivo.</span></span>
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button size="lg" className="sm:flex-1" onClick={save}><Icon name="check" className="h-6 w-6" /> Guardar mi cuerpo</Button>
              <Button size="lg" variant="secondary" onClick={() => setStep('front')}>Repetir</Button>
            </div>
          </div>
        </div>
      )}

      {step === 'manual' && (
        <div className="space-y-6">
          {!cameraOk && <p className="rounded-2xl bg-sunk px-4 py-3">Este navegador no permite usar la cámara, así que vamos con las medidas.</p>}
          <p className="text-[1.05rem]">Usá un centímetro de costura. Medí sobre ropa fina, sin apretar.</p>
          <ol className="grid gap-4 sm:grid-cols-2">
            <li><NumberField label="1. Altura" value={height} min={120} max={220} onChange={setHeight} /></li>
            <li><NumberField label="2. Busto o pecho" value={manual.bust} onChange={(v) => setManual((m) => ({ ...m, bust: v }))} hint="Por la parte más ancha." /></li>
            <li><NumberField label="3. Cintura" value={manual.waist} onChange={(v) => setManual((m) => ({ ...m, waist: v }))} hint="Por la parte más angosta, arriba del ombligo." /></li>
            <li><NumberField label="4. Cadera" value={manual.hip} onChange={(v) => setManual((m) => ({ ...m, hip: v }))} hint="Por la parte más ancha de la cola." /></li>
          </ol>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button size="lg" className="sm:flex-1" onClick={saveManual}><Icon name="check" className="h-6 w-6" /> Guardar mis medidas</Button>
            {cameraOk && <Button size="lg" variant="secondary" onClick={() => setStep('intro')}>Mejor escanear</Button>}
          </div>
        </div>
      )}
    </Modal>
  );
}
