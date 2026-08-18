import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export default function CustomDialog({ isOpen, type, title, message, onConfirm, onCancel }) {
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsRendered(true), 10); // Small delay to allow CSS transition
    } else {
      setIsRendered(false);
    }
  }, [isOpen]);

  if (!isOpen && !isRendered) return null;

  return (
    <div 
      className="custom-dialog-overlay"
      onClick={onCancel}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isOpen ? 1 : 0,
        transition: 'opacity 0.2s ease-in-out'
      }}
    >
      <div 
        className="custom-dialog-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          width: '90%',
          maxWidth: '400px',
          padding: '24px',
          transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(10px)',
          opacity: isOpen ? 1 : 0,
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ 
            background: type === 'confirm' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
            color: type === 'confirm' ? '#ef4444' : '#3b82f6',
            padding: '8px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {type === 'confirm' ? <AlertTriangle size={24} /> : <Info size={24} />}
          </div>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-main)' }}>
            {title || (type === 'confirm' ? 'Confirm Action' : 'Information')}
          </h2>
          <button 
            onClick={onCancel}
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '24px' }}>
          {message}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          {type === 'confirm' && (
            <button 
              className="btn-secondary" 
              onClick={onCancel}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              Cancel
            </button>
          )}
          <button 
            className="btn-primary" 
            onClick={() => {
              if (onConfirm) onConfirm();
              else onCancel();
            }}
            style={{ 
              padding: '8px 16px', 
              fontSize: '0.85rem',
              background: type === 'confirm' ? '#ef4444' : 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            {type === 'confirm' ? 'Delete' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
