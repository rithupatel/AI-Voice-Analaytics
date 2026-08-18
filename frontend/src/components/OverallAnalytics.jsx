import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BarChart2, Smile, AlertTriangle, CheckCircle, Clock, Percent, Shield, Star, ShieldAlert, Download, X } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import RadialProgressGauge from './RadialProgressGauge';
import { getScorecardData } from './LLMInsightsPanel';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

export default function OverallAnalytics({ recordings, agentName, dateFilterDays, customDateRange }) {
  const [expandedChart, setExpandedChart] = useState(null);
  if (!recordings || recordings.length === 0) {
    return (
      <div className="overall-analytics-pane" style={{ padding: '24px', color: 'var(--text-muted)' }}>
        No analytics data available. Upload some recordings first.
      </div>
    );
  }

  const metricsMeta = {
    greeting: { label: 'Greeting Standard', weight: 0.05 },
    activeListening: { label: 'Active Listening & Empathy', weight: 0.05 },
    probing: { label: 'Probing & Information Gathering', weight: 0.05 },
    priority: { label: 'Priority Assessment', weight: 0.05 },
    troubleshooting: { label: 'Troubleshooting Steps', weight: 0.10 },
    solutionAccuracy: { label: 'Solution Accuracy', weight: 0.10 },
    validEscalation: { label: 'Valid Escalation', weight: 0.05 },
    p1Compliance: { label: 'Compliance (No Negative Sentiment)', weight: 0.05 },
    ticketDoc: { label: 'Ticket Documentation', weight: 0.10 },
    timeEntry: { label: 'Time Entry Compliance', weight: 0.05 },
    ownership: { label: 'Ownership & Accountability', weight: 0.05 },
    communicationSla: { label: 'Communication SLA', weight: 0.10 },
    properClosing: { label: 'Proper Closing', weight: 0.05 },
    fcr: { label: 'First Call Resolution', weight: 0.05 },
    thirtyMinRule: { label: '30-Minute SLA Rule', weight: 0.03 },
    minimalTransfers: { label: 'Minimal Transfers', weight: 0.02 }
  };

  // Calculate stats based on Excel Scorecard mapping
  const calculateCallScore = (rec) => {
    const analysis = rec.analysis || rec.llm_analysis || {};
    const duration = rec.duration_seconds || 0;
    
    const scorecard = getScorecardData(analysis, duration, "");
    if (!scorecard) return { final: 0, comm: 0, tech: 0, proc: 0, cx: 0, eff: 0 };
    
    return {
      final: scorecard.finalScore,
      comm: scorecard.sections[0].sectionScore,
      tech: scorecard.sections[1].sectionScore,
      proc: scorecard.sections[2].sectionScore,
      cx: scorecard.sections[3].sectionScore,
      eff: scorecard.sections[4].sectionScore
    };
  };

  const processedRecs = recordings.filter(r => r.status === 'COMPLETED');
  const totalCalls = processedRecs.length;

  if (totalCalls === 0) {
    return (
      <div className="overall-analytics-pane" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h3>No recordings in this timeline.</h3>
        <p>Please select a different date range or upload recordings.</p>
      </div>
    );
  }

  let totalScoreSum = 0;
  let totalDurationSum = 0;
  let resolvedCount = 0;
  let positiveCount = 0;
  let neutralCount = 0;
  let negativeCount = 0;

  let commSum = 0;
  let techSum = 0;
  let procSum = 0;
  let cxSum = 0;
  let effSum = 0;

  const mapQualitativeToScore = (val, isInverted = false) => {
    if (!val) return 50; // Default if not found
    
    // Parse "X/10" numerical rating
    const match = String(val).trim().match(/^(\d+)(?:\/10)?$/);
    if (match) {
      const score = parseInt(match[1], 10);
      if (!isNaN(score) && score <= 10) {
        const percentage = score * 10;
        return isInverted ? (100 - percentage) : percentage;
      }
    }

    // Fallback for older qualitative records
    const upper = String(val).toUpperCase();
    if (upper.includes("HIGH")) return isInverted ? 0 : 100;
    if (upper.includes("MEDIUM") || upper.includes("MODERATE")) return 50;
    if (upper.includes("LOW") || upper.includes("NONE")) return isInverted ? 100 : 0;
    return 50;
  };

  let frustSum = 0, calmSum = 0, perpSum = 0, knowSum = 0, sentSum = 0, behavSum = 0;
  let validEmotionCount = 0;

  processedRecs.forEach(rec => {
    const analysis = rec.analysis || rec.llm_analysis || {};
    const duration = rec.duration_seconds || 0;
    const { final, comm, tech, proc, cx, eff } = calculateCallScore(rec);
    
    totalScoreSum += final;
    totalDurationSum += duration;
    
    if (analysis.issue_resolved) resolvedCount++;
    
    const sentiment = (analysis.overall_sentiment || 'NEUTRAL').toUpperCase();
    if (sentiment === 'POSITIVE') positiveCount++;
    else if (sentiment === 'NEGATIVE') negativeCount++;
    else neutralCount++;

    commSum += comm;
    techSum += tech;
    procSum += proc;
    cxSum += cx;
    effSum += eff;

    // Emotional parameters aggregation
    const intents = analysis.speaker_intents || [];
    const agentIntent = intents.find(item => {
      const name = (item.display_name || '').toLowerCase();
      return !(name.includes('customer') || name.includes('client') || name.includes('caller'));
    }) || intents[0];
    
    if (agentIntent) {
      frustSum += mapQualitativeToScore(agentIntent.frustration_level, true);
      calmSum += mapQualitativeToScore(agentIntent.calmness_level, false);
      perpSum += mapQualitativeToScore(agentIntent.perplexity_level, true);
      knowSum += mapQualitativeToScore(agentIntent.knowledgeability, false);
      behavSum += mapQualitativeToScore(agentIntent.tone_behavior, false);
      sentSum += mapQualitativeToScore(agentIntent.emotional_state, false);

      validEmotionCount++;
    }
  });

  const avgQualityScore = Math.round(totalScoreSum / totalCalls);
  const avgDuration = Math.round(totalDurationSum / totalCalls);
  const resolutionRate = Math.round((resolvedCount / totalCalls) * 100);

  const avgComm = Math.round(commSum / totalCalls);
  const avgTech = Math.round(techSum / totalCalls);
  const avgProc = Math.round(procSum / totalCalls);
  const avgCx = Math.round(cxSum / totalCalls);
  const avgEff = Math.round(effSum / totalCalls);

  const avgFrust = validEmotionCount > 0 ? Math.round(frustSum / validEmotionCount) : 50;
  const avgCalm = validEmotionCount > 0 ? Math.round(calmSum / validEmotionCount) : 50;
  const avgPerp = validEmotionCount > 0 ? Math.round(perpSum / validEmotionCount) : 50;
  const avgKnow = validEmotionCount > 0 ? Math.round(knowSum / validEmotionCount) : 50;
  const avgBehav = validEmotionCount > 0 ? Math.round(behavSum / validEmotionCount) : 50;
  const avgSent = validEmotionCount > 0 ? Math.round(sentSum / validEmotionCount) : 50;

  const metricsData = [
    { subject: 'Communication\n& Professionalism', score: avgComm, fullMark: 100 },
    { subject: 'Tech Accuracy\n& Resolution', score: avgTech, fullMark: 100 },
    { subject: 'Process Adherence', score: avgProc, fullMark: 100 },
    { subject: 'Customer Experience', score: avgCx, fullMark: 100 },
    { subject: 'Efficiency Metrics', score: avgEff, fullMark: 100 },
  ];

  const emotionData = [
    { subject: 'Tone', score: avgSent, fullMark: 100 },
    { subject: 'Frustration', score: avgFrust, fullMark: 100 },
    { subject: 'Calmness', score: avgCalm, fullMark: 100 },
    { subject: 'Perplexity', score: avgPerp, fullMark: 100 },
    { subject: 'Knowledge', score: avgKnow, fullMark: 100 },
    { subject: 'Behavior', score: avgBehav, fullMark: 100 },
  ];

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="overall-analytics-pane" style={{ padding: '24px' }}>
      
      {/* Spider Graphs Row */}
      <div id="spider-graphs-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '24px' }}>
        
        {/* 5 Main Scorecard Metrics Breakdown */}
        <div 
          id="spider-graph-1"
          className="chart-card" 
          style={{ boxShadow: 'none', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', overflow: 'hidden' }}
          onClick={() => setExpandedChart({ title: 'Scorecard Breakdown', data: metricsData, stroke: '#3b82f6', label: 'Average Score (%)' })}
        >
          <div style={{ width: '100%', textAlign: 'left', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Scorecard Breakdown</h3>
          </div>
          <div style={{ width: '100%', height: '320px', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="50%" data={metricsData}>
                <PolarGrid stroke="#64748B" strokeWidth={1.5} strokeOpacity={0.8} />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={(props) => {
                    const { payload, x, y, textAnchor } = props;
                    const parts = payload.value.split('\n');
                    return (
                      <text x={x} y={y + (parts.length > 1 ? -6 : 4)} textAnchor={textAnchor} fill="#0F172A" fontSize={10} fontWeight={600}>
                        <tspan x={x} dy="0">{parts[0]}</tspan>
                        {parts[1] && <tspan x={x} dy="1.2em">{parts[1]}</tspan>}
                      </text>
                    );
                  }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Average Score (%)" dataKey="score" stroke="#1D4ED8" strokeWidth={2} fill="rgba(37, 99, 235, 0.6)" />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-light)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.85rem' }} 
                  itemStyle={{ color: '#3b82f6', fontWeight: 600 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Emotional Parameters Graph */}
        <div 
          id="spider-graph-2"
          className="chart-card" 
          style={{ boxShadow: 'none', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', overflow: 'hidden' }}
          onClick={() => setExpandedChart({ title: 'Agent Emotional Footprint', data: emotionData, stroke: '#3b82f6', label: 'Emotion Index' })}
        >
          <div style={{ width: '100%', textAlign: 'left', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Agent Emotional Footprint</h3>
          </div>
          <div style={{ width: '100%', height: '320px', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="50%" data={emotionData}>
                <PolarGrid stroke="#64748B" strokeWidth={1.5} strokeOpacity={0.8} />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={(props) => {
                    const { payload, x, y, textAnchor } = props;
                    return (
                      <text x={x} y={y + 4} textAnchor={textAnchor} fill="#0F172A" fontSize={10} fontWeight={600}>
                        {payload.value}
                      </text>
                    );
                  }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Emotion Index" dataKey="score" stroke="#1D4ED8" strokeWidth={2} fill="rgba(37, 99, 235, 0.6)" />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-light)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.85rem' }} 
                  itemStyle={{ color: '#3b82f6', fontWeight: 600 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Expanded Chart Modal */}
      {expandedChart && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
          onClick={() => setExpandedChart(null)}
        >
          <div 
            style={{
              background: 'var(--bg-card)',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '700px',
              boxShadow: 'var(--shadow-xl)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setExpandedChart(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-main)' }}>
              {expandedChart.title}
            </h2>
            <div style={{ width: '100%', height: '500px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={expandedChart.data}>
                  <PolarGrid stroke="#64748B" strokeWidth={1.5} strokeOpacity={0.8} />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={(props) => {
                      const { payload, x, y, textAnchor } = props;
                      const parts = payload.value.split('\n');
                      return (
                        <text x={x} y={y + (parts.length > 1 ? -6 : 4)} textAnchor={textAnchor} fill="#0F172A" fontSize={13} fontWeight={600}>
                          <tspan x={x} dy="0">{parts[0]}</tspan>
                          {parts[1] && <tspan x={x} dy="1.2em">{parts[1]}</tspan>}
                        </text>
                      );
                    }}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name={expandedChart.label} dataKey="score" stroke="#1D4ED8" strokeWidth={2} fill="rgba(37, 99, 235, 0.6)" />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border-light)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.9rem' }} 
                    itemStyle={{ color: expandedChart.stroke, fontWeight: 600 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>, document.body
      )}
      
      {/* Detailed Insights & Deductions removed as per user request */}
    </div>
  );
}

export const generateAnalyticsPDF = async (recordings, agentName, dateFilterDays, customDateRange) => {
  if (!recordings || recordings.length === 0) return;
  const processedRecs = recordings.filter(r => r.status === 'COMPLETED');
  const totalCalls = processedRecs.length;
  if (totalCalls === 0) return;

  let totalScoreSum = 0;
  let commSum = 0, techSum = 0, procSum = 0, cxSum = 0, effSum = 0;
  let minScore = 100;
  let maxScore = 0;

  const logs = [];

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  processedRecs.forEach((rec, idx) => {
    const analysis = rec.analysis || rec.llm_analysis || {};
    const duration = rec.duration_seconds || 0;
    const scorecard = getScorecardData(analysis, duration, "");
    
    if (scorecard) {
      const final = scorecard.finalScore;
      totalScoreSum += final;
      if (final < minScore) minScore = final;
      if (final > maxScore) maxScore = final;

      commSum += scorecard.sections[0].sectionScore;
      techSum += scorecard.sections[1].sectionScore;
      procSum += scorecard.sections[2].sectionScore;
      cxSum += scorecard.sections[3].sectionScore;
      effSum += scorecard.sections[4].sectionScore;

      logs.push([
        rec.created_at ? new Date(rec.created_at.replace(' ', 'T')).toLocaleString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'}) : 'Unknown',
        `Call ${idx + 1}`,
        `${final}%`,
        formatTime(duration),
        (analysis.overall_sentiment || 'Neutral').toUpperCase()
      ]);
    }
  });

  if (minScore === 100 && maxScore === 0) { minScore = 0; }

  const avgQualityScore = Math.round(totalScoreSum / totalCalls);
  const avgComm = Math.round(commSum / totalCalls);
  const avgTech = Math.round(techSum / totalCalls);
  const avgProc = Math.round(procSum / totalCalls);
  const avgCx = Math.round(cxSum / totalCalls);
  const avgEff = Math.round(effSum / totalCalls);

  const doc = new jsPDF();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`Agent Performance Report: ${agentName || 'Agent'}`, 14, 22);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139); // slate-500
  let timelineStr = "All Time";
  if (dateFilterDays !== 'all') {
    if (dateFilterDays === 'custom' && customDateRange?.start) {
       timelineStr = `Custom Range: ${new Date(customDateRange.start).toLocaleDateString()} to ${customDateRange.end ? new Date(customDateRange.end).toLocaleDateString() : 'Present'}`;
    } else {
       timelineStr = `Past ${dateFilterDays} Days`;
    }
  }
  doc.text(`Timeline: ${timelineStr}`, 14, 30);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36);

  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(14, 42, 196, 42);

  // Table 1: Summary Statistics
  autoTable(doc, {
    startY: 50,
    head: [['Total Calls', 'Minimum Score', 'Maximum Score', 'Average Score']],
    body: [[totalCalls.toString(), `${minScore}%`, `${maxScore}%`, `${avgQualityScore}%`]],
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] }, // Dark Slate
    styles: { fontSize: 10, cellPadding: 6, halign: 'center' }
  });

  // Table 2: Analytics Parameters
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 12,
    head: [['Scorecard Metric Breakdown', 'Average']],
    body: [
      ['1. Communication & Professionalism', `${avgComm}%`],
      ['2. Technical Accuracy & Resolution', `${avgTech}%`],
      ['3. Process Adherence', `${avgProc}%`],
      ['4. Customer Experience', `${avgCx}%`],
      ['5. Efficiency Metrics', `${avgEff}%`]
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] }, // blue-500
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: { 1: { halign: 'center', fontStyle: 'bold' } }
  });

  // Table 3: Recordings Log
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 12,
    head: [['Date & Time', 'Call Reference', 'Score', 'Duration', 'Sentiment']],
    body: logs,
    theme: 'striped',
    headStyles: { fillColor: [100, 116, 139] }, // slate-500
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: { 2: { halign: 'center', fontStyle: 'bold' }, 3: { halign: 'center' }, 4: { halign: 'center' } }
  });

  // Embed Spider Graphs if visible
  const graph1 = document.getElementById('spider-graph-1');
  const graph2 = document.getElementById('spider-graph-2');
  
  if (graph1 || graph2) {
    try {
      // Always put graphs on a dedicated new page
      doc.addPage();
      
      // Add a title for the graphs page
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text("Agent Visual Profiles", 14, 20);

      let currentY = 30;

      if (graph1) {
        const canvas1 = await html2canvas(graph1, { scale: 2, useCORS: true, logging: false });
        const imgData1 = canvas1.toDataURL('image/png');
        
        let pdfWidth1 = 150;
        let pdfHeight1 = (canvas1.height * pdfWidth1) / canvas1.width;
        if (pdfHeight1 > 110) {
          const scale = 110 / pdfHeight1;
          pdfHeight1 = 110;
          pdfWidth1 = pdfWidth1 * scale;
        }
        
        const xOffset1 = 14 + (182 - pdfWidth1) / 2;
        doc.addImage(imgData1, 'PNG', xOffset1, currentY, pdfWidth1, pdfHeight1);
        currentY += pdfHeight1 + 15;
      }

      if (graph2) {
        const canvas2 = await html2canvas(graph2, { scale: 2, useCORS: true, logging: false });
        const imgData2 = canvas2.toDataURL('image/png');
        
        let pdfWidth2 = 150;
        let pdfHeight2 = (canvas2.height * pdfWidth2) / canvas2.width;
        if (pdfHeight2 > 110) {
          const scale = 110 / pdfHeight2;
          pdfHeight2 = 110;
          pdfWidth2 = pdfWidth2 * scale;
        }
        
        const xOffset2 = 14 + (182 - pdfWidth2) / 2;
        doc.addImage(imgData2, 'PNG', xOffset2, currentY, pdfWidth2, pdfHeight2);
      }
    } catch (err) {
      console.error('Error capturing graphs for PDF:', err);
    }
  }

  doc.save(`Agent_Report_${agentName || 'export'}.pdf`);
};
