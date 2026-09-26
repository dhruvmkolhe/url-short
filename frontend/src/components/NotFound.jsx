import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertOctagon, Home, ArrowLeft } from 'lucide-react';
import { track404 } from '../utils/analyticsTracker';

function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    track404(location.pathname);
  }, [location.pathname]);

  return (
    <div style={{
      maxWidth: '680px',
      margin: '4rem auto',
      textAlign: 'center',
      padding: '3rem 2rem',
      background: 'var(--bg-card)',
      border: '4px solid #000000',
      boxShadow: '10px 10px 0px #000000',
    }}>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '80px',
        height: '80px',
        background: '#FF2E93',
        border: '3px solid #000000',
        boxShadow: '4px 4px 0px #000000',
        marginBottom: '1.5rem'
      }}>
        <AlertOctagon size={44} color="#000000" />
      </div>

      <span style={{
        display: 'inline-block',
        background: '#F5FF00',
        color: '#000000',
        border: '2px solid #000000',
        padding: '0.25rem 0.75rem',
        fontWeight: 900,
        fontSize: '0.85rem',
        textTransform: 'uppercase',
        marginBottom: '1rem'
      }}>
        Error 404 — Page Not Found
      </span>

      <h1 style={{
        fontSize: '2.5rem',
        fontWeight: 900,
        fontFamily: "'Archivo Black', sans-serif",
        textTransform: 'uppercase',
        color: 'var(--text-primary)',
        marginBottom: '1rem',
        lineHeight: 1.1
      }}>
        LOST IN THE MATRIX?
      </h1>

      <p style={{
        fontSize: '1rem',
        color: 'var(--text-secondary)',
        marginBottom: '2rem',
        lineHeight: 1.5,
        fontWeight: 600
      }}>
        The path <code style={{ background: '#00F0FF', color: '#000000', padding: '0.2rem 0.5rem', border: '1.5px solid #000' }}>{location.pathname}</code> does not exist or has been moved to another short alias.
      </p>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button 
          onClick={() => navigate('/')} 
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}
        >
          <Home size={18} /> Return Home
        </button>

        <button 
          onClick={() => navigate(-1)} 
          className="btn-secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#00F0FF', color: '#000', borderColor: '#000' }}
        >
          <ArrowLeft size={18} /> Go Back
        </button>
      </div>
    </div>
  );
}

export default NotFound;
