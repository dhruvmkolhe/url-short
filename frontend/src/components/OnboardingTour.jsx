import React, { useState, useEffect } from 'react';
import { X, Link2, BarChart2, QrCode, Key, Keyboard, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: '👋 Welcome to COMMON!',
    description: 'Your all-in-one intelligent URL shortener. Let\'s walk you through the key features in 60 seconds.',
    icon: <Sparkles size={32} color="#6366f1" />,
    highlight: null,
  },
  {
    id: 'shorten',
    title: '🔗 Shorten Any URL',
    description: 'Paste any long link into the input field and get a clean short URL instantly. Add a custom alias like "/my-product" to brand your link.',
    icon: <Link2 size={32} color="#6366f1" />,
    highlight: 'shorten-tab',
    tip: 'Press N anywhere to jump to the shortener',
  },
  {
    id: 'qr',
    title: '📱 Instant QR Codes',
    description: 'Every shortened link generates a downloadable high-res QR code. Perfect for print materials, posters, or packaging.',
    icon: <QrCode size={32} color="#06b6d4" />,
    highlight: null,
    tip: 'Customize your QR color with the palette picker',
  },
  {
    id: 'password',
    title: '🔐 Password Protection',
    description: 'Gate your links behind a password. Recipients will need to enter it before being redirected — perfect for private or internal content.',
    icon: <Key size={32} color="#818cf8" />,
    highlight: null,
    tip: 'Password locks are bcrypt-encrypted — fully secure',
  },
  {
    id: 'analytics',
    title: '📊 Real-Time Analytics',
    description: 'Visit the Link Manager to see live click data with device, country, browser, and referrer breakdowns. Data updates instantly as clicks happen.',
    icon: <BarChart2 size={32} color="#10b981" />,
    highlight: 'dashboard-tab',
    tip: 'Click "Stats" on any link to see its full analytics dashboard',
  },
  {
    id: 'shortcuts',
    title: '⌨️ Keyboard Shortcuts',
    description: 'Power-user shortcuts are built in for speed:',
    icon: <Keyboard size={32} color="#f59e0b" />,
    highlight: null,
    shortcuts: [
      { key: 'N', action: 'Go to Shortener (New link)' },
      { key: 'D', action: 'Go to Dashboard' },
      { key: 'C', action: 'Copy last short URL' },
      { key: '?', action: 'Show this help tour again' },
      { key: 'Esc', action: 'Close any open panel' },
    ],
  },
];

export default function OnboardingTour({ onDone }) {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [animDir, setAnimDir] = useState('forward');

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const isFirst = step === 0;

  const goNext = () => {
    setAnimDir('forward');
    setStep(s => Math.min(s + 1, TOUR_STEPS.length - 1));
  };

  const goPrev = () => {
    setAnimDir('back');
    setStep(s => Math.max(s - 1, 0));
  };

  const handleFinish = () => {
    setIsVisible(false);
    localStorage.setItem('tour_completed', '1');
    setTimeout(() => onDone && onDone(), 300);
  };

  // Keyboard nav inside tour
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') { if (!isLast) goNext(); else handleFinish(); }
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape') handleFinish();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [step, isLast]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleFinish(); }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '4px solid var(--border)',
          padding: '2.5rem',
          maxWidth: '520px',
          width: '100%',
          boxShadow: '8px 8px 0px var(--border)',
          position: 'relative'
        }}
      >
        {/* Close button */}
        <button
          onClick={handleFinish}
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
            fontWeight: 800,
            boxShadow: '2px 2px 0px #000000'
          }}
          title="Skip tour"
        >
          <X size={16} />
        </button>

        {/* Step Dots */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '2rem' }}>
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              onClick={() => setStep(i)}
              style={{
                height: '8px',
                border: '2px solid #000000',
                flex: i === step ? 2.5 : 1,
                background: i <= step ? '#F5FF00' : 'var(--bg-deep)',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>

        {/* Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          background: '#F5FF00',
          border: '3px solid #000000',
          boxShadow: '4px 4px 0px #000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          color: '#000000'
        }}>
          {current.icon}
        </div>

        {/* Content */}
        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '0.75rem', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
          {current.title}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, fontWeight: 600, marginBottom: current.shortcuts || current.tip ? '1.25rem' : '2rem' }}>
          {current.description}
        </p>

        {/* Keyboard shortcuts table */}
        {current.shortcuts && (
          <div style={{
            background: 'var(--bg-deep)',
            border: '3px solid var(--border)',
            boxShadow: '4px 4px 0px var(--border)',
            overflow: 'hidden',
            marginBottom: '2rem',
          }}>
            {current.shortcuts.map(({ key, action }) => (
              <div key={key} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 1rem',
                borderBottom: '2px solid var(--border)',
              }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 700 }}>{action}</span>
                <kbd>{key}</kbd>
              </div>
            ))}
          </div>
        )}

        {/* Tip callout */}
        {current.tip && !current.shortcuts && (
          <div style={{
            background: '#00F0FF',
            color: '#000000',
            border: '3px solid #000000',
            boxShadow: '4px 4px 0px #000000',
            padding: '0.85rem 1rem',
            marginBottom: '2rem',
            fontSize: '0.88rem',
            fontWeight: 800,
          }}>
            💡 <strong>TIP:</strong> {current.tip}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={goPrev}
            disabled={isFirst}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'none',
              border: 'none',
              color: isFirst ? 'var(--text-muted)' : 'var(--text-primary)',
              cursor: isFirst ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              padding: '0.5rem 0',
              opacity: isFirst ? 0.4 : 1,
            }}
          >
            <ChevronLeft size={16} /> Back
          </button>

          <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 800 }}>
            {step + 1} / {TOUR_STEPS.length}
          </span>

          <button
            onClick={isLast ? handleFinish : goNext}
            className="btn-primary"
            style={{ padding: '0.55rem 1.5rem', fontSize: '0.9rem' }}
          >
            {isLast ? (
              <>🚀 GET STARTED</>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                NEXT <ChevronRight size={16} />
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
