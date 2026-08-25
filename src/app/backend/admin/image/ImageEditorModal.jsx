'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EasyCropper from 'react-easy-crop';
import Cropper from 'react-cropper';
import BouncingDotsLoader from '../components/BouncingDotsLoader';
import { useImageEnhancer } from './hooks/useImageEnhancer';
import { toSafeName } from './utils/imageUtils';
import { renderEditedImageToCanvas, buildCanvasFilter } from './utils/editorCanvas.mjs';
import { canvasToWebpBlob, convertFileToWebpBlob, MAX_UPLOAD_BYTES } from './utils/webpUtils.mjs';
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
  {
    key: 'background',
    label: 'Background',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="3" strokeDasharray="3 3" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-4.5-4.5a2 2 0 0 0-2.83 0L5 19" />
      </svg>
    ),
  },
];

const TOOL_PANEL_COPY = {
  crop: { title: 'Crop', subtitle: 'Set ratio and drag the crop box.' },
  rotate: { title: 'Rotate', subtitle: 'Rotate or fine-tune the angle.' },
  enhance: { title: 'Enhance', subtitle: 'Pick a filter preset.' },
  resize: { title: 'Resize', subtitle: 'Set export dimensions.' },
  background: { title: 'Background', subtitle: 'Remove the background automatically.' },
};

const ASPECT_OPTIONS = [
  { key: 'free', label: 'Free', value: 'free' },
  { key: 'original', label: 'Original', value: 'original' },
  { key: 'square', label: '1:1', value: 1 },
  { key: 'portrait', label: '4:5', value: 4 / 5 },
  { key: 'story', label: '9:16', value: 9 / 16 },
  { key: 'wide', label: '16:9', value: 16 / 9 },
];

