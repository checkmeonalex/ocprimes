'use client';
import { Suspense } from 'react';
import ReviewsPage from '../ReviewsPage';

export default function AdminReviewsRoutePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <ReviewsPage />
    </Suspense>
  );
}
