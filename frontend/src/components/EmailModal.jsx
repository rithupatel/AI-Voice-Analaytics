import React, { useState } from 'react';
import { X, Send, Paperclip } from 'lucide-react';

export default function EmailModal({ onClose, agentEmail, defaultSubject, defaultBody, pdfBase64, pdfFilename, showAlert }) {
  const [toEmail, setToEmail] = useState(agentEmail || '');
  const [subject, setSubject] = useState(defaultSubject || '');
  const [body, setBody] = useState(defaultBody || '');
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!toEmail.trim()) {
      showAlert("Please enter a recipient email.", "Error");
      return;
    }
    
    setIsSending(true);
    try {
      const response = await fetch(`/api/v1/recordings/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to_email: toEmail,
          subject: subject,
          body: body,
          pdf_base64: pdfBase64,
          pdf_filename: pdfFilename
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to send email');
      }

      showAlert("Email sent successfully!", "Success");
      onClose();
    } catch (err) {
      console.error("Failed to send email", err);
      showAlert(err.message || "Failed to send email. Check backend logs.", "Error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="custom-dialog-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="custom-dialog-content" style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', width: '500px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)' }}>Compose Email</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>To</label>
          <input 
            type="email" 
            value={toEmail}
            onChange={(e) => setToEmail(e.target.value)}
            placeholder="recipient@example.com"
            style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '0.9rem' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Subject</label>
          <input 
            type="text" 
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '0.9rem' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Body</label>
          <textarea 
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '0.9rem', resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
          <Paperclip size={16} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 500 }}>{pdfFilename}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>(Generated Automatically)</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
          <button className="btn-secondary" onClick={onClose} disabled={isSending}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSend} disabled={isSending} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Send size={14} />
            {isSending ? 'Sending...' : 'Send Email'}
          </button>
        </div>

      </div>
    </div>
  );
}
