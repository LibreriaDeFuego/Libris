// Matemática del encuadre de portada — portada casi literal desde el
// prototipo de diseño (design_handoff_hero_portada/cover-framer.js).
//
// Vocabulario:
//   box  = el recuadro que se ve (en el editor: el "escenario" recortado a
//          la proporción del teléfono; en el héroe: el propio héroe).
//   nat  = tamaño natural de la imagen subida (px).
//   s    = escala actual de la imagen dentro de "box".
//   tx/ty= traslación de la imagen dentro de "box", en las mismas unidades
//          que "box" (no necesariamente las mismas que "nat").
//
// El crop persistido son 4 números normalizados (0–1) relativos a la
// imagen natural — no un transform en px — así sirve para el héroe, para
// una miniatura, o para cualquier tamaño futuro sin recortar el archivo.

// Proporción del héroe (390×844, el mismo marco que el resto de la app).
export const HERO_ASPECT = 390 / 844;

// La escala que hace que la imagen cubra "box" por completo (sin huecos).
export function baseScale(box, nat) {
  return Math.max(box.w / nat.w, box.h / nat.h);
}

// La escala que hace que la imagen entre entera dentro de "box".
export function fitScale(box, nat) {
  return Math.min(box.w / nat.w, box.h / nat.h);
}

// Evita que, mientras la imagen cubra "box", se pueda arrastrar dejando
// huecos; si es más chica que "box" en un eje (caso "Ajustar entera"), la
// centra en ese eje.
export function clamp(box, nat, s, tx, ty) {
  const iw = nat.w * s;
  const ih = nat.h * s;
  const clampedTx = iw >= box.w
    ? Math.min(box.x, Math.max(box.x + box.w - iw, tx))
    : box.x + (box.w - iw) / 2;
  const clampedTy = ih >= box.h
    ? Math.min(box.y, Math.max(box.y + box.h - ih, ty))
    : box.y + (box.h - ih) / 2;
  return { tx: clampedTx, ty: clampedTy };
}

// Los cuatro presets del editor.
export const PRESETS = {
  fill(box, nat) {
    const s = baseScale(box, nat);
    return { s, tx: box.x + (box.w - nat.w * s) / 2, ty: box.y + (box.h - nat.h * s) / 2 };
  },
  fit(box, nat) {
    const s = fitScale(box, nat);
    return { s, tx: box.x + (box.w - nat.w * s) / 2, ty: box.y + (box.h - nat.h * s) / 2 };
  },
  top(box, nat) {
    const s = baseScale(box, nat);
    return { s, tx: box.x + (box.w - nat.w * s) / 2, ty: box.y };
  },
  face(box, nat) {
    const s = baseScale(box, nat) * 1.45;
    return { s, tx: box.x + (box.w - nat.w * s) / 2, ty: box.y - nat.h * s * 0.06 };
  },
};

// De estado en vivo (s, tx, ty sobre "box") a los 4 números normalizados
// que se guardan.
export function stateToCrop(box, nat, s, tx, ty) {
  return {
    x: (box.x - tx) / s / nat.w,
    y: (box.y - ty) / s / nat.h,
    w: box.w / s / nat.w,
    h: box.h / s / nat.h,
  };
}

// El camino inverso: de un crop guardado a s/tx/ty dentro de un "box"
// cualquiera (el héroe real, la vista previa del editor, una miniatura...).
// Se calcula la escala a partir del ancho para no distorsionar: mismo
// factor en los dos ejes.
export function cropToState(box, nat, crop) {
  const s = box.w / (crop.w * nat.w);
  const tx = box.x - crop.x * s * nat.w;
  const ty = box.y - crop.y * s * nat.h;
  return { s, tx, ty };
}

// Crop por defecto ("Llenar", centrado) para libros que todavía no
// guardaron un encuadre propio. El crop normalizado no depende del tamaño
// real de "box", solo de su proporción — por eso alcanza con usar 390×844.
export function defaultCrop(nat) {
  const box = { x: 0, y: 0, w: 390, h: 844 };
  const { s, tx, ty } = PRESETS.fill(box, nat);
  return stateToCrop(box, nat, s, tx, ty);
}
