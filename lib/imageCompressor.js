/**
 * Utilidad para comprimir imágenes en el frontend antes de subir.
 * Usa Canvas API para redimensionar y comprimir a JPEG/WebP.
 */

// Resolución máxima para las imágenes (lado más largo)
const MAX_DIMENSION = 1000;
// Calidad de compresión JPEG (0-1)
const JPEG_QUALITY = 0.5;

/**
 * Comprime una imagen File y devuelve base64
 * @param {File} file - Archivo de imagen
 * @returns {Promise<{data: string, mimeType: string, originalSize: number, compressedSize: number}>}
 */
export async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        try {
          // Calcular nuevas dimensiones manteniendo aspect ratio
          let { width, height } = img;
          const originalSize = file.size;

          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width > height) {
              height = Math.round((height * MAX_DIMENSION) / width);
              width = MAX_DIMENSION;
            } else {
              width = Math.round((width * MAX_DIMENSION) / height);
              height = MAX_DIMENSION;
            }
          }

          // Crear canvas y dibujar imagen redimensionada
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          // Suavizar la imagen al redimensionar
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Intentar primero WebP, luego JPEG
          let mimeType = 'image/webp';
          let dataUrl = canvas.toDataURL(mimeType, JPEG_QUALITY);

          // Fallback a JPEG si WebP no es soportado
          if (dataUrl.startsWith('data:image/png')) {
            mimeType = 'image/jpeg';
            dataUrl = canvas.toDataURL(mimeType, JPEG_QUALITY);
          }

          // Extraer solo la parte base64
          const base64Data = dataUrl.split(',')[1];
          const compressedSize = Math.round((base64Data.length * 3) / 4);

          resolve({
            data: base64Data,
            mimeType,
            originalSize,
            compressedSize,
            width,
            height,
          });
        } catch (err) {
          reject(new Error(`Error al comprimir imagen: ${err.message}`));
        }
      };

      img.onerror = () => reject(new Error('No se pudo cargar la imagen. Formato no soportado.'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Comprime múltiples imágenes con progreso
 * @param {File[]} files - Array de archivos de imagen
 * @param {(progress: number) => void} onProgress - Callback de progreso (0-100)
 * @returns {Promise<Array>}
 */
export async function compressImages(files, onProgress) {
  const results = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const result = await compressImage(files[i]);
    results.push(result);
    onProgress?.(Math.round(((i + 1) / total) * 100));
  }

  return results;
}

/**
 * Genera una URL de preview para un File
 * @param {File} file
 * @returns {string}
 */
export function createPreviewUrl(file) {
  return URL.createObjectURL(file);
}

/**
 * Formatea bytes a formato legible
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
