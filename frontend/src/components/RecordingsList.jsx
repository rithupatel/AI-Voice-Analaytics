import React, { useState } from 'react';
import { Search, Plus, Clock, User, Filter, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RecordingsList({ recordings, selectedId, onSelect, onOpenUpload }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // all, positive, negative, neutral, failed

  const getInitials = (rec) => {
    const title = (rec.title || "").toLowerCase();
    const analysis = rec.analysis || rec.llm_analysis || {};
    const summary = (analysis.call_summary || "").toLowerCase();
    if (title.includes("flower") || title.includes("rose") || summary.includes("randall")) {
      return "RT";
    }
    if (title.includes("support") || title.includes("bluetooth") || summary.includes("meredith") || title.includes("dacasin")) {
      return "MB";
    }
    const cleanTitle = rec.title.replace(/Sample|Call|Tech|Support/gi, "").trim();
    if (cleanTitle) {
      const parts = cleanTitle.split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      if (parts[0]) return parts[0][0].toUpperCase();
    }
    return "C";
  };

  const getDisplayName = (rec) => {
    const title = (rec.title || "").toLowerCase();
    const analysis = rec.analysis || rec.llm_analysis || {};
    const summary = (analysis.call_summary || "").toLowerCase();
    if (title.includes("flower") || title.includes("rose") || summary.includes("randall")) {
      return "Randall Thomas";
    }
    if (title.includes("support") || title.includes("bluetooth") || summary.includes("meredith") || title.includes("dacasin")) {
      return "Meredith Blake";
    }
    return rec.title;
  };

  const getCallSubject = (rec) => {
    const title = (rec.title || "").toLowerCase();
    if (title.includes("flower") || title.includes("rose")) {
      return "Order Inquiry: Red Roses";
    }
    if (title.includes("bluetooth") || title.includes("headset") || title.includes("dacasin")) {
      return "Technical Support: Bluetooth Pairing";
    }
    return "Voice Analysis Review";
  };

  const getPreviewText = (rec) => {
    const analysis = rec.analysis || rec.llm_analysis || {};
    if (analysis.call_summary) {
      return analysis.call_summary;
    }
    if (rec.status === 'FAILED') {
      return `Error: ${rec.error_message || 'Processing failed.'}`;
    }
    if (rec.status === 'PROCESSING' || rec.status === 'DIARIZING' || rec.status === 'TRANSCRIBING' || rec.status === 'ALIGNING' || rec.status === 'ANALYZING') {
      return 'Analyzing audio recording dialogue... Stage: ' + rec.status;
    }
    return 'Pending pipeline processing...';
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    try {
      // Input formats: "2026-07-29 05:10:05"
      const parts = dateStr.split(' ');
      if (parts.length >= 2) {
        const timeParts = parts[1].split(':');
        const hour = parseInt(timeParts[0]);
        const minute = timeParts[1];
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minute} ${ampm}`;
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  const formatDuration = (secs) => {
    if (!secs) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Filter logic
  const filtered = recordings.filter(r => {
    const matchesSearch = 
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getDisplayName(r).toLowerCase().includes(searchTerm.toLowerCase());

    const analysis = r.analysis || r.llm_analysis || {};
    const sentiment = (analysis.overall_sentiment || 'NEUTRAL').toUpperCase();
    
    if (activeFilter === 'positive') return matchesSearch && sentiment === 'POSITIVE' && r.status === 'COMPLETED';
    if (activeFilter === 'negative') return matchesSearch && sentiment === 'NEGATIVE' && r.status === 'COMPLETED';
    if (activeFilter === 'neutral') return matchesSearch && sentiment === 'NEUTRAL' && r.status === 'COMPLETED';
    if (activeFilter === 'failed') return matchesSearch && r.status === 'FAILED';
    
    return matchesSearch;
  });

  return (
    <div className="recordings-sidebar">
      {/* 1. Header with Title & Action */}
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <span className="sidebar-title">Inbox</span>
          <button className="btn-primary" onClick={onOpenUpload}>
            <Plus size={14} style={{ marginRight: '4px' }} /> New Call
          </button>
        </div>

        {/* Search */}
        <div className="search-box">
          <Search className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search in folder..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Outlook-style inbox tabs */}
        <div className="outlook-filter-tabs">
          <button 
            className={`filter-tab ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'positive' ? 'active' : ''}`}
            onClick={() => setActiveFilter('positive')}
          >
            Positive
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'negative' ? 'active' : ''}`}
            onClick={() => setActiveFilter('negative')}
          >
            Negative
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'neutral' ? 'active' : ''}`}
            onClick={() => setActiveFilter('neutral')}
          >
            Neutral
          </button>
          <button 
            className={`filter-tab ${activeFilter === 'failed' ? 'active' : ''}`}
            onClick={() => setActiveFilter('failed')}
          >
            Failed
          </button>
        </div>
      </div>

      {/* 2. List of Email-style recordings */}
      <div className="recordings-list">
        {filtered.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No calls found in this folder.
          </div>
        ) : (
          filtered.map(r => {
            const analysis = r.analysis || r.llm_analysis || {};
            const sentiment = analysis.overall_sentiment || 'NEUTRAL';
            const displayName = getDisplayName(r);
            const initials = getInitials(r);
            const subject = getCallSubject(r);
            const preview = getPreviewText(r);
            const isSelected = selectedId === r.id;

            return (
              <div
                key={r.id}
                className={`outlook-mail-item ${isSelected ? 'selected' : ''} status-${r.status.toLowerCase()}`}
                onClick={() => onSelect(r.id)}
              >
                {/* Unread/Selected indicator bar on the left */}
                <div className="unread-bar"></div>

                {/* Avatar circle */}
                <div className={`mail-avatar avatar-${initials.toLowerCase()}`}>
                  <span>{initials}</span>
                </div>

                {/* Mail details */}
                <div className="mail-content-wrapper">
                  <div className="mail-header-row">
                    <span className="mail-sender">{displayName}</span>
                    <span className="mail-time">{formatTimestamp(r.created_at)}</span>
                  </div>

                  <div className="mail-subject">{subject}</div>
                  
                  <div className="mail-preview">
                    {preview}
                  </div>

                  <div className="mail-footer-meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock size={11} /> {formatDuration(r.duration_seconds)}
                    </span>

                    {r.status === 'COMPLETED' ? (
                      <span className={`sentiment-badge sentiment-${sentiment}`}>
                        ● {sentiment}
                      </span>
                    ) : (
                      <span className={`badge-status badge-${r.status.toLowerCase()}`}>
                        {r.status === 'FAILED' && <AlertCircle size={10} style={{ marginRight: '2px' }} />}
                        {r.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
