'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function CourseFileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Course File Page Error:', error);
  }, [error]);

  return (
    <div className="container py-5 text-center">
      <div
        className="card shadow-sm p-4 mx-auto"
        style={{
          maxWidth: '560px',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          background: '#ffffff'
        }}
      >
        <div
          className="mb-3 d-inline-flex align-items-center justify-content-center"
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            fontSize: '28px',
            margin: '0 auto'
          }}
        >
          !
        </div>

        <h4 className="fw-bold mb-2 text-dark">Course File Unavailable</h4>
        <p className="text-secondary mb-3" style={{ fontSize: '14px' }}>
          We could not load the requested course file.
        </p>

        {error?.message && (
          <div
            className="p-2.5 mb-4 text-start font-mono-ppsu bg-light rounded text-danger border"
            style={{ fontSize: '12px', wordBreak: 'break-all' }}
          >
            <strong>Error details:</strong> {error.message}
          </div>
        )}

        <div className="d-flex justify-content-center gap-3">
          <button
            onClick={() => reset()}
            className="btn btn-primary px-4 py-2"
            style={{
              backgroundColor: '#1E3A8A',
              borderColor: '#1E3A8A',
              borderRadius: '8px',
              fontWeight: 600
            }}
          >
            Try Again
          </button>
          <Link
            href="/faculty/dashboard"
            className="btn btn-outline-secondary px-4 py-2"
            style={{ borderRadius: '8px', fontWeight: 600 }}
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
