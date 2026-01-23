const memoryCache = new Map();

const getCachedImage = (key) => {
  if (!key) return '';
  return memoryCache.get(key) || '';
};

const cacheImageFromBlob = async (key, blob) => {
  if (!key || !blob) return '';
  const url = URL.createObjectURL(blob);
  memoryCache.set(key, url);
  return url;
};

const fetchAndCacheImage = async (key, url) => {
  if (!url) return '';
  const response = await fetch(url);
  const blob = await response.blob();
  return cacheImageFromBlob(key || url, blob);
};

export { cacheImageFromBlob, fetchAndCacheImage, getCachedImage };
