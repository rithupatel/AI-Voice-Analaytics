import React from 'react';
import { CheckCircle2, Loader2, Clock, AlertCircle } from 'lucide-react';

export default function PipelineProgress({ status, title }) {
  const steps = [
    {
      id: 1,
      name: 'Audio Preprocessing',
      description: 'Volume leveling and 16kHz PCM Mono conversion',
      activeStatus: 'PREPROCESSING',
      doneStatuses: ['DIARIZING', 'TRANSCRIBING', 'ALIGNING', 'ANALYZING', 'COMPLETED']
    },
    {
      id: 2,
      name: 'Speaker Diarization',
      description: 'PyAnnote neural speaker diarization and turn mapping',
      activeStatus: 'DIARIZING',
      doneStatuses: ['TRANSCRIBING', 'ALIGNING', 'ANALYZING', 'COMPLETED']
    },
    {
      id: 3,
      name: 'Speech-to-Text Transcription',
      description: 'Converting dialogue using Whisper ASR pipeline',
      activeStatus: 'TRANSCRIBING',
      doneStatuses: ['ALIGNING', 'ANALYZING', 'COMPLETED']
    },
    {
      id: 4,
      name: 'Text-to-Speaker Alignment',
      description: 'Synchronizing words with precise speaker segments',
      activeStatus: 'ALIGNING',
      doneStatuses: ['ANALYZING', 'COMPLETED']
    },
    {
      id: 5,
      name: 'AI Quality Analytics & Scorecard',
      description: 'Evaluating metrics, compliance, and empathy ratings',
      activeStatus: 'ANALYZING',
      doneStatuses: ['COMPLETED']
    }
  ];

  const getPercentage = () => {
    switch (status) {
      case 'PENDING': return 5;
      case 'PREPROCESSING': return 20;
      case 'DIARIZING': return 40;
      case 'TRANSCRIBING': return 60;
      case 'ALIGNING': return 75;
      case 'ANALYZING': return 90;
      case 'COMPLETED': return 100;
      case 'FAILED': return 100;
      default: return 0;
    }
  };

  const percent = getPercentage();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      padding: '24px',
      background: 'var(--bg-card)',
      overflowY: 'auto',
      gap: '24px'
    }}>
      <div style={{
        background: 'rgba(0, 120, 212, 0.03)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)' }}>
              {title || 'Analyzing Call'}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {status === 'FAILED' ? 'Processing failed' : status === 'COMPLETED' ? 'Analysis complete' : 'Running voice analysis pipeline...'}
            </p>
          </div>
          <span style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: status === 'FAILED' ? 'red' : 'var(--primary)'
          }}>
            {status === 'FAILED' ? 'Error' : `${percent}%`}
          </span>
        </div>

        {/* Progress Bar Track */}
        <div style={{
          height: '6px',
          background: 'var(--border-light)',
          borderRadius: '3px',
          width: '100%',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            height: '100%',
            background: status === 'FAILED' ? 'red' : 'var(--primary)',
            width: `${percent}%`,
            borderRadius: '3px',
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>
      </div>

      {/* Stepper Steps */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        position: 'relative',
        paddingLeft: '12px'
      }}>
        {/* Connector Line */}
        <div style={{
          position: 'absolute',
          left: '21px',
          top: '12px',
          bottom: '24px',
          width: '2px',
          background: 'var(--border-light)',
          zIndex: 0
        }} />

        {steps.map((step, idx) => {
          const isDone = step.doneStatuses.includes(status);
          const isActive = status === step.activeStatus;
          const isFailed = status === 'FAILED' && idx === steps.findIndex(s => s.activeStatus === 'PENDING'); // Fallback if general error

          let icon = <Clock size={16} style={{ color: 'var(--text-muted)' }} />;
          let iconBg = 'var(--border-light)';
          let stepTitleColor = 'var(--text-muted)';
          let borderStyle = 'none';

          if (isDone) {
            icon = <CheckCircle2 size={16} style={{ color: '#27ae60' }} />;
            iconBg = 'rgba(39, 174, 96, 0.1)';
            stepTitleColor = 'var(--text)';
          } else if (isActive) {
            icon = <Loader2 className="spin" size={16} style={{ color: 'var(--primary)', animation: 'spin 1.5s linear infinite' }} />;
            iconBg = 'rgba(0, 120, 212, 0.1)';
            stepTitleColor = 'var(--text)';
            borderStyle = '1px solid var(--primary)';
          } else if (isFailed) {
            icon = <AlertCircle size={16} style={{ color: 'red' }} />;
            iconBg = 'rgba(255, 0, 0, 0.1)';
            stepTitleColor = 'red';
          }

          return (
            <div key={step.id} style={{
              display: 'flex',
              gap: '16px',
              position: 'relative',
              zIndex: 1,
              opacity: isDone || isActive ? 1 : 0.6,
              transition: 'opacity 0.3s ease'
            }}>
              <div style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: borderStyle,
                marginTop: '2px'
              }}>
                {icon}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: stepTitleColor
                }}>
                  {step.name}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  marginTop: '2px'
                }}>
                  {step.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
