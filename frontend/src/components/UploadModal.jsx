import React, { useState } from 'react';
import { X, UploadCloud, Loader2, CheckCircle2 } from 'lucide-react';

export default function UploadModal({ onClose, onUploadSuccess, agentName, showAlert }) {
  const [files, setFiles] = useState([]);
  const [uploadState, setUploadState] = useState('idle'); // idle | uploading | queuing | done | error
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [localAgentName, setLocalAgentName] = useState(
    agentName && agentName !== 'Select Agent' && agentName !== 'Unknown Agent' ? agentName : ''
  );

  const processSelectedFiles = (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    let hasZip = false;
    let hasAudio = false;
    
    for (const file of selectedFiles) {
      const name = file.name.toLowerCase();
      if (name.endsWith('.zip')) {
        hasZip = true;
      } else {
        hasAudio = true;
      }
    }
    
    if (hasZip && hasAudio) {
      setError("You cannot mix ZIP files and audio files. Please select only audio files, or only ZIP files.");
      setFiles([]);
    } else {
      setError('');
      setFiles(selectedFiles);
    }
  };

  const handleFileChange = (e) => {
    processSelectedFiles(Array.from(e.target.files || []));
  };

  const handleDropAudio = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files || []).filter(f => !f.name.toLowerCase().endsWith('.zip'));
    processSelectedFiles(droppedFiles);
  };

  const handleDropZip = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files || []).filter(f => f.name.toLowerCase().endsWith('.zip'));
    processSelectedFiles(droppedFiles);
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError('Please select at least one audio file.');
      return;
    }

    setUploadState('hashing');
    setError('');

    try {
      // Hashing is now handled purely on the backend to avoid freezing the UI
      // and drastically speed up the upload process for large audio files.


      setUploadState('uploading');
      setUploadProgress(0);

      const formData = new FormData();
      files.forEach(f => formData.append('files', f));

      const xhr = new XMLHttpRequest();

    // Track upload progress (bytes transferred to server)
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(percent);
        // Once 100% bytes sent, switch to "queuing" state (server is now processing)
        if (percent >= 100) {
          setUploadState('queuing');
        }
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          
          if (data.skipped > 0) {
            if (data.queued === 0) {
              setUploadState('error');
              setError(`Upload rejected: ${data.skipped === 1 ? 'This file is a duplicate and has' : `${data.skipped} duplicate files have`} already been processed.`);
              return;
            } else if (showAlert) {
              showAlert('warning', `Queued ${data.queued} file(s). Skipped ${data.skipped} duplicate(s).`);
            }
          }

          setUploadState('done');
          // Small delay so user sees success before modal closes
          setTimeout(() => {
            onUploadSuccess(data);
            onClose();
          }, 600);
        } catch (err) {
          setUploadState('error');
          setError('Failed to parse upload response.');
        }
      } else {
        setUploadState('error');
        try {
          const errData = JSON.parse(xhr.responseText);
          setError(errData.detail || 'Failed to upload file.');
        } catch (err) {
          setError('Failed to upload file.');
        }
      }
    });

    xhr.addEventListener('error', () => {
      setUploadState('error');
      setError('Network error occurred during upload.');
    });

    let url = '/api/v1/recordings/batch-upload';
    if (localAgentName && localAgentName.trim() !== '') {
      url += `?agent_name=${encodeURIComponent(localAgentName.trim())}`;
    }

    xhr.open('POST', url);
    xhr.send(formData);
    } catch (err) {
      setUploadState('error');
      setError('Failed to process or hash the file.');
    }
  };

  const isActive = uploadState === 'hashing' || uploadState === 'uploading' || uploadState === 'queuing';

  const stageLabel = () => {
    switch (uploadState) {
      case 'hashing': return 'Checking for duplicates...';
      case 'uploading': return `Uploading file... ${uploadProgress}%`;
      case 'queuing': return 'Queuing analysis pipeline on server...';
      case 'done': return 'Upload complete! Starting pipeline...';
      default: return '';
    }
  };

  return (
    <div className="modal-overlay" onClick={isActive ? undefined : onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '480px' }}>
        <div className="modal-header">
          <span style={{ fontWeight: 600 }}>Upload Audio Recording</span>
          <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose} disabled={isActive}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Drop Zones Container */}
          <div style={{ display: 'flex', gap: '16px' }}>
            {/* Audio Drop Zone */}
            <div
              className="dropzone"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDropAudio}
              onClick={() => !isActive && document.getElementById('audio-file-input').click()}
              style={{ flex: 1, pointerEvents: isActive ? 'none' : 'auto', opacity: isActive ? 0.5 : 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'var(--bg-app)', border: '1px dashed var(--border-light)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
            >
              <UploadCloud size={28} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Audio Files</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Select multiple .wav / .mp3</div>
              <input
                id="audio-file-input"
                type="file"
                multiple
                accept="audio/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                disabled={isActive}
              />
            </div>

            {/* ZIP Drop Zone */}
            <div
              className="dropzone"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDropZip}
              onClick={() => !isActive && document.getElementById('zip-file-input').click()}
              style={{ flex: 1, pointerEvents: isActive ? 'none' : 'auto', opacity: isActive ? 0.5 : 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'var(--bg-app)', border: '1px dashed var(--border-light)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
            >
              <UploadCloud size={28} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>ZIP Archives</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Upload batch .zip file</div>
              <input
                id="zip-file-input"
                type="file"
                multiple
                accept=".zip,application/zip,application/x-zip-compressed"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                disabled={isActive}
              />
            </div>
          </div>

          {/* Show selected files count */}
          {files.length > 0 && (
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', textAlign: 'center' }}>
              {files.length} file(s) selected ready for upload
            </div>
          )}

          {/* Progress Section */}
          {(uploadState === 'hashing' || uploadState === 'uploading' || uploadState === 'queuing' || uploadState === 'done') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '4px 0' }}>

              {/* Label Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {uploadState === 'done' ? (
                    <CheckCircle2 size={14} style={{ color: '#27ae60' }} />
                  ) : (
                    <Loader2 size={14} style={{ color: 'var(--primary)', animation: 'spin 1.2s linear infinite' }} />
                  )}
                  <span>{stageLabel()}</span>
                </div>
                {uploadState === 'uploading' && (
                  <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{uploadProgress}%</span>
                )}
              </div>

              {/* Progress Bar */}
              <div style={{ height: '6px', background: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden' }}>
                {uploadState === 'uploading' ? (
                  // Determinate bar while uploading
                  <div style={{
                    height: '100%',
                    background: 'var(--primary)',
                    width: `${uploadProgress}%`,
                    transition: 'width 0.15s ease',
                    borderRadius: '3px'
                  }} />
                ) : (
                  // Indeterminate animated bar while queuing / done / hashing
                  <div style={{
                    height: '100%',
                    background: uploadState === 'done' ? '#27ae60' : 'var(--primary)',
                    width: uploadState === 'done' ? '100%' : undefined,
                    animation: (uploadState === 'queuing' || uploadState === 'hashing') ? 'progressIndeterminate 1.5s infinite ease-in-out' : 'none',
                    borderRadius: '3px'
                  }} />
                )}
              </div>

              {/* Stage sub-labels */}
              {uploadState === 'queuing' && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  File received by server. Verifying audio, checking for duplicates, and dispatching pipeline...
                </div>
              )}
            </div>
          )}

          {/* Agent Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Assign to Agent(s) <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Agent A, Agent B"
              value={localAgentName}
              onChange={(e) => setLocalAgentName(e.target.value)}
              disabled={isActive}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-panel)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.8rem', background: 'rgba(239,68,68,0.07)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>{error}</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn-secondary" onClick={onClose} disabled={isActive}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSubmit} disabled={isActive || files.length === 0}>
              {uploadState === 'hashing' ? (
                <><Loader2 size={14} style={{ marginRight: '6px', animation: 'spin 1.2s linear infinite' }} /> Checking...</>
              ) : uploadState === 'uploading' ? (
                <><Loader2 size={14} style={{ marginRight: '6px', animation: 'spin 1.2s linear infinite' }} /> Uploading...</>
              ) : uploadState === 'queuing' ? (
                <><Loader2 size={14} style={{ marginRight: '6px', animation: 'spin 1.2s linear infinite' }} /> Queuing...</>
              ) : (
                'Start Pipeline'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
