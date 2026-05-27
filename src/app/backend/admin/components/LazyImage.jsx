import { useEffect, useRef, useState } from 'react';
import { fetchAndCacheImage, getCachedImage } from '../../../../performace/asset/imagecaching';

const inFlightRequests = new Map();

function LazyImage({ src, alt, className = '' }) {
  const containerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [displaySrc, setDisplaySrc] = useState(src || '');

  useEffect(() => {
    setIsLoaded(false);
    if (!src) {
      setDisplaySrc('');
      return;
    }
    const cached = getCachedImage(src);
    if (cached) {
      setDisplaySrc(cached);
      return;
    }

    // Always attempt to load the image, regardless of viewport visibility
    if (inFlightRequests.has(src)) {
      let cancelled = false;
      const pending = inFlightRequests.get(src);
      pending
        .then((dataUrl) => {
          if (cancelled) return;
          if (dataUrl) {
            setDisplaySrc(dataUrl);
          } else {
            setDisplaySrc(src);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setDisplaySrc(src);
          }
        });
      return () => {
        cancelled = true;
      };
    }
    let cancelled = false;
    const load = async () => {
      let dataUrl = null;
      try {
        const target = new URL(src, window.location.href);
        if (target.origin === window.location.origin) {
          dataUrl = await fetchAndCacheImage(src);
        }
      } catch (_error) {}
      return dataUrl;
    };
    const requestPromise = load();
    inFlightRequests.set(src, requestPromise);
    requestPromise
      .then((dataUrl) => {
        if (cancelled) return;
        if (dataUrl) {
          setDisplaySrc(dataUrl);
        } else {
          setDisplaySrc(src);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDisplaySrc(src);
        }
      })
      .finally(() => {
        if (inFlightRequests.get(src) === requestPromise) {
          inFlightRequests.delete(src);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [src]); // Removed isInView from dependency array to always load images

  return (
    <span ref={containerRef} className="relative block h-full w-full">
      {!displaySrc && src && !isLoaded && (
        <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
          Loading...
        </span>
      )}
      {displaySrc && !isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-slate-200/70" />
      )}
      {(displaySrc || src) && (
        <img
          src={displaySrc || src}
          alt={alt}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${className}`}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
          style={{ opacity: 1 }}
        />
      )}
    </span>
  );
}

export default LazyImage;
