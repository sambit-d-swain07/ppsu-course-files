'use client';

import React, { useEffect } from 'react';
import { Spinner } from 'react-bootstrap';

interface UploadLoadingOverlayProps {
  isUploading: boolean;
  message?: string;
  subMessage?: string;
}

/**
 * Ensures body scroll is fully restored and any leftover modal artifacts
 * (modal-open class, inline overflow/padding styles, stray backdrop elements)
 * are thoroughly cleaned up when no visible modal remains.
 */
function cleanBodyScroll() {
  if (typeof document === 'undefined') return;
  const hasVisibleModal = document.querySelector('.modal.show') !== null;
  if (!hasVisibleModal) {
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    document.body.classList.remove('modal-open');
    document.querySelectorAll('.modal-backdrop').forEach((el) => el.remove());
  }
}

export default function UploadLoadingOverlay({
  isUploading,
  message = 'Uploading...',
  subMessage = 'Please wait while your document is being uploaded and saved.',
}: UploadLoadingOverlayProps) {
  useEffect(() => {
    if (!isUploading) return;

    // Only lock body if it wasn't ALREADY locked by an active parent modal.
    // If a modal was already open, do NOT touch body styles so we never
    // capture "hidden" as a restore value or conflict with Bootstrap's ModalManager.
    const wasAlreadyLocked = document.body.style.overflow === 'hidden';
    if (!wasAlreadyLocked) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    return () => {
      // Immediate cleanup when overlay closes
      cleanBodyScroll();
      // Delayed cleanup to ensure any concurrent Bootstrap modal exit transition (300ms)
      // also has its body styles / backdrop cleaned up reliably
      setTimeout(cleanBodyScroll, 150);
      setTimeout(cleanBodyScroll, 350);
    };
  }, [isUploading]);

  if (!isUploading) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      aria-label={message}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        pointerEvents: 'all',
        userSelect: 'none',
        touchAction: 'none',
        overscrollBehavior: 'contain',
      }}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '36px 48px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '420px',
          textAlign: 'center',
          border: '1px solid rgba(226, 232, 240, 0.8)',
        }}
      >
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <Spinner
            animation="border"
            style={{
              width: '3.5rem',
              height: '3.5rem',
              color: '#E8541E',
              borderWidth: '0.25em',
            }}
          />
        </div>
        <h5
          style={{
            fontWeight: 700,
            color: '#1E293B',
            marginBottom: '8px',
            fontSize: '1.25rem',
          }}
        >
          {message}
        </h5>
        <p
          style={{
            color: '#64748B',
            fontSize: '0.875rem',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {subMessage}
        </p>
      </div>
    </div>
  );
}


