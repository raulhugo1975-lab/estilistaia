# Escaneo corporal y probador: arquitectura

## Qué hace hoy (funciona en el navegador, gratis, sin servidor)

```
Cámara (getUserMedia) ──► MediaPipe Pose Landmarker (WASM + GPU, en el dispositivo)
                              │  33 puntos del cuerpo + máscara de silueta
                              ▼
               src/lib/bodyMeasure.js (funciones puras)
               · checkFraming()  → guía en vivo ("alejate un paso", "girá de costado")
               · measureShot()   → anchos de pecho, cintura y cadera en píxeles
               · computeBody()   → cm con la altura real; contorno = elipse ancho × profundidad
               · classifyShape() → silueta (recta, triángulo, invertido, reloj, ovalada)
               · dimsFromBody()  → semianchos del avatar SVG
               · cropForAvatar() → recorta la foto para que las prendas caigan alineadas
                              ▼
  profile.body (se sincroniza en Supabase) · foto de frente (SOLO en el dispositivo)
```

- **Flujo:** consejos y altura → foto de frente → foto de perfil (opcional) → resultado editable.
  La foto se saca sola con cuenta regresiva cuando el encuadre es correcto.
- **Precisión esperable:** unos ±3 cm con frente y perfil, y unos ±5 cm solo de frente. Por eso el
  resultado siempre se puede corregir. Mejora con ropa ajustada, buena luz y fondo liso.
- **Privacidad:** ninguna imagen sale del dispositivo. En Supabase solo se guardan las medidas
  (`user_state.data.profile.body`).
- **Peso:** MediaPipe se carga recién al tocar "Escanear" (import dinámico, un archivo aparte de unos 44 kB
  gzip, más el WASM y el modelo de unos 9 MB que el navegador guarda en caché).

### Servir MediaPipe desde tu dominio (opcional)
1. Copiá `node_modules/@mediapipe/tasks-vision/wasm/*` a `public/mediapipe/wasm/`.
2. Descargá `pose_landmarker_full.task` (de la URL que figura en `src/lib/camera.js`) a `public/mediapipe/`.
3. Cargá en Vercel `VITE_MEDIAPIPE_WASM_URL=/mediapipe/wasm` y `VITE_POSE_MODEL_URL=/mediapipe/pose_landmarker_full.task`.

### Requisitos del navegador
- HTTPS (Vercel ya lo da). En `localhost` también funciona.
- iOS 15 o más nuevo con Safari, o Chrome o Edge actuales. Sin cámara, la app ofrece escribir las medidas.

## Próximo nivel: prueba fotorrealista (no incluida)

El probador actual dibuja las prendas como capas sobre tu avatar o tu foto alineada. Para que la ropa
**se vea puesta** sobre la foto, con pliegues y caída, hace falta un modelo generativo de *virtual try-on*
(familia de modelos de difusión tipo IDM-VTON). Eso no corre en el navegador, así que la arquitectura sería:

```
App ─► POST /api/tryon (Vercel, con el token de Supabase; solo Premium)
         ├─ sube foto de cuerpo y prenda a Supabase Storage (bucket privado, URL firmada de 10 min)
         ├─ llama a un proveedor de try-on por API (o a un modelo propio en GPU)
         ├─ guarda el resultado en Storage y borra las entradas
         └─ devuelve la URL firmada de la imagen
```

Antes de construirlo, hay que decidir:
- **Costo:** se paga por cada imagen generada. Conviene limitarlo a Premium y con un cupo diario.
- **Consentimiento:** la foto del cuerpo sale del dispositivo. Hay que pedir permiso explícito, explicar
  cuánto se guarda y borrarla después.
- **Proveedor:** compará calidad, precio, tiempo de respuesta y política de datos con fotos tuyas antes de elegir.
