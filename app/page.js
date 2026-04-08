'use client';

/**
 * LSF Smart Fridge — Página Principal
 *
 * Gestiona el flujo completo:
 * 1. Subida de fotos de nevera
 * 2. Compresión client-side
 * 3. Análisis con IA (Gemini Vision)
 * 4. Visualización de ingredientes y recetas
 * 5. Regeneración de recetas (una sola vez)
 */

import { useState, useRef, useCallback } from 'react';
import { compressImages, createPreviewUrl, formatFileSize } from '@/lib/imageCompressor';

// ============================================================
// Constantes
// ============================================================
const MAX_FILES = 5;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

// ============================================================
// Estados de la aplicación
// ============================================================
const STATES = {
  UPLOAD: 'upload',
  COMPRESSING: 'compressing',
  ANALYZING: 'analyzing',
  RESULTS: 'results',
  ERROR: 'error',
};

export default function HomePage() {
  // Estado principal
  const [appState, setAppState] = useState(STATES.UPLOAD);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [ingredientes, setIngredientes] = useState([]);
  const [recetas, setRecetas] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [canRegenerate, setCanRegenerate] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);

  // ============================================================
  // Manejo de archivos
  // ============================================================
  const handleFileSelect = useCallback((files) => {
    const validFiles = Array.from(files)
      .filter((f) => ACCEPTED_TYPES.includes(f.type) || f.name.toLowerCase().endsWith('.heic'))
      .slice(0, MAX_FILES);

    if (validFiles.length === 0) return;

    setSelectedFiles((prev) => {
      const combined = [...prev, ...validFiles].slice(0, MAX_FILES);
      return combined;
    });

    // Generar previews
    const newPreviews = validFiles.map((f) => ({
      url: createPreviewUrl(f),
      name: f.name,
      size: f.size,
    }));

    setPreviews((prev) => [...prev, ...newPreviews].slice(0, MAX_FILES));
  }, []);

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
      
      // DISPARO AUTOMÁTICO: Iniciar análisis inmediatamente después de seleccionar
      // Usamos los archivos directamente del evento para evitar delay del estado
      const files = Array.from(e.target.files).slice(0, MAX_FILES);
      if (files.length > 0) {
        // Pequeño timeout para permitir que la UI muestre el estado de carga
        setTimeout(() => {
          handleAnalyzeDirectly(files);
        }, 100);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  // ============================================================
  // Análisis principal
  // ============================================================
  const handleAnalyzeDirectly = async (filesToAnalyze) => {
    if (!filesToAnalyze || filesToAnalyze.length === 0) return;

    try {
      // PASO 1: Comprimir imágenes
      setAppState(STATES.COMPRESSING);
      setProgress(0);
      setProgressMessage('Comprimiendo imágenes...');

      const compressed = await compressImages(filesToAnalyze, (p) => {
        setProgress(p);
      });

      // Log de compresión
      compressed.forEach((img, i) => {
        console.log(
          `Imagen ${i + 1}: ${formatFileSize(img.originalSize)} → ${formatFileSize(img.compressedSize)} (${img.width}×${img.height})`
        );
      });

      // PASO 2: Enviar a la API
      setAppState(STATES.ANALYZING);
      setProgress(0);
      setProgressMessage('Analizando ingredientes con IA...');

      // Simular progreso durante análisis
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 8;
        });
      }, 600);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: compressed.map((img) => ({
            data: img.data,
            mimeType: img.mimeType,
          })),
        }),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error del servidor (${response.status})`);
      }

      const data = await response.json();

      setProgress(100);
      setProgressMessage('¡Análisis completado!');

      // Pequeña pausa para UX
      await new Promise((r) => setTimeout(r, 500));

      setIngredientes(data.ingredientes || []);
      setRecetas(data.recetas || []);
      setAppState(STATES.RESULTS);
    } catch (error) {
      console.error('Error durante análisis:', error);
      setErrorMsg(error.message || 'Error inesperado. Inténtalo de nuevo.');
      setAppState(STATES.ERROR);
    }
  };

  const handleAnalyze = () => {
    handleAnalyzeDirectly(selectedFiles);
  };

  // ============================================================
  // Regenerar recetas
  // ============================================================
  const handleRegenerate = async () => {
    if (!canRegenerate || isRegenerating) return;

    try {
      setIsRegenerating(true);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regenerate: true,
          ingredientes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al regenerar recetas.');
      }

      const data = await response.json();
      setRecetas(prev => [...prev, ...(data.recetas || [])]); // AÑADIR recetas a las anteriores
      setCanRegenerate(false); // Solo se puede regenerar una vez
    } catch (error) {
      console.error('Error al regenerar:', error);
      setErrorMsg(error.message);
    } finally {
      setIsRegenerating(false);
    }
  };

  // ============================================================
  // Volver al inicio
  // ============================================================
  const handleReset = () => {
    // Limpiar URLs de preview
    previews.forEach((p) => URL.revokeObjectURL(p.url));

    setAppState(STATES.UPLOAD);
    setSelectedFiles([]);
    setPreviews([]);
    setProgress(0);
    setProgressMessage('');
    setIngredientes([]);
    setRecetas([]);
    setErrorMsg('');
    setCanRegenerate(true);
    setIsRegenerating(false);
  };

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="app-container">
      {/* Header con logo */}
      <header className="header">
        <span className="header-title">Smart Fridge</span>
        <div className="logo" id="lsf-logo">LSF</div>
      </header>

      {/* ----- PANTALLA: Subida de imágenes ----- */}
      {appState === STATES.UPLOAD && (
        <div className="fade-in">
          <section className="hero">
            <div className="hero-icon">🧊</div>
            <h1>¿Qué hay en tu nevera?</h1>
            <p>
              Sube fotos de tu nevera y la IA detectará los ingredientes para
              sugerirte recetas deliciosas.
            </p>
          </section>

          {/* Zona de subida */}
          <div
            className={`upload-area ${dragOver ? 'drag-over' : ''}`}
            id="upload-zone"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handleInputChange}
              id="file-input"
            />
            <div className="upload-icon">📸</div>
            <p className="upload-text">Toca para subir fotos</p>
            <p className="upload-hint">
              o arrastra aquí (máx. {MAX_FILES} imágenes)
            </p>
          </div>

          {/* Previews de imágenes */}
          {previews.length > 0 && (
            <>
              <div className="previews-grid" id="image-previews">
                {previews.map((preview, index) => (
                  <div key={index} className="preview-item">
                    <img
                      src={preview.url}
                      alt={`Preview ${index + 1}`}
                      loading="lazy"
                    />
                    <button
                      className="preview-remove"
                      onClick={() => removeFile(index)}
                      aria-label="Eliminar imagen"
                      id={`remove-image-${index}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <p style={{ 
                textAlign: 'center', 
                fontSize: '0.8rem', 
                color: 'var(--text-muted)', 
                marginBottom: 'var(--space-md)' 
              }}>
                {previews.length} {previews.length === 1 ? 'imagen seleccionada' : 'imágenes seleccionadas'}
                {' · '}
                {formatFileSize(selectedFiles.reduce((sum, f) => sum + f.size, 0))} total
              </p>

              <button
                className="btn btn-primary"
                onClick={handleAnalyze}
                id="analyze-btn"
              >
                🔍 Analizar nevera
              </button>
            </>
          )}
        </div>
      )}

      {/* ----- PANTALLA: Comprimiendo / Analizando ----- */}
      {(appState === STATES.COMPRESSING || appState === STATES.ANALYZING) && (
        <div className="fade-in">
          <div className="loading-container">
            <div className="spinner" />
            <p className="loading-text">
              {appState === STATES.COMPRESSING
                ? '📦 Optimizando imágenes...'
                : '🤖 La IA está analizando tu nevera...'}
            </p>
          </div>

          <div className="progress-container">
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="progress-text">
              <span className="progress-status">
                {progressMessage}
              </span>
              <span>{Math.round(Math.min(progress, 100))}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ----- PANTALLA: Resultados ----- */}
      {appState === STATES.RESULTS && (
        <div className="fade-in">
          {/* Ingredientes detectados */}
          <div className="ingredients-card" id="ingredients-section">
            <h2>🥗 Ingredientes detectados</h2>
            <div className="ingredients-list">
              {ingredientes.map((ing, i) => (
                <span
                  key={i}
                  className="ingredient-chip"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  {ing}
                </span>
              ))}
            </div>
          </div>

          {/* Recetas */}
          <div className="recipes-section" id="recipes-section">
            <h2 className="section-title" style={{ marginBottom: 'var(--space-md)' }}>
              👨‍🍳 Recetas sugeridas
            </h2>
            <p className="section-subtitle" style={{ marginBottom: 'var(--space-lg)' }}>
              Basadas en los ingredientes de tu nevera
            </p>

            {recetas.map((receta, index) => (
              <article
                key={index}
                className="recipe-card"
                id={`recipe-card-${index}`}
              >
                <div className="recipe-number">{index + 1}</div>
                <h3 className="recipe-name">{receta.nombre}</h3>

                <p className="recipe-section-title">Ingredientes</p>
                <ul className="recipe-ingredients">
                  {receta.ingredientes?.map((ing, i) => (
                    <li key={i}>{ing}</li>
                  ))}
                </ul>

                <p className="recipe-section-title">Preparación</p>
                <ol className="recipe-steps">
                  {receta.pasos?.map((paso, i) => (
                    <li key={i}>{paso}</li>
                  ))}
                </ol>
              </article>
            ))}
          </div>

          {/* Botones de acción */}
          <div className="actions-bar">
            {canRegenerate && (
              <button
                className="btn btn-primary"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                id="regenerate-btn"
              >
                {isRegenerating ? (
                  <>
                    <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    Generando...
                  </>
                ) : (
                  '✨ Generar nuevas recetas'
                )}
              </button>
            )}

            {!canRegenerate && (
              <p style={{ 
                textAlign: 'center', 
                fontSize: '0.8rem', 
                color: 'var(--text-muted)',
                fontStyle: 'italic' 
              }}>
                Ya has regenerado las recetas una vez
              </p>
            )}

            <button
              className="btn btn-secondary"
              onClick={handleReset}
              id="back-btn"
            >
              ← Volver al inicio
            </button>
          </div>
        </div>
      )}

      {/* ----- PANTALLA: Error ----- */}
      {appState === STATES.ERROR && (
        <div className="fade-in">
          <div className="error-container">
            <div className="error-icon">😕</div>
            <h2 className="error-title">Algo salió mal</h2>
            <p className="error-message">{errorMsg}</p>
            <button
              className="btn btn-primary"
              onClick={handleReset}
              id="retry-btn"
              style={{ maxWidth: '280px', margin: '0 auto' }}
            >
              ← Volver e intentar de nuevo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
