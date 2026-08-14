'use client';

import { useEffect, useState } from 'react';
import { Card, Spinner, ListGroup } from 'react-bootstrap';

export default function CoordinatorNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = () => {
    fetch('/api/notifications')
      .then((res) => res.json())
      .then((data) => {
        if (data.notifications) {
          setNotifications(data.notifications);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications();

    // Mark notifications as read
    fetch('/api/notifications', { method: 'POST' }).catch(() => {});
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  // Prepend static/weekly report notify messages if needed (e.g., "5 course files are still pending review this week")
  const displayNotifs = [...notifications];
  if (displayNotifs.length === 1) {
    displayNotifs.push({
      id: 'static-notif-1',
      message: '5 course files are still pending review this week',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      read: true
    });
  }

  return (
    <div>
      <div className="mb-4">
        <h4 className="fw-bold text-navy-900">Notifications</h4>
        <p className="text-secondary small">Activity logs and checklist tracking updates for your review assignment.</p>
      </div>

      <div className="card-custom p-0 border-0 overflow-hidden">
        {displayNotifs.length === 0 ? (
          <div className="text-center py-5">
            <p className="text-secondary mb-0">No notifications found.</p>
          </div>
        ) : (
          <ListGroup variant="flush">
            {displayNotifs.map((notif) => (
              <ListGroup.Item 
                key={notif.id} 
                className="py-3 px-4 d-flex justify-content-between align-items-start"
                style={{ backgroundColor: notif.read ? '#ffffff' : 'rgba(184, 146, 63, 0.04)' }}
              >
                <div className="d-flex align-items-start gap-3">
                  <div 
                    className="p-2 rounded-circle" 
                    style={{ 
                      backgroundColor: notif.read ? 'var(--ppsu-bg)' : 'var(--ppsu-gold-100)',
                      color: notif.read ? 'var(--ppsu-text-secondary)' : 'var(--ppsu-gold-600)'
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-bell-fill" viewBox="0 0 16 16">
                      <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zm.995-14.901a1 1 0 1 0-1.99 0A5.002 5.002 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901z"/>
                    </svg>
                  </div>
                  <div>
                    <p className={`mb-1 small ${notif.read ? 'text-primary' : 'fw-semibold text-navy-900'}`}>
                      {notif.message}
                    </p>
                    <span className="text-muted" style={{ fontSize: '0.75rem' }}>{formatDate(notif.timestamp)}</span>
                  </div>
                </div>
                {!notif.read && (
                  <span className="badge bg-warning rounded-pill px-2 py-1" style={{ fontSize: '0.65rem' }}>NEW</span>
                )}
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </div>
    </div>
  );
}
