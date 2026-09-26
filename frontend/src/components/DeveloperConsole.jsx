import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Key, Webhook, Plus, Trash2, Copy, Check, Terminal, Shield, RefreshCw } from 'lucide-react';
import { trackEvent } from '../utils/analyticsTracker';

function DeveloperConsole({ showToast }) {
  const [activeTab, setActiveTab] = useState('keys');
  
  // API Keys state
  const [keys, setKeys] = useState([]);
  const [keyName, setKeyName] = useState('');
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [creatingKey, setCreatingKey] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState(null);

  // Webhooks state
  const [webhooks, setWebhooks] = useState([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState(['link.clicked', 'link.updated', 'link.expired']);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [creatingWebhook, setCreatingWebhook] = useState(false);

  // Fetch API Keys
  const fetchKeys = async () => {
    setLoadingKeys(true);
    try {
      const res = await axios.get('/api/developer/keys');
      setKeys(res.data.keys || []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load API keys.', 'error');
    } finally {
      setLoadingKeys(false);
    }
  };

  // Fetch Webhooks
  const fetchWebhooks = async () => {
    setLoadingWebhooks(true);
    try {
      const res = await axios.get('/api/developer/webhooks');
      setWebhooks(res.data.webhooks || []);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load webhooks.', 'error');
    } finally {
      setLoadingWebhooks(false);
    }
  };

  useEffect(() => {
    fetchKeys();
    fetchWebhooks();
  }, []);

  // Create API Key
  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    setCreatingKey(true);
    try {
      const res = await axios.post('/api/developer/keys', { name: keyName });
      trackEvent('create_api_key_click');
      showToast('API Key generated successfully!');
      setKeyName('');
      setKeys([res.data.apiKey, ...keys]);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create API key.', 'error');
    } finally {
      setCreatingKey(false);
    }
  };

  // Delete API Key
  const handleDeleteKey = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this secret API key? Any applications relying on it will lose access immediately.')) return;
    
    try {
      await axios.delete(`/api/developer/keys/${id}`);
      showToast('API Key revoked.');
      setKeys(keys.filter(k => k.id !== id));
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to revoke API key.', 'error');
    }
  };

  // Copy API Key
  const handleCopyKey = (id, keyString) => {
    navigator.clipboard.writeText(keyString);
    setCopiedKeyId(id);
    showToast('Secret API key copied!');
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // Create Webhook
  const handleCreateWebhook = async (e) => {
    e.preventDefault();
    if (!webhookUrl.trim()) return;

    setCreatingWebhook(true);
    try {
      const res = await axios.post('/api/developer/webhooks', {
        url: webhookUrl,
        events: selectedEvents
      });
      showToast('Webhook endpoint registered successfully!');
      setWebhookUrl('');
      setWebhooks([res.data.webhook, ...webhooks]);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to register webhook.', 'error');
    } finally {
      setCreatingWebhook(false);
    }
  };

  // Delete Webhook
  const handleDeleteWebhook = async (id) => {
    if (!window.confirm('Are you sure you want to remove this webhook endpoint?')) return;
    
    try {
      await axios.delete(`/api/developer/webhooks/${id}`);
      showToast('Webhook endpoint removed.');
      setWebhooks(webhooks.filter(w => w.id !== id));
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete webhook.', 'error');
    }
  };

  const toggleEvent = (eventName) => {
    if (selectedEvents.includes(eventName)) {
      setSelectedEvents(selectedEvents.filter(e => e !== eventName));
    } else {
      setSelectedEvents([...selectedEvents, eventName]);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Terminal size={28} style={{ color: 'var(--primary)' }} /> Developer Platform & API
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.4rem' }}>
          Programmatically shorten links, manage secret API keys, and configure real-time event webhooks.
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="dev-tabs-container">
        <button
          onClick={() => setActiveTab('keys')}
          className={`btn-secondary ${activeTab === 'keys' ? 'active' : ''}`}
          style={{
            background: activeTab === 'keys' ? '#FF2E93' : 'var(--bg-card)',
            color: '#000000',
            borderColor: '#000000',
            boxShadow: activeTab === 'keys' ? '4px 4px 0px #000000' : '2px 2px 0px #000000',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Key size={16} /> API Keys ({keys.length})
        </button>

        <button
          onClick={() => setActiveTab('webhooks')}
          className={`btn-secondary ${activeTab === 'webhooks' ? 'active' : ''}`}
          style={{
            background: activeTab === 'webhooks' ? '#FF2E93' : 'var(--bg-card)',
            color: '#000000',
            borderColor: '#000000',
            boxShadow: activeTab === 'webhooks' ? '4px 4px 0px #000000' : '2px 2px 0px #000000',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Webhook size={16} /> Webhooks ({webhooks.length})
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          className={`btn-secondary ${activeTab === 'docs' ? 'active' : ''}`}
          style={{
            background: activeTab === 'docs' ? '#FF2E93' : 'var(--bg-card)',
            color: '#000000',
            borderColor: '#000000',
            boxShadow: activeTab === 'docs' ? '4px 4px 0px #000000' : '2px 2px 0px #000000',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Shield size={16} /> Quick Docs
        </button>
      </div>

      {/* ---------------- TAB 1: API KEYS ---------------- */}
      {activeTab === 'keys' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Create Key Card */}
          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} style={{ color: 'var(--primary)' }} /> Generate Secret API Key
            </h3>
            <form onSubmit={handleCreateKey} className="responsive-form-row">
              <input 
                type="text" 
                className="input-field" 
                placeholder="Key Label (e.g. Production Server, Zapier, Mobile App)"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                style={{ flex: 1 }}
                required
              />
              <button type="submit" className="btn-primary" disabled={creatingKey} style={{ whiteSpace: 'nowrap' }}>
                {creatingKey ? 'Generating...' : 'Generate API Key'}
              </button>
            </form>
          </div>

          {/* API Keys Table */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Your Secret API Keys</h3>
              <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={fetchKeys}>
                <RefreshCw size={14} style={{ marginRight: '4px' }} /> Refresh
              </button>
            </div>

            {loadingKeys ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading API keys...</div>
            ) : keys.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
                <Key size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                <p>No API keys generated yet. Create your first API key above to start making REST API calls.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="link-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Name / Label</th>
                      <th>Secret Key</th>
                      <th>Created At</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((k) => (
                      <tr key={k.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{k.name}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <code style={{ background: '#F5FF00', color: '#000000', border: '2px solid #000000', padding: '0.25rem 0.6rem', fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 800 }}>
                              {k.key}
                            </code>
                            <button
                              className="btn-secondary"
                              style={{ padding: '0.3rem', fontSize: '0.75rem' }}
                              onClick={() => handleCopyKey(k.id, k.key)}
                              title="Copy API Key"
                            >
                              {copiedKeyId === k.id ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {new Date(k.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', color: 'var(--danger)' }}
                            onClick={() => handleDeleteKey(k.id)}
                            title="Revoke Key"
                          >
                            <Trash2 size={14} style={{ marginRight: '4px' }} /> Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- TAB 2: WEBHOOKS ---------------- */}
      {activeTab === 'webhooks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Register Webhook Form */}
          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} style={{ color: 'var(--primary)' }} /> Register Webhook Endpoint
            </h3>
            <form onSubmit={handleCreateWebhook} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label>Webhook Payload URL</label>
                <input 
                  type="url" 
                  className="input-field" 
                  placeholder="https://yourserver.com/api/webhooks/shortener"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ marginBottom: '0.5rem' }}>Subscribed Events</label>
                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  {[
                    { id: 'link.clicked', label: '⚡ Link Clicked' },
                    { id: 'link.updated', label: '✏️ Link Updated' },
                    { id: 'link.expired', label: '⌛ Link Expired' }
                  ].map(evt => (
                    <label key={evt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                      <input 
                        type="checkbox"
                        checked={selectedEvents.includes(evt.id)}
                        onChange={() => toggleEvent(evt.id)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span>{evt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <button type="submit" className="btn-primary" disabled={creatingWebhook}>
                  {creatingWebhook ? 'Registering...' : 'Register Webhook'}
                </button>
              </div>
            </form>
          </div>

          {/* Webhooks Table */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Configured Event Webhooks</h3>
              <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={fetchWebhooks}>
                <RefreshCw size={14} style={{ marginRight: '4px' }} /> Refresh
              </button>
            </div>

            {loadingWebhooks ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading webhooks...</div>
            ) : webhooks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-secondary)' }}>
                <Webhook size={36} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                <p>No webhooks configured yet. Register a webhook URL above to get HTTP POST notifications when links are clicked.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="link-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Endpoint URL</th>
                      <th>Events</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webhooks.map((w) => (
                      <tr key={w.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{w.url}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {w.events.split(',').map(e => (
                              <span key={e} className="badge badge-active" style={{ fontSize: '0.72rem' }}>
                                {e.trim()}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-active" style={{ fontSize: '0.75rem', background: '#00FF66', color: '#000000', border: '2px solid #000000', fontWeight: 800 }}>
                            Active
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', color: 'var(--danger)' }}
                            onClick={() => handleDeleteWebhook(w.id)}
                            title="Delete Webhook"
                          >
                            <Trash2 size={14} style={{ marginRight: '4px' }} /> Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- TAB 3: QUICK DOCS ---------------- */}
      {activeTab === 'docs' && (
        <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            ⚡ REST API Integration Quickstart
          </h3>

          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              1. Shorten a URL via cURL (Using X-API-Key)
            </h4>
            <pre style={{ background: '#000000', padding: '1rem', border: '3px solid #000000', boxShadow: '4px 4px 0px #000000', fontSize: '0.85rem', color: '#00FF66' }}>
{`curl -X POST http://localhost:5000/api/links/shorten \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: sk_live_your_secret_key_here" \\
  -d '{
    "longUrl": "https://example.com/promo-campaign",
    "customAlias": "spring-sale-2026",
    "redirectType": "301"
  }'`}
            </pre>
          </div>

          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              2. Fetch All Your Links Programmatically
            </h4>
            <pre style={{ background: '#000000', padding: '1rem', border: '3px solid #000000', boxShadow: '4px 4px 0px #000000', fontSize: '0.85rem', color: '#00FF66' }}>
{`curl -X GET http://localhost:5000/api/links \\
  -H "X-API-Key: sk_live_your_secret_key_here"`}
            </pre>
          </div>

          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              3. Webhook HTTP POST Payload Schema
            </h4>
            <pre style={{ background: '#000000', padding: '1rem', border: '3px solid #000000', boxShadow: '4px 4px 0px #000000', fontSize: '0.85rem', color: '#00F0FF' }}>
{`{
  "event": "link.clicked",
  "timestamp": "2026-07-25T16:00:00.000Z",
  "data": {
    "id": "link-uuid-1234",
    "code": "spring-sale-2026",
    "longUrl": "https://example.com/promo-campaign",
    "ip": "192.168.1.1",
    "country": "United States",
    "city": "San Francisco",
    "device": "Desktop",
    "browser": "Chrome",
    "referrer": "Twitter / X"
  }
}`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeveloperConsole;