const IMAGE_ID_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const generateImageId = () => {
  let id = 'IMG-';
  for (let i = 0; i < 7; i++) id += IMAGE_ID_ALPHABET[Math.floor(Math.random() * IMAGE_ID_ALPHABET.length)];
  return id;
};

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
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [backgroundRemoved, setBackgroundRemoved] = useState(false);
  const [brushMode, setBrushMode] = useState('restore');
  const [brushSize, setBrushSize] = useState(40);
  const [isPainting, setIsPainting] = useState(false);
  const bgOriginalCanvasRef = useRef(null);
  const bgMaskCanvasRef = useRef(null);
  const bgPreviewCanvasRef = useRef(null);
  const bgPaintingRef = useRef(false);
  const bgLastPointRef = useRef(null);
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

  // Resets the whole editor UI only on a genuine media switch — the
  // incoming `media` prop, not our own preview-blob updates (crop apply,
  // background removal/touch-up), which also change activeMedia.url via
  // sessionMedia but must NOT kick the user back to the Crop tool or wipe
  // whatever tool state they're mid-edit on.
  useEffect(() => {
    if (!media?.id && !media?.url) return;
    setImageName(media?.title || `image-${media?.id || ''}`);
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
    setBackgroundRemoved(false);
    bgOriginalCanvasRef.current = null;
    bgMaskCanvasRef.current = null;
    resetEnhancer();
  }, [media?.id, media?.url, media?.title, resetEnhancer]);

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

  // Leaves room around the fitted image so crop-box drag handles (which
  // straddle the box border) never render clipped against the container edge.
  const CROP_HANDLE_INSET = 10;

  const syncCanvasAndCropToContain = useCallback((cropperInstance, ratioOverride = activeAspect) => {
    if (!cropperInstance) return;

    const containerData = cropperInstance.getContainerData?.();
    const imageData = cropperInstance.getImageData?.();
    if (!containerData || !imageData?.naturalWidth || !imageData?.naturalHeight) {
      return;
    }

    const availableWidth = Math.max(1, containerData.width - CROP_HANDLE_INSET * 2);
    const availableHeight = Math.max(1, containerData.height - CROP_HANDLE_INSET * 2);

    const fittedScale = Math.min(
      availableWidth / imageData.naturalWidth,
      availableHeight / imageData.naturalHeight,
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

  useEffect(() => {
    if (!isCropActive) return undefined;
    const handleResize = () => {
      const cropper = cropperRef.current?.cropper;
      if (cropper) syncCanvasAndCropToContain(cropper, activeAspect);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
    setBackgroundRemoved(false);
    bgOriginalCanvasRef.current = null;
    bgMaskCanvasRef.current = null;
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

  // Redraws the live preview canvas as original-pixels × current mask alpha,
  // then pushes the result into the same preview pipeline crop/rotate use.
  const renderBgComposite = useCallback(() => {
    const original = bgOriginalCanvasRef.current;
    const mask = bgMaskCanvasRef.current;
    const preview = bgPreviewCanvasRef.current;
    if (!original || !mask || !preview) return;

    const w = original.width;
    const h = original.height;
    preview.width = w;
    preview.height = h;
    const previewCtx = preview.getContext('2d');
    const maskCtx = mask.getContext('2d');
    if (!previewCtx || !maskCtx) return;

    previewCtx.clearRect(0, 0, w, h);
    previewCtx.drawImage(original, 0, 0);
    const maskData = maskCtx.getImageData(0, 0, w, h);
    const outData = previewCtx.getImageData(0, 0, w, h);
    for (let i = 0; i < outData.data.length; i += 4) {
      outData.data[i + 3] = maskData.data[i]; // mask channels are all equal (grayscale)
    }
    previewCtx.putImageData(outData, 0, 0);
  }, []);

  const pushBgPreviewAsSession = useCallback(async () => {
    const preview = bgPreviewCanvasRef.current;
    if (!preview) return;
    const blob = await canvasToWebpBlob(preview);
    if (!blob) return;
    if (sessionPreviewUrlRef.current) {
      URL.revokeObjectURL(sessionPreviewUrlRef.current);
    }
    const nextUrl = URL.createObjectURL(blob);
    sessionPreviewUrlRef.current = nextUrl;
    setSessionMedia({ url: nextUrl, title: imageName });
  }, [imageName]);

  // Runs the first composite once the touch-up <canvas> DOM node mounts
  // (it only renders while activeTool === 'background' && backgroundRemoved,
  // so this can't run inside applyBackgroundRemoval itself — the node
  // doesn't exist yet at that point).
  useEffect(() => {
    if (!backgroundRemoved || activeTool !== 'background') return;
    if (!bgPreviewCanvasRef.current || !bgOriginalCanvasRef.current || !bgMaskCanvasRef.current) return;
    renderBgComposite();
    pushBgPreviewAsSession();
  }, [activeTool, backgroundRemoved, renderBgComposite, pushBgPreviewAsSession]);

  const applyBackgroundRemoval = async () => {
    if (!imageObj || isRemovingBackground) return;
    setIsRemovingBackground(true);
    setError('');
    setStatusMessage('Removing background…');

    try {
      // Draw the already-loaded image to a canvas and hand the library a
      // Blob directly, rather than a URL — passing a URL makes the library
      // do its own fetch() internally, which can come back with an HTML
      // error/redirect page (auth gate, 404) instead of the image and
      // fail with "Invalid format: text/html".
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = imageObj.naturalWidth;
      sourceCanvas.height = imageObj.naturalHeight;
      const sourceCtx = sourceCanvas.getContext('2d');
      if (!sourceCtx) throw new Error('Canvas is not available.');
      sourceCtx.drawImage(imageObj, 0, 0);
      const sourceBlob = await canvasToWebpBlob(sourceCanvas);
      if (!sourceBlob) throw new Error('Unable to prepare image for background removal.');

      // The model files are fetched from imgly's CDN on first use. If that
      // request is blocked (network filtering, an ad-blocker, a browser
      // extension) the fetch can resolve with an HTML page instead of the
      // expected binary/JSON, which the library then fails to parse with a
      // cryptic "Invalid format: text/html" error. Check reachability first
      // so we can surface a clear, actionable message instead of that.
      try {
        const probeRes = await fetch(
          'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/resources.json',
          { method: 'GET', mode: 'cors', cache: 'no-store' },
        );
        const probeType = probeRes.headers.get('content-type') || '';
        if (!probeRes.ok || !probeType.includes('json')) {
          throw new Error('blocked');
        }
      } catch {
        throw new Error(
          'Background removal needs to download a one-time AI model from staticimgly.com, but that request is being blocked (by your network, an ad-blocker, or a browser extension). Try disabling ad-blocking extensions for this site, switching networks, or allowing staticimgly.com.',
        );
      }

      // segmentForeground/alphamask returns just the mask (a white image
      // whose alpha channel is the segmentation) instead of the final
      // composited cutout — keeping mask and original pixels separate is
      // what lets the touch-up brush restore/erase by editing the mask
      // alone, without re-running the model.
      //
      // device: 'gpu' + proxyToWorker: true runs inference on WebGPU inside
      // a worker instead of blocking the main thread with WASM — without
      // this the tab can freeze/"Page Unresponsive" for several seconds
      // while the model runs. The library auto-falls-back to CPU/main-thread
      // if WebGPU isn't available in this browser.
      const { segmentForeground } = await import('@imgly/background-removal');
      const maskBlob = await segmentForeground(sourceBlob, {
        device: 'gpu',
        proxyToWorker: true,
      });
      const maskImg = await loadImageObject(URL.createObjectURL(maskBlob));

      bgOriginalCanvasRef.current = sourceCanvas;

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = sourceCanvas.width;
      maskCanvas.height = sourceCanvas.height;
      const maskCtx = maskCanvas.getContext('2d');
      if (!maskCtx) throw new Error('Canvas is not available.');
      maskCtx.drawImage(maskImg, 0, 0, maskCanvas.width, maskCanvas.height);
      bgMaskCanvasRef.current = maskCanvas;

      setBackgroundRemoved(true);
      setStatusMessage('Background removed. Touch up or save when ready.');
    } catch (removalError) {
      setError(removalError?.message || 'Unable to remove background.');
      setStatusMessage('');
    } finally {
      setIsRemovingBackground(false);
    }
  };

  // Converts a pointer event on the displayed <canvas> into mask-pixel
  // coordinates (the canvas backing store can be a different resolution
  // than its on-screen CSS size).
  const bgEventToMaskPoint = useCallback((event) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }, []);

  const paintMaskStroke = useCallback((from, to) => {
    const mask = bgMaskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = brushMode === 'restore' ? '#fff' : '#000';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = brushSize;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(to.x, to.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    renderBgComposite();
  }, [brushMode, brushSize, renderBgComposite]);

  const handleBrushPointerDown = useCallback((event) => {
    if (!bgMaskCanvasRef.current) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    bgPaintingRef.current = true;
    setIsPainting(true);
    const point = bgEventToMaskPoint(event);
    bgLastPointRef.current = point;
    paintMaskStroke(point, point);
  }, [bgEventToMaskPoint, paintMaskStroke]);

  const handleBrushPointerMove = useCallback((event) => {
    if (!bgPaintingRef.current) return;
    const point = bgEventToMaskPoint(event);
    const from = bgLastPointRef.current || point;
    paintMaskStroke(from, point);
    bgLastPointRef.current = point;
  }, [bgEventToMaskPoint, paintMaskStroke]);

  const handleBrushPointerUp = useCallback(async (event) => {
    if (!bgPaintingRef.current) return;
    event.currentTarget?.releasePointerCapture?.(event.pointerId);
    bgPaintingRef.current = false;
    bgLastPointRef.current = null;
    setIsPainting(false);
    await pushBgPreviewAsSession();
  }, [pushBgPreviewAsSession]);

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
        background: backgroundRemoved ? 'transparent' : '#ffffff',
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
      formData.append('local_image_id', generateImageId());

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
        local_image_id: payload?.local_image_id || '',
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
        background: backgroundRemoved ? 'transparent' : '#ffffff',
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <button type="button" onClick={onClose} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" aria-label="Close" />

      {/* ══════════════ Mobile shell (< lg) ══════════════ */}
      <div className="fixed inset-0 z-10 flex h-dvh w-full flex-col overflow-hidden bg-white lg:hidden">

        {/* Top bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 pb-2.5 pt-3.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" /></svg>
            </button>
            <button
              type="button"
              onClick={resetEdits}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"
              aria-label="Reset"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 12a8 8 0 1 0 3-6.3" /><path d="M4 4v5h5" /></svg>
            </button>
          </div>
          <LoadingButton
            type="button"
            onClick={saveEditedImage}
            isLoading={isSaving}
            disabled={!canSave}
            className="rounded-full bg-slate-900 px-5 py-2 text-[13px] font-bold text-white disabled:opacity-40"
          >
            Save
          </LoadingButton>
        </div>

        {/* Canvas */}
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-1">
          {isLoadingImage ? (
            <BouncingDotsLoader className="text-slate-400" dotClassName="bg-slate-400" />
          ) : imageObj && activeTool === 'crop' ? (
            <div className="alxora-admin-cropper-shell relative aspect-square w-full max-w-[420px] overflow-hidden rounded-2xl bg-slate-100">
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
                  ready={() => {
                    const c = cropperRef.current?.cropper;
                    if (!c) return;
                    c.crop();
                    // Mobile skips the desktop's explicit "Activate crop" step —
                    // the crop box is always live as soon as the tool mounts, so
                    // mark it active here too, otherwise applyCropToPreview's
                    // isCropActive guard would silently no-op on mobile.
                    setIsCropActive(true);
                    syncCanvasAndCropToContain(c, activeAspect);
                    requestAnimationFrame(() => {
                      const cropper = cropperRef.current?.cropper;
                      if (cropper) syncCanvasAndCropToContain(cropper, activeAspect);
                    });
                  }}
                  cropend={() => syncCropPixelsFromInstance(cropperRef.current?.cropper)}
                  cropmove={() => syncCropPixelsFromInstance(cropperRef.current?.cropper)}
                />
              </div>
            </div>
          ) : imageObj && activeTool === 'background' && backgroundRemoved ? (
            <div
              className="flex aspect-square w-full max-w-[420px] items-center justify-center overflow-hidden rounded-2xl"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                backgroundColor: '#f8fafc',
              }}
            >
              <canvas
                ref={(node) => {
                  bgPreviewCanvasRef.current = node;
                  if (node && bgOriginalCanvasRef.current && bgMaskCanvasRef.current) {
                    renderBgComposite();
                  }
                }}
                width={imageObj.naturalWidth}
                height={imageObj.naturalHeight}
                className="block max-h-full max-w-full touch-none object-contain"
                onPointerDown={handleBrushPointerDown}
                onPointerMove={handleBrushPointerMove}
                onPointerUp={handleBrushPointerUp}
                onPointerLeave={handleBrushPointerUp}
              />
            </div>
          ) : imageObj ? (
            <div className="relative aspect-square w-full max-w-[420px] overflow-hidden rounded-2xl">
              <EasyCropper
                image={editorImageSrc} crop={crop} zoom={zoom} rotation={rotation}
                aspect={1} showGrid={false}
                onCropChange={setCrop} onZoomChange={setZoom} onRotationChange={setRotation}
                objectFit="contain"
                style={{
                  containerStyle: { backgroundColor: 'transparent' },
                  mediaStyle: { filter: filterStyle },
                  cropAreaStyle: { border: 'none', boxShadow: 'none' },
                }}
              />
            </div>
          ) : (
            <p className="text-sm text-slate-400">Unable to load image.</p>
          )}
        </div>

        {/* Aspect ratio row — only meaningful for Crop */}
        {activeTool === 'crop' && (
          <div className="flex shrink-0 gap-4 overflow-x-auto px-5 pb-1 pt-3 [&::-webkit-scrollbar]:hidden">
            {ASPECT_OPTIONS.filter((o) => ['free', 'original', 'square', 'wide', 'story'].includes(o.key)).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setAspectKey(opt.key)}
                className="flex shrink-0 flex-col items-center gap-1.5"
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-[10px] border-[1.5px] ${
                  aspectKey === opt.key ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-400'
                }`}>
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="5" width="14" height="14" rx="2" /></svg>
                </span>
                <span className={`text-[10px] ${aspectKey === opt.key ? 'font-bold text-slate-900' : 'font-medium text-slate-400'}`}>
                  {opt.key === 'free' ? 'Custom' : opt.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Slider strip — angle for Rotate, brush size for Background touch-up */}
        {(activeTool === 'rotate' || (activeTool === 'background' && backgroundRemoved)) && (
          <div className="flex shrink-0 flex-col items-center gap-2 px-5 pb-3 pt-2">
            <span className="flex h-6 w-8 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
              {activeTool === 'rotate' ? Math.round(rotation > 180 ? rotation - 360 : rotation) : brushSize}
            </span>
            {activeTool === 'rotate' ? (
              <input
                type="range" min="-180" max="180" step="1"
                value={rotation > 180 ? rotation - 360 : rotation}
                onChange={(e) => setRotation(((Number(e.target.value) % 360) + 360) % 360)}
                className="w-full accent-slate-900"
              />
            ) : (
              <input
                type="range" min="8" max="150" step="1"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-full accent-slate-900"
              />
            )}
          </div>
        )}

        {(statusMessage || error) && (
          <div className="shrink-0 px-5 pb-1">
            {statusMessage && <p className="text-[11px] font-medium text-emerald-600">{statusMessage}</p>}
            {error && <p className="text-[11px] font-medium text-rose-500">{error}</p>}
          </div>
        )}

        {/* Mobile-only extra controls that don't fit the dock/slider pattern above */}
        {activeTool === 'crop' && (
          <div className="flex shrink-0 justify-center gap-3 px-5 pb-3">
            <button type="button" onClick={applyCropToPreview} className="rounded-full bg-slate-900 px-5 py-2 text-xs font-bold text-white">
              Apply crop
            </button>
            <button
              type="button"
              onClick={() => {
                const c = cropperRef.current?.cropper;
                if (c) syncCanvasAndCropToContain(c, activeAspect);
              }}
              className="rounded-full border border-slate-200 px-5 py-2 text-xs font-bold text-slate-600"
            >
              Reset
            </button>
          </div>
        )}
        {activeTool === 'enhance' && (
          <div className="flex shrink-0 gap-2 overflow-x-auto px-5 pb-3 [&::-webkit-scrollbar]:hidden">
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPresetKey(p.key)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold ${
                  presetKey === p.key && !isManual ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
        {activeTool === 'resize' && (
          <div className="flex shrink-0 gap-2 overflow-x-auto px-5 pb-3 [&::-webkit-scrollbar]:hidden">
            {[
              { label: 'Square', w: 800, h: 800 },
              { label: 'Portrait', w: 800, h: 1000 },
              { label: 'Wide', w: 1200, h: 630 },
              { label: 'Thumb', w: 400, h: 400 },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => { handleWidthChange(String(p.w)); setResizeHeight(String(p.h)); setHasCustomResize(true); }}
                className="shrink-0 rounded-full bg-slate-100 px-3.5 py-1.5 text-[11px] font-semibold text-slate-600"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
        {activeTool === 'background' && !backgroundRemoved && (
          <div className="flex shrink-0 justify-center px-5 pb-3">
            <LoadingButton
              type="button"
              onClick={applyBackgroundRemoval}
              isLoading={isRemovingBackground}
              disabled={!imageObj}
              className="rounded-full bg-slate-900 px-6 py-2.5 text-xs font-bold text-white disabled:opacity-40"
            >
              {isRemovingBackground ? 'Removing background…' : 'Remove background'}
            </LoadingButton>
          </div>
        )}
        {activeTool === 'background' && backgroundRemoved && (
          <div className="flex shrink-0 justify-center gap-2 px-5 pb-3">
            <button
              type="button"
              onClick={() => setBrushMode('restore')}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-semibold ${
                brushMode === 'restore' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Restore
            </button>
            <button
              type="button"
              onClick={() => setBrushMode('erase')}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-semibold ${
                brushMode === 'erase' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 20H9l-6-6a2 2 0 0 1 0-2.83l8-8a2 2 0 0 1 2.83 0l6 6a2 2 0 0 1 0 2.83L13 19" /></svg>
              Erase
            </button>
          </div>
        )}

        {/* Bottom icon dock */}
        <div className="flex shrink-0 items-center justify-around border-t border-slate-100 px-2 pb-6 pt-2">
          {TOOL_OPTIONS.map((tool) => (
            <button
              key={tool.key}
              type="button"
              onClick={() => setActiveTool(tool.key)}
              aria-label={tool.label}
              className={`flex h-[46px] w-[46px] items-center justify-center rounded-full ${
                activeTool === tool.key ? 'bg-slate-900 text-white' : 'text-slate-400'
              }`}
            >
              {tool.icon}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════ Desktop shell (lg+) ══════════════ */}
      <div className="relative z-10 hidden h-full w-full flex-col overflow-hidden bg-white sm:h-[calc(100vh-32px)] sm:max-w-6xl sm:rounded-2xl sm:shadow-2xl lg:flex">

        {/* ── Top bar ── */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
          <p className="truncate text-base font-bold text-slate-900 sm:text-lg">Edit image</p>
          <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* ── Body: rail + panel + canvas ── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">

          {/* Icon rail */}
          <div className="flex shrink-0 items-center gap-1 border-b border-slate-100 px-3 py-2 lg:flex-col lg:justify-start lg:gap-1.5 lg:border-b-0 lg:border-r lg:px-0 lg:py-4">
            {TOOL_OPTIONS.map((tool) => (
              <button
                key={tool.key}
                type="button"
                onClick={() => setActiveTool(tool.key)}
                title={tool.label}
                aria-label={tool.label}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                  activeTool === tool.key ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                {tool.icon}
              </button>
            ))}
          </div>

          {/* ── Left tool panel ── */}
          <div className="flex w-full shrink-0 flex-col overflow-hidden border-b border-slate-100 bg-white lg:w-64 lg:border-b-0 lg:border-r">

            {/* Panel header */}
            <div className="shrink-0 px-5 pb-1 pt-4 lg:pt-5">
              <p className="text-base font-bold text-slate-900 lg:text-lg">
                {TOOL_PANEL_COPY[activeTool]?.title}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {TOOL_PANEL_COPY[activeTool]?.subtitle}
              </p>
            </div>

            {/* Panel controls */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-200">

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

              {/* ══ BACKGROUND ══ */}
              {activeTool === 'background' && (
                <div className="space-y-5">
                  <p className="text-[11px] leading-5 text-slate-400">
                    Automatically cuts out the subject and makes the background transparent. Runs entirely in your browser — nothing is uploaded to a third-party service.
                  </p>

                  {!backgroundRemoved ? (
                    <>
                      <LoadingButton
                        type="button"
                        onClick={applyBackgroundRemoval}
                        isLoading={isRemovingBackground}
                        disabled={!imageObj}
                        className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40"
                      >
                        {isRemovingBackground ? 'Removing background…' : 'Remove background'}
                      </LoadingButton>
                      {isRemovingBackground && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400">First use downloads a small on-device model — this can take a moment.</p>
                          <p className="text-[10px] leading-4 text-amber-600">
                            The tab may look frozen for a few seconds on browsers without WebGPU support — that's expected, not a crash. Please wait.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7" strokeLinecap="round" /></svg>
                          <p className="text-[11px] font-semibold text-emerald-700">Background removed</p>
                        </div>
                        <p className="mt-1 text-[10px] text-emerald-600">Save when ready, or reset to undo.</p>
                      </div>

                      <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Touch up</p>
                        <p className="mb-3 text-[11px] leading-5 text-slate-400">
                          Paint on the image to fix spots that were removed or kept by mistake.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setBrushMode('restore')}
                            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-semibold transition ${
                              brushMode === 'restore'
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                            }`}
                          >
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => setBrushMode('erase')}
                            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-semibold transition ${
                              brushMode === 'erase'
                                ? 'border-slate-900 bg-slate-900 text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                            }`}
                          >
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 20H9l-6-6a2 2 0 0 1 0-2.83l8-8a2 2 0 0 1 2.83 0l6 6a2 2 0 0 1 0 2.83L13 19" /></svg>
                            Erase
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Brush size</p>
                          <span className="font-mono text-[10px] text-slate-500">{brushSize}px</span>
                        </div>
                        <input
                          type="range" min="8" max="150" step="1"
                          value={brushSize}
                          onChange={(e) => setBrushSize(Number(e.target.value))}
                          className="w-full accent-slate-900"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Canvas + rotation strip ── */}
          <div className="flex min-h-[70vh] flex-1 flex-col sm:min-h-0">
            <div className="relative min-h-0 flex-1 bg-[#f0f2f5]">
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
                          ready={() => {
                            const c = cropperRef.current?.cropper;
                            if (!c) return;
                            c.crop();
                            syncCanvasAndCropToContain(c, activeAspect);
                            // The flex layout (rail + panel + canvas) can still be settling
                            // when `ready` fires, so the first measurement is sometimes stale
                            // (e.g. a wide default box on a portrait image). Re-sync once more
                            // after layout has genuinely finished.
                            requestAnimationFrame(() => {
                              const cropper = cropperRef.current?.cropper;
                              if (cropper) syncCanvasAndCropToContain(cropper, activeAspect);
                            });
                          }}
                          cropend={() => syncCropPixelsFromInstance(cropperRef.current?.cropper)}
                          cropmove={() => syncCropPixelsFromInstance(cropperRef.current?.cropper)}
                        />
                      </div>
                    ) : (
                      <img src={editorImageSrc} alt={imageName || 'Media'} className="block max-h-full max-w-full object-contain" style={previewImageStyle} />
                    )}
                  </div>
                </div>
              ) : imageObj && activeTool === 'background' && backgroundRemoved ? (
                <div
                  className="absolute inset-0 flex items-center justify-center p-4"
                  style={{
                    backgroundImage:
                      'linear-gradient(45deg, #d8dee6 25%, transparent 25%), linear-gradient(-45deg, #d8dee6 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d8dee6 75%), linear-gradient(-45deg, transparent 75%, #d8dee6 75%)',
                    backgroundSize: '20px 20px',
                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                  }}
                >
                  <canvas
                    ref={(node) => {
                      bgPreviewCanvasRef.current = node;
                      if (node && bgOriginalCanvasRef.current && bgMaskCanvasRef.current) {
                        renderBgComposite();
                      }
                    }}
                    width={imageObj.naturalWidth}
                    height={imageObj.naturalHeight}
                    className="block max-h-full max-w-full touch-none object-contain"
                    style={{ cursor: 'crosshair' }}
                    onPointerDown={handleBrushPointerDown}
                    onPointerMove={handleBrushPointerMove}
                    onPointerUp={handleBrushPointerUp}
                    onPointerLeave={handleBrushPointerUp}
                  />
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

            {/* Rotation readout strip — visible while on the Rotate tool */}
            {activeTool === 'rotate' && (
              <div className="flex shrink-0 flex-col items-center gap-1 border-t border-slate-100 py-3">
                <span className="text-xs font-semibold text-slate-500">{Math.round(rotation > 180 ? rotation - 360 : rotation)}°</span>
                <input
                  type="range" min="-180" max="180" step="1"
                  value={rotation > 180 ? rotation - 360 : rotation}
                  onChange={(e) => setRotation(((Number(e.target.value) % 360) + 360) % 360)}
                  className="w-40 accent-slate-900 sm:w-56"
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-h-[16px] items-center gap-3">
            {statusMessage && <p className="text-[11px] font-semibold text-emerald-600">{statusMessage}</p>}
            {error && <p className="text-[11px] text-rose-500">{error}</p>}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <button type="button" onClick={resetEdits} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="Reset">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 12a8 8 0 1 0 3-6.3" /><path d="M4 4v5h5" /></svg>
            </button>
            <LoadingButton type="button" onClick={replaceEditedImage} isLoading={isReplacing} disabled={!canReplace}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40">
              Replace
            </LoadingButton>
            <LoadingButton type="button" onClick={saveEditedImage} isLoading={isSaving} disabled={!canSave}
              className="whitespace-nowrap rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40">
              Save
            </LoadingButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImageEditorModal;
