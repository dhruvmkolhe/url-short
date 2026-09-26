import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { ArrowLeft, RotateCw, Globe, Smartphone, Compass, Link2, Calendar, Eye } from 'lucide-react';

import Breadcrumb from './Breadcrumb';

// Register ChartJS plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function AnalyticsView({ linkId, onClose, showToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [liveBanner, setLiveBanner] = useState(null);
  const [isLive, setIsLive] = useState(true);

  const fetchStats = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const response = await axios.get(`/api/links/${linkId}/stats`);
      setData(response.data);
      setLastUpdated(new Date());
    } catch (err) {
      if (!isSilent) {
        showToast(err.response?.data?.error || 'Failed to fetch link stats.', 'error');
        onClose();
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(false);

    // 1. Establish SSE EventSource for real-time click streaming
    const streamUrl = `/api/links/${linkId}/stream`;
    let eventSource;
    try {
      eventSource = new EventSource(streamUrl);
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'click') {
            fetchStats(true);
            const clickDevice = parsed.analytic?.device ? ` (${parsed.analytic.device})` : '';
            const clickLocation = parsed.analytic?.country ? ` from ${parsed.analytic.country}` : '';
            setLiveBanner(`⚡ Live redirect click registered${clickLocation}${clickDevice}!`);
            setTimeout(() => setLiveBanner(null), 3500);
          }
        } catch (_) {}
      };
      eventSource.onerror = () => {
        setIsLive(false);
      };
      eventSource.onopen = () => {
        setIsLive(true);
      };
    } catch (_) {
      setIsLive(false);
    }

    // 2. Periodic background refresh interval (every 4s) for high reliability
    const intervalId = setInterval(() => {
      fetchStats(true);
    }, 4000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(intervalId);
    };
  }, [linkId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '10% 0', color: 'var(--text-secondary)' }}>
        <RotateCw size={44} className="spin" style={{ margin: '0 auto 1.5rem', color: 'var(--primary)' }} />
        <h3>Compiling Redirection Telemetry...</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Aggregating geographical details, user-agents, and referrer databases.</p>
      </div>
    );
  }

  if (!data) return null;

  // Chart Global Options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: 'var(--text-primary)',
          font: { family: 'Space Grotesk', size: 12, weight: 'bold' }
        }
      },
      tooltip: {
        padding: 12,
        titleFont: { family: 'Space Grotesk', size: 13, weight: 'bold' },
        bodyFont: { family: 'Space Grotesk', size: 12, weight: 'bold' },
        backgroundColor: '#000000',
        titleColor: '#F5FF00',
        bodyColor: '#FFFFFF',
        borderColor: '#FFFFFF',
        borderWidth: 2
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(128, 128, 128, 0.25)' },
        ticks: { color: 'var(--text-primary)', font: { family: 'Space Grotesk', weight: 'bold' } }
      },
      y: {
        grid: { color: 'rgba(128, 128, 128, 0.25)' },
        ticks: { color: 'var(--text-primary)', font: { family: 'Space Grotesk', weight: 'bold' }, stepSize: 1 },
        beginAtZero: true
      }
    }
  };

  // 1. Timeline Chart Data (Clicks over time)
  const timelineDates = data.analytics.clicksOverTime.map(d => d.date);
  const timelineClicks = data.analytics.clicksOverTime.map(d => d.clicks);
  
  const timelineData = {
    labels: timelineDates.length > 0 ? timelineDates : [new Date().toLocaleDateString()],
    datasets: [
      {
        label: 'Redirect Clicks',
        data: timelineClicks.length > 0 ? timelineClicks : [0],
        borderColor: '#00FF66',
        backgroundColor: 'rgba(0, 255, 102, 0.25)',
        fill: true,
        tension: 0,
        borderWidth: 3,
        pointBackgroundColor: '#F5FF00',
        pointBorderColor: '#000000',
        pointBorderWidth: 2,
        pointHoverRadius: 7
      }
    ]
  };

  // 2. Devices Doughnut Data
  const deviceLabels = Object.keys(data.analytics.devices);
  const deviceCounts = Object.values(data.analytics.devices);
  
  const devicesData = {
    labels: deviceLabels,
    datasets: [
      {
        data: deviceCounts,
        backgroundColor: ['#00F0FF', '#FF2E93', '#F5FF00'],
        borderColor: '#000000',
        borderWidth: 3,
        hoverOffset: 6
      }
    ]
  };

  // 3. Browsers Horizontal Bar Data
  const browserLabels = data.analytics.browsers.map(b => b.name).slice(0, 5);
  const browserCounts = data.analytics.browsers.map(b => b.value).slice(0, 5);
  
  const browsersData = {
    labels: browserLabels.length > 0 ? browserLabels : ['No Data'],
    datasets: [
      {
        label: 'Clicks',
        data: browserCounts.length > 0 ? browserCounts : [0],
        backgroundColor: '#F5FF00',
        borderColor: '#000000',
        borderWidth: 3
      }
    ]
  };

  // 4. Referrers Vertical Bar Data
  const referrerLabels = data.analytics.referrers.map(r => r.name).slice(0, 5);
  const referrerCounts = data.analytics.referrers.map(r => r.value).slice(0, 5);

  const referrersData = {
    labels: referrerLabels.length > 0 ? referrerLabels : ['No Data'],
    datasets: [
      {
        label: 'Referrals',
        data: referrerCounts.length > 0 ? referrerCounts : [0],
        backgroundColor: '#FF2E93',
        borderColor: '#000000',
        borderWidth: 3
      }
    ]
  };

  // Find Top Country / Device / Referrer for Summary Tiles
  const topCountry = data.analytics.countries.length > 0 
    ? data.analytics.countries.reduce((max, c) => c.value > max.value ? c : max, data.analytics.countries[0]).name 
    : '-';
    
  const topReferrer = data.analytics.referrers.length > 0 
    ? data.analytics.referrers.reduce((max, r) => r.value > max.value ? r : max, data.analytics.referrers[0]).name 
    : '-';

  const deviceMax = Math.max(...deviceCounts);
  const topDeviceIdx = deviceCounts.indexOf(deviceMax);
  const topDevice = deviceMax > 0 ? deviceLabels[topDeviceIdx] : '-';

  return (
    <div style={{ position: 'relative' }}>
      {/* Breadcrumb Navigation & BreadcrumbList JSON-LD Schema */}
      <Breadcrumb items={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: `Analytics (${data?.code || linkId})`, path: `/analytics/${linkId}` }
      ]} />
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "http://localhost:3000/" },
            { "@type": "ListItem", "position": 2, "name": "Dashboard", "item": "http://localhost:3000/dashboard" },
            { "@type": "ListItem", "position": 3, "name": `Link Analytics: ${data?.code || linkId}`, "item": `http://localhost:3000/analytics/${linkId}` }
          ]
        })}
      </script>

      {/* Navigation Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            className="btn-secondary" 
            style={{ padding: '0.55rem', borderRadius: '50%', width: '40px', height: '40px' }} 
            onClick={onClose}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Redirection Analytics <span className="gradient-text">/{data.code}</span>
            </h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', wordBreak: 'break-all' }}>
              Target: {data.longUrl}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Live indicator badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.45rem 0.85rem',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 700,
            letterSpacing: '0.5px',
            background: isLive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
            color: isLive ? '#10b981' : '#f59e0b',
            border: isLive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
          }}>
            <span className={isLive ? 'pulse-dot' : ''} style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isLive ? '#10b981' : '#f59e0b',
              display: 'inline-block'
            }}></span>
            {isLive ? 'LIVE REAL-TIME' : 'AUTO-SYNCING'}
          </div>

          <button className="btn-secondary" style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }} onClick={() => fetchStats(false)}>
            <RotateCw size={14} style={{ marginRight: '4px' }} /> Refresh Stats
          </button>
        </div>
      </div>

      {/* Floating Live Click Alert Banner */}
      {liveBanner && (
        <div className="live-banner" style={{
          marginBottom: '1.5rem',
          padding: '0.75rem 1.25rem',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(99, 102, 241, 0.25))',
          border: '1px solid rgba(16, 185, 129, 0.5)',
          borderRadius: '12px',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.25)'
        }}>
          <span className="pulse-dot"></span>
          {liveBanner}
        </div>
      )}

      {/* 4 Summary Cards Grid */}
      <div className="stats-grid-4" style={{ marginBottom: '2.5rem' }}>
        
        {/* Total Clicks */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.6rem', background: 'var(--primary-glow)', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--primary)' }}>
            <Eye size={20} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Total Clicks</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{data.totalClicks}</span>
          </div>
        </div>

        {/* Unique Visitors */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.6rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)' }}>
            <Compass size={20} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Unique Reach</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>{data.uniqueClicks || data.totalClicks}</span>
          </div>
        </div>

        {/* Top Country */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.6rem', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.2)', color: 'var(--secondary)' }}>
            <Globe size={20} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Top Country</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px', display: 'block' }} title={topCountry}>
              {topCountry}
            </span>
          </div>
        </div>

        {/* Top Device */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.6rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
            <Smartphone size={20} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Top Device</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>{topDevice}</span>
          </div>
        </div>

        {/* Top Referrer */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.6rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)' }}>
            <Compass size={20} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Top Referrer</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px', display: 'block' }} title={topReferrer}>
              {topReferrer}
            </span>
          </div>
        </div>

      </div>

      {/* Main Charts Grid Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        
        {/* Timeline (Full Width) */}
        <div className="glass-card" style={{ height: '350px' }}>
          <h4 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: '#ffffff' }}>Redirection Traffic (Clicks Over Time)</h4>
          <div style={{ height: '260px' }}>
            <Line data={timelineData} options={chartOptions} />
          </div>
        </div>

        {/* Double charts splits */}
        <div className="grid-2">
          
          {/* Left: Devices split */}
          <div className="glass-card" style={{ height: '320px', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#ffffff' }}>Device Ratio Distribution</h4>
            <div style={{ flex: 1, position: 'relative', height: '200px' }}>
              {data.totalClicks > 0 ? (
                <Doughnut 
                  data={devicesData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'right', labels: { color: '#e5e7eb', font: { family: 'Outfit' } } }
                    }
                  }} 
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No telemetry logged yet.</div>
              )}
            </div>
          </div>

          {/* Right: Referrers split */}
          <div className="glass-card" style={{ height: '320px' }}>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#ffffff' }}>Top Referrer Platforms</h4>
            <div style={{ height: '220px' }}>
              <Bar 
                data={referrersData} 
                options={{
                  ...chartOptions,
                  scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#9ca3af', font: { family: 'Outfit' } } },
                    y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#9ca3af', font: { family: 'Outfit' } } }
                  }
                }} 
              />
            </div>
          </div>

        </div>

        {/* Table Geo & Browser Split */}
        <div className="grid-2" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
          
          {/* Geo tables */}
          <div className="glass-card">
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Globe size={18} className="text-secondary" /> Geographical Traffic Rankings
            </h4>
            
            {data.analytics.countries.length === 0 ? (
              <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No geographical data resolved. (Test from external IPs or run multiple queries to map mock databases)</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                
                {/* Countries list */}
                <div>
                  <h5 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>Top Countries</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {data.analytics.countries.sort((a,b) => b.value - a.value).slice(0, 5).map((country, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                        <span style={{ fontWeight: 500 }}>{idx+1}. {country.name}</span>
                        <span className="badge badge-active" style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem' }}>{country.value} clicks</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cities list */}
                <div>
                  <h5 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>Top Cities</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {data.analytics.cities.sort((a,b) => b.value - a.value).slice(0, 5).map((city, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                        <span style={{ fontWeight: 500 }}>{idx+1}. {city.name}</span>
                        <span className="badge badge-active" style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem' }}>{city.value} clicks</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Browser bars */}
          <div className="glass-card" style={{ height: '100%' }}>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: '#ffffff' }}>Browsers Used</h4>
            <div style={{ height: '180px' }}>
              <Bar 
                data={browsersData} 
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#9ca3af', font: { family: 'Outfit' }, stepSize: 1 }, beginAtZero: true },
                    y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#9ca3af', font: { family: 'Outfit' } } }
                  }
                }} 
              />
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

export default AnalyticsView;
