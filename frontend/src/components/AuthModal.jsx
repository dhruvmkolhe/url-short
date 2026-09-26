import React, { useState } from 'react';
import axios from 'axios';
import { Mail, Lock, X, ArrowRight, ShieldCheck, Zap, Eye, EyeOff } from 'lucide-react';

function AuthModal({ isOpen, onClose, mode, setMode, setToken, showToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
    
    try {
      const response = await axios.post(endpoint, { email, password });
      showToast(response.data.message);
      setToken(response.data.token);
      onClose();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Authentication failed. Please try again.';
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '1.5rem'
    }}>
      <div className="glass-card modal-overlay-content" style={{
        maxWidth: '440px',
        width: '100%',
        padding: '2.25rem 1.75rem',
        border: '4px solid var(--border)',
        boxShadow: '8px 8px 0px var(--border)',
        background: 'var(--bg-card)',
        position: 'relative'
      }}>
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: '#FF2E93',
            border: '2px solid #000000',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#000000',
            boxShadow: '2px 2px 0px #000000',
            fontWeight: 800
          }}
        >
          <X size={18} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: '#F5FF00',
            border: '3px solid #000000',
            boxShadow: '4px 4px 0px #000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            color: '#000000'
          }}>
            <ShieldCheck size={32} />
          </div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem', fontWeight: 600 }}>
            {mode === 'login' 
              ? 'Sign in to access analytics and link management' 
              : 'Register for real-time traffic statistics'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label>Email Address</label>
            <div className="input-with-icon-wrapper">
              <Mail size={18} className="input-icon-prefix" />
              <input 
                type="email" 
                className="input-field" 
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon-wrapper" style={{ paddingRight: '2.5rem' }}>
              <Lock size={18} className="input-icon-prefix" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                className="input-field" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', padding: '0.9rem', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div style={{
          marginTop: '1.75rem',
          textAlign: 'center',
          fontSize: '0.9rem',
          fontWeight: 700,
          color: 'var(--text-secondary)'
        }}>
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button 
                onClick={() => setMode('signup')}
                style={{ background: '#FF2E93', border: '2px solid #000', color: '#000', padding: '2px 8px', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', boxShadow: '2px 2px 0 #000' }}
              >
                Sign Up Now
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button 
                onClick={() => setMode('login')}
                style={{ background: '#FF2E93', border: '2px solid #000', color: '#000', padding: '2px 8px', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase', boxShadow: '2px 2px 0 #000' }}
              >
                Sign In Instead
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
