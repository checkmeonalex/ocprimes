import React, { useState, useEffect } from 'react';
import Skeleton from './Skeleton';

const ImageWithCache = ({ src, alt, className }) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setLoaded(true);
  }, [src]);

  return !loaded ? (
    <Skeleton className={`${className} object-cover`} />
  ) : (
    <img
      src={src}
      alt={alt}
      className={`${className} object-cover`}
      loading="lazy"
    />
  );
};

export default ImageWithCache;
