'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import glassStyles from '@/styles/glass/glass.module.css';
import { FollowPersonIcon, buildVendorSocialLinks } from './VendorSocialIcons';

export default function VendorConnectMenu({
  isOpen,
  onClose,
  anchorRef,
  vendorName,
  social,
  isFollowing,
  isFollowLoading,
  onFollow,
}) {
  const panelRef = useRef(null);
  const socialLinks = buildVendorSocialLinks(social);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        anchorRef?.current && !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose, anchorRef]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (typeof window === 'undefined' || window.innerWidth >= 640) return;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleFollowClick = () => {
    onFollow?.();
    onClose();
  };

  const mobileSheet = (
    <>
      <div
        aria-hidden="true"
        className={`sm:hidden fixed inset-0 z-[2147483040] bg-black/40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Connect"
        className={`sm:hidden fixed left-3 right-3 bottom-3 w-auto max-w-none z-[2147483050] rounded-2xl p-1.5 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${glassStyles.liquidGlassDark} ${
          isOpen ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 pointer-events-none'
        }`}
      >
        <MenuItems
          vendorName={vendorName}
          socialLinks={socialLinks}
          isFollowing={isFollowing}
          isFollowLoading={isFollowLoading}
          onFollowClick={handleFollowClick}
          onLinkClick={onClose}
        />
      </div>
    </>
  );

  return (
    <>
      {/* Mobile: bottom sheet — portaled to <body> so its `fixed` positioning
          is relative to the viewport, not a `transform`-ed ancestor
          (VendorFloatingFollow's wrapper uses -translate-x-1/2, which would
          otherwise turn it into the containing block for fixed descendants). */}
      {mounted && createPortal(mobileSheet, document.body)}

      {/* Desktop: anchored popup */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Connect"
        className={`hidden sm:block absolute right-0 top-full mt-2 z-[60] w-64 rounded-2xl p-1.5 origin-top-right transition-all duration-200 ease-out ${glassStyles.liquidGlassDark} ${
          isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 -translate-y-1 pointer-events-none'
        }`}
      >
        <MenuItems
          vendorName={vendorName}
          socialLinks={socialLinks}
          isFollowing={isFollowing}
          isFollowLoading={isFollowLoading}
          onFollowClick={handleFollowClick}
          onLinkClick={onClose}
        />
      </div>
    </>
  );
}

function MenuItems({ vendorName, socialLinks, isFollowing, isFollowLoading, onFollowClick, onLinkClick }) {
  return (
    <div className="flex w-full flex-col">
      <button
        type="button"
        onClick={onFollowClick}
        disabled={isFollowLoading}
        className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold text-white transition disabled:opacity-60 hover:bg-white/[0.06] active:bg-white/[0.1]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
          <FollowPersonIcon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 truncate">
          {isFollowLoading ? 'Following…' : isFollowing ? `Following ${vendorName}` : `Follow ${vendorName}`}
        </span>
      </button>

      {socialLinks.length > 0 && (
        <>
          <div className="mx-3.5 my-1 h-px bg-white/10" />
          {socialLinks.map(({ key, label, Icon, color, href, sublabel }) => (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onLinkClick}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition hover:bg-white/[0.06] active:bg-white/[0.1]"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${color}22`, color }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{label}</span>
                {sublabel && (
                  <span className="block truncate text-xs text-white/50">{sublabel}</span>
                )}
              </span>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-white/30" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 5h5v5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="m10 14 9-9" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M19 14v5H5V5h5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          ))}
        </>
      )}
    </div>
  );
}
