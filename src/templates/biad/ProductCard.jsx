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

const BiadProductCard = ({ product, onAddToCart }) => {
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
        className="group block focus:outline-none"
      >
        {/* Image block */}
        <div className="relative overflow-hidden bg-gray-100" style={{ aspectRatio: '3/4' }}>
          <ProductDeferredImage
            src={imageSrc}
            alt={product.name}
            eager={false}
            isLoadEnabled
            rootMargin="320px 0px"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            imgClassName="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            placeholderClassName="absolute inset-0"
            observerClassName="absolute inset-0"
            onReady={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
          />

          {imageLoaded && (
            <>
              {/* Discount badge */}
              {discountPercentage && (
                <div className="absolute left-2.5 top-2.5 z-10 bg-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                  -{discountPercentage}%
                </div>
              )}

              {/* Wishlist */}
              <button
                type="button"
                onClick={handleWishlist}
                aria-pressed={isFavorite}
                className={`absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center transition ${
                  isFavorite ? 'text-black' : 'text-gray-400 hover:text-black'
                }`}
              >
                <Heart size={16} className={isFavorite ? 'fill-current' : ''} />
              </button>

              {/* Sold out overlay */}
              {isOutOfStock && (
                <div className="absolute inset-0 z-10 flex items-end bg-white/30">
                  <div className="w-full bg-white/90 py-2 text-center text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Sold out
                  </div>
                </div>
              )}

              {/* Quick add — desktop hover */}
              {!isOutOfStock && (
                <div className="absolute inset-x-0 bottom-0 z-20 hidden translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0 sm:block">
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className={`w-full py-3 text-[11px] font-black uppercase tracking-widest transition ${
                      inCart
                        ? 'bg-gray-200 text-gray-600'
                        : 'bg-gray-900 text-white hover:bg-black'
                    }`}
                  >
                    {inCart ? 'Added ✓' : 'Quick Add'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Info below image */}
        <div className="mt-2.5 px-0.5">
          <p className="line-clamp-1 text-xs font-bold uppercase tracking-wide text-gray-900 sm:text-[13px]">
            {product.name}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm font-black text-gray-900">{formatMoney(priceValue)}</span>
            {hasDiscount && (
              <span className="text-xs text-gray-400 line-through">{formatMoney(originalPriceValue)}</span>
            )}
          </div>
        </div>

        {/* Mobile quick add */}
        {!isOutOfStock && (
          <button
            type="button"
            onClick={handleAddToCart}
            className={`mt-2 w-full py-2 text-[10px] font-black uppercase tracking-widest transition sm:hidden ${
              inCart ? 'bg-gray-200 text-gray-600' : 'bg-gray-900 text-white'
            }`}
          >
            {inCart ? 'Added ✓' : 'Add to Cart'}
          </button>
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

export default BiadProductCard;
