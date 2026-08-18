import React from 'react';
import { MessageSquare, User, Clock, Copy } from 'lucide-react';

export default function TranscriptView({ transcripts, wordTimestamps = [], showAlert }) {
  const formatTime = (seconds) => {
    if (seconds === undefined || seconds === null) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!transcripts || transcripts.length === 0) {
    return (
      <div className="transcript-pane">
        <div className="pane-title">
          <MessageSquare size={16} /> Speaker Transcripts
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '20px 0' }}>
          No transcript items available yet.
        </div>
      </div>
    );
  }

  const renderSegmentText = (t) => {
    if (!wordTimestamps || wordTimestamps.length === 0) return t.text;
    
    // Find words that fall into this segment's time boundary
    // Tightened buffer to 0.1 to prevent duplicate words leaking across adjacent segments
    const segmentWords = wordTimestamps.filter(w => 
      w.start_time >= t.start_time - 0.1 && w.end_time <= t.end_time + 0.1
    );

    if (segmentWords.length === 0) return t.text;

    // Whisper's word array sometimes drops punctuation.
    // To preserve grammar in the UI, we align the original punctuated sentence text with the timestamps.
    const textWords = t.text.split(' ');
    
    if (Math.abs(textWords.length - segmentWords.length) <= 3) {
      return textWords.map((word, i) => {
        const timestampWord = segmentWords[i] || segmentWords[segmentWords.length - 1];
        if (!timestampWord) return <React.Fragment key={i}>{word} </React.Fragment>;
        
        return (
          <span 
            key={i} 
            className="word-hover" 
            title={`[${timestampWord.start_time.toFixed(2)}s - ${timestampWord.end_time.toFixed(2)}s]`}
          >
            {word}{' '}
          </span>
        );
      });
    }

    // Fallback if alignment is impossible
    return segmentWords.map((w, i) => (
      <span 
        key={i} 
        className="word-hover" 
        title={`[${w.start_time.toFixed(2)}s - ${w.end_time.toFixed(2)}s]`}
      >
        {w.word.trim()}{' '}
      </span>
    ));
  };

  return (
    <div className="transcript-pane">
      <div className="pane-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={16} /> Speaker Transcripts
        </div>
        <button
           onClick={(e) => {
             e.stopPropagation();
             const fullTranscript = transcripts.map(t => {
               const isSpeakerA = t.speaker_label === 'SPEAKER_00';
               const speaker = isSpeakerA ? 'Agent' : 'Customer';
               return `[${formatTime(t.start_time)} - ${formatTime(t.end_time)}] ${speaker}: ${t.text}`;
             }).join('\n');
             navigator.clipboard.writeText(fullTranscript);
             if (showAlert) showAlert('Transcript copied to clipboard!', 'Success');
             else alert('Transcript copied to clipboard!');
           }}
           title="Copy Transcript"
           style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
        >
          <Copy size={14} />
        </button>
      </div>
      {transcripts.map((t, idx) => {
        const isSpeakerA = t.speaker_label === 'SPEAKER_00';
        return (
          <div
            key={t.id || idx}
            className={`transcript-card ${isSpeakerA ? 'speaker-a' : 'speaker-b'}`}
          >
            <div className="speaker-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="speaker-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} /> {isSpeakerA ? 'Agent' : 'Customer'}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
                <Clock size={12} /> [{formatTime(t.start_time)} - {formatTime(t.end_time)}]
              </span>
            </div>
            <div className="transcript-text" style={{ marginTop: '6px' }}>{renderSegmentText(t)}</div>
          </div>
        );
      })}
    </div>
  );
}
