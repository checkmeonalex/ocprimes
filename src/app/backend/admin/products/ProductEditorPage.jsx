'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProductPreviewModal from './ProductPreviewModal';
import AdminSidebar from '@/components/AdminSidebar';

function ProductEditorDesktopLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <div className="hidden lg:block">
        <AdminSidebar />
      </div>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

function ProductEditorPage() {
  const params = useParams();
  const router = useRouter();
  const productId = Array.isArray(params?.productId) ? params.productId[0] : params?.productId;
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const isNew = useMemo(() => !productId || productId === 'new', [productId]);

  const loadProduct = useCallback(async () => {
    if (isNew) {
      setProduct(null);
      setError('');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        credentials: 'include',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to load product.');
      }
      const item =
        payload?.item ||
        payload?.product ||
        (Array.isArray(payload?.items) ? payload.items[0] : null);
      if (!item) {
        throw new Error('Product not found.');
      }
      setProduct(item);
    } catch (err) {
      setError(err?.message || 'Unable to load product.');
    } finally {
      setIsLoading(false);
    }
  }, [isNew, productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleSaved = useCallback(
    (saved) => {
      if (!saved) return;
      setProduct(saved);
      if (isNew && saved?.id) {
        router.replace(`/backend/admin/products/${saved.id}`);
      }
    },
    [isNew, router],
  );

  if (error) {
    return (
      <ProductEditorDesktopLayout>
        <div className="px-6 py-10">
          <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1 className="text-lg font-semibold text-slate-900">Product editor</h1>
            <p className="mt-3 text-sm text-slate-500">{error}</p>
            <button
              type="button"
              onClick={() => router.push('/backend/admin/products')}
              className="mt-6 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500"
            >
              Back to products
            </button>
          </div>
        </div>
      </ProductEditorDesktopLayout>
    );
  }

  return (
    <ProductEditorDesktopLayout>
      {isLoading && (
        <div className="flex min-h-screen items-center justify-center text-sm text-slate-400">
          Loading product...
        </div>
      )}
      {!isLoading && (
        <ProductPreviewModal
          isOpen
          product={product}
          onClose={() => router.push('/backend/admin/products')}
          onExpand={() => {}}
          onSaved={handleSaved}
          mode="page"
        />
      )}
    </ProductEditorDesktopLayout>
  );
}

export default ProductEditorPage;
