'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EasyCropper from 'react-easy-crop';
import Cropper from 'react-cropper';
import BouncingDotsLoader from '../components/BouncingDotsLoader';
import { useImageEnhancer } from './hooks/useImageEnhancer';
import { toSafeName } from './utils/imageUtils';
import { renderEditedImageToCanvas, buildCanvasFilter } from './utils/editorCanvas.mjs';
import { canvasToWebpBlob, MAX_UPLOAD_BYTES } from './utils/webpUtils.mjs';
import LoadingButton from '../../../../components/LoadingButton';

const TOOL_OPTIONS = [
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
    key: 'rotate',
    label: 'Rotate',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 12a8 8 0 1 0 3-6.3" />
        <path d="M4 4v5h5" />
      </svg>
    ),
  },
  {
    key: 'enhance',
    label: 'Enhance',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z" />
        <path d="M18 16l.9 2.1L21 19l-2.1.9L18 22l-.9-2.1L15 19l2.1-.9L18 16Z" />
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

const ASPECT_OPTIONS = [
  { key: 'free', label: 'Free', value: 'free' },
  { key: 'original', label: 'Original', value: 'original' },
  { key: 'square', label: '1:1', value: 1 },
  { key: 'portrait', label: '4:5', value: 4 / 5 },
  { key: 'story', label: '9:16', value: 9 / 16 },
  { key: 'wide', label: '16:9', value: 16 / 9 },
];

const clampDimension = (value, fallback = 1) => {
  const normalized = Number(value);
  if (Number.isFinite(normalized) && normalized > 0) {
    return Math.max(1, Math.round(normalized));
  }
  return Math.max(1, Math.round(fallback));
};

const buildContainedCropBox = (bounds, aspectRatio) => {
  if (!bounds) return null;

  const ratio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : null;
  let width = bounds.width;
  let height = bounds.height;

  if (ratio) {
    width = bounds.width;
    height = width / ratio;

    if (height > bounds.height) {
      height = bounds.height;
      width = height * ratio;
    }
  }

  return {
    left: bounds.left + (bounds.width - width) / 2,
    top: bounds.top + (bounds.height - height) / 2,
    width,
    height,
  };
};

const loadImageObject = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load the image preview.'));
    image.src = src;
  });

