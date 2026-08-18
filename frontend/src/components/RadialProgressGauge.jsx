import React from 'react';

export default function RadialProgressGauge({ score, label, size = 120, strokeWidth = 10 }) {
  // SVG calculation
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // Calculate offset for stroke-dashoffset
  const strokeDashoffset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  // Threshold color logic
  let strokeColor = '#EF4444'; // Red for < 50%
  if (score >= 80) {
    strokeColor = '#10B981'; // Green for >= 80%
  } else if (score >= 50) {
    strokeColor = '#F59E0B'; // Amber for 50-79%
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Active progress stroke */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {/* Inner Score Label */}
        <text
          x="50%"
          y="50%"
          dy=".3em"
          textAnchor="middle"
          fontSize={`${size * 0.22}px`}
          fontWeight="700"
          fill="var(--text-main, #333)"
        >
          {Math.round(score)}%
        </text>
      </svg>
      {/* Optional sub-label */}
      {label && (
        <span style={{ marginTop: '12px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted, #6b7280)' }}>
          {label}
        </span>
      )}
    </div>
  );
}
