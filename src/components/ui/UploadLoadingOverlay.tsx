'use client';

import React, { useEffect } from 'react';
import { Spinner } from 'react-bootstrap';

interface UploadLoadingOverlayProps {
  isUploading: boolean;
  message?: string;
  subMessage?: string;
}

export default function UploadLoadingOverlay({
  isUploading,
  message = 'Uploading...',
  subMessage = 'Please wait while your document is being uploaded and saved.',
}: UploadLoadingOverlayProps) {
  // Prevent page scrolling while uploading
  useEffect(() => {
    if (isUploading) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
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
      }}
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

