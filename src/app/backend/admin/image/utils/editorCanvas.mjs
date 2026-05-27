const getRadianAngle = (degreeValue = 0) => (degreeValue * Math.PI) / 180;

const rotateSize = (width, height, rotation) => {
  const radians = getRadianAngle(rotation);
  return {
    width:
      Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height),
    height:
      Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height),
  };
};

const clampDimension = (value, fallback) => {
  const normalized = Number(value);
  if (Number.isFinite(normalized) && normalized > 0) {
    return Math.max(1, Math.round(normalized));
  }
  return Math.max(1, Math.round(fallback || 1));
};

export const buildCanvasFilter = (filters = {}) => {
  const brightness = Number(filters?.brightness ?? 100);
  const contrast = Number(filters?.contrast ?? 100);
  const saturate = Number(filters?.saturate ?? 100);
  return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`;
};

export const renderEditedImageToCanvas = ({
  image,
  pixelCrop,
  rotation = 0,
  filters,
  outputWidth,
  outputHeight,
  background = '#ffffff',
}) => {
  if (!image) {
    throw new Error('No image available for export.');
  }

  const safeCrop = pixelCrop || {
    x: 0,
    y: 0,
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  };

  const rotatedBounds = rotateSize(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    rotation,
  );

  const workCanvas = document.createElement('canvas');
  const workContext = workCanvas.getContext('2d');
  if (!workContext) {
    throw new Error('Unable to prepare image export.');
  }

  workCanvas.width = Math.round(rotatedBounds.width);
  workCanvas.height = Math.round(rotatedBounds.height);

  workContext.fillStyle = background;
  workContext.fillRect(0, 0, workCanvas.width, workCanvas.height);
  workContext.translate(workCanvas.width / 2, workCanvas.height / 2);
  workContext.rotate(getRadianAngle(rotation));
  workContext.filter = buildCanvasFilter(filters);
  workContext.drawImage(
    image,
    -(image.naturalWidth || image.width) / 2,
    -(image.naturalHeight || image.height) / 2,
  );
  workContext.setTransform(1, 0, 0, 1, 0, 0);
  workContext.filter = 'none';

  const destinationWidth = clampDimension(outputWidth, safeCrop.width);
  const destinationHeight = clampDimension(outputHeight, safeCrop.height);
  const outputCanvas = document.createElement('canvas');
  const outputContext = outputCanvas.getContext('2d');
  if (!outputContext) {
    throw new Error('Unable to finalize image export.');
  }

  outputCanvas.width = destinationWidth;
  outputCanvas.height = destinationHeight;
  outputContext.fillStyle = background;
  outputContext.fillRect(0, 0, destinationWidth, destinationHeight);
  outputContext.drawImage(
    workCanvas,
    safeCrop.x,
    safeCrop.y,
    safeCrop.width,
    safeCrop.height,
    0,
    0,
    destinationWidth,
    destinationHeight,
  );

  return outputCanvas;
};
