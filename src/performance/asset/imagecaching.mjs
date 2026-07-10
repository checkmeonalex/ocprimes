const MAX_CACHE_SIZE = 100;
const memoryCache = new Map();

const getCachedImage = (key) => {
  if (!key) return '';
  return memoryCache.get(key) || '';
};

const cacheImageFromBlob = async (key, blob) => {
  if (!key || !blob) return '';
  const url = URL.createObjectURL(blob);

  if (memoryCache.has(key)) {
    URL.revokeObjectURL(memoryCache.get(key));
  } else if (memoryCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = memoryCache.keys().next().value;
    URL.revokeObjectURL(memoryCache.get(oldestKey));
    memoryCache.delete(oldestKey);
  }

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
