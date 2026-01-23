import { useCallback, useEffect, useRef, useState } from 'react';
import BouncingDotsLoader from '../components/BouncingDotsLoader';
import { useImageCropper } from './hooks/useImageCropper';
import { useImageEnhancer } from './hooks/useImageEnhancer';
import { toSafeName } from './utils/imageUtils';
import { canvasToWebpBlob, prepareWebpUpload, MAX_UPLOAD_BYTES } from './utils/webpUtils.mjs';
import LoadingButton from '../../../../components/LoadingButton';

function ImageEditorModal({ media, onClose }) {
  const [uploadedMedia, setUploadedMedia] = useState(null);
  const [imageName, setImageName] = useState('');
  const [imageObj, setImageObj] = useState(null);
  const [activeTool, setActiveTool] = useState('crop');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadPreview, setUploadPreview] = useState('');
  const canvasRef = useRef(null);
  const {
    cropRect,
    selection,
    isCropping,
    containerRef,
    beginCrop,
    resetCrop,
    applyCrop,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useImageCropper({
    imageObj,
    onError: setError,
    onStatusChange: setStatusMessage,
  });
  const { presets, presetKey, setPresetKey, appliedFilters, resetEnhancer } =
    useImageEnhancer();

  useEffect(() => {
    setUploadedMedia(null);
  }, [media?.id, media?.url]);

  const activeMedia = uploadedMedia || media;

  useEffect(() => {
    if (!activeMedia) return;
    setImageObj(null);
    setImageName(activeMedia.title || `image-${activeMedia.id}`);
    setStatusMessage('');
    setError('');
    resetCrop();
    resetEnhancer();
  }, [activeMedia, resetCrop, resetEnhancer]);

  useEffect(() => {
    if (!activeMedia) return () => {};
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeMedia]);

  useEffect(() => {
    if (!activeMedia?.url) return () => {};
    let isActive = true;
    setIsLoadingImage(true);
    const loadImage = (src) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (!isActive) return;
        setImageObj(img);
        setIsLoadingImage(false);
      };
      img.onerror = () => {
        if (!isActive) return;
        setIsLoadingImage(false);
        setError('Unable to load the image preview.');
      };
      img.src = src;
    };

    loadImage(activeMedia.url);

    return () => {
      isActive = false;
    };
  }, [activeMedia?.url]);

  const drawCanvas = useCallback(() => {
    if (!imageObj || !canvasRef.current) return;
    const crop = cropRect || {
      x: 0,
      y: 0,
      width: imageObj.naturalWidth,
      height: imageObj.naturalHeight,
    };
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = crop.width;
    canvas.height = crop.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = `brightness(${appliedFilters.brightness}%) contrast(${appliedFilters.contrast}%) saturate(${appliedFilters.saturate}%)`;
    ctx.drawImage(
      imageObj,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height,
    );
  }, [appliedFilters, cropRect, imageObj]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const resetEdits = () => {
    resetCrop();
    resetEnhancer();
    setStatusMessage('Edits reset.');
  };

  useEffect(() => {
    if (activeTool === 'crop' && imageObj) {
      beginCrop();
    }
  }, [activeTool, beginCrop, imageObj]);

  const handleToolChange = (toolKey) => {
    setActiveTool(toolKey);
    if (toolKey === 'crop') {
      beginCrop();
    }
  };

  const saveEditedImage = async () => {
    if (!canvasRef.current) return;
    setIsSaving(true);
    setError('');
    try {
      const canvas = canvasRef.current;
      const blob = await canvasToWebpBlob(canvas);
      if (!blob) {
        throw new Error('Unable to export image. The source may block editing.');
      }
      if (blob.size > MAX_UPLOAD_BYTES) {
        throw new Error('Converted image exceeds 5MB. Please use a smaller file.');
      }
      const filename = `${toSafeName(imageName)}.webp`;
      const file = new File([blob], filename, { type: 'image/webp' });
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || 'Unable to save image.');
      }
      setStatusMessage('Saved as a new image in your library.');
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save image.');
    } finally {
      setIsSaving(false);
    }
  };

  const previewWidth = cropRect?.width || imageObj?.naturalWidth || 0;
  const previewHeight = cropRect?.height || imageObj?.naturalHeight || 0;
  const previewAspect =
    previewWidth && previewHeight ? `${previewWidth} / ${previewHeight}` : '4 / 3';
  const previewUrl = imageObj?.src || activeMedia?.url || '';

  if (!activeMedia) {
    return null;
  }

  const toolOptions = [
    {
      key: 'crop',
      label: 'Crop',
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6 3v12a3 3 0 0 0 3 3h12" />
          <path d="M9 21V9a3 3 0 0 1 3-3h9" />
        </svg>
      ),
    },
    {
      key: 'filter',
      label: 'Filter',
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="8" cy="8" r="4" />
          <circle cx="16" cy="16" r="4" />
          <path d="M12 12h.01" />
        </svg>
      ),
    },
    {
      key: 'colors',
      label: 'Colors',
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 9h18" />
          <path d="M6 15h12" />
          <circle cx="9" cy="9" r="2" />
          <circle cx="15" cy="15" r="2" />
        </svg>
      ),
    },
    {
      key: 'resize',
      label: 'Resize',
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M8 16h8M16 8v8" />
        </svg>
      ),
    },
  ];
  const canSave = Boolean(imageObj) && !isSaving;
  const handleUploadFile = async (file) => {
    if (!file) return;
    setIsUploading(true);
    setUploadError('');
    try {
      const { webpFile } = await prepareWebpUpload(file);
      const formData = new FormData();
      formData.append('file', webpFile);
      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || 'Unable to upload image.');
      }
      setUploadedMedia({
        id: payload?.id || payload?.key || `${Date.now()}`,
        url: payload?.url || '',
        title: file.name,
      });
      setImageName(file.name.replace(/\.[^/.]+$/, ''));
      setIsUploadOpen(false);
      setUploadPreview('');
    } catch (uploadErr) {
      setUploadError(uploadErr?.message || 'Unable to upload image.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Close image editor"
      />
      <div className="relative z-10 w-full max-w-6xl max-h-[calc(100vh-48px)] overflow-x-hidden overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/70 px-6 py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={resetEdits}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500"
              aria-label="Reset edits"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 12a8 8 0 1 0 3-6.3" />
                <path d="M4 4v5h5" />
              </svg>
            </button>
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-center gap-4">
            {toolOptions.map((tool) => {
              const isActive = activeTool === tool.key;
              return (
                <button
                  key={tool.key}
                  type="button"
                  onClick={() => handleToolChange(tool.key)}
                  className="flex flex-col items-center gap-1 text-xs font-semibold"
                >
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl transition ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {tool.icon}
                  </span>
                  <span className={isActive ? 'text-slate-900' : 'text-slate-400'}>
                    {tool.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600"
            >
              Replace image
            </button>
            <LoadingButton
              type="button"
              onClick={saveEditedImage}
              isLoading={isSaving}
              disabled={!canSave}
              className="rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Done
            </LoadingButton>
          </div>
        </div>

        <div className="border-b border-slate-200/70 px-6 py-3">
          {activeTool === 'crop' && (
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={beginCrop}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600"
              >
                New crop
              </button>
              <button
                type="button"
                disabled
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-400"
              >
                Rotate left
              </button>
              <button
                type="button"
                disabled
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-400"
              >
                Flip horizontal
              </button>
              <button
                type="button"
                disabled
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-400"
              >
                Flip vertical
              </button>
              <button
                type="button"
                disabled
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-400"
              >
                Aspect ratio
              </button>
              {isCropping && (
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={applyCrop}
                    className="rounded-full bg-slate-900 px-4 py-1 text-[11px] font-semibold text-white"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={resetCrop}
                    className="rounded-full border border-slate-200 bg-white px-4 py-1 text-[11px] font-semibold text-slate-500"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
          {activeTool === 'filter' && (
            <div className="flex flex-wrap items-center gap-2">
              {presets.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setPresetKey(preset.key)}
                  className={`rounded-full border px-4 py-1 text-[11px] font-semibold transition ${
                    presetKey === preset.key
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}
          {activeTool === 'colors' && (
            <p className="text-xs text-slate-400">
              Color controls are coming soon. Use Enhance presets for now.
            </p>
          )}
          {activeTool === 'resize' && (
            <div className="flex flex-wrap items-end gap-4 text-xs text-slate-500">
              <div className="min-w-[220px] flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  File name
                </p>
                <input
                  value={imageName}
                  onChange={(event) => setImageName(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                  placeholder="image-name"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Saving creates a new image with this name.
                </p>
              </div>
              <p className="text-[11px] text-slate-400">Press Done to save to your library.</p>
            </div>
          )}
        </div>

        <div className="px-6 py-6">
          <div
            ref={containerRef}
            className={`relative mx-auto overflow-hidden rounded-[24px] bg-slate-50 shadow-inner ${
              isCropping ? 'cursor-crosshair' : ''
            }`}
            style={{
              width: '100%',
              maxWidth: '100%',
              aspectRatio: previewAspect,
              backgroundImage: previewUrl ? `url("${previewUrl}")` : 'none',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              backgroundSize: 'contain',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {(isLoadingImage && !imageObj) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <BouncingDotsLoader className="text-slate-400" dotClassName="bg-slate-400" />
              </div>
            )}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 h-full w-full opacity-0 pointer-events-none"
            />
            {isCropping && selection && (
              <div
                className="absolute cursor-move border-2 border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]"
                style={{
                  left: selection.x,
                  top: selection.y,
                  width: selection.width,
                  height: selection.height,
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  handlePointerDown(event, 'move');
                }}
              />
            )}
            {isCropping && selection && (
              <>
                {[
                  { key: 'nw', x: selection.x, y: selection.y },
                  { key: 'n', x: selection.x + selection.width / 2, y: selection.y },
                  { key: 'ne', x: selection.x + selection.width, y: selection.y },
                  { key: 'e', x: selection.x + selection.width, y: selection.y + selection.height / 2 },
                  { key: 'se', x: selection.x + selection.width, y: selection.y + selection.height },
                  { key: 's', x: selection.x + selection.width / 2, y: selection.y + selection.height },
                  { key: 'sw', x: selection.x, y: selection.y + selection.height },
                  { key: 'w', x: selection.x, y: selection.y + selection.height / 2 },
                ].map((handle) => (
                  <button
                    key={handle.key}
                    type="button"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      handlePointerDown(event, 'resize', handle.key);
                    }}
                    className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-slate-900 shadow"
                    style={{ left: handle.x, top: handle.y }}
                    aria-label="Resize crop area"
                  />
                ))}
              </>
            )}
          </div>
        </div>

        {(statusMessage || error) && (
          <div className="border-t border-slate-200/70 px-6 py-3">
            {statusMessage && (
              <p className="text-xs font-semibold text-emerald-600">{statusMessage}</p>
            )}
            {error && <p className="text-xs text-rose-500">{error}</p>}
          </div>
        )}
      </div>

      {isUploadOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-6">
          <button
            type="button"
            onClick={() => setIsUploadOpen(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            aria-label="Close upload"
          />
          <div className="relative z-10 w-full max-w-lg max-h-[calc(100vh-48px)] overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Upload</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">Replace image</p>
                <p className="mt-1 text-xs text-slate-500">Upload a new image to edit.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500"
              >
                Close
              </button>
            </div>

            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-xs text-slate-500">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                      setUploadPreview(reader.result);
                    }
                  };
                  reader.readAsDataURL(file);
                  handleUploadFile(file);
                }}
              />
              <span className="text-sm font-semibold text-slate-700">Drop image or click to upload</span>
              <span className="mt-1 text-[11px] text-slate-400">JPG, PNG, WEBP up to 10MB</span>
            </label>

            {uploadPreview && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <img src={uploadPreview} alt="Upload preview" className="h-48 w-full object-cover" />
              </div>
            )}

            {uploadError && <p className="mt-3 text-xs text-rose-500">{uploadError}</p>}

            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
              <span>{isUploading ? 'Uploading...' : 'Ready when you are.'}</span>
              <span>{isUploading ? 'Please wait' : 'Auto-uploads on select'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageEditorModal;