function ImageEditorModal({ media, onClose, onSaved }) {
  const cropperRef = useRef(null);
  const sessionPreviewUrlRef = useRef('');
  const [sessionMedia, setSessionMedia] = useState(null);
  const [uploadedMedia, setUploadedMedia] = useState(null);
  const [imageName, setImageName] = useState('');
  const [imageObj, setImageObj] = useState(null);
  const [activeTool, setActiveTool] = useState('crop');
  const [isCropActive, setIsCropActive] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspectKey, setAspectKey] = useState('free');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [resizeWidth, setResizeWidth] = useState('');
  const [resizeHeight, setResizeHeight] = useState('');
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [hasCustomResize, setHasCustomResize] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [isReplacing, setIsReplacing] = useState(false);
  const {
    presets, presetKey, setPresetKey, appliedFilters, resetEnhancer,
    brightness, setManualBrightness,
    contrast,   setManualContrast,
    saturation, setManualSaturation,
    isManual,
  } = useImageEnhancer();

  const activeMedia = sessionMedia || uploadedMedia || media;
  const activeMediaId = activeMedia?.id || '';
  const activeMediaTitle = activeMedia?.title || '';
  const targetMediaId = media?.id || '';
  // Always use the /source proxy — it returns CORS-safe headers needed for canvas operations.
  const editorImageSrc = activeMedia?.id ? `/api/admin/media/${activeMedia.id}/source` : activeMedia?.url || '';
  const originalAspect =
    imageObj?.naturalWidth && imageObj?.naturalHeight
      ? imageObj.naturalWidth / imageObj.naturalHeight
      : 1;
  const activeAspect =
    aspectKey === 'free'
      ? undefined
      : aspectKey === 'original'
      ? originalAspect
      : ASPECT_OPTIONS.find((option) => option.key === aspectKey)?.value || originalAspect;

  const cropPixelWidth = croppedAreaPixels?.width || imageObj?.naturalWidth || 0;
  const cropPixelHeight = croppedAreaPixels?.height || imageObj?.naturalHeight || 0;
  const aspectRatioValue =
    cropPixelWidth && cropPixelHeight ? cropPixelWidth / cropPixelHeight : originalAspect || 1;
  const filterStyle = useMemo(
    () => buildCanvasFilter(appliedFilters),
    [appliedFilters],
  );
  const previewImageStyle = useMemo(
    () => ({
      width: 'auto',
      height: 'auto',
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'contain',
      objectPosition: 'center',
      filter: filterStyle,
    }),
    [filterStyle],
  );

  useEffect(() => {
    setUploadedMedia(null);
  }, [media?.id, media?.url]);

  useEffect(() => {
    if (!sessionPreviewUrlRef.current) return;
    URL.revokeObjectURL(sessionPreviewUrlRef.current);
    sessionPreviewUrlRef.current = '';
    setSessionMedia(null);
  }, [media?.id, media?.url, uploadedMedia?.id, uploadedMedia?.url]);

  useEffect(() => () => {
    if (!sessionPreviewUrlRef.current) return;
    URL.revokeObjectURL(sessionPreviewUrlRef.current);
    sessionPreviewUrlRef.current = '';
  }, []);

  useEffect(() => {
    if (!activeMediaId && !activeMedia?.url) return;
    setImageName(activeMediaTitle || `image-${activeMediaId}`);
    setActiveTool('crop');
    setIsCropActive(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspectKey('free');
    setCroppedAreaPixels(null);
    setResizeWidth('');
    setResizeHeight('');
    setLockAspectRatio(true);
    setHasCustomResize(false);
    setStatusMessage('');
    setError('');
    resetEnhancer();
  }, [activeMedia?.url, activeMediaId, activeMediaTitle, resetEnhancer]);

  useEffect(() => {
    if (!activeMedia) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeMedia]);

  useEffect(() => {
    if (!editorImageSrc) return undefined;
    let isActive = true;
    setIsLoadingImage(true);
    setError('');

    loadImageObject(editorImageSrc)
      .then((loadedImage) => {
        if (!isActive) return;
        setImageObj(loadedImage);
        setIsLoadingImage(false);
      })
      .catch((loadError) => {
        if (!isActive) return;
        setImageObj(null);
        setIsLoadingImage(false);
        setError(loadError?.message || 'Unable to load the image preview.');
      });

    return () => {
      isActive = false;
    };
  }, [editorImageSrc]);

  useEffect(() => {
    if (!imageObj || hasCustomResize) return;
    const nextWidth = cropPixelWidth || imageObj.naturalWidth || 0;
    const nextHeight = cropPixelHeight || imageObj.naturalHeight || 0;
    if (!nextWidth || !nextHeight) return;
    setResizeWidth(String(Math.round(nextWidth)));
    setResizeHeight(String(Math.round(nextHeight)));
  }, [cropPixelHeight, cropPixelWidth, hasCustomResize, imageObj]);

  const syncCropPixelsFromInstance = useCallback((cropperInstance) => {
    if (!cropperInstance || !imageObj) {
      setCroppedAreaPixels(null);
      return;
    }

    const cropData = cropperInstance.getData?.(true);
    if (!cropData?.width || !cropData?.height) {
      setCroppedAreaPixels(null);
      return;
    }

    setCroppedAreaPixels({
      x: Math.max(0, Math.round(cropData.x || 0)),
      y: Math.max(0, Math.round(cropData.y || 0)),
      width: Math.max(1, Math.round(cropData.width || 0)),
      height: Math.max(1, Math.round(cropData.height || 0)),
    });
  }, [imageObj]);

  const syncCanvasAndCropToContain = useCallback((cropperInstance, ratioOverride = activeAspect) => {
    if (!cropperInstance) return;

    const containerData = cropperInstance.getContainerData?.();
    const imageData = cropperInstance.getImageData?.();
    if (!containerData || !imageData?.naturalWidth || !imageData?.naturalHeight) {
      return;
    }

    const fittedScale = Math.min(
      containerData.width / imageData.naturalWidth,
      containerData.height / imageData.naturalHeight,
    );

    const canvasData = {
      left: (containerData.width - imageData.naturalWidth * fittedScale) / 2,
      top: (containerData.height - imageData.naturalHeight * fittedScale) / 2,
      width: imageData.naturalWidth * fittedScale,
      height: imageData.naturalHeight * fittedScale,
    };

    cropperInstance.setCanvasData(canvasData);

    const cropBox = buildContainedCropBox(canvasData, ratioOverride);
    if (!cropBox) return;
    cropperInstance.setCropBoxData(cropBox);
    syncCropPixelsFromInstance(cropperInstance);
  }, [activeAspect, syncCropPixelsFromInstance]);

  useEffect(() => {
    if (!isCropActive) return;
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    cropper.setAspectRatio(activeAspect || NaN);
    syncCanvasAndCropToContain(cropper, activeAspect);
  }, [activeAspect, isCropActive, syncCanvasAndCropToContain]);

  const resetEdits = () => {
    const cropper = cropperRef.current?.cropper;
    if (sessionPreviewUrlRef.current) {
      URL.revokeObjectURL(sessionPreviewUrlRef.current);
      sessionPreviewUrlRef.current = '';
    }
    setSessionMedia(null);
    setIsCropActive(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspectKey('free');
    setCroppedAreaPixels(null);
    setLockAspectRatio(true);
    setHasCustomResize(false);
    setResizeWidth(imageObj?.naturalWidth ? String(imageObj.naturalWidth) : '');
    setResizeHeight(imageObj?.naturalHeight ? String(imageObj.naturalHeight) : '');
    if (cropper) {
      cropper.clear();
      cropper.reset();
      cropper.setAspectRatio(NaN);
    }
    resetEnhancer();
    setStatusMessage('Editor reset.');
    setError('');
  };

  const applyCropToPreview = async () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper || !isCropActive) return;

    try {
      const croppedCanvas = cropper.getCroppedCanvas({
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });

      if (!croppedCanvas) {
        throw new Error('Unable to apply crop preview.');
      }

      const blob = await canvasToWebpBlob(croppedCanvas);
      if (!blob) {
        throw new Error('Unable to create cropped preview.');
      }

      if (sessionPreviewUrlRef.current) {
        URL.revokeObjectURL(sessionPreviewUrlRef.current);
      }

      const nextUrl = URL.createObjectURL(blob);
      sessionPreviewUrlRef.current = nextUrl;
      setSessionMedia({
        url: nextUrl,
        title: imageName,
      });
      setIsCropActive(false);
      setAspectKey('free');
      setCroppedAreaPixels(null);
      setResizeWidth(String(croppedCanvas.width));
      setResizeHeight(String(croppedCanvas.height));
      setStatusMessage('Crop applied to preview.');
      setError('');
    } catch (cropError) {
      setError(cropError?.message || 'Unable to apply crop preview.');
    }
  };

  const handleWidthChange = (nextValue) => {
    setResizeWidth(nextValue);
    setHasCustomResize(true);
    if (!lockAspectRatio) return;
    const parsedWidth = Number(nextValue);
    if (!Number.isFinite(parsedWidth) || parsedWidth <= 0 || !aspectRatioValue) return;
    setResizeHeight(String(Math.max(1, Math.round(parsedWidth / aspectRatioValue))));
  };

  const handleHeightChange = (nextValue) => {
    setResizeHeight(nextValue);
    setHasCustomResize(true);
    if (!lockAspectRatio) return;
    const parsedHeight = Number(nextValue);
    if (!Number.isFinite(parsedHeight) || parsedHeight <= 0 || !aspectRatioValue) return;
    setResizeWidth(String(Math.max(1, Math.round(parsedHeight * aspectRatioValue))));
  };

  const applyQuarterTurn = (direction) => {
    setRotation((prev) => {
      const next = prev + direction * 90;
      return ((next % 360) + 360) % 360;
    });
  };

  const saveEditedImage = async () => {
    if (!imageObj) return;
    setIsSaving(true);
    setError('');
    setStatusMessage('');

    try {
      const exportCanvas = renderEditedImageToCanvas({
        image: imageObj,
        pixelCrop: croppedAreaPixels,
        rotation,
        filters: appliedFilters,
        outputWidth: clampDimension(resizeWidth, cropPixelWidth || imageObj.naturalWidth),
        outputHeight: clampDimension(resizeHeight, cropPixelHeight || imageObj.naturalHeight),
      });

      const blob = await canvasToWebpBlob(exportCanvas);
      if (!blob) {
        throw new Error('Unable to export image. The source may block editing.');
      }
      if (blob.size > MAX_UPLOAD_BYTES) {
        throw new Error('Converted image exceeds 5MB. Please reduce the export size.');
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

      const savedItem = {
        id: payload?.id || payload?.key || `${Date.now()}`,
        url: payload?.url || '',
        title: filename,
        unattached: true,
      };

      setStatusMessage('Saved as a new image in your library.');
      onSaved?.(savedItem);
      onClose?.();
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save image.');
    } finally {
      setIsSaving(false);
    }
  };

  const replaceEditedImage = async () => {
    if (!imageObj || !targetMediaId) return;
    setIsReplacing(true);
    setError('');
    setStatusMessage('');

    try {
      const exportCanvas = renderEditedImageToCanvas({
        image: imageObj,
        pixelCrop: croppedAreaPixels,
        rotation,
        filters: appliedFilters,
        outputWidth: clampDimension(resizeWidth, cropPixelWidth || imageObj.naturalWidth),
        outputHeight: clampDimension(resizeHeight, cropPixelHeight || imageObj.naturalHeight),
      });

      const blob = await canvasToWebpBlob(exportCanvas);
      if (!blob) {
        throw new Error('Unable to export image. The source may block editing.');
      }
      if (blob.size > MAX_UPLOAD_BYTES) {
        throw new Error('Converted image exceeds 5MB. Please reduce the export size.');
      }

      const filename = `${toSafeName(imageName)}.webp`;
      const file = new File([blob], filename, { type: 'image/webp' });
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/admin/media/${targetMediaId}`, {
        method: 'PATCH',
        body: formData,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || 'Unable to replace image.');
      }

      const replacedItem = {
        id: targetMediaId,
        url: payload?.url || '',
        title: imageName || activeMediaTitle || 'Media',
        unattached: !(payload?.product_id),
      };

      if (sessionPreviewUrlRef.current) {
        URL.revokeObjectURL(sessionPreviewUrlRef.current);
        sessionPreviewUrlRef.current = '';
      }

      setSessionMedia(null);
      setUploadedMedia(null);
      setStatusMessage('Image replaced.');
      onSaved?.(replacedItem);
      onClose?.();
    } catch (replaceError) {
      setError(replaceError?.message || 'Unable to replace image.');
    } finally {
      setIsReplacing(false);
    }
  };

  if (!activeMedia) return null;

  const canSave = Boolean(imageObj) && !isSaving;
  const canReplace = Boolean(imageObj && targetMediaId) && !isReplacing;

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none';
  const pillBtn = (active) =>
    `rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
      active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <button type="button" onClick={onClose} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" aria-label="Close" />

      {/* Modal shell */}
      <div className="relative z-10 flex h-full w-full flex-col overflow-hidden bg-white sm:h-[calc(100vh-32px)] sm:max-w-6xl sm:rounded-2xl sm:shadow-2xl">

        {/* ── Top bar ── */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-white px-3 py-2.5 sm:px-5">
          {/* Left: close + reset */}
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200" aria-label="Close">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" /></svg>
            </button>
            <button type="button" onClick={resetEdits} className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200" aria-label="Reset">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 12a8 8 0 1 0 3-6.3" /><path d="M4 4v5h5" /></svg>
            </button>
            <span className="hidden max-w-[120px] truncate text-xs font-semibold text-slate-700 sm:block">{imageName || 'Untitled'}</span>
          </div>

          {/* Center: tool tabs — icons only on mobile, icons+labels on sm+ */}
          <div className="flex min-w-0 items-center gap-0.5 rounded-xl border border-slate-100 bg-slate-50 p-0.5">
            {TOOL_OPTIONS.map((tool) => (
              <button
                key={tool.key}
                type="button"
                onClick={() => setActiveTool(tool.key)}
                title={tool.label}
                className={`flex items-center justify-center gap-1 rounded-lg p-2 sm:px-2.5 sm:py-1.5 text-[11px] font-semibold transition ${
                  activeTool === tool.key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tool.icon}
                <span className="hidden sm:inline">{tool.label}</span>
              </button>
            ))}
          </div>

          {/* Right: actions */}
          <div className="flex shrink-0 items-center gap-1.5">
            <LoadingButton type="button" onClick={replaceEditedImage} isLoading={isReplacing} disabled={!canReplace}
              className="hidden rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 sm:block">
              Replace
            </LoadingButton>
            <LoadingButton type="button" onClick={saveEditedImage} isLoading={isSaving} disabled={!canSave}
              className="whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40">
              Save
            </LoadingButton>
          </div>
        </div>

        {/* ── Body: canvas + panel ── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">

          {/* Canvas */}
          <div className="relative flex-1 bg-[#f0f2f5]" style={{ minHeight: '45vw' }}>
            {isLoadingImage ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <BouncingDotsLoader className="text-slate-400" dotClassName="bg-slate-400" />
              </div>
            ) : imageObj && activeTool === 'crop' ? (
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden p-4">
                <div className="alxora-admin-cropper-shell relative flex h-full w-full items-center justify-center overflow-hidden">
                  {isCropActive ? (
                    <div className="h-full w-full" style={{ filter: filterStyle }}>
                      <Cropper
                        ref={cropperRef}
                        src={editorImageSrc}
                        className="h-full w-full"
                        style={{ height: '100%', width: '100%' }}
                        guides center highlight={false} background={false} responsive
                        autoCrop={false} autoCropArea={0.9} viewMode={1} dragMode="move"
                        cropBoxMovable cropBoxResizable movable
                        zoomable={false} scalable={false} rotatable={false}
                        toggleDragModeOnDblclick={false} checkOrientation={false}
                        aspectRatio={activeAspect || NaN}
                        ready={() => { const c = cropperRef.current?.cropper; if (!c) return; c.crop(); syncCanvasAndCropToContain(c, activeAspect); }}
                        cropend={() => syncCropPixelsFromInstance(cropperRef.current?.cropper)}
                        cropmove={() => syncCropPixelsFromInstance(cropperRef.current?.cropper)}
                      />
                    </div>
                  ) : (
                    <img src={editorImageSrc} alt={imageName || 'Media'} className="block max-h-full max-w-full object-contain" style={previewImageStyle} />
                  )}
                </div>
              </div>
            ) : imageObj ? (
              <EasyCropper
                image={editorImageSrc} crop={crop} zoom={zoom} rotation={rotation}
                aspect={activeAspect} showGrid
                onCropChange={setCrop} onZoomChange={setZoom} onRotationChange={setRotation}
                objectFit="contain"
                style={{
                  containerStyle: { backgroundColor: '#f0f2f5' },
                  mediaStyle: { filter: filterStyle },
                  cropAreaStyle: { border: '2px solid rgba(255,255,255,0.9)', boxShadow: '0 0 0 9999px rgba(15,23,42,0.5)' },
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
                Unable to load image.
              </div>
            )}
          </div>

          {/* ── Right panel ── */}
          <div className="flex w-full shrink-0 flex-col overflow-hidden border-t border-slate-100 bg-white lg:w-72 lg:border-l lg:border-t-0">

            {/* Panel header */}
            <div className="shrink-0 border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-bold text-slate-900">
                {activeTool === 'crop' ? 'Crop & Frame' : activeTool === 'rotate' ? 'Rotate' : activeTool === 'enhance' ? 'Enhance' : 'Resize'}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {activeTool === 'crop' ? 'Set ratio and drag the crop box.' : activeTool === 'rotate' ? 'Rotate or fine-tune the angle.' : activeTool === 'enhance' ? 'Pick a filter preset.' : 'Set export dimensions.'}
              </p>
            </div>

            {/* Panel controls */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">

              {/* ══ CROP ══ */}
              {activeTool === 'crop' && (
                <div className="space-y-5">

                  {/* Step 1 — Aspect ratio */}
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">1</span>
                      <p className="text-xs font-semibold text-slate-700">Choose a ratio</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ASPECT_OPTIONS.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setAspectKey(opt.key)}
                          className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition ${
                            aspectKey === opt.key
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2 — Activate */}
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">2</span>
                      <p className="text-xs font-semibold text-slate-700">Activate & drag</p>
                    </div>
                    {!isCropActive ? (
                      <button
                        type="button"
                        onClick={() => { setZoom(1); setCrop({ x: 0, y: 0 }); setCroppedAreaPixels(null); setIsCropActive(true); }}
                        className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                      >
                        Activate crop
                      </button>
                    ) : (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                          <p className="text-[11px] font-semibold text-emerald-700">Crop is active</p>
                        </div>
                        <p className="mt-1 text-[10px] text-emerald-600">Drag handles to resize · drag inside to move</p>
                        {croppedAreaPixels && (
                          <p className="mt-1 font-mono text-[10px] text-emerald-500">
                            {croppedAreaPixels.width} × {croppedAreaPixels.height} px
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Step 3 — Apply or cancel */}
                  {isCropActive && (
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">3</span>
                        <p className="text-xs font-semibold text-slate-700">Confirm</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={applyCropToPreview}
                          className="rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                        >
                          Apply crop ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => { cropperRef.current?.cropper?.clear(); setIsCropActive(false); setCroppedAreaPixels(null); }}
                          className="rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Crop applied state */}
                  {!isCropActive && sessionMedia && (
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7" strokeLinecap="round" /></svg>
                      <p className="text-[11px] text-slate-600">Crop applied to preview. Save when ready.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ══ ROTATE ══ */}
              {activeTool === 'rotate' && (
                <div className="space-y-5">

                  {/* Current angle display */}
                  <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 py-4">
                    <div className="text-center">
                      <p className="font-mono text-3xl font-bold text-slate-900">{Math.round(rotation)}°</p>
                      <p className="mt-1 text-[10px] text-slate-400">Current rotation</p>
                    </div>
                  </div>

                  {/* Quick turns */}
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Quick rotate</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => applyQuarterTurn(-1)}
                        className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 12a8 8 0 1 0 3-6.3" /><path d="M4 4v5h5" /></svg>
                        ← 90°
                      </button>
                      <button
                        type="button"
                        onClick={() => applyQuarterTurn(1)}
                        className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        90° →
                        <svg viewBox="0 0 24 24" className="h-4 w-4 scale-x-[-1]" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 12a8 8 0 1 0 3-6.3" /><path d="M4 4v5h5" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Fine angle */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Fine angle</p>
                      <button type="button" onClick={() => setRotation(0)} className="text-[10px] font-medium text-slate-400 hover:text-slate-700">Reset</button>
                    </div>
                    <input
                      type="range" min="-180" max="180" step="1"
                      value={rotation > 180 ? rotation - 360 : rotation}
                      onChange={(e) => setRotation(((Number(e.target.value) % 360) + 360) % 360)}
                      className="w-full accent-slate-900"
                    />
                    <div className="mt-1 flex justify-between text-[10px] text-slate-300">
                      <span>-180°</span><span>0°</span><span>+180°</span>
                    </div>
                  </div>

                  <p className="text-[11px] leading-5 text-slate-400">
                    Rotation is applied when you save — the preview updates in real time.
                  </p>
                </div>
              )}

              {/* ══ ENHANCE ══ */}
              {activeTool === 'enhance' && (
                <div className="space-y-5">

                  {/* Presets */}
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Presets</p>
                    <div className="grid grid-cols-2 gap-2">
                      {presets.map((p) => (
                        <button
                          key={p.key}
                          type="button"
                          onClick={() => setPresetKey(p.key)}
                          className={`rounded-xl border px-3 py-2.5 text-left transition ${
                            presetKey === p.key && !isManual
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white hover:border-slate-400'
                          }`}
                        >
                          <p className={`text-[11px] font-bold ${presetKey === p.key && !isManual ? 'text-white' : 'text-slate-700'}`}>{p.label}</p>
                          <p className={`text-[10px] ${presetKey === p.key && !isManual ? 'text-white/70' : 'text-slate-400'}`}>{p.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual sliders */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Manual adjust</p>
                      {isManual && <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-semibold text-white">Custom</span>}
                    </div>
                    {[
                      { label: 'Brightness', value: brightness, set: setManualBrightness, min: 50, max: 200 },
                      { label: 'Contrast',   value: contrast,   set: setManualContrast,   min: 50, max: 200 },
                      { label: 'Saturation', value: saturation, set: setManualSaturation, min: 0,  max: 200 },
                    ].map((s) => (
                      <div key={s.label} className="mb-3">
                        <div className="mb-1 flex justify-between text-[10px] font-medium text-slate-500">
                          <span>{s.label}</span>
                          <span className="font-mono">{Math.round(s.value)}%</span>
                        </div>
                        <input
                          type="range" min={s.min} max={s.max} step="1"
                          value={isManual ? s.value : (appliedFilters[s.label.toLowerCase()] ?? appliedFilters.saturate ?? 100)}
                          onChange={(e) => s.set(Number(e.target.value))}
                          className="w-full accent-slate-900"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ══ RESIZE ══ */}
              {activeTool === 'resize' && (
                <div className="space-y-5">

                  {/* Original dimensions */}
                  {imageObj && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Original</p>
                      <p className="mt-1 font-mono text-sm font-bold text-slate-700">
                        {imageObj.naturalWidth} × {imageObj.naturalHeight} px
                      </p>
                    </div>
                  )}

                  {/* Lock aspect ratio */}
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:bg-slate-50">
                    <div className={`relative h-5 w-9 rounded-full transition ${lockAspectRatio ? 'bg-slate-900' : 'bg-slate-200'}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${lockAspectRatio ? 'left-4' : 'left-0.5'}`} />
                    </div>
                    <input type="checkbox" checked={lockAspectRatio} onChange={(e) => setLockAspectRatio(e.target.checked)} className="sr-only" />
                    <span className="text-xs font-semibold text-slate-700">Lock aspect ratio</span>
                  </label>

                  {/* Dimensions */}
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Export size</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="mb-1 text-[10px] text-slate-400">Width (px)</p>
                        <input type="number" min="1" inputMode="numeric" value={resizeWidth} onChange={(e) => handleWidthChange(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <p className="mb-1 text-[10px] text-slate-400">Height (px)</p>
                        <input type="number" min="1" inputMode="numeric" value={resizeHeight} onChange={(e) => handleHeightChange(e.target.value)} className={inputCls} />
                      </div>
                    </div>
                  </div>

                  {/* Quick presets */}
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Quick sizes</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: 'Square',   w: 800,  h: 800  },
                        { label: 'Portrait', w: 800,  h: 1000 },
                        { label: 'Wide',     w: 1200, h: 630  },
                        { label: 'HD',       w: 1280, h: 720  },
                        { label: 'Full HD',  w: 1920, h: 1080 },
                        { label: 'Thumb',    w: 400,  h: 400  },
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => { handleWidthChange(String(p.w)); setResizeHeight(String(p.h)); setHasCustomResize(true); }}
                          className="rounded-lg border border-slate-200 px-2 py-2 text-center transition hover:border-slate-400 hover:bg-slate-50"
                        >
                          <p className="text-[10px] font-semibold text-slate-700">{p.label}</p>
                          <p className="text-[9px] text-slate-400">{p.w}×{p.h}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* File name */}
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">File name</p>
                    <input value={imageName} onChange={(e) => setImageName(e.target.value)} className={inputCls} placeholder="image-name" />
                    <p className="mt-1 text-[10px] text-slate-400">Saved as .webp · {resizeWidth && resizeHeight ? `${resizeWidth}×${resizeHeight}px` : 'original size'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Panel footer — status + mobile Replace button */}
            <div className="shrink-0 border-t border-slate-100 px-4 py-3 space-y-2">
              {statusMessage && <p className="text-[11px] font-semibold text-emerald-600">{statusMessage}</p>}
              {error && <p className="text-[11px] text-rose-500">{error}</p>}
              <LoadingButton
                type="button"
                onClick={replaceEditedImage}
                isLoading={isReplacing}
                disabled={!canReplace}
                className="w-full rounded-xl border border-slate-200 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 lg:hidden"
              >
                Replace original
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImageEditorModal;
