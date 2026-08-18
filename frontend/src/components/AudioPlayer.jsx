import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause } from 'lucide-react';

export default function AudioPlayer({ audioUrl, duration }) {
  const containerRef = useRef(null);
  const mediaRef = useRef(null);
  const waveSurferRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!audioUrl || !containerRef.current || !mediaRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#94a3b8',
      progressColor: 'rgba(0, 120, 212, 0.4)', // Using a color close to primary
      cursorColor: 'var(--primary)',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 60,
      normalize: true,
      media: mediaRef.current,
    });
    
    waveSurferRef.current = ws;

    const recordingIdMatch = audioUrl.match(/\/recordings\/([^\/]+)\/audio/);
    if (recordingIdMatch) {
      const recId = recordingIdMatch[1];
      fetch(`/api/v1/recordings/${recId}/peaks`)
        .then(res => res.json())
        .then(peaks => {
          if (peaks && peaks.length > 0) {
            const interleaved = new Float32Array(peaks.length * 2);
            for (let i = 0; i < peaks.length; i++) {
              interleaved[i * 2] = -peaks[i];
              interleaved[i * 2 + 1] = peaks[i];
            }
            setTimeout(() => {
              if (waveSurferRef.current) {
                waveSurferRef.current.load(audioUrl, [interleaved], duration);
              }
            }, 50);
          } else {
            ws.load(audioUrl);
          }
        })
        .catch(() => ws.load(audioUrl));
    } else {
      ws.load(audioUrl);
    }

    ws.on('ready', () => setIsReady(true));
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));
    ws.on('timeupdate', (time) => setCurrentTime(time));

    return () => ws.destroy();
  }, [audioUrl, duration]);

  if (!audioUrl) return null;

  const togglePlay = () => {
    if (waveSurferRef.current) {
      waveSurferRef.current.playPause();
    }
  };

  const handleRateChange = (e) => {
    const rate = parseFloat(e.target.value);
    setPlaybackRate(rate);
    if (waveSurferRef.current) {
      waveSurferRef.current.setPlaybackRate(rate);
    }
  };

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '8px',
      border: '1px solid var(--border-light)',
      padding: '16px 20px',
      marginBottom: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <audio ref={mediaRef} src={audioUrl} preload="metadata" style={{ display: 'none' }} />

      {/* Top Row: Play Button & Waveform */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={togglePlay}
          disabled={!isReady}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isReady ? 'pointer' : 'not-allowed',
            opacity: isReady ? 1 : 0.5,
            flexShrink: 0
          }}
        >
          {isPlaying ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: '2px' }} />}
        </button>

        <div ref={containerRef} style={{ flex: 1, minWidth: 0 }}></div>
      </div>

      {/* Bottom Row: Duration & Speed */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '4px' }}>
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#64748b' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        <select
          value={playbackRate}
          onChange={handleRateChange}
          style={{
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid var(--border-light)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          <option value={0.5}>0.5x</option>
          <option value={1}>1x</option>
          <option value={1.25}>1.25x</option>
          <option value={1.5}>1.5x</option>
          <option value={2}>2x</option>
        </select>
      </div>
    </div>
  );
}
