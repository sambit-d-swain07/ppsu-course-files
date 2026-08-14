'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fillCredentials = (role: 'FACULTY' | 'COORDINATOR') => {
    if (role === 'FACULTY') {
      setEmail('aakash@ppsu.ac.in');
      setPassword('123');
    } else {
      setEmail('cc@ppsu.ac.in');
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

      // Successful login, middleware handles redirection, but let's push directly for instant feel
      if (data.role === 'FACULTY') {
        router.push('/faculty/dashboard');
      } else if (data.role === 'COORDINATOR') {
        router.push('/coordinator/dashboard');
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
    <div className="login-bg">
      <div className="login-card">
        <div className="login-header">
          <img src="/PPSUNAACA+Logo.png" alt="PPSU Logo" style={{ height: '80px', objectFit: 'contain' }} className="mb-3" />
          <h1 className="login-title">PPSU Course Files</h1>
          <p className="login-subtitle mb-1">Faculty & Course File Management & Evaluation Portal</p>
          <small className="text-muted d-block font-mono-ppsu">P P Savani University · School of Engineering</small>
        </div>

        {error && <Alert variant="danger" className="py-2 px-3 mb-3" style={{ fontSize: '0.85rem' }}>{error}</Alert>}

        <Form onSubmit={handleLogin}>
          <Form.Group className="mb-3" controlId="formBasicEmail">
            <Form.Label className="small fw-semibold text-secondary">Email address</Form.Label>
            <Form.Control
              type="email"
              placeholder="name@ppsu.ac.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="py-2"
              required
            />
          </Form.Group>

          <Form.Group className="mb-4" controlId="formBasicPassword">
            <Form.Label className="small fw-semibold text-secondary">Password</Form.Label>
            <Form.Control
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="py-2"
              required
            />
          </Form.Group>

          <Button
            type="submit"
            className="w-100 py-2 mb-4 btn-ppsu-navy border-0"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>

          <div className="border-top pt-3 text-center">
            <p className="small text-secondary mb-2 fw-semibold">Quick Demo Logins:</p>
            <div className="d-flex justify-content-center gap-2">
              <span
                className="demo-chip"
                onClick={() => fillCredentials('FACULTY')}
              >
                Faculty Demo
              </span>
              <span
                className="demo-chip"
                onClick={() => fillCredentials('COORDINATOR')}
              >
                Coordinator Demo
              </span>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}
