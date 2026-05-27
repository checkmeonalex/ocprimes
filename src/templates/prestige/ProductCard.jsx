'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useOptionalCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useUserI18n } from '@/lib/i18n/useUserI18n';
import { useScreenSize } from '@/hooks/useScreenSize';
import { findCartEntry } from '@/lib/cart/cart-match';
import { deriveOptionsFromVariations } from '@/components/product/variationUtils.mjs';
import ProductVariantQuickAddModal from '@/components/product/ProductVariantQuickAddModal';
import OutOfStockNotifyModal from '@/components/product/OutOfStockNotifyModal';
import ProductDeferredImage from '@/components/product/ProductDeferredImage';

const PrestigeProductCard = ({ product, onAddToCart }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [showOutOfStockModal, setShowOutOfStockModal] = useState(false);

  const { isMobile } = useScreenSize();
  const openInNewTab = !isMobile;
  const cart = useOptionalCart();
  const items = cart?.items || [];
  const { openSaveModal, isRecentlySaved } = useWishlist();
  const { formatMoney } = useUserI18n();

  const isFavorite = isRecentlySaved(product?.id);

  const availableColors = useMemo(() => {
    const fromVariations = deriveOptionsFromVariations(product?.variations, ['color', 'colour']);
    if (fromVariations.length) return fromVariations;
    return Array.isArray(product?.colors) ? product.colors : [];
  }, [product?.colors, product?.variations]);

  const [selectedColor] = useState(() => availableColors[0] || '');
  const [selectedSize] = useState(() => product?.sizes?.[0]);

  const selectionForCart = useMemo(
    () => ({ id: product?.id, selectedVariationId: product?.selectedVariationId, selectedColor, selectedSize }),
    [product?.id, product?.selectedVariationId, selectedColor, selectedSize],
  );
  const cartEntry = findCartEntry(items, selectionForCart);
  const inCart = (cartEntry?.quantity || 0) > 0;

  const priceValue = Number(product?.price) || 0;
  const originalPriceValue = Number(product?.originalPrice);
  const hasDiscount =
    Number.isFinite(originalPriceValue) && originalPriceValue > priceValue && priceValue > 0;
  const discountPercentage = hasDiscount
    ? Math.max(1, Math.round(((originalPriceValue - priceValue) / originalPriceValue) * 100))
    : null;

  const stockCount = Math.max(0, Number(product?.stock) || 0);
  const isOutOfStock = stockCount <= 0;

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) { setShowOutOfStockModal(true); return; }
    if (Array.isArray(product?.variations) && product.variations.length > 0) {
      setIsVariantModalOpen(true);
      return;
    }
    onAddToCart?.({ ...product, selectedColor, selectedSize });
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openSaveModal({ id: product.id, name: product.name, slug: product.slug, price: product.price, image: product.image });
  };

  const imageSrc = product?.image || '';
  if (!product) return null;

  return (
    <>
      <Link
        href={`/product/${product.slug}`}
        target={openInNewTab ? '_blank' : undefined}
        rel={openInNewTab ? 'noopener noreferrer' : undefined}
        className="group relative block overflow-hidden bg-[#111] focus:outline-none"
        style={{ aspectRatio: '2/3' }}
      >
        <ProductDeferredImage
          src={imageSrc}
          alt={product.name}
          eager={false}
          isLoadEnabled
          rootMargin="320px 0px"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          imgClassName="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          placeholderClassName="absolute inset-0"
          observerClassName="absolute inset-0"
          onReady={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
        />

        {imageLoaded && (
          <>
            {discountPercentage && (
              <div className="absolute left-3 top-3 z-10 rounded-sm bg-white px-2 py-0.5 text-[11px] font-bold tracking-wide text-black">
                -{discountPercentage}%
              </div>
            )}

            <button
              type="button"
              onClick={handleWishlist}
              aria-pressed={isFavorite}
              className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition ${
                isFavorite ? 'bg-white text-black' : 'bg-black/30 text-white hover:bg-black/50'
              }`}
            >
              <Heart size={14} className={isFavorite ? 'fill-current' : ''} />
            </button>

            {isOutOfStock && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                <span className="rounded-sm bg-white/90 px-3 py-1 text-xs font-semibold tracking-wider text-black uppercase">
                  Sold out
                </span>
              </div>
            )}

            {!isOutOfStock && (
              <div className="absolute inset-x-0 bottom-0 z-20 translate-y-full bg-gradient-to-t from-black/95 via-black/80 to-transparent px-4 pb-4 pt-8 transition-transform duration-300 ease-out group-hover:translate-y-0">
                <p className="line-clamp-1 text-sm font-medium text-white">{product.name}</p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-bold text-white">{formatMoney(priceValue)}</span>
                    {hasDiscount && (
                      <span className="text-xs text-white/40 line-through">{formatMoney(originalPriceValue)}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                      inCart ? 'bg-white/20 text-white' : 'bg-white text-black hover:bg-white/90'
                    }`}
                    aria-label={inCart ? 'In cart' : 'Add to cart'}
                  >
                    {inCart ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12l5 5L20 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {!isOutOfStock && (
              <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 to-transparent px-3 pb-3 pt-8 sm:hidden">
                <p className="line-clamp-1 text-xs font-medium text-white">{product.name}</p>
                <p className="text-xs font-bold text-white">{formatMoney(priceValue)}</p>
              </div>
            )}
          </>
        )}
      </Link>

      <ProductVariantQuickAddModal
        open={isVariantModalOpen}
        product={product}
        initialColor={selectedColor}
        initialSize={selectedSize}
        onClose={() => setIsVariantModalOpen(false)}
        onConfirm={(payload) => {
          onAddToCart?.({ ...product, ...payload }, Math.max(1, Number(payload?.quantity) || 1));
          setIsVariantModalOpen(false);
        }}
      />
      <OutOfStockNotifyModal
        open={showOutOfStockModal}
        onClose={() => setShowOutOfStockModal(false)}
        productName={product?.name}
        productImage={imageSrc}
      />
    </>
  );
};

export default PrestigeProductCard;
