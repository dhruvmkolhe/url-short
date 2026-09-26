import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Routes, Route, useNavigate, useLocation, useParams, Navigate } from 'react-router-dom';
import { Link2, LayoutDashboard, LogOut, User, AlertCircle, CheckCircle2, Infinity, Sun, Moon, Terminal, Keyboard, ChevronDown, Trash2, X } from 'lucide-react';
import LinkCreator from './components/LinkCreator';
import LinkList from './components/LinkList';
import AnalyticsView from './components/AnalyticsView';
import DeveloperConsole from './components/DeveloperConsole';
import AuthModal from './components/AuthModal';
import OnboardingTour from './components/OnboardingTour';
import NotFound from './components/NotFound';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';
import { trackPageView } from './utils/analyticsTracker';

// Setup global axios defaults
axios.defaults.baseURL = '';

function AnalyticsRouteWrapper({ showToast }) {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <AnalyticsView 
      linkId={id} 
      onClose={() => navigate('/dashboard')} 
      showToast={showToast} 
    />
  );
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [links, setLinks] = useState([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Theme Management (Dark / Light)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  // Onboarding Tour
  const [showTour, setShowTour] = useState(false);

  // Keyboard Shortcuts Help Panel
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Cookie Consent State
  const [cookieAccepted, setCookieAccepted] = useState(localStorage.getItem('cookie_consent') === 'true');

  // Dynamic SEO Meta & Client Analytics Tracker
  useEffect(() => {
    trackPageView(location.pathname);

    let title = 'Common URL Shortener | High-Performance Link Management';
    let desc = 'Generate high-performance short URLs, dynamic QR codes, password-protected links, and detailed geolocation analytics on a high-contrast Neo-Brutalist dashboard.';

    if (location.pathname === '/dashboard') {
      title = 'Link Manager & Analytics Dashboard | Common URL Shortener';
      desc = 'Manage your shortened links, view active status, export CSV reports, and monitor click analytics.';
    } else if (location.pathname === '/developer') {
      title = 'Developer API Platform & Webhooks | Common URL Shortener';
      desc = 'Manage secret API keys and register HTTP POST event webhooks for programmatic link shortening.';
    } else if (location.pathname.startsWith('/analytics/')) {
      title = 'Real-Time Link Geolocation Analytics | Common URL Shortener';
      desc = 'View detailed geolocation maps, device breakdowns, referrer channels, and live click streams.';
    } else if (location.pathname === '/privacy') {
      title = 'Privacy Policy | Common URL Shortener';
      desc = 'Privacy Policy detailing data collection, link click analytics, and user privacy guarantees.';
    } else if (location.pathname === '/terms') {
      title = 'Terms of Service | Common URL Shortener';
      desc = 'Terms of Service governing acceptable URL shortener usage, rate limits, and API policies.';
    }

    document.title = title;
    
    // Meta description update
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', desc);

    // Canonical URL update
    const canonicalTag = document.getElementById('canonical-url');
    if (canonicalTag) canonicalTag.setAttribute('href', `http://localhost:3000${location.pathname}`);
  }, [location.pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Show tour for first-time visitors
  useEffect(() => {
    const completed = localStorage.getItem('tour_completed');
    if (!completed) {
      const timer = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKey = (e) => {
      // Skip if typing in an input/textarea/select
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      // Skip if any modal is open
      if (showTour || showShortcuts || authModalOpen) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        navigate('/');
        showToast('📝 Shortener opened — paste your URL!');
      }
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        if (user) navigate('/dashboard');
        else openAuth('login');
      }
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        if (links.length > 0) {
          const last = links[0];
          navigator.clipboard.writeText(last.shortUrl).then(() => {
            showToast(`📋 Copied: ${last.shortUrl}`);
          });
        } else {
          showToast('No links to copy yet. Create one first!', 'error');
        }
      }
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }
      if (e.key === 'Escape') {
        setShowShortcuts(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [showTour, showShortcuts, authModalOpen, user, links, navigate]);

  // Set Auth Header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
      fetchUser();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      setUser(null);
      setLinks([]);
    }
  }, [token]);

  // Auto load links if user is on dashboard or analytics
  useEffect(() => {
    const isDashboardOrAnalytics = location.pathname === '/dashboard' || location.pathname === '/links' || location.pathname.startsWith('/analytics/');
    if (user && isDashboardOrAnalytics) {
      fetchLinks(false);
      const intervalId = setInterval(() => {
        fetchLinks(true);
      }, 5000);
      return () => clearInterval(intervalId);
    }
  }, [user, location.pathname]);

  // Require auth modal if visiting protected routes without token
  useEffect(() => {
    const isProtectedRoute = location.pathname === '/dashboard' || location.pathname === '/links' || location.pathname === '/developer' || location.pathname.startsWith('/analytics/');
    if (!token && !user && isProtectedRoute) {
      openAuth('login');
      navigate('/');
    }
  }, [token, user, location.pathname]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
    } catch (err) {
      console.warn('Auto login failed. Token might be expired.');
      handleLogout();
    }
  };

  const fetchLinks = async (isSilent = false) => {
    if (!isSilent) setLinksLoading(true);
    try {
      const response = await axios.get('/api/links');
      setLinks(response.data.links);
    } catch (err) {
      if (!isSilent) {
        const errorMsg = err.response?.data?.error || 'Failed to fetch links.';
        showToast(errorMsg, 'error');
      }
    } finally {
      if (!isSilent) setLinksLoading(false);
    }
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    setToken(null);
    setUser(null);
    setLinks([]);
    navigate('/');
    showToast('Logged out successfully.');
  };

  const handleDeleteAccount = async () => {
    setUserMenuOpen(false);
    if (!window.confirm('⚠️ Are you sure you want to PERMANENTLY delete your account? All your short links and analytics data will be deleted forever.')) {
      return;
    }

    try {
      await axios.delete('/api/auth/account');
      showToast('Account permanently deleted.');
      setToken(null);
      setUser(null);
      setLinks([]);
      navigate('/');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete account.', 'error');
    }
  };

  const openAuth = (mode = 'login') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const isTabActive = (tab) => {
    const p = location.pathname;
    if (tab === 'create') return p === '/' || p === '/shorten';
    if (tab === 'dashboard') return p === '/dashboard' || p === '/links' || p.startsWith('/analytics/');
    if (tab === 'developer') return p === '/developer' || p === '/api-console';
    return false;
  };

  return (
    <div className="app-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-deep)' }}>
      {/* Top Header Navbar */}
      <header className="navbar-header">
        <div className="navbar-inner">
          {/* Logo & Brand */}
          <div 
            className="brand-container"
            onClick={() => navigate('/')}
          >
            <div className="brand-logo-icon">
              <Infinity size={22} color="#ffffff" />
            </div>
            <div className="brand-title-group">
              <span className="brand-title">COMMON</span>
              <span className="brand-subtitle">URL Shortener</span>
            </div>
          </div>

          {/* Segmented Control Navigation */}
          <nav className="segmented-nav">
            <button 
              className={`nav-pill ${isTabActive('create') ? 'active' : ''}`}
              onClick={() => navigate('/')}
            >
              <Link2 size={16} /> 
              <span className="nav-label-full">Shorten URL</span>
              <span className="nav-label-short">Shorten</span>
            </button>
            
            <button 
              className={`nav-pill ${isTabActive('dashboard') ? 'active' : ''}`}
              onClick={() => {
                if (user) {
                  navigate('/dashboard');
                } else {
                  openAuth('login');
                }
              }}
            >
              <LayoutDashboard size={16} /> 
              <span className="nav-label-full">Link Manager &amp; Stats</span>
              <span className="nav-label-short">Dashboard</span>
            </button>

            <button 
              className={`nav-pill ${isTabActive('developer') ? 'active' : ''}`}
              onClick={() => {
                if (user) {
                  navigate('/developer');
                } else {
                  openAuth('login');
                  showToast('Sign in required to access Developer API Platform.', 'error');
                }
              }}
            >
              <Terminal size={16} /> 
              <span className="nav-label-full">Developer API</span>
              <span className="nav-label-short">Dev API</span>
            </button>
          </nav>

          {/* Right Section: Theme Toggle & User Auth */}
          <div className="navbar-actions-group">
            
            {/* Theme Toggle Button */}
            <button className="theme-toggle-btn" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}>
              {theme === 'dark' ? (
                <>
                  <Sun size={15} color="#f59e0b" /> <span>Light</span>
                </>
              ) : (
                <>
                  <Moon size={15} color="#6366f1" /> <span>Dark</span>
                </>
              )}
            </button>

            {/* Keyboard Shortcuts hint */}
            <button
              className="theme-toggle-btn"
              onClick={() => setShowShortcuts(true)}
              title="Keyboard Shortcuts (?)"
              style={{ gap: '0.35rem' }}
            >
              <Keyboard size={15} /> <span>Shortcuts</span>
            </button>

            {user ? (
              <div style={{ position: 'relative' }} ref={menuRef}>
                <button 
                  className="user-badge-chip"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <User size={15} style={{ color: '#000000' }} />
                  <span>{user.email}</span>
                  <ChevronDown size={14} style={{ color: '#000000', transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.1s linear' }} />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '240px',
                    background: 'var(--bg-card)',
                    border: '3px solid var(--border)',
                    boxShadow: '5px 5px 0px var(--border)',
                    padding: '0.5rem',
                    zIndex: 200,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem'
                  }}>
                    <div style={{ padding: '0.75rem 0.85rem', borderBottom: '3px solid var(--border)', background: '#F5FF00', color: '#000000' }}>
                      <p style={{ fontSize: '0.75rem', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 800 }}>Signed in as</p>
                      <p style={{ fontSize: '0.875rem', fontWeight: 800, color: '#000000', wordBreak: 'break-all', marginTop: '0.15rem' }}>{user.email}</p>
                    </div>

                    <button
                      onClick={() => { setUserMenuOpen(false); localStorage.removeItem('tour_completed'); setShowTour(true); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: 'transparent',
                        border: '2px solid transparent',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#00F0FF'; e.currentTarget.style.color = '#000'; e.currentTarget.style.borderColor = '#000'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'transparent'; }}
                    >
                      <Keyboard size={16} /> Replay Tour
                    </button>

                    <button 
                      onClick={handleLogout}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: 'transparent',
                        border: '2px solid transparent',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#F5FF00'; e.currentTarget.style.color = '#000'; e.currentTarget.style.borderColor = '#000'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'transparent'; }}
                    >
                      <LogOut size={16} /> Log Out
                    </button>

                    <button 
                      onClick={handleDeleteAccount}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.65rem',
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        background: 'transparent',
                        border: '2px solid transparent',
                        color: '#FF2E93',
                        fontSize: '0.875rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#FF2E93'; e.currentTarget.style.color = '#000'; e.currentTarget.style.borderColor = '#000'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#FF2E93'; e.currentTarget.style.borderColor = 'transparent'; }}
                    >
                      <Trash2 size={16} /> Delete Account
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button className="nav-pill" style={{ fontSize: '0.875rem', padding: '0.45rem 0.85rem' }} onClick={() => openAuth('login')}>
                  Sign In
                </button>
                <button className="btn-primary" style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem' }} onClick={() => openAuth('signup')}>
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="main-workspace-container">
        <Routes>
          <Route path="/" element={
            <LinkCreator 
              user={user} 
              showToast={showToast} 
              onAuthRedirect={() => openAuth('signup')} 
              onShortenSuccess={() => { if (user) fetchLinks(); }}
            />
          } />
          
          <Route path="/shorten" element={<Navigate to="/" replace />} />

          <Route path="/dashboard" element={
            user ? (
              <LinkList 
                links={links} 
                loading={linksLoading} 
                onRefresh={fetchLinks}
                onSelectStats={(id) => navigate(`/analytics/${id}`)}
                showToast={showToast}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontWeight: 800 }}>Loading Account...</p>
              </div>
            )
          } />

          <Route path="/links" element={<Navigate to="/dashboard" replace />} />

          <Route path="/analytics/:id" element={
            <AnalyticsRouteWrapper showToast={showToast} />
          } />

          <Route path="/developer" element={
            user ? (
              <DeveloperConsole showToast={showToast} />
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontWeight: 800 }}>Sign in required for Developer API Platform.</p>
                <button className="btn-primary" onClick={() => openAuth('login')}>Sign In</button>
              </div>
            )
          } />

          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* Site Footer */}
      <footer style={{
        background: 'var(--bg-card)',
        borderTop: '4px solid #000000',
        padding: '2rem 1.5rem',
        marginTop: 'auto',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1.5rem',
          flexWrap: 'wrap'
        }}>
          <div>
            <span style={{ fontFamily: "'Archivo Black', sans-serif", fontWeight: 900, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              ⚡ COMMON
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginLeft: '0.5rem', fontWeight: 700 }}>
              © 2026 High-Performance URL Shortener & REST Platform
            </span>
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.85rem', fontWeight: 800 }}>
            <span 
              onClick={() => navigate('/privacy')} 
              style={{ cursor: 'pointer', color: 'var(--text-primary)', textDecoration: 'underline' }}
            >
              Privacy Policy
            </span>
            <span 
              onClick={() => navigate('/terms')} 
              style={{ cursor: 'pointer', color: 'var(--text-primary)', textDecoration: 'underline' }}
            >
              Terms of Service
            </span>
            <a 
              href="mailto:support@common.io" 
              style={{ textDecoration: 'none', background: '#00FF66', color: '#000000', border: '1.5px solid #000', padding: '0.15rem 0.5rem' }}
            >
              Support: support@common.io
            </a>
          </div>
        </div>
      </footer>

      {/* Cookie & Storage Consent Banner */}
      {!cookieAccepted && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#000000',
          color: '#FFFFFF',
          borderTop: '4px solid #F5FF00',
          padding: '1rem 1.5rem',
          zIndex: 8000,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            ⚡ We use essential local storage cookies for JWT authentication and theme preferences. No intrusive ad tracking.
          </div>
          <button
            onClick={() => {
              localStorage.setItem('cookie_consent', 'true');
              setCookieAccepted(true);
            }}
            className="btn-primary"
            style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', background: '#F5FF00', color: '#000', borderColor: '#000' }}
          >
            Got It!
          </button>
        </div>
      )}

      {/* Sticky Mobile Quick Shorten CTA */}
      <div className="mobile-sticky-cta" style={{
        position: 'fixed',
        bottom: cookieAccepted ? '1rem' : '4rem',
        left: '1rem',
        right: '1rem',
        zIndex: 1500,
      }}>
        <button
          onClick={() => {
            navigate('/');
            setTimeout(() => {
              const el = document.getElementById('shortener-input');
              if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth' }); }
            }, 100);
          }}
          className="btn-primary"
          style={{
            width: '100%',
            padding: '0.85rem',
            background: '#FF2E93',
            color: '#000000',
            border: '3px solid #000000',
            boxShadow: '4px 4px 0px #000000',
            fontWeight: 900,
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            textTransform: 'uppercase'
          }}
        >
          <Link2 size={18} /> Shorten URL Now
        </button>
      </div>

      {/* Toast Notification Banner */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 100,
          background: toast.type === 'error' ? '#FF2E93' : '#F5FF00',
          color: '#000000',
          border: '3px solid #000000',
          boxShadow: '5px 5px 0px #000000',
          padding: '0.85rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          maxWidth: '400px'
        }}>
          {toast.type === 'error' ? (
            <AlertCircle size={20} style={{ color: '#000000' }} />
          ) : (
            <CheckCircle2 size={20} style={{ color: '#000000' }} />
          )}
          <span style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase' }}>
            {toast.message}
          </span>
        </div>
      )}

      {/* Auth Gateway Modal */}
      {authModalOpen && (
        <AuthModal 
          isOpen={authModalOpen} 
          onClose={() => setAuthModalOpen(false)} 
          mode={authMode} 
          setMode={setAuthMode}
          setToken={setToken}
          showToast={showToast} 
        />
      )}

      {/* Onboarding Tour */}
      {showTour && <OnboardingTour onDone={() => setShowTour(false)} />}

      {/* Keyboard Shortcuts Panel */}
      {showShortcuts && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 9000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setShowShortcuts(false)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '4px solid var(--border)',
              padding: '2rem',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '8px 8px 0px var(--border)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowShortcuts(false)}
              style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: '#FF2E93', border: '2px solid #000',
                width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#000', fontWeight: 800,
                boxShadow: '2px 2px 0 #000'
              }}
            >
              <X size={16} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Keyboard size={24} color="var(--text-primary)" />
              <h3 style={{ fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase' }}>Keyboard Shortcuts</h3>
            </div>
            {[
              { key: 'N', action: 'Go to Shortener (New link)' },
              { key: 'D', action: 'Go to Dashboard' },
              { key: 'C', action: 'Copy last short URL' },
              { key: '?', action: 'Toggle this shortcuts panel' },
              { key: 'Esc', action: 'Close open panels' },
            ].map(({ key, action }) => (
              <div key={key} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.75rem 0', borderBottom: '2px solid var(--border)',
              }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 700 }}>{action}</span>
                <kbd>{key}</kbd>
              </div>
            ))}
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1.25rem', textAlign: 'center', fontWeight: 700 }}>
              Press <kbd>?</kbd> anytime to toggle this panel
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
