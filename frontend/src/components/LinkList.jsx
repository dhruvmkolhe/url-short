import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { Search, RotateCw, BarChart2, Edit2, Trash2, Copy, Check, ExternalLink, Calendar, Key, AlertCircle, X, Activity, CheckSquare, Square, ShieldAlert, CheckCircle2, XCircle, GripVertical } from 'lucide-react';

function LinkList({ links, loading, onRefresh, onSelectStats, showToast }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'disabled', 'expired'
  const [copiedId, setCopiedId] = useState(null);

  // Multi-Select Batch Actions State
  const [selectedIds, setSelectedIds] = useState([]);

  // URL Health Check State map: { [linkId]: { loading: boolean, healthy: boolean, status: number, statusText: string } }
  const [healthMap, setHealthMap] = useState({});

  // Edit Link Modal States
  const [editingLink, setEditingLink] = useState(null);
  const [editUrl, setEditUrl] = useState('');
  const [editExpires, setEditExpires] = useState('');
  const [editMaxClicks, setEditMaxClicks] = useState('');
  const [editRedirectType, setEditRedirectType] = useState('302');
  const [editCustomDomain, setEditCustomDomain] = useState('');
  const [editRequirePreview, setEditRequirePreview] = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [editIpAllowlist, setEditIpAllowlist] = useState('');
  const [editIpBlocklist, setEditIpBlocklist] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Drag-to-Reorder State
  const [dragOrder, setDragOrder] = useState(null); // local reordered list or null
  const dragSrcIdx = useRef(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  // Copy helper
  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Link copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Switch Toggle Handler (Enable/Disable redirect link)
  const handleStatusToggle = async (id, currentVal) => {
    try {
      await axios.put(`/api/links/${id}`, { isEnabled: !currentVal });
      showToast(`Link ${!currentVal ? 'enabled' : 'disabled'} successfully.`);
      onRefresh();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update link status.', 'error');
    }
  };

  // Delete Handler
  const handleDelete = async (id) => {
    if (!window.confirm('Are you absolutely sure you want to delete this short link? All click analytics will be permanently destroyed.')) return;
    
    try {
      await axios.delete(`/api/links/${id}`);
      showToast('Short link deleted.');
      onRefresh();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete link.', 'error');
    }
  };

  // Health Check Handler
  const handleCheckHealth = async (id, longUrl) => {
    setHealthMap(prev => ({ ...prev, [id]: { loading: true } }));
    try {
      const response = await axios.post('/api/links/health-check', { url: longUrl });
      setHealthMap(prev => ({ ...prev, [id]: { loading: false, ...response.data } }));
      if (response.data.healthy) {
        showToast(`Target link is live (${response.data.status} OK).`);
      } else {
        showToast(`Health warning: ${response.data.statusText || 'Destination unreachable'}`, 'error');
      }
    } catch (err) {
      setHealthMap(prev => ({ ...prev, [id]: { loading: false, healthy: false, statusText: 'Failed to connect' } }));
      showToast('Health check request failed.', 'error');
    }
  };

  // Edit Submit Handler
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);

    try {
      const payload = {
        longUrl: editUrl,
        expiresAt: editExpires ? new Date(editExpires).toISOString() : null,
        maxClicks: editMaxClicks ? parseInt(editMaxClicks, 10) : null,
        redirectType: editRedirectType,
        customDomain: editCustomDomain ? editCustomDomain.trim() : null,
        requirePreview: editRequirePreview,
        password: editPassword === 'antigravity-keep-existing-pwd' ? undefined : (editPassword.trim() || null),
        ipAllowlist: editIpAllowlist.trim() || null,
        ipBlocklist: editIpBlocklist.trim() || null,
      };

      await axios.put(`/api/links/${editingLink.id}`, payload);
      showToast('Link configurations updated successfully.');
      setEditingLink(null);
      onRefresh();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update link settings.', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const openEditModal = (link) => {
    setEditingLink(link);
    setEditUrl(link.longUrl);
    setEditExpires(link.expiresAt ? link.expiresAt.slice(0, 16) : '');
    setEditMaxClicks(link.maxClicks || '');
    setEditRedirectType(link.redirectType || '302');
    setEditCustomDomain(link.customDomain || '');
    setEditRequirePreview(!!link.requirePreview);
    setEditPassword(link.passwordProtected ? 'antigravity-keep-existing-pwd' : '');
    setEditIpAllowlist(link.ipAllowlist || '');
    setEditIpBlocklist(link.ipBlocklist || '');
  };

  // Filter links on Client Side
  const sourceLinks = dragOrder || links;
  const filteredLinks = sourceLinks.filter(link => {
    const matchesSearch = link.longUrl.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          link.code.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    const isExpired = link.expiresAt && new Date(link.expiresAt) <= new Date();
    
    if (statusFilter === 'active') {
      return link.isEnabled && !isExpired;
    } else if (statusFilter === 'disabled') {
      return !link.isEnabled;
    } else if (statusFilter === 'expired') {
      return isExpired;
    }
    
    return true;
  });

  // Drag handlers
  const handleDragStart = (e, idx) => {
    dragSrcIdx.current = idx;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(idx);
  };

  const handleDrop = (e, dropIdx) => {
    e.preventDefault();
    const srcIdx = dragSrcIdx.current;
    if (srcIdx === null || srcIdx === dropIdx) {
      setDragOverIdx(null);
      return;
    }
    const base = dragOrder || links;
    const reordered = [...base];
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(dropIdx, 0, moved);
    setDragOrder(reordered);
    dragSrcIdx.current = null;
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    dragSrcIdx.current = null;
    setDragOverIdx(null);
  };

  // Batch Select Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredLinks.map(l => l.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBatchCopy = () => {
    const selectedLinks = links.filter(l => selectedIds.includes(l.id));
    const textToCopy = selectedLinks.map(l => l.shortUrl).join('\n');
    navigator.clipboard.writeText(textToCopy);
    showToast(`Copied ${selectedLinks.length} URLs to clipboard!`);
  };

  const handleBatchToggleStatus = async (enable) => {
    try {
      await Promise.all(selectedIds.map(id => axios.put(`/api/links/${id}`, { isEnabled: enable })));
      showToast(`Updated status for ${selectedIds.length} links.`);
      setSelectedIds([]);
      onRefresh();
    } catch (err) {
      showToast('Failed to update some selected links.', 'error');
    }
  };

  const handleBatchDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected short links?`)) return;
    try {
      await Promise.all(selectedIds.map(id => axios.delete(`/api/links/${id}`)));
      showToast(`Deleted ${selectedIds.length} links.`);
      setSelectedIds([]);
      onRefresh();
    } catch (err) {
      showToast('Failed to delete some selected links.', 'error');
    }
  };

  const isAllSelected = filteredLinks.length > 0 && selectedIds.length === filteredLinks.length;

  return (
    <div style={{ position: 'relative' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: "'Archivo Black', sans-serif", textTransform: 'uppercase', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
        Link Manager & Analytics Dashboard
      </h1>
      
      {/* Table Action Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap'
      }}>
        
        {/* Left: Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all', 'active', 'disabled', 'expired'].map(status => (
            <button
              key={status}
              className={`btn-secondary ${statusFilter === status ? 'active' : ''}`}
              style={{
                padding: '0.45rem 1rem',
                fontSize: '0.85rem',
                background: statusFilter === status ? '#FF2E93' : 'var(--bg-card)',
                color: '#000000',
                borderColor: '#000000',
                boxShadow: statusFilter === status ? '4px 4px 0px #000000' : '2px 2px 0px #000000',
                fontWeight: 800,
                textTransform: 'uppercase'
              }}
              onClick={() => { setStatusFilter(status); setSelectedIds([]); }}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Right: Search + Refresh */}
        <div style={{ display: 'flex', gap: '0.75rem', width: '100%', maxWidth: '400px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }} />
            <input 
              type="text"
              className="input-field"
              placeholder="Search by URL or short code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem', paddingTop: '0.55rem', paddingBottom: '0.55rem', fontSize: '0.9rem' }}
            />
          </div>
          <button className="btn-secondary" style={{ padding: '0.55rem' }} onClick={onRefresh} title="Sync links">
            <RotateCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>

      </div>

      {/* Batch Operations Bar (when items selected) */}
      {selectedIds.length > 0 && (
        <div style={{
          background: '#F5FF00',
          color: '#000000',
          border: '3px solid #000000',
          boxShadow: '4px 4px 0px #000000',
          padding: '0.75rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#000000', textTransform: 'uppercase' }}>
            ⚡ {selectedIds.length} LINKS SELECTED
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={handleBatchCopy}>
              <Copy size={13} /> Copy URLs
            </button>
            <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleBatchToggleStatus(true)}>
              Enable Selected
            </button>
            <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleBatchToggleStatus(false)}>
              Disable Selected
            </button>
            <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: '#FF2E93', color: '#000' }} onClick={handleBatchDelete}>
              <Trash2 size={13} /> Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Main Table view */}
      <div className="glass-card" style={{ padding: '1.5rem 1.25rem' }}>
        {loading && links.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: 800 }}>
              <RotateCw size={18} className="spin" /> Fetching short code entries...
            </div>
            {[1, 2, 3, 4].map(idx => (
              <div key={idx} style={{
                height: '56px',
                background: 'var(--bg-input)',
                border: '2px solid #000000',
                boxShadow: '3px 3px 0px #000000',
                opacity: 0.6,
                display: 'flex',
                alignItems: 'center',
                padding: '0 1rem',
                justifyContent: 'space-between'
              }}>
                <div style={{ width: '35%', height: '16px', background: '#000000', opacity: 0.15 }} />
                <div style={{ width: '25%', height: '16px', background: '#000000', opacity: 0.15 }} />
                <div style={{ width: '15%', height: '16px', background: '#000000', opacity: 0.15 }} />
              </div>
            ))}
          </div>
        ) : filteredLinks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            <AlertCircle size={40} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
            <h4>No shortened links found matching filters.</h4>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Start by creating custom codes in the shortener tab!</p>
          </div>
        ) : (
          <div className="table-container link-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '30px' }}></th>
                  <th style={{ width: '40px' }}>
                    <input 
                      type="checkbox" 
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ width: '40px' }}>State</th>
                  <th>Destination URL</th>
                  <th>Short link mapping</th>
                  <th style={{ width: '130px' }}>URL Health</th>
                  <th style={{ width: '90px' }}>Clicks</th>
                  <th style={{ width: '130px' }}>Expires</th>
                  <th style={{ width: '130px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLinks.map((link, idx) => {
                  const isExpired = link.expiresAt && new Date(link.expiresAt) <= new Date();
                  const isSelected = selectedIds.includes(link.id);
                  const healthInfo = healthMap[link.id];
                  const isDragTarget = dragOverIdx === idx;
                  
                  return (
                    <tr
                      key={link.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      style={{
                        background: isSelected ? 'var(--primary-glow)' : 'transparent',
                        outline: isDragTarget ? '2px dashed var(--primary)' : 'none',
                        outlineOffset: '-2px',
                        opacity: dragSrcIdx.current === idx ? 0.45 : 1,
                        transition: 'opacity 0.15s ease',
                        cursor: 'grab',
                      }}
                    >
                      {/* Drag Handle */}
                      <td style={{ color: 'var(--text-muted)', paddingLeft: '0.5rem' }}>
                        <GripVertical size={15} style={{ cursor: 'grab', opacity: 0.5 }} />
                      </td>
                      {/* Checkbox */}
                      <td>
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(link.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* Active switch */}
                      <td>
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={link.isEnabled} 
                            onChange={() => handleStatusToggle(link.id, link.isEnabled)}
                          />
                          <span className="slider"></span>
                        </label>
                      </td>

                      {/* Destination URL */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span 
                            style={{
                              maxWidth: '260px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontWeight: 600,
                              fontSize: '0.925rem'
                            }}
                            title={link.longUrl}
                          >
                            {link.longUrl}
                          </span>
                          
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {link.passwordProtected && (
                              <span style={{ fontSize: '0.75rem', color: '#000000', background: '#F5FF00', border: '2px solid #000000', boxShadow: '2px 2px 0px #000000', padding: '2px 6px', fontWeight: 800, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <Key size={11} color="#000000" /> Password Encrypted
                              </span>
                            )}
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Added {new Date(link.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Shortened URL */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <a 
                            href={link.shortUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{
                              background: '#F5FF00',
                              color: '#000000',
                              padding: '2px 8px',
                              border: '2px solid #000000',
                              boxShadow: '2px 2px 0px #000000',
                              fontWeight: 800,
                              fontFamily: 'var(--font-mono)',
                              textDecoration: 'none'
                            }}
                          >
                            /{link.code}
                          </a>
                          
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button 
                              onClick={() => handleCopy(link.id, link.shortUrl)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                              title="Copy URL"
                            >
                              {copiedId === link.id ? <Check size={13} style={{ color: 'var(--success)' }} /> : <Copy size={13} />}
                            </button>
                            <a 
                              href={link.shortUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              style={{ color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center' }}
                              title="Open link"
                            >
                              <ExternalLink size={13} />
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* URL Health Check */}
                      <td>
                        {healthInfo ? (
                          healthInfo.loading ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <RotateCw size={11} className="spin" /> Checking...
                            </span>
                          ) : healthInfo.healthy ? (
                            <span className="badge badge-active" style={{ fontSize: '0.725rem' }}>
                              <CheckCircle2 size={11} style={{ marginRight: '3px' }} /> {healthInfo.status} OK
                            </span>
                          ) : (
                            <span className="badge badge-disabled" style={{ fontSize: '0.725rem' }}>
                              <XCircle size={11} style={{ marginRight: '3px' }} /> {healthInfo.status || 'Broken'}
                            </span>
                          )
                        ) : (
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '0.2rem 0.55rem', fontSize: '0.75rem' }}
                            onClick={() => handleCheckHealth(link.id, link.longUrl)}
                          >
                            <Activity size={12} /> Test Health
                          </button>
                        )}
                      </td>

                      {/* Clicks */}
                      <td>
                        <span className="badge badge-active" style={{ fontSize: '0.85rem', padding: '0.2rem 0.6rem' }}>
                          {link.clicks}
                        </span>
                      </td>

                      {/* Expiration date */}
                      <td>
                        {link.expiresAt ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.85rem' }}>
                              {new Date(link.expiresAt).toLocaleDateString()}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: isExpired ? 'var(--danger)' : 'var(--text-secondary)' }}>
                              {isExpired ? 'Expired' : new Date(link.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Permanent</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '0.45rem 0.65rem', fontSize: '0.8rem' }}
                            onClick={() => onSelectStats(link.id)}
                            title="Analytics & Telemetry"
                          >
                            <BarChart2 size={14} /> Stats
                          </button>
                          
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '0.45rem', fontSize: '0.8rem' }}
                            onClick={() => openEditModal(link)}
                            title="Edit Link Settings"
                          >
                            <Edit2 size={14} />
                          </button>
                          
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '0.45rem', fontSize: '0.8rem', color: 'var(--danger)' }}
                            onClick={() => handleDelete(link.id)}
                            title="Delete Short Link"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Link Modal Overlay */}
      {editingLink && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem'
        }}>
          <div className="glass-card modal-overlay-content" style={{ maxWidth: '520px', width: '100%', padding: '2rem', position: 'relative' }}>
            <button 
              onClick={() => setEditingLink(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'var(--bg-deep)',
                border: '1px solid var(--border)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
            >
              <X size={16} />
            </button>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '1.5rem', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
              Edit Link Config: <span style={{ color: '#000000', background: '#F5FF00', padding: '2px 8px', border: '2px solid #000000', fontWeight: 800 }}>/{editingLink.code}</span>
            </h3>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label>Target Destination URL</label>
                <input 
                  type="url" 
                  className="input-field" 
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Expiration Date (Optional)</label>
                <input 
                  type="datetime-local" 
                  className="input-field" 
                  value={editExpires}
                  onChange={(e) => setEditExpires(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>⚡ Max Clicks Limit (TTL)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="e.g. 100"
                    value={editMaxClicks}
                    onChange={(e) => setEditMaxClicks(e.target.value)}
                    min="1"
                  />
                </div>

                <div className="form-group">
                  <label>🔀 Redirect Code</label>
                  <select 
                    className="input-field"
                    value={editRedirectType}
                    onChange={(e) => setEditRedirectType(e.target.value)}
                  >
                    <option value="302">302 Temporary</option>
                    <option value="301">301 Permanent</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>🌐 Custom Branded Domain</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="go.yourbrand.com"
                  value={editCustomDomain}
                  onChange={(e) => setEditCustomDomain(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={editRequirePreview}
                    onChange={(e) => setEditRequirePreview(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>🛡️ Require Interstitial Link Preview Gate</span>
                </label>
              </div>

              <div className="form-group">
                <label>Password Protection</label>
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder={editingLink.passwordProtected ? '•••••••• (Leave blank to remove password)' : 'Enter password to gate redirect'}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                />
              </div>

              {/* IP Access Control */}
              <div style={{
                background: 'var(--bg-deep)',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                padding: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.9rem' }}>
                  <span style={{ fontSize: '1rem' }}>🌐</span>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>IP Access Control</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>comma-separated IPs</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label style={{ color: 'var(--success)', fontWeight: 700 }}>✅ Allowlist — Only these IPs can access</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. 192.168.1.1, 10.0.0.5  (leave empty = everyone)"
                      value={editIpAllowlist}
                      onChange={(e) => setEditIpAllowlist(e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ color: 'var(--danger)', fontWeight: 700 }}>🚫 Blocklist — These IPs are banned</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. 203.0.113.0, 198.51.100.1  (leave empty = no blocks)"
                      value={editIpBlocklist}
                      onChange={(e) => setEditIpBlocklist(e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setEditingLink(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={editLoading}>
                  {editLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default LinkList;
