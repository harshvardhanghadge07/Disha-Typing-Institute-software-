import React, { Component } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('DISHA UI Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: '#dfe7e6', padding: 32, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0f1724', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ background: '#172234', padding: '32px 40px', borderRadius: 12, border: '1px solid #23344d', maxWidth: 480, width: '100%' }}>
            <h2 style={{ color: '#d4a24c', margin: '0 0 12px' }}>DISHA Typing Institute</h2>
            <p style={{ color: '#ef4444', fontWeight: 500, margin: '0 0 16px' }}>Interface encountered an issue.</p>
            <pre style={{ background: '#0b1319', padding: 12, borderRadius: 6, fontSize: 12, color: '#fca5a5', overflowX: 'auto', textAlign: 'left', marginBottom: 20 }}>
              {String(this.state.error?.message || this.state.error || 'Unknown error')}
            </pre>
            <button 
              style={{ background: '#1f6f68', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              onClick={() => window.location.reload()}
            >
              Reload Interface
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// Unregister service workers inside Electron to avoid stale caches
if ('serviceWorker' in navigator) {
  if (navigator.userAgent.includes('Electron')) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      for (const reg of regs) reg.unregister();
    });
  } else if (window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('PWA Service Worker registration skipped:', err);
      });
    });
  }
}

