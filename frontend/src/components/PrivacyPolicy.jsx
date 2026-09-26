import React from 'react';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function PrivacyPolicy() {
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
          <div style={{ background: '#00FF66', border: '3px solid #000', padding: '0.5rem', boxShadow: '3px 3px 0 #000' }}>
            <ShieldCheck size={28} color="#000" />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: "'Archivo Black', sans-serif", textTransform: 'uppercase', color: 'var(--text-primary)' }}>
              Privacy Policy
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              Last Updated: September 27, 2026
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: 'var(--text-primary)', lineHeight: 1.6, fontSize: '0.95rem' }}>
          <section style={{ borderBottom: '2px solid var(--border)', paddingBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', color: '#000', background: '#F5FF00', display: 'inline-block', padding: '0.2rem 0.5rem', border: '2px solid #000' }}>
              1. Information We Collect
            </h3>
            <p>
              When you use Common URL Shortener, we collect specific data to deliver link management services:
            </p>
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
              <li><strong>Account Credentials:</strong> Email address and encrypted password hash upon registration.</li>
              <li><strong>Link Metadata:</strong> Destination URLs, custom aliases, UTM parameters, password locks, and expiration dates.</li>
              <li><strong>Analytics Data:</strong> When visitors click short links, we process IP addresses, geographic location (country & city), device type, browser, OS, and HTTP HTTP referrers.</li>
            </ul>
          </section>

          <section style={{ borderBottom: '2px solid var(--border)', paddingBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', color: '#000', background: '#00F0FF', display: 'inline-block', padding: '0.2rem 0.5rem', border: '2px solid #000' }}>
              2. How We Use Data
            </h3>
            <p>
              We process data strictly for:
            </p>
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
              <li>Executing fast base62 URL redirections.</li>
              <li>Rendering aggregate analytics charts on your dashboard.</li>
              <li>Preventing spam, abuse, phishing, and rate-limit violations.</li>
              <li>Dispatching registered event webhooks.</li>
            </ul>
          </section>

          <section style={{ borderBottom: '2px solid var(--border)', paddingBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', background: '#FF2E93', color: '#000000', display: 'inline-block', padding: '0.2rem 0.5rem', border: '2px solid #000' }}>
              3. Data Retention & Deletion
            </h3>
            <p>
              You maintain complete ownership of your data. You can delete individual short links or use the <strong>Delete Account</strong> feature in your user menu to purge all personal data and analytics immediately.
            </p>
          </section>

          <section>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem', color: '#000', background: '#00FF66', display: 'inline-block', padding: '0.2rem 0.5rem', border: '2px solid #000' }}>
              4. Contact Us
            </h3>
            <p>
              For privacy inquiries or data removal requests, contact support at <code>privacy@common.io</code>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
