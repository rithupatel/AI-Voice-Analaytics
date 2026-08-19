import React, { useEffect, useState } from 'react';
import { X, Code, Copy, Check } from 'lucide-react';

export default function Stage3JsonModal({ recordingId, onClose }) {
  const [jsonData, setJsonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!recordingId) return;
    setLoading(true);
    fetch(`/api/v1/recordings/${recordingId}/stage3-json`)
      .then(res => res.json())
      .then(data => {
        setJsonData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch Stage 3 JSON', err);
        setLoading(false);
      });
  }, [recordingId]);

  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [onClose]);

  const handleCopy = () => {
    if (jsonData) {
      navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <Code size={18} style={{ color: 'var(--primary)' }} /> Stage 3 Alignment Engine JSON Payload
          </div>
          <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Stage 3 JSON...</div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                <button className="btn-secondary" onClick={handleCopy}>
                  {copied ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy JSON'}
                </button>
              </div>
              <pre className="json-code">
                {JSON.stringify(jsonData, null, 2)}
              </pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
