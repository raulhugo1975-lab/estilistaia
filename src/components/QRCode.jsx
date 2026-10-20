/**
 * Código QR en SVG puro (librería `qrcode-generator`, sin red ni canvas).
 * Se dibuja siempre oscuro sobre blanco, también en modo oscuro,
 * porque es lo que los lectores de QR leen mejor.
 */
import React, { useMemo } from 'react';
import qrcode from 'qrcode-generator';

export function QRCode({ value, size = 208, label = 'Código QR' }) {
  const { path, n } = useMemo(() => {
    const qr = qrcode(0, 'M'); // versión automática, corrección de errores media
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    }
    return { path: d, n: count };
  }, [value]);

  const quiet = 3; // margen blanco que exige el estándar
  const box = n + quiet * 2;
  return (
    <svg viewBox={`${-quiet} ${-quiet} ${box} ${box}`} width={size} height={size} role="img" aria-label={label} className="block rounded-xl">
      <rect x={-quiet} y={-quiet} width={box} height={box} fill="#FFFFFF" />
      <path d={path} fill="#22203A" shapeRendering="crispEdges" />
    </svg>
  );
}
