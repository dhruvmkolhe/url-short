import React from 'react';
import { FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem 0' }}>
      <button 
        onClick={() => navigate('/')} 
        className="btn-secondary"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem', background: '#00F0FF', color: '#000', borderColor: '#000', fontWeight: 800 }}
      >
        <ArrowLeft size={16} /> Back to Shortener
      </button>

      <div style={{
        background: 'var(--bg-card)',
        border: '4px solid #000000',
        boxShadow: '8px 8px 0px #000000',
        padding: '2.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#F5FF00', border: '3px solid #000', padding: '0.5rem', boxShadow: '3px 3px 0 #000' }}>
            <FileText size={28} color="#000" />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: "'Archivo Black', sans-serif", textTransform: 'uppercase', color: 'var(--text-primary)' }}>
              Terms of Service
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              Last Updated: September 27, 2026
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: 'var(--text-primary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
          <section style={{ borderBottom: '2px solid var(--border)', paddingBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', color: '#000', background: '#F5FF00', display: 'inline-block', padding: '0.2rem 0.5rem', border: '2px solid #000' }}>
              1. Acceptance of Terms
            </h3>
            <p>
              By accessing or using Common URL Shortener, you agree to comply with and be bound by these Terms of Service. If you do not agree, please do not use the platform.
            </p>
          </section>

          <section style={{ borderBottom: '2px solid var(--border)', paddingBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', background: '#FF2E93', color: '#000000', display: 'inline-block', padding: '0.2rem 0.5rem', border: '2px solid #000' }}>
              2. Prohibited Link Content & Misuse
            </h3>
            <p>
              You may NOT use Common URL Shortener to create links pointing to:
            </p>
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
              <li>Malware, ransomware, phishing, or scam sites.</li>
              <li>Unsolicited bulk commercial email (Spam).</li>
              <li>Illegal content or copyright-infringing downloads.</li>
            </ul>
            <p style={{ marginTop: '0.5rem', fontWeight: 700, color: '#FF2E93' }}>
              Violation of these rules will result in immediate link deactivation and permanent account termination.
            </p>
          </section>

          <section style={{ borderBottom: '2px solid var(--border)', paddingBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', color: '#000', background: '#00F0FF', display: 'inline-block', padding: '0.2rem 0.5rem', border: '2px solid #000' }}>
              3. REST API Usage & Rate Limits
            </h3>
            <p>
              Secret API key access is governed by rate limits. You agree not to bypass rate-limiting safeguards or attempt to disrupt the availability of shortcode redirection services.
            </p>
          </section>

          <section>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', color: '#000', background: '#00FF66', display: 'inline-block', padding: '0.2rem 0.5rem', border: '2px solid #000' }}>
              4. Disclaimer of Warranties
            </h3>
            <p>
              Common URL Shortener is provided "as is" without warranty of any kind. Service availability and uptime guarantees are subject to standard hosting maintenance windows.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default TermsOfService;
