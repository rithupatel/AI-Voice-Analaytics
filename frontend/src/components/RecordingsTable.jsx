import React from 'react';
import { getScoreColor } from '../utils/scoreUtils';
import { getScorecardData } from './LLMInsightsPanel';

const getProgressPercentage = (status) => {
  switch (status) {
    case 'QUEUED': return 2;
    case 'PENDING': return 5;
    case 'PREPROCESSING': return 15;
    case 'DIARIZING': return 30;
    case 'TRANSCRIBING': return 60;
    case 'ALIGNING': return 75;
    case 'ANALYZING': return 90;
    case 'COMPLETED': return 100;
    case 'FAILED': return 0;
    default: return 10;
  }
};

const getProgressLabel = (status) => {
  switch (status) {
    case 'QUEUED': return 'Queued...';
    case 'PENDING': return 'Starting pipeline...';
    case 'PREPROCESSING': return 'Uploading & Normalizing...';
    case 'DIARIZING': return 'Diarizing Audio...';
    case 'TRANSCRIBING': return 'Diarizing & Transcribing...';
    case 'ALIGNING': return 'Aligning Timestamps...';
    case 'ANALYZING': return 'Analyzing QA Score...';
    case 'COMPLETED': return 'Completed';
    case 'FAILED': return 'Failed';
    default: return 'Processing...';
  }
};

const formatTimestamp = (dateStr) => {
  if (!dateStr) return '';
  try {
    const cleaned = dateStr.replace(' ', 'T');
    const date = new Date(cleaned);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch (e) {
    return dateStr;
  }
};

const RecordingsTable = ({ recordings, selectedId, onSelect, isMobileOrTablet, setActiveMobilePanel }) => {
  if (recordings.length === 0) {
    return (
      <div className="empty-panel-text" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        No recordings in this timeline.
      </div>
    );
  }

  return (
    <>
      {recordings.map(r => {
        const isSelected = selectedId === r.id;
        const analysis = r.analysis || {};
        
        if (r.status !== 'COMPLETED' && r.status !== 'FAILED') {
           const progress = getProgressPercentage(r.status);
           const label = getProgressLabel(r.status);
           return (
              <div 
                key={r.id} 
                className={`skeleton-loading-card ${isSelected ? 'active-item' : ''}`} 
                onClick={() => {
                  onSelect(r.id);
                  if (isMobileOrTablet && setActiveMobilePanel) {
                    setActiveMobilePanel('three');
                  }
                }}
                style={{ padding: '16px', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-app)', cursor: 'pointer', transition: 'all 0.2s', border: isSelected ? '1px solid var(--primary)' : '1px solid transparent' }}
              >
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                   <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</span>
                   <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{progress}%</span>
                 </div>
                 <div style={{ width: '100%', background: 'var(--border-light)', height: '6px', borderRadius: '3px', overflow: 'hidden', marginBottom: '10px' }}>
                   <div style={{ width: `${progress}%`, background: 'var(--primary)', height: '100%', transition: 'width 0.5s ease' }}></div>
                 </div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.2s infinite' }}></span>
                   <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</span>
                 </div>
              </div>
           );
        }

        return (
          <div
            key={r.id}
            className={`outlook-mail-item ${isSelected ? 'active-item' : ''}`}
            onClick={() => {
              onSelect(r.id);
              if (isMobileOrTablet && setActiveMobilePanel) {
                setActiveMobilePanel('three');
              }
            }}
            style={{
              position: 'relative',
              padding: '10px 12px',
              marginBottom: '4px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              border: '2px solid transparent',
              transition: 'all 0.2s',
              display: 'flex',
              gap: '12px'
            }}
          >
            <div className="mail-content-wrapper" style={{ flex: 1, minWidth: 0 }}>
              <div className="mail-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mail-sender item-title" style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>{r.title}</span>
                <span className="mail-time" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatTimestamp(r.created_at)}</span>
              </div>
              <div className="mail-footer-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                {r.status === 'COMPLETED' && (analysis.qa_scorecard || analysis.empathy_score !== undefined) ? (
                  <span className="quality-pill" style={{
                    background: 'var(--bg-app)',
                    color: getScoreColor(getScorecardData(analysis, r.duration_seconds || 0)?.finalScore),
                    border: `1px solid ${getScoreColor(getScorecardData(analysis, r.duration_seconds || 0)?.finalScore)}`,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 600
                  }}>
                    Score: {getScorecardData(analysis, r.duration_seconds || 0)?.finalScore}%
                  </span>
                ) : r.status === 'FAILED' ? (
                  <span className="quality-pill" style={{
                    background: 'rgba(231, 76, 60, 0.1)',
                    color: '#e74c3c',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 600
                  }}>
                    Failed
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

export default RecordingsTable;
