import React, { useState } from 'react';
import { Mail, Key, LogIn, Send, AlertCircle, Grid, CheckCircle } from 'lucide-react';

export default function LoginBox({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const handleSendCode = async () => {
    if (!email.trim()) {
      setError("Please enter your email first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/v1/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to send code.');
      }
      
      setMessage("A 4-digit code has been sent to your email.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!email.trim() || !code.trim()) return;

    setIsLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/v1/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Invalid code.');
      }
      
      localStorage.setItem('token', 'auth_active'); // Set a dummy token to satisfy isAuthenticated check
      localStorage.setItem('userEmail', data.email);
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100vw',
      background: 'var(--bg-app)',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        background: 'var(--bg-card)',
        padding: '40px',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        width: '400px',
        maxWidth: '90%',
        border: '1px solid var(--border-light)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{ 
            background: 'var(--primary)', 
            padding: '10px', 
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <Grid size={24} />
          </div>
          <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: 600 }}>
            Voice Analytics
          </h2>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid #ef4444', 
            color: '#ef4444', 
            padding: '12px', 
            borderRadius: 'var(--radius-sm)',
            marginBottom: '20px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        
        {message && (
          <div style={{ 
            background: 'rgba(16, 185, 129, 0.1)', 
            border: '1px solid #10b981', 
            color: '#10b981', 
            padding: '12px', 
            borderRadius: 'var(--radius-sm)',
            marginBottom: '20px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={16} />
            {message}
          </div>
        )}

        <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gmail.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-app)',
                  color: 'var(--text-main)',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Login Code</label>
            <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Key size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="1234"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 40px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-main)',
                    fontSize: '1rem',
                    letterSpacing: '2px'
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={isLoading || !email}
                className="btn-secondary"
                style={{
                  padding: '0 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85rem',
                  opacity: isLoading || !email ? 0.7 : 1,
                  cursor: isLoading || !email ? 'not-allowed' : 'pointer'
                }}
              >
                <Send size={14} />
                Send Code
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading || !email || !code}
            className="btn-primary"
            style={{
              padding: '12px',
              fontSize: '0.95rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              marginTop: '16px',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: isLoading || !email || !code ? 'not-allowed' : 'pointer',
              opacity: isLoading || !email || !code ? 0.7 : 1
            }}
          >
            <LogIn size={16} />
            {isLoading ? 'Processing...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
