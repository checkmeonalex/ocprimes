import { useCallback, useEffect, useRef, useState } from 'react';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getRelativePoint = (event, container) => {
  const rect = container?.getBoundingClientRect();
  if (!rect) return null;
  const x = clamp(event.clientX - rect.left, 0, rect.width);
  const y = clamp(event.clientY - rect.top, 0, rect.height);
  return { x, y, rect };
};

const DEFAULT_STATUS = '';
const MIN_SIZE = 20;

export const useImageCropper = ({ imageObj, onError, onStatusChange }) => {
  const [cropRect, setCropRect] = useState(null);
  const [selection, setSelection] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const containerRef = useRef(null);
  const dragStateRef = useRef(null);

  useEffect(() => {
    if (!isCropping || selection || !containerRef.current || !imageObj) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setSelection({
      x: 0,
      y: 0,
      width: rect.width,
      height: rect.height,
    });
  }, [imageObj, isCropping, selection]);

  const beginCrop = useCallback(() => {
    setIsCropping(true);
    setSelection((current) => {
      if (current || !imageObj || !containerRef.current) {
        return current;
      }
      const rect = containerRef.current.getBoundingClientRect();
      if (!cropRect) {
        return {
          x: 0,
          y: 0,
          width: rect.width,
          height: rect.height,
        };
      }
      const scaleX = rect.width / imageObj.naturalWidth;
      const scaleY = rect.height / imageObj.naturalHeight;
      return {
        x: cropRect.x * scaleX,
        y: cropRect.y * scaleY,
        width: cropRect.width * scaleX,
        height: cropRect.height * scaleY,
      };
    });
    if (onStatusChange) {
      onStatusChange('Drag to select your crop area, then apply.');
    }
  }, [cropRect, imageObj, onStatusChange]);

  const resetCrop = useCallback(() => {
    setCropRect(null);
    setSelection(null);
    setIsCropping(false);
    if (onStatusChange) {
      onStatusChange(DEFAULT_STATUS);
    }
  }, [onStatusChange]);

  const handlePointerDown = useCallback(
    (event, mode = 'new', handle = null) => {
      if (!isCropping || !containerRef.current) return;
      event.preventDefault();
      const point = getRelativePoint(event, containerRef.current);
      if (!point) return;
      if (containerRef.current.setPointerCapture) {
        try {
          containerRef.current.setPointerCapture(event.pointerId);
        } catch (_error) {}
      }
      if (mode === 'new') {
        const nextSelection = { x: point.x, y: point.y, width: 0, height: 0 };
        dragStateRef.current = { mode, handle, start: point, origin: nextSelection };
        setSelection(nextSelection);
        return;
      }
      if (!selection) return;
      dragStateRef.current = { mode, handle, start: point, origin: selection };
    },
    [isCropping, selection],
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (!isCropping || !dragStateRef.current || !containerRef.current) return;
      const point = getRelativePoint(event, containerRef.current);
      if (!point) return;
      const { mode, handle, start, origin } = dragStateRef.current;
      if (!origin) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (mode === 'new') {
        const x = Math.min(start.x, point.x);
        const y = Math.min(start.y, point.y);
        const width = Math.abs(point.x - start.x);
        const height = Math.abs(point.y - start.y);
        setSelection({ x, y, width, height });
        return;
      }
      if (mode === 'move') {
        const dx = point.x - start.x;
        const dy = point.y - start.y;
        const nextX = clamp(origin.x + dx, 0, rect.width - origin.width);
        const nextY = clamp(origin.y + dy, 0, rect.height - origin.height);
        setSelection({ ...origin, x: nextX, y: nextY });
        return;
      }
      if (mode === 'resize') {
        let next = { ...origin };
        const dx = point.x - start.x;
        const dy = point.y - start.y;
        if (handle.includes('e')) {
          next.width = clamp(origin.width + dx, MIN_SIZE, rect.width - origin.x);
        }
        if (handle.includes('s')) {
          next.height = clamp(origin.height + dy, MIN_SIZE, rect.height - origin.y);
        }
        if (handle.includes('w')) {
          const maxX = origin.x + origin.width - MIN_SIZE;
          next.x = clamp(origin.x + dx, 0, maxX);
          next.width = origin.width + (origin.x - next.x);
        }
        if (handle.includes('n')) {
          const maxY = origin.y + origin.height - MIN_SIZE;
          next.y = clamp(origin.y + dy, 0, maxY);
          next.height = origin.height + (origin.y - next.y);
        }
        setSelection(next);
      }
    },
    [isCropping],
  );

  const handlePointerUp = useCallback((event) => {
    dragStateRef.current = null;
    if (containerRef.current?.releasePointerCapture && event?.pointerId != null) {
      try {
        containerRef.current.releasePointerCapture(event.pointerId);
      } catch (_error) {}
    }
  }, []);

  const applyCrop = useCallback(() => {
    if (!selection || !imageObj || !containerRef.current) {
      if (onError) {
        onError('Select a crop area before applying.');
      }
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const baseCrop = cropRect || {
      x: 0,
      y: 0,
      width: imageObj.naturalWidth,
      height: imageObj.naturalHeight,
    };
    const scaleX = baseCrop.width / rect.width;
    const scaleY = baseCrop.height / rect.height;
    const width = Math.round(selection.width * scaleX);
    const height = Math.round(selection.height * scaleY);
    if (width < 10 || height < 10) {
      if (onError) {
        onError('Crop area is too small.');
      }
      return;
    }
    const nextCrop = {
      x: Math.round(baseCrop.x + selection.x * scaleX),
      y: Math.round(baseCrop.y + selection.y * scaleY),
      width,
      height,
    };
    setCropRect(nextCrop);
    setSelection(null);
    setIsCropping(false);
    if (onStatusChange) {
      onStatusChange('Crop applied.');
    }
  }, [cropRect, imageObj, onError, onStatusChange, selection]);

  return {
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
  };
};
