import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

function Breadcrumb({ items = [] }) {
  return (
    <nav 
      aria-label="Breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        fontSize: '0.85rem',
        fontWeight: 800,
      }}
    >
      <Link 
        to="/" 
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          background: '#F5FF00',
          color: '#000000',
          border: '2px solid #000000',
          padding: '0.2rem 0.6rem',
          textDecoration: 'none',
          boxShadow: '2px 2px 0px #000000'
        }}
      >
        <Home size={14} /> Home
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight size={16} style={{ color: 'var(--text-primary)' }} />
            {isLast ? (
              <span style={{
                background: '#FF2E93',
                color: '#000000',
                border: '2px solid #000000',
                padding: '0.2rem 0.6rem',
                boxShadow: '2px 2px 0px #000000'
              }}>
                {item.label}
              </span>
            ) : (
              <Link 
                to={item.path} 
                style={{
                  background: '#00F0FF',
                  color: '#000000',
                  border: '2px solid #000000',
                  padding: '0.2rem 0.6rem',
                  textDecoration: 'none',
                  boxShadow: '2px 2px 0px #000000'
                }}
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export default Breadcrumb;
