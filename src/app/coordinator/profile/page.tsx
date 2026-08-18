'use client';

import { useEffect, useState } from 'react';
import { Card, Spinner, Row, Col, Table, Alert } from 'react-bootstrap';

export default function CoordinatorProfile() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (!user) {
    return <Alert variant="danger">Failed to load user profile.</Alert>;
  }

  return (
    <div>
      <div className="mb-4">
        <h4 className="fw-bold text-navy-900">Coordinator Profile</h4>
        <p className="text-secondary small">Your account and coordination structural details within P P Savani University.</p>
      </div>

      <Row className="g-4">
        <Col xs={12} lg={8}>
          <div className="card-custom">
            <div className="d-flex align-items-center gap-3 border-bottom pb-3 mb-4">
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center fs-2 fw-bold text-white"
                style={{ 
                  width: '64px', 
                  height: '64px', 
                  backgroundColor: 'var(--ppsu-navy-900)',
                  border: '2px solid var(--ppsu-gold-500)'
                }}
              >
                {user.name.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase()}
              </div>
              <div>
                <h5 className="fw-bold text-navy-900 mb-0">{user.name}</h5>
                <span className="text-muted small">Role: {user.role}</span>
              </div>
            </div>

            <div className="table-responsive">
            <Table borderless className="align-middle">
              <tbody>
                <tr className="border-bottom" style={{ borderColor: 'var(--ppsu-border)' }}>
                  <td className="text-secondary fw-semibold py-3" style={{ width: '200px' }}>Full Name:</td>
                  <td className="text-primary py-3">{user.name}</td>
                </tr>
                <tr className="border-bottom" style={{ borderColor: 'var(--ppsu-border)' }}>
                  <td className="text-secondary fw-semibold py-3">Email Address:</td>
                  <td className="text-primary py-3">{user.email}</td>
                </tr>
                <tr className="border-bottom" style={{ borderColor: 'var(--ppsu-border)' }}>
                  <td className="text-secondary fw-semibold py-3">Designation:</td>
                  <td className="text-primary py-3">{user.designation || 'Faculty Coordinator'}</td>
                </tr>
                <tr className="border-bottom" style={{ borderColor: 'var(--ppsu-border)' }}>
                  <td className="text-secondary fw-semibold py-3">Department:</td>
                  <td className="text-primary py-3">{user.department || 'Computer Engineering'}</td>
                </tr>
                <tr className="border-bottom" style={{ borderColor: 'var(--ppsu-border)' }}>
                  <td className="text-secondary fw-semibold py-3">School / Institute:</td>
                  <td className="text-primary py-3">{user.school || 'School of Engineering'}</td>
                </tr>
                <tr>
                  <td className="text-secondary fw-semibold py-3">System Access Role:</td>
                  <td className="text-primary py-3">
                    <span className="badge bg-navy-900 px-3 py-1.5 rounded">{user.role}</span>
                  </td>
                </tr>
              </tbody>
            </Table>
            </div>

            <Alert variant="info" className="mb-0 mt-3 p-3 border-0" style={{ backgroundColor: 'var(--ppsu-bg)', color: 'var(--ppsu-text-secondary)' }}>
              <div className="d-flex gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-info-circle-fill mt-1 flex-shrink-0" viewBox="0 0 16 16">
                  <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
                </svg>
                <small>Profile details are managed by the university's authentication system and are read-only in this prototype.</small>
              </div>
            </Alert>
          </div>
        </Col>
      </Row>
    </div>
  );
}
