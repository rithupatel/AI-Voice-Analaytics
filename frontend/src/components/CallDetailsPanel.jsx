import React from 'react';
import { ChevronLeft, FileAudio, FileText, Mail, Download, AlertCircle, Activity, Mic } from 'lucide-react';
import AudioPlayer from './AudioPlayer';
import TranscriptView from './TranscriptView';
import PipelineProgress from './PipelineProgress';
import LLMInsightsPanel, { getScorecardData, exportScorecardPDF } from './LLMInsightsPanel';

export default function CallDetailsPanel({
  isMobileOrTablet,
  activeMobilePanel,
  setActiveMobilePanel,
  selectedDetail,
  showTranscript,
  setShowTranscript,
  selectedWordTimestamps,
  showAlert,
  setEmailModalData,
  setShowEmailModal,
  filteredAgentRecordings
}) {
  return (
    <div className="panel-three" style={{ flexGrow: 1, flexShrink: 1, minHeight: 0, minWidth: isMobileOrTablet ? 0 : '450px', display: 'flex', flexDirection: 'column', background: 'var(--bg-card)' }}>
      {selectedDetail ? (
        <>
          <div className="workspace-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-light)' }}>
            <div className="header-title-container" style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
              {isMobileOrTablet && (
                <button 
                  className="btn-secondary" 
                  onClick={() => setActiveMobilePanel('two')}
                  style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px', flexShrink: 0 }}
                >
                  <ChevronLeft size={16} /> Back
                </button>
              )}
              <div className="email-avatar-placeholder" style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(0, 120, 212, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <FileAudio size={22} style={{ color: 'var(--primary)' }} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="header-title" style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', maxWidth: '100%' }}>{selectedDetail.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', maxWidth: '100%' }}>
                  {selectedDetail.original_filename} | Agent: <strong style={{ color: 'var(--primary)' }}>{selectedDetail.agent_name || 'Unknown'}</strong>
                  {selectedDetail.status !== 'COMPLETED' && (
                    <span> | Status: <strong style={{ color: 'var(--primary)' }}>{selectedDetail.status}</strong></span>
                  )}
                </div>
              </div>
            </div>

            <div className="header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
              <button 
                className="btn-secondary" 
                onClick={() => setShowTranscript(!showTranscript)}
                style={{ background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)', fontWeight: 600 }}
              >
                <FileText size={13} style={{ marginRight: '4px' }} /> 
                <span className="btn-text">{showTranscript ? 'Hide Transcript' : 'Show Transcript'}</span>
              </button>
              
              <button 
                className="btn-secondary"
                onClick={async () => {
                  if (!selectedDetail || !selectedDetail.analysis) return;
                  const duration = selectedDetail.duration_seconds || 0;
                  let fullText = "";
                  if (selectedDetail.transcripts) {
                    selectedDetail.transcripts.forEach(seg => { fullText += " " + (seg.text || ""); });
                  }
                  const sc = getScorecardData(selectedDetail.analysis, duration, fullText);
                  const b64 = await exportScorecardPDF(selectedDetail, selectedDetail.analysis, sc, duration, true);
                  setEmailModalData({ pdfBase64: b64, pdfFilename: `QA_Report_${selectedDetail.id}.pdf` });
                  setShowEmailModal(true);
                }}
                style={{ background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)', fontWeight: 600 }}
                title="Email Report"
              >
                <Mail size={13} style={{ marginRight: '4px' }} /> 
                <span className="btn-text" style={{ color: 'white' }}>Email</span>
              </button>

              <button 
                className="btn-secondary"
                onClick={async () => {
                  if (!selectedDetail || !selectedDetail.analysis) return;
                  const duration = selectedDetail.duration_seconds || 0;
                  let fullText = "";
                  if (selectedDetail.transcripts) {
                    selectedDetail.transcripts.forEach(seg => { fullText += " " + (seg.text || ""); });
                  }
                  const sc = getScorecardData(selectedDetail.analysis, duration, fullText);
                  await exportScorecardPDF(selectedDetail, selectedDetail.analysis, sc, duration);
                }}
                style={{ background: 'var(--primary)', color: 'white', borderColor: 'var(--primary)', fontWeight: 600 }}
                title="Export PDF"
              >
                <Download size={13} style={{ marginRight: '4px' }} /> 
                <span className="btn-text" style={{ color: 'white' }}>PDF</span>
              </button>
            </div>
          </div>

          <AudioPlayer audioUrl={selectedDetail.audio_url ? `${selectedDetail.audio_url}?v=${selectedDetail.status}` : null} duration={selectedDetail.duration_seconds} />

          {selectedDetail.status === 'FAILED' ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '48px', color: 'red', gap: '16px' }}>
              <AlertCircle size={48} />
              <span style={{ fontWeight: 600, fontSize: '1rem' }}>Voice Analysis Pipeline Failed</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', maxWidth: '400px', marginBottom: '16px' }}>
                {selectedDetail.error_message || "An error occurred during speech-to-text processing or diarization. Please try uploading the file again."}
              </span>
              <button 
                className="btn btn-primary"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/v1/recordings/reprocess/${selectedDetail.id}`, { method: 'POST' });
                    if (res.ok) {
                      showAlert("Recording queued for reprocessing!", "success");
                      setTimeout(() => window.location.reload(), 1500);
                    } else {
                      showAlert("Failed to queue reprocessing.", "error");
                    }
                  } catch (err) {
                    showAlert("Error queuing reprocessing.", "error");
                  }
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 500 }}
              >
                <Activity size={18} /> Reprocess Recording
              </button>
            </div>
          ) : selectedDetail.status !== 'COMPLETED' ? (
            <div className={`dual-pane-workspace ${!showTranscript || selectedDetail.status !== 'ANALYZING' ? 'no-transcript' : ''}`} style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: isMobileOrTablet ? 'column' : 'row' }}>
              {showTranscript && selectedDetail.status === 'ANALYZING' && (
                <TranscriptView transcripts={selectedDetail.transcripts} wordTimestamps={selectedWordTimestamps} showAlert={showAlert} />
              )}
              <PipelineProgress status={selectedDetail.status} title={selectedDetail.title} />
            </div>
          ) : (
            <div className={`dual-pane-workspace ${!showTranscript ? 'no-transcript' : ''}`} style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: isMobileOrTablet ? 'column' : 'row' }}>
              {showTranscript && (
                <TranscriptView transcripts={selectedDetail.transcripts} wordTimestamps={selectedWordTimestamps} showAlert={showAlert} />
              )}
              {!showTranscript && (
                <LLMInsightsPanel analysis={selectedDetail.analysis} recording={selectedDetail} showAlert={showAlert} />
              )}
            </div>
          )}
        </>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '12px', padding: '24px' }}>
          {isMobileOrTablet && (
            <button 
              className="btn-secondary" 
              onClick={() => setActiveMobilePanel('two')}
              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}
            >
              <ChevronLeft size={16} /> Back to recordings
            </button>
          )}
          {(() => {
            const hasProcessing = filteredAgentRecordings.some(r => r.status !== 'COMPLETED' && r.status !== 'FAILED');
            const hasReady = filteredAgentRecordings.some(r => r.status === 'COMPLETED' || r.status === 'FAILED');
            if (hasProcessing && !hasReady) {
              return (
                <div style={{ animation: 'pulse 1.5s infinite', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
                  <span>Processing agent recordings...</span>
                </div>
              );
            }
            return (
              <>
                <Mic size={32} style={{ color: 'var(--border-light)' }} />
                <span>Select a recording from the middle pane to view analytics.</span>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
