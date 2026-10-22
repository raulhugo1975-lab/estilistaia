/**
 * Botones para agregar una foto.
 *   Principal  → abre la cámara directo:
 *                · teléfonos/tablets: <input capture> abre la cámara nativa en un toque;
 *                · computadoras: un visor propio con getUserMedia.
 *   Secundario → elegir una foto de la galería o del disco.
 */
import React, { useEffect, useRef, useState } from 'react';
import { cameraErrorMessage, canUseCamera, grabFrame, isTouchDevice, openCamera, stopCamera } from '../lib/camera.js';
import { Button, Icon, Modal } from './ui.jsx';

/** Visor de cámara para computadoras (en teléfonos se usa la cámara nativa). */
export function CameraModal({ open, onClose, onCapture, facing = 'environment', title = 'Sacá la foto' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [mode, setMode] = useState(facing);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setReady(false);
    setError('');
    openCamera(videoRef.current, mode)
      .then((s) => { if (cancelled) stopCamera(s); else { streamRef.current = s; setReady(true); } })
      .catch((e) => !cancelled && setError(cameraErrorMessage(e)));
    return () => { cancelled = true; stopCamera(streamRef.current); streamRef.current = null; };
  }, [open, mode]);

  async function shoot() {
    const blob = await grabFrame(videoRef.current, { mirror: mode === 'user' });
    onCapture(blob);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: '3 / 4' }}>
          <video ref={videoRef} className="h-full w-full object-cover" style={{ transform: mode === 'user' ? 'scaleX(-1)' : undefined }} playsInline muted />
          {!ready && !error && <p className="absolute inset-0 flex items-center justify-center text-white">Abriendo la cámara…</p>}
          {error && <p role="alert" className="absolute inset-0 flex items-center justify-center p-6 text-center text-white">{error}</p>}
        </div>
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => setMode((m) => (m === 'user' ? 'environment' : 'user'))}>Cambiar cámara</Button>
          <button type="button" onClick={shoot} disabled={!ready} aria-label="Sacar foto"
            className="h-16 w-16 rounded-full border-4 border-[var(--surface)] bg-accent shadow-[0_0_0_2px_var(--ink)] disabled:opacity-40" />
          <span className="w-[7.5rem]" aria-hidden="true" />
        </div>
      </div>
    </Modal>
  );
}

/**
 * @param {(file: Blob) => void} onPick  recibe la foto elegida o sacada
 * @param {string} cameraLabel           texto del botón principal
 * @param {boolean} [stacked]            botones uno debajo del otro (pantallas angostas)
 */
export function PhotoPicker({ onPick, cameraLabel = 'Sacar foto', galleryLabel = 'Elegir de la galería', facing = 'environment', stacked = false, size = 'lg' }) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const touch = isTouchDevice();
  const useNativeCapture = touch || !canUseCamera();
  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir la misma foto
    if (file) onPick(file);
  };
  const big = size === 'lg' ? 'min-h-[3.5rem] px-5 text-[1.05rem]' : 'min-h-[3rem] px-4';

  return (
    <div className={`flex gap-2 ${stacked ? 'flex-col' : 'flex-wrap'}`}>
      {useNativeCapture ? (
        <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-accent font-bold text-accent-ink hover:brightness-110 focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${big}`}>
          <Icon name="camera" className="h-6 w-6" /> {cameraLabel}
          <input type="file" accept="image/*" capture={facing} className="sr-only" onChange={pick} />
        </label>
      ) : (
        <Button className={big} onClick={() => setCameraOpen(true)}><Icon name="camera" className="h-6 w-6" /> {cameraLabel}</Button>
      )}
      <label className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-line bg-surface font-bold text-ink hover:border-ink focus-within:outline focus-within:outline-[3px] focus-within:outline-offset-2 focus-within:outline-[var(--accent)] ${big}`}>
        <Icon name="upload" className="h-5 w-5" /> {galleryLabel}
        <input type="file" accept="image/*" className="sr-only" onChange={pick} />
      </label>
      {!useNativeCapture && <CameraModal open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={onPick} facing={facing} />}
    </div>
  );
}
