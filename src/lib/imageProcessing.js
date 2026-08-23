// Utilidades de imagen que corren en el navegador, antes de que el archivo
// salga hacia el servidor: achicar una foto de cámara a un peso razonable,
// y convertirla a JPEG. Todo con <canvas>, sin librerías externas.

export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}

export function canvasToBlob(canvas, quality = 0.85) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen.'))), 'image/jpeg', quality);
  });
}

// Achica una foto completa (sin recortarla) a un ancho máximo, manteniendo
// la proporción original. Se usa para la portada de un libro: el archivo
// que sube así de liviano es el que después encuadra EncuadreScreen.
export async function compressImage(file, { maxWidth = 1600, quality = 0.85 } = {}) {
  const { img, url } = await loadImage(file);
  try {
    const scale = Math.min(1, maxWidth / img.naturalWidth);
    const width = Math.round(img.naturalWidth * scale);
    const height = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
    return await canvasToBlob(canvas, quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
