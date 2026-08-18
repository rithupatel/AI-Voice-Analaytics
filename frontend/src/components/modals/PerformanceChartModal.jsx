import React, { useState } from 'react';
import { X } from 'lucide-react';

const PerformanceChartModal = ({ agentName, scoredCalls, onClose }) => {
  const [activeIndex, setActiveIndex] = useState(null);
  const displayCalls = scoredCalls.slice(-7);
  const maxScore = 100;
  const width = 700;
  const height = 300;
  const paddingX = 40;
  const paddingY = 40;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Calculate coordinates
  const points = displayCalls.map((call, idx) => {
    const x = paddingX + (idx / Math.max(1, displayCalls.length - 1)) * chartWidth;
    const y = height - paddingY - (call.score / maxScore) * chartHeight;
    return { ...call, x, y };
  });

  const pathD = points.length > 0 ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}` : '';
  const areaD = points.length > 0 ? `${pathD} L ${points[points.length-1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z` : '';

  const avgScore = displayCalls.length > 0 ? Math.round(displayCalls.reduce((acc, c) => acc + c.score, 0) / displayCalls.length) : 0;
  
  let themeHex = '#3b82f6';
  if (avgScore >= 90) themeHex = '#10b981';
  else if (avgScore >= 75) themeHex = '#f59e0b';
  else if (avgScore > 0) themeHex = '#ef4444';

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div className="modal-content" style={{ background: 'var(--bg-app)', width: '750px', maxWidth: '95%', borderRadius: 'var(--radius-lg)', padding: '24px 32px', boxShadow: 'var(--shadow-xl)', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>Trend Analytics: {agentName}</h2>
            {displayCalls.length > 0 && (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                Performance across recent {displayCalls.length} calls (Avg: <span style={{ fontWeight: 700, color: themeHex }}>{avgScore}%</span>)
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-light)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s' }}><X size={18}/></button>
        </div>
        
        {displayCalls.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '1.1rem' }}>No scored calls available for this agent.</div>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '10px' }}>
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible', margin: '10px 0' }}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={themeHex} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={themeHex} stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Grid lines & Y-Axis Labels */}
              {[0, 25, 50, 75, 100].map(val => {
                const y = height - paddingY - (val / maxScore) * chartHeight;
                return (
                  <g key={val}>
                    <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="var(--border-light)" strokeWidth="1" strokeDasharray="4 6" />
                    <text x={paddingX - 10} y={y + 4} fontSize="11" fontWeight="500" fill="var(--text-muted)" textAnchor="end">{val}</text>
                  </g>
                );
              })}

              {/* X-axis Labels (Dates) - Staggered to prevent overlap */}
              {points.map((p, idx) => {
                const isHover = activeIndex === idx;
                const yOffset = idx % 2 === 0 ? 24 : 38;
                return (
                  <g key={idx}>
                    <text x={p.x} y={height - paddingY + yOffset} fontSize="11" fontWeight={isHover ? "700" : "500"} fill={isHover ? "var(--text-main)" : "var(--text-muted)"} textAnchor="middle" style={{ transition: 'all 0.2s' }}>
                      {new Date(p.date.replace(' ', 'T')).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                    </text>
                  </g>
                );
              })}

              {/* Interactive Vertical Line */}
              {activeIndex !== null && points[activeIndex] && (
                <line 
                  x1={points[activeIndex].x} 
                  y1={paddingY} 
                  x2={points[activeIndex].x} 
                  y2={height - paddingY} 
                  stroke="var(--text-muted)" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 4" 
                  opacity="0.6" 
                />
              )}

              {/* Chart Area Fill */}
              <path d={areaD} fill="url(#trendGradient)" />

              {/* Chart Line */}
              <path d={pathD} fill="none" stroke={themeHex} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

              {/* Data Points */}
              {points.map((p, idx) => {
                const pColor = p.score >= 90 ? '#10b981' : p.score >= 75 ? '#f59e0b' : '#ef4444';
                const isActive = activeIndex === idx;
                return (
                  <g 
                    key={idx} 
                    onClick={() => setActiveIndex(isActive ? null : idx)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle cx={p.x} cy={p.y} r="20" fill="transparent" />
                    <circle cx={p.x} cy={p.y} r={isActive ? "8" : "6"} fill="var(--bg-app)" stroke={pColor} strokeWidth={isActive ? "4" : "3"} style={{ transition: 'all 0.2s' }} />
                    <text x={p.x} y={p.y - (isActive ? 18 : 14)} fontSize={isActive ? "15" : "13"} fontWeight="700" fill={pColor} textAnchor="middle" style={{ transition: 'all 0.2s', opacity: isActive ? 1 : 0 }}>
                      {p.score}%
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceChartModal;
