'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Button, Alert, Spinner, Modal } from 'react-bootstrap';

const CAMPUS_IMAGES = [
  {
    src: '/images/campus/ppsu_campus_1.jpg',
    title: 'P P Savani University',
    subtitle: 'NAAC A+ Accredited · Excellence in Higher Education & Research'
  },
  {
    src: '/images/campus/ppsu_campus_2.jpg',
    title: 'Vibrant Green Campus',
    subtitle: 'State-of-the-Art Academic Infrastructure & Growth'
  }
];

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'FACULTY' | 'COORDINATOR' | 'ADMIN'>('FACULTY');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Auto-rotate campus images every 5.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAMPUS_IMAGES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const fillCredentials = (role: 'FACULTY' | 'COORDINATOR' | 'ADMIN') => {
    setSelectedRole(role);
    if (role === 'FACULTY') {
      setEmail('aakash@ppsu.ac.in');
      setPassword('123');
    } else if (role === 'COORDINATOR') {
      setEmail('s.iyer@ppsu.ac.in');
      setPassword('123');
    } else {
      setEmail('admin@ppsu.ac.in');
      setPassword('123');
    }
    setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      if (data.role === 'FACULTY') {
        router.push('/faculty/dashboard');
      } else if (data.role === 'COORDINATOR') {
        router.push('/coordinator/dashboard');
      } else if (data.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="erp-login-wrapper">
      {/* Left Pane: Campus Photo Hero Carousel */}
      <div className="erp-hero-pane">
        {CAMPUS_IMAGES.map((img, idx) => (
          <div
            key={img.src}
            className={`erp-hero-slide ${idx === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `url(${img.src})` }}
          />
        ))}

        <div className="erp-hero-overlay">
          {/* Top badge */}
          <div className="d-flex align-items-center gap-2">
            <span
              className="badge px-3 py-1.5 fw-bold"
              style={{ background: 'rgba(255, 255, 255, 0.18)', backdropFilter: 'blur(8px)', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.25)' }}
            >
              ★ NAAC A+ ACCREDITED UNIVERSITY
            </span>
          </div>

          {/* Bottom Tagline & Dots */}
          <div>
            <div className="erp-hero-tagline mb-4">
              <h2>{CAMPUS_IMAGES[currentSlide].title}</h2>
              <p>{CAMPUS_IMAGES[currentSlide].subtitle}</p>
            </div>

            <div className="erp-hero-dots">
              {CAMPUS_IMAGES.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  aria-label={`Slide ${idx + 1}`}
                  className={`erp-dot ${idx === currentSlide ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(idx)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Pane: Login Form */}
      <div className="erp-form-pane">
        <div className="erp-form-container">
          {/* Header */}
          <div className="text-center mb-4">
            <img
              src="/PPSUNAACA+Logo.png"
              alt="P P Savani University Logo"
              style={{ height: '72px', objectFit: 'contain' }}
              className="mb-3"
            />
            <h1 className="h4 fw-bold text-navy-900 mb-1">PPSU Course Files</h1>
            <p className="text-secondary small mb-0">Course Management & Evaluation Portal</p>
          </div>

          {/* Role Selector */}
          <div className="erp-role-selector mb-3">
            <button
              type="button"
              className={`erp-role-btn ${selectedRole === 'FACULTY' ? 'active' : ''}`}
              onClick={() => fillCredentials('FACULTY')}
            >
              <span>👨‍🏫</span> Faculty
            </button>
            <button
              type="button"
              className={`erp-role-btn ${selectedRole === 'COORDINATOR' ? 'active' : ''}`}
              onClick={() => fillCredentials('COORDINATOR')}
            >
              <span>📋</span> Evaluator
            </button>
            <button
              type="button"
              className={`erp-role-btn ${selectedRole === 'ADMIN' ? 'active' : ''}`}
              onClick={() => fillCredentials('ADMIN')}
            >
              <span>🛡️</span> Admin
            </button>
          </div>

          {error && (
            <Alert variant="danger" className="py-2.5 px-3 mb-3 d-flex align-items-center gap-2 small border-0" style={{ background: '#FFF1F2', color: '#BE123C' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="flex-shrink-0">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
              </svg>
              <span>{error}</span>
            </Alert>
          )}

          <Form onSubmit={handleLogin}>
            {/* Email Field */}
            <Form.Group className="mb-3">
              <Form.Label className="small fw-semibold text-secondary mb-1.5">Official University Email</Form.Label>
              <div className="erp-input-wrapper">
                <span className="erp-input-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                  </svg>
                </span>
                <Form.Control
                  type="email"
                  placeholder="name@ppsu.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="erp-form-control"
                  required
                />
              </div>
            </Form.Group>

            {/* Password Field */}
            <Form.Group className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1.5">
                <Form.Label className="small fw-semibold text-secondary mb-0">Password</Form.Label>
                <button
                  type="button"
                  className="btn btn-link p-0 small text-decoration-none"
                  style={{ color: 'var(--ppsu-accent)', fontSize: '0.8rem', fontWeight: 600 }}
                  onClick={() => setShowForgotModal(true)}
                >
                  Forgot Password?
                </button>
              </div>
              <div className="erp-input-wrapper">
                <span className="erp-input-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <Form.Control
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="erp-form-control"
                  required
                />
                <button
                  type="button"
                  className="erp-show-pwd-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                      <path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7.029 7.029 0 0 0 2.79-.588zM5.21 3.088A7.028 7.028 0 0 1 8 2.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474L5.21 3.089z"/>
                      <path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829l-2.83-2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171-4.708-10 10 .708.708 10-10-.708-.708z"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                      <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                    </svg>
                  )}
                </button>
              </div>
            </Form.Group>

            {/* Login Button */}
            <Button
              type="submit"
              className="w-100 py-2.5 mb-3 btn-ppsu-navy border-0 d-flex align-items-center justify-content-center gap-2"
              disabled={loading}
              style={{ fontSize: '0.95rem' }}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In to Portal →</span>
              )}
            </Button>

            {/* Quick Demo Logins */}
            <div className="pt-3 border-top text-center">
              <p className="small text-secondary mb-2 fw-semibold">Quick Demo Logins (Single-Click):</p>
              <div className="d-flex justify-content-center gap-2 flex-wrap">
                <span
                  className="demo-chip"
                  onClick={() => fillCredentials('FACULTY')}
                >
                  👨‍🏫 Faculty Demo
                </span>
                <span
                  className="demo-chip"
                  onClick={() => fillCredentials('COORDINATOR')}
                >
                  📋 Evaluator Demo
                </span>
                <span
                  className="demo-chip"
                  onClick={() => fillCredentials('ADMIN')}
                >
                  🛡️ Admin Demo
                </span>
              </div>
            </div>

            {/* ERP Footer Note */}
            <div className="erp-footer-note">
              Please use Google Chrome for the best experience.
            </div>
          </Form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal show={showForgotModal} onHide={() => setShowForgotModal(false)} centered size="sm">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="h6 fw-bold">Password Assistance</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-3">
          <p className="small text-secondary mb-2">
            PPSU Course Files uses institutional ERP single sign-on.
          </p>
          <p className="small text-secondary mb-0">
            For password resets or credential issues, please contact the <strong>PPSU IT Helpdesk</strong> or access the self-service portal at <a href="http://erp.ppsu.ac.in" target="_blank" rel="noreferrer" className="text-decoration-none">erp.ppsu.ac.in</a>.
          </p>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button variant="secondary" size="sm" onClick={() => setShowForgotModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
