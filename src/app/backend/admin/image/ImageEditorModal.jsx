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
  const { presets, presetKey, setPresetKey, appliedFilters, resetEnhancer } = useImageEnhancer();

  const activeMedia = sessionMedia || uploadedMedia || media;
  const activeMediaId = activeMedia?.id || '';
  const activeMediaTitle = activeMedia?.title || '';
  const targetMediaId = media?.id || '';
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

  if (!activeMedia) {
    return null;
  }

  const canSave = Boolean(imageObj) && !isSaving;
  const canReplace = Boolean(imageObj && targetMediaId) && !isReplacing;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Close image editor"
      />
      <div className="relative z-10 flex h-[calc(100vh-48px)] w-full max-w-7xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
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
            {TOOL_OPTIONS.map((tool) => {
              const isActive = activeTool === tool.key;
              return (
                <button
                  key={tool.key}
                  type="button"
                  onClick={() => setActiveTool(tool.key)}
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
                  <span className={isActive ? 'text-slate-900' : 'text-slate-400'}>{tool.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <LoadingButton
              type="button"
              onClick={replaceEditedImage}
              isLoading={isReplacing}
              disabled={!canReplace}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
            >
              Replace image
            </LoadingButton>
            <LoadingButton
              type="button"
              onClick={saveEditedImage}
              isLoading={isSaving}
              disabled={!canSave}
              className="rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Save copy
            </LoadingButton>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-h-0 border-b border-slate-200 bg-[#f4f6f8] lg:border-b-0 lg:border-r lg:border-slate-200">
            <div className="relative h-[48vh] min-h-[320px] lg:h-full lg:min-h-0">
              {isLoadingImage ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <BouncingDotsLoader className="text-slate-400" dotClassName="bg-slate-400" />
                </div>
              ) : imageObj && activeTool === 'crop' ? (
                <div className="absolute inset-0 overflow-hidden bg-[#e9edf2] p-6">
                  <div className="alxora-admin-cropper-shell relative flex h-full w-full min-h-0 items-center justify-center overflow-hidden">
                    {isCropActive ? (
                      <div className="h-full w-full" style={{ filter: filterStyle }}>
                        <Cropper
                          ref={cropperRef}
                          src={editorImageSrc}
                          className="h-full w-full"
                          style={{ height: '100%', width: '100%' }}
                          guides
                          center
                          highlight={false}
                          background={false}
                          responsive
                          autoCrop={false}
                          autoCropArea={0.9}
                          viewMode={1}
                          dragMode="move"
                          cropBoxMovable
                          cropBoxResizable
                          movable
                          zoomable={false}
                          scalable={false}
                          rotatable={false}
                          toggleDragModeOnDblclick={false}
                          checkOrientation={false}
                          aspectRatio={activeAspect || NaN}
                          ready={() => {
                            const cropper = cropperRef.current?.cropper;
                            if (!cropper) return;
                            cropper.crop();
                            syncCanvasAndCropToContain(cropper, activeAspect);
                          }}
                          cropend={() => syncCropPixelsFromInstance(cropperRef.current?.cropper)}
                          cropmove={() => syncCropPixelsFromInstance(cropperRef.current?.cropper)}
                        />
                      </div>
                    ) : (
                      <img
                        src={editorImageSrc}
                        alt={imageName || 'Media'}
                        className="block max-h-full max-w-full object-contain"
                        style={previewImageStyle}
                      />
                    )}
                  </div>
                </div>
              ) : imageObj ? (
                <EasyCropper
                  image={editorImageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={activeAspect}
                  showGrid
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onRotationChange={setRotation}
                  objectFit="contain"
                  style={{
                    containerStyle: {
                      backgroundColor: '#e9edf2',
                    },
                    mediaStyle: {
                      filter: filterStyle,
                    },
                    cropAreaStyle: {
                      border: '2px solid rgba(255,255,255,0.96)',
                      boxShadow: '0 0 0 9999px rgba(15,23,42,0.42)',
                    },
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-400">
                  Unable to load this image into the editor.
                </div>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col bg-white">
            <div className="border-b border-slate-200/80 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Image editor</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{imageName || 'Untitled image'}</p>
              <p className="mt-1 text-xs text-slate-500">
                Crop, rotate, resize, and save a new optimized copy into the library.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-6">
                {activeTool === 'crop' && (
                  <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Crop and frame</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Drag the image, zoom in, and choose the crop ratio you want to export.
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Aspect ratio
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {ASPECT_OPTIONS.map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            onClick={() => setAspectKey(option.key)}
                            className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                              aspectKey === option.key
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setZoom(1);
                          setCrop({ x: 0, y: 0 });
                          setCroppedAreaPixels(null);
                          setIsCropActive(true);
                        }}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700"
                      >
                        {isCropActive ? 'Crop active' : 'Activate crop'}
                      </button>
                      {isCropActive ? (
                        <button
                          type="button"
                          onClick={applyCropToPreview}
                          className="rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white"
                        >
                          Done
                        </button>
                      ) : null}
                      {isCropActive ? (
                        <button
                          type="button"
                          onClick={() => {
                            const cropper = cropperRef.current?.cropper;
                            if (cropper) {
                              cropper.clear();
                            }
                            setIsCropActive(false);
                            setCroppedAreaPixels(null);
                          }}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-500"
                        >
                          Hide crop
                        </button>
                      ) : null}
                    </div>

                    <p className="text-[11px] text-slate-500">
                      {isCropActive
                        ? 'Crop mode keeps the image fully fitted. Drag the crop box to move it and use the handles to resize it freely.'
                        : 'The full image stays visible until you activate cropping.'}
                    </p>
                  </section>
                )}

                {activeTool === 'rotate' && (
                  <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Rotate image</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Use quick turns or fine-tune the angle with the slider.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => applyQuarterTurn(-1)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Rotate left
                      </button>
                      <button
                        type="button"
                        onClick={() => applyQuarterTurn(1)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        Rotate right
                      </button>
                    </div>

                    <label className="block">
                      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        <span>Angle</span>
                        <span className="text-slate-500">{Math.round(rotation)}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        step="1"
                        value={rotation}
                        onChange={(event) => setRotation(Number(event.target.value))}
                        className="mt-3 w-full accent-slate-900"
                      />
                    </label>
                  </section>
                )}

                {activeTool === 'enhance' && (
                  <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Enhance preview</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Apply lightweight enhancement presets before saving the new copy.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {presets.map((preset) => (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => setPresetKey(preset.key)}
                          className={`rounded-full border px-4 py-1.5 text-[11px] font-semibold transition ${
                            presetKey === preset.key
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {activeTool === 'resize' && (
                  <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Resize export</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Set the final width and height for the saved image copy.
                      </p>
                    </div>

                    <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={lockAspectRatio}
                        onChange={(event) => setLockAspectRatio(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                      />
                      Lock aspect ratio
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Width
                        </span>
                        <input
                          type="number"
                          min="1"
                          inputMode="numeric"
                          value={resizeWidth}
                          onChange={(event) => handleWidthChange(event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          Height
                        </span>
                        <input
                          type="number"
                          min="1"
                          inputMode="numeric"
                          value={resizeHeight}
                          onChange={(event) => handleHeightChange(event.target.value)}
                          className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                        />
                      </label>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        File name
                      </p>
                      <input
                        value={imageName}
                        onChange={(event) => setImageName(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                        placeholder="image-name"
                      />
                      <p className="mt-2 text-[11px] text-slate-400">
                        Saving creates a new `.webp` image in the library.
                      </p>
                    </div>
                  </section>
                )}
              </div>
            </div>

            {(statusMessage || error) && (
              <div className="border-t border-slate-200/70 px-5 py-3">
                {statusMessage ? (
                  <p className="text-xs font-semibold text-emerald-600">{statusMessage}</p>
                ) : null}
                {error ? <p className="mt-1 text-xs text-rose-500">{error}</p> : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImageEditorModal;
