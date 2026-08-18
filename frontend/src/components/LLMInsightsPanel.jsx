import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Sparkles, HeartPulse, Target, CheckSquare, 
  Check, X, Award, AlertCircle, Phone, Mail, 
  User, ShoppingCart, DollarSign, MapPin, Truck, ChevronDown, ChevronUp,
  Maximize2, Minimize2, Download, Activity, Copy
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { getScoreColor, getScoreBadgeClass, getScoreGradeText } from '../utils/scoreUtils';

const determineSpeakerName = (intent, recording) => {
  let mappedSpeakerId = intent.speaker_label;
  if (recording?.speakers) {
    const matchedSpeaker = recording.speakers.find(s => s.display_name === intent.speaker_label || s.speaker_label === intent.speaker_label);
    if (matchedSpeaker) mappedSpeakerId = matchedSpeaker.speaker_label;
  }
  
  if (mappedSpeakerId === 'SPEAKER_00') return { isAgent: true, name: 'Agent' };
  if (mappedSpeakerId === 'SPEAKER_01') return { isAgent: false, name: 'Customer' };
  
  const rawName = (intent.display_name || intent.speaker_label || '').toLowerCase();
  const isAgent = rawName.includes('agent') || (recording?.agent_name && rawName.includes(recording.agent_name.toLowerCase()));
  return { isAgent, name: isAgent ? 'Agent' : 'Customer' };
};

// Excel Scorecard mapping
export function getScorecardData(analysis, durationSeconds, fullText) {
  if (!analysis) return null;

  const empathy = analysis.empathy_score || 0;
  const knowledge = analysis.knowledgeable_score || 0;
  const understandability = analysis.understandability_percentage || 0;
  const resolved = !!analysis.issue_resolved;
  const sentiment = analysis.overall_sentiment || 'NEUTRAL';
  const summary = (analysis.call_summary || "").toLowerCase();
  
  const isEscalated = summary.includes("escalat") || summary.includes("supervisor");
  const qa = analysis.qa_scorecard || {};

  // Read LLM scorecard values or fall back to rule-based heuristics
  const greetingVal = qa.greeting_and_verification || (understandability >= 80 ? 'Yes' : 'No');
  const activeListeningVal = qa.active_listening_and_empathy || (empathy >= 6 ? 'Yes' : 'No');
  const probingVal = qa.probing_questions || (knowledge >= 5 ? 'Yes' : 'No');
  const priorityVal = qa.validate_priority || (knowledge >= 6 ? 'Yes' : 'No');

  const troubleshootingVal = qa.accurate_troubleshooting || (knowledge >= 7 ? 'Yes' : 'No');
  const solutionAccuracyVal = qa.solution_accuracy || (resolved ? 'Yes' : 'No');
  const validEscalationVal = isEscalated ? 'No' : 'Yes';
  const useOfKbVal = 'NA';

  const p1ComplianceVal = qa.critical_p1_compliance || (sentiment !== 'NEGATIVE' ? 'Yes' : 'No');
  const ticketDocVal = qa.ticket_documentation || (knowledge >= 6 ? 'Yes' : 'No');
  const timeEntryVal = qa.time_entry_agreement || (understandability >= 75 ? 'Yes' : 'No');

  const ownershipVal = qa.ownership_of_incident || (empathy >= 7 ? 'Yes' : 'No');
  const communicationSlaVal = qa.communication_sla || (understandability >= 80 ? 'Yes' : 'No');
  const properClosingVal = qa.proper_closing_confirmation || ((resolved && sentiment === 'POSITIVE') ? 'Yes' : 'No');

  const fcrVal = qa.first_call_resolution || ((resolved && !isEscalated) ? 'Yes' : 'No');
  const thirtyMinRuleVal = qa.thirty_minute_rule || (durationSeconds < 1800 ? 'Yes' : 'No');
  const minimalTransfersVal = qa.minimal_transfers_hold || ((analysis.speaker_intents && analysis.speaker_intents.length <= 2) ? 'Yes' : 'No');

  const sections = [
    {
      title: "1. Communication & Professionalism",
      weight: 0.20,
      items: [
        { name: "Greeting & Customer Verification", weight: 0.05, score: greetingVal, comment: "Verification of caller name/details." },
        { name: "Active Listening and Empathy", weight: 0.05, score: activeListeningVal, comment: `Empathy rating: ${empathy}/10.` },
        { name: "Probing the issue", weight: 0.05, score: probingVal, comment: "Analyst asked relevant probing questions." },
        { name: "Validating Priority of the issue", weight: 0.05, score: priorityVal, comment: "Urgency validated." }
      ]
    },
    {
      title: "2. Technical Accuracy & Resolution",
      weight: 0.30,
      items: [
        { name: "Accurate troubleshooting of Issue", weight: 0.10, score: troubleshootingVal, comment: `Knowledge rating: ${knowledge}/10.` },
        { name: "Accuracy of Solution Provided (Ticket should not be reopened)", weight: 0.10, score: solutionAccuracyVal, comment: resolved ? "Core issue successfully resolved." : "Solution not finalized." },
        { name: "Valid Escalation", weight: 0.05, score: validEscalationVal, comment: isEscalated ? "Case escalated (rated low for non-resolution)." : "No escalation required (rated completely)." },
        { name: "Use of Knowledge Base - currently due to tool limitation this will be NA", weight: 0.05, score: useOfKbVal, comment: "Tool limitation default." }
      ]
    },
    {
      title: "3. Process Adherence",
      weight: 0.20,
      items: [
        { name: "Critical/P1 Compliance", weight: 0.05, score: p1ComplianceVal, comment: "Compliance with call center policies." },
        { name: "Ticket Documentation & category selection", weight: 0.10, score: ticketDocVal, comment: "Structured transcript documented." },
        { name: "Time entry & Agreement", weight: 0.05, score: timeEntryVal, comment: `Voice clarity: ${understandability}% score.` }
      ]
    },
    {
      title: "4. Customer Experience",
      weight: 0.20,
      items: [
        { name: "Ownership of Incident", weight: 0.05, score: ownershipVal, comment: "Ownership demonstrated." },
        { name: "Communication to EU/Admin/stakeholders within timeline", weight: 0.10, score: communicationSlaVal, comment: "Cadence timeline met." },
        { name: "Proper Closing & Confirmation of Satisfaction", weight: 0.05, score: properClosingVal, comment: sentiment === 'POSITIVE' ? "Customer satisfied at closure." : "Neutral closure." }
      ]
    },
    {
      title: "5. Efficiency Metrics",
      weight: 0.10,
      items: [
        { name: "First Call Resolution", weight: 0.05, score: fcrVal, comment: resolved && !isEscalated ? "Resolved on first contact." : "Requires follow-up." },
        { name: "30 minute rule - if applicable", weight: 0.03, score: thirtyMinRuleVal, comment: `Duration: ${Math.round(durationSeconds)}s.` },
        { name: "Minimal Transfers/Hold Time", weight: 0.02, score: minimalTransfersVal, comment: "Zero holds, direct agent conversation." }
      ]
    }
  ];

  let earnedPoints = 0;
  let totalWeight = 0;

  sections.forEach(sec => {
    let secEarned = 0;
    let secTotal = 0;
    let yesCount = 0;
    let nonNaCount = 0;
    
    sec.items.forEach(item => {
      // Determine percentScore
      if (item.score === 'NA') {
        item.percentScore = 'NA';
      } else {
        if (item.name === "Active Listening and Empathy") {
          item.percentScore = empathy * 10;
        } else if (item.name === "Accurate troubleshooting of Issue") {
          item.percentScore = knowledge * 10;
        } else if (item.name === "Time entry & Agreement") {
          item.percentScore = Math.round(understandability);
        } else {
          item.percentScore = item.score === 'Yes' ? 100 : 0;
        }
      }

      if (item.percentScore !== 'NA') {
        const itemWeight = item.weight;
        totalWeight += itemWeight;
        secTotal += itemWeight;
        nonNaCount++;
        
        const earned = itemWeight * (item.percentScore / 100);
        earnedPoints += earned;
        secEarned += earned;
        if (item.percentScore >= 80) {
          yesCount++;
        }
      }
    });
    
    sec.sectionScore = secTotal > 0 ? Math.round((secEarned / secTotal) * 100) : 100;
    sec.yesCount = yesCount;
    sec.nonNaCount = nonNaCount;
  });

  const finalScore = totalWeight > 0 ? (earnedPoints / totalWeight) * 100 : 100;
  return {
    sections,
    finalScore: Math.round(finalScore)
  };
}

export const exportScorecardPDF = async (recording, analysis, scorecard, duration, returnBase64 = false) => {
    if (!analysis || !scorecard) return;

    const doc = new jsPDF({ format: 'a4', unit: 'mm' });
    const pageWidth = 210;
    const pageHeight = 297;
    const marginLeft = 25;
    const marginRight = 15;
    const marginTop = 15;
    const marginBottom = 15;
    const contentWidth = pageWidth - marginLeft - marginRight; // 170mm
    
    // Header
    doc.setFont('times', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); 
    doc.text('QA Scorecard & Transcript Report', marginLeft, marginTop + 5);
    
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    
    let cursorY = marginTop + 16;
    const addText = (label, value) => {
        doc.setFont('times', 'bold');
        doc.text(label, marginLeft, cursorY);
        doc.setFont('times', 'normal');
        doc.text(value, marginLeft + 35, cursorY);
        cursorY += 6;
    };

    addText('Recording:', recording?.title || 'Unknown');
    addText('Agent Name:', recording?.agent_name || 'Unknown');
    addText('Call Date:', recording?.created_at || 'Unknown');
    addText('Duration:', `${Math.round(duration)} seconds`);
    
    cursorY += 5;
    doc.setFont('times', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(0, 90, 158);
    doc.text(`Final Quality Score: ${scorecard.finalScore}%`, marginLeft, cursorY);
    cursorY += 12;

    const checkPageBreak = (neededHeight) => {
      if (cursorY + neededHeight > pageHeight - marginBottom) {
        doc.addPage();
        cursorY = marginTop + 5;
      }
    };

    scorecard.sections.forEach((sec) => {
      checkPageBreak(25);
      
      doc.setFont('times', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(0, 90, 158);
      doc.text(`${sec.title} (Score: ${sec.sectionScore}%)`, marginLeft, cursorY);
      cursorY += 6;
      
      let tableData = [];
      sec.items.forEach(item => {
        tableData.push([
          item.name, 
          `${Math.round(item.weight * 100)}%`, 
          item.percentScore === 'NA' ? 'NA' : `${item.percentScore}%`, 
          item.comment || ''
        ]);
      });

      autoTable(doc, {
        startY: cursorY,
        margin: { left: marginLeft, right: marginRight }, 
        tableWidth: contentWidth,
        head: [['Criteria', 'Weight', 'Score', 'Notes']],
        body: tableData,
        theme: 'grid',
        styles: { 
          font: 'times',
          fontSize: 9, 
          overflow: 'linebreak', 
          valign: 'top',
          cellPadding: 1.5,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
          textColor: [40, 40, 40]
        },
        columnStyles: {
          0: { cellWidth: 75, halign: 'left' },
          1: { cellWidth: 15, halign: 'center' },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 65, halign: 'left' }
        },
        headStyles: { 
          fillColor: [240, 244, 248], 
          textColor: [15, 23, 42], 
          fontStyle: 'bold', 
          halign: 'left' 
        }
      });
      
      cursorY = doc.lastAutoTable.finalY + 12;
    });

    // 1. AI Call Summary
    if (analysis?.call_summary) {
      checkPageBreak(30);
      doc.setFont('times', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text('AI Call Summary', marginLeft, cursorY);
      doc.setFont('times', 'normal');
      cursorY += 8;
      
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      
      const lines = doc.splitTextToSize(analysis.call_summary, contentWidth - 15);
      const textHeight = lines.length * 5.5;
      checkPageBreak(textHeight + 10);
      
      doc.text(lines, marginLeft, cursorY);
      cursorY += textHeight + 8;
    }

    // 2. Agent's Emotional Parameters
    if (analysis?.speaker_intents && analysis.speaker_intents.length > 0) {
      checkPageBreak(30);
      doc.setFont('times', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text("Agent's Emotional Parameters", marginLeft, cursorY);
      doc.setFont('times', 'normal');
      cursorY += 8;
      
      doc.setFontSize(11);
      
      analysis.speaker_intents.forEach((intent, idx) => {
        let { isAgent, name: speakerName } = determineSpeakerName(intent, recording);
        if (idx === 0 && !isAgent && analysis.speaker_intents.length > 1) {
           const secondSpeaker = determineSpeakerName(analysis.speaker_intents[1], recording);
           if (!secondSpeaker.isAgent) { isAgent = true; speakerName = 'Agent'; }
        } else if (idx === 1 && isAgent && analysis.speaker_intents.length > 1) {
           const firstSpeaker = determineSpeakerName(analysis.speaker_intents[0], recording);
           if (firstSpeaker.isAgent) { isAgent = false; speakerName = 'Customer'; }
        }
        
        checkPageBreak(40);
        doc.setFont('times', 'bold');
        if (isAgent) doc.setTextColor(2, 132, 199);
        else doc.setTextColor(15, 23, 42);
        
        doc.text(`${speakerName}:`, marginLeft, cursorY);
        doc.setFont('times', 'normal');
        doc.setTextColor(50, 50, 50);
        cursorY += 6;
        
        const printIntent = (label, value) => {
          if (!value || value === "Unknown" || value === "N/A") return;
          const lines = doc.splitTextToSize(`• ${label}: ${value}`, contentWidth - 15);
          checkPageBreak(lines.length * 5.5 + 4);
          doc.text(lines, marginLeft + 5, cursorY);
          cursorY += (lines.length * 5.5) + 2;
        };
        
        printIntent('Tone', intent.emotional_state);
        printIntent('Frustration', intent.frustration_level);
        printIntent('Calmness', intent.calmness_level);
        printIntent('Perplexity', intent.perplexity_level);
        printIntent('Knowledge', intent.knowledgeability);
        printIntent('Behavior', intent.tone_behavior);
        
        cursorY += 4;
      });
    }

    // 3. Call Transcript
    if (recording?.transcripts && recording.transcripts.length > 0) {
      checkPageBreak(30);
      doc.setFont('times', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text('Call Transcript', marginLeft, cursorY);
      doc.setFont('times', 'normal');
      cursorY += 10;
      
      doc.setFontSize(11);
      
      recording.transcripts.forEach(seg => {
        const isAgent = seg.speaker_label === 'SPEAKER_00';
        const speaker = isAgent ? 'Agent' : 'Customer';
        const time = `[${seg.start_time.toFixed(1)}s]`;
        
        const splitText = doc.splitTextToSize(seg.text, contentWidth - 15);
        const textHeight = splitText.length * 5.5;
        
        checkPageBreak(textHeight + 15);
        
        doc.setFont('times', 'bold');
        if (isAgent) doc.setTextColor(2, 132, 199);
        else doc.setTextColor(15, 23, 42);
        
        doc.text(`${speaker} ${time}:`, marginLeft, cursorY);
        
        doc.setFont('times', 'normal');
        doc.setTextColor(50, 50, 50);
        
        cursorY += 5;
        doc.text(splitText, marginLeft + 5, cursorY);
        cursorY += textHeight + 6;
      });
    }

    if (returnBase64) {
      return doc.output('datauristring').split(',')[1];
    }
    doc.save(`QA_Report_${recording?.id || 'export'}.pdf`);
};

export const exportAgentRecordingsCSV = (recordings, agentName) => {
  if (!recordings || recordings.length === 0) return;

  const validRecordings = recordings.filter(r => r.status === 'COMPLETED' && r.analysis);
  if (validRecordings.length === 0) {
    alert("No completed recordings with analysis found in this timeline.");
    return;
  }

  const sampleAnalysis = validRecordings[0].analysis;
  const sampleDuration = validRecordings[0].duration_seconds || 0;
  const sampleText = (validRecordings[0].transcripts || []).map(t => t.text).join(' ');
  const sampleScorecard = getScorecardData(sampleAnalysis, sampleDuration, sampleText);
  
  if (!sampleScorecard) {
    alert("Could not generate scorecard data format.");
    return;
  }

  const headers = ['Agent Name', 'Recording Name', 'Date', 'Final Score (%)'];
  
  const sectionNames = [];
  sampleScorecard.sections.forEach(sec => {
    headers.push(`${sec.title} (%)`);
    sectionNames.push(sec.title);
  });

  const paramNames = [];
  sampleScorecard.sections.forEach(sec => {
    sec.items.forEach(item => {
      headers.push(`${item.name} (%)`);
      paramNames.push(item.name);
    });
  });

  const rows = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',')];

  validRecordings.forEach(r => {
    const agName = r.agent_name || agentName || 'Unknown';
    const title = r.title || r.original_filename || 'Unknown';
    const date = r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Unknown';
    const text = (r.transcripts || []).map(t => t.text).join(' ');
    const sc = getScorecardData(r.analysis, r.duration_seconds || 0, text);
    
    if (sc) {
      const rowData = [agName, title, date, sc.finalScore];
      
      sectionNames.forEach(secTitle => {
        const sec = sc.sections.find(s => s.title === secTitle);
        rowData.push(sec ? sec.sectionScore : 'NA');
      });
      
      const itemScores = {};
      sc.sections.forEach(sec => {
        sec.items.forEach(item => {
          itemScores[item.name] = item.percentScore;
        });
      });
      
      paramNames.forEach(pName => {
        const val = itemScores[pName];
        rowData.push(val !== undefined ? val : 'NA');
      });
      
      rows.push(rowData.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));
    }
  });

  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  const cleanAgentName = (agentName || 'Agent').replace(/[^a-z0-9]/gi, '_');
  link.setAttribute("download", `${cleanAgentName}_Scorecards.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function LLMInsightsPanel({ analysis, recording, showAlert }) {
  const [showTable, setShowTable] = useState(true);
  const [showSummary, setShowSummary] = useState(true);
  const [showIntents, setShowIntents] = useState(true);
  const [showActionItems, setShowActionItems] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!analysis) {
    if (recording?.status === 'FAILED') {
      const handleReprocess = async () => {
        try {
          const res = await fetch(`/api/v1/recordings/reprocess/${recording.id}`, { method: 'POST' });
          if (res.ok) {
            showAlert("Recording queued for reprocessing!", "success");
            setTimeout(() => window.location.reload(), 1500);
          } else {
            showAlert("Failed to queue reprocessing.", "error");
          }
        } catch (err) {
          showAlert("Error queuing reprocessing.", "error");
        }
      };

      return (
        <div className="analytics-pane" style={{ padding: '24px' }}>
          <div className="pane-title" style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={22} style={{ color: 'var(--danger, #ef4444)' }} /> Call Analysis Failed
          </div>
          <div style={{ color: 'var(--text-main)', fontSize: '0.95rem', padding: '20px', background: 'var(--bg-card-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
            <p style={{ marginBottom: '20px', color: 'var(--danger, #ef4444)', lineHeight: 1.5 }}>
              <strong>Error Details:</strong><br/>
              {recording.error_message || "The AI processing pipeline encountered a fatal error."}
            </p>
            <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
              Would you like to try processing this audio file again?
            </p>
            <button 
              className="btn btn-primary"
              onClick={handleReprocess}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 500 }}
            >
              <Activity size={18} /> Reprocess Recording
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="analytics-pane">
        <div className="pane-title" style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} style={{ color: 'var(--primary)' }} /> Call Quality Intelligence
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', padding: '12px' }}>
          Processing call analytics...
        </div>
      </div>
    );
  }

  const duration = recording?.duration_seconds || 0;
  
  let fullText = "";
  if (recording?.transcripts) {
    recording.transcripts.forEach(seg => {
      fullText += " " + (seg.text || "");
    });
  }

  const scorecard = getScorecardData(analysis, duration, fullText);
  
  const { call_summary, overall_sentiment, speaker_intents, key_action_items } = analysis;

  return (
    <div className="analytics-pane">
      <div className="pane-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} style={{ color: 'var(--primary)' }} />
          Intelligence & Analytics
        </h2>
      </div>

      {/* 1. Overall Call Quality Rating Gauge */}
      {scorecard && (
        <div className="analytics-card scorecard-summary-card" style={{ position: 'relative' }}>
          <button 
            className="btn-maximize-scorecard"
            onClick={() => setIsFullscreen(true)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'var(--bg-app)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              transition: 'all 0.2s'
            }}
            title="Maximize Scorecard"
          >
            <Maximize2 size={13} />
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
            <div className="scorecard-kpi-row" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: '16px', paddingRight: '40px' }}>
              <div style={{ 
                fontSize: '2.5rem', 
                fontWeight: 800, 
                color: 'var(--text-main)',
                lineHeight: 1
              }}>
                {scorecard.finalScore}%
              </div>
              <div className="scorecard-meta">
                <h3 style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '1.1rem' }}>Quality Assurance Grade</h3>
                <p style={{ margin: '4px 0 12px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Overall call performance based on standard QA metrics.
                </p>
                <div className="grade-badge-wrapper">
                  <span className={`grade-badge ${getScoreBadgeClass(scorecard.finalScore)}`} style={{ color: '#000000' }}>
                    {getScoreGradeText(scorecard.finalScore)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section Score Breakdown Boxes */}
          <div className="scorecard-sections-grid">
            {scorecard.sections.map((section, idx) => {
              const shortName = section.title.split('. ')[1] || section.title;
              const score = section.sectionScore;
              
              let themeClass = 'theme-danger';
              if (score >= 85) themeClass = 'theme-success';
              else if (score >= 70) themeClass = 'theme-warning';

              const radius = 20;
              const circumference = 2 * Math.PI * radius;
              const strokeDashoffset = circumference - (score / 100) * circumference;

              return (
                <div className={`scorecard-section-box ${themeClass}`} key={idx}>
                  <div className="section-box-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span className="section-box-title" title={section.title} style={{ flex: 1, marginRight: '8px' }}>{shortName}</span>
                    <div className="pictorial-percentage" style={{ position: 'relative', width: '46px', height: '46px', flexShrink: 0 }}>
                      <svg width="46" height="46" viewBox="0 0 46 46" style={{ transform: 'rotate(-90deg)' }}>
                        <circle
                          cx="23"
                          cy="23"
                          r={radius}
                          fill="transparent"
                          stroke="var(--border-light)"
                          strokeWidth="3.5"
                        />
                        <circle
                          cx="23"
                          cy="23"
                          r={radius}
                          fill="transparent"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                        />
                      </svg>
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        color: 'currentColor'
                      }}>
                        {score}%
                      </div>
                    </div>
                  </div>
                  <div className="section-box-progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${score}%` }}></div>
                  </div>
                  <div className="section-box-footer">
                    <span>{section.yesCount} of {section.nonNaCount} met</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Collapsible Excel table */}
          <button 
            className="scorecard-collapse-btn" 
            onClick={() => setShowTable(!showTable)}
          >
            <span>{showTable ? 'Hide Detailed Excel Scorecard' : 'Show Detailed Excel Scorecard'}</span>
            {showTable ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showTable && (
            <div className="excel-table-container">
              <table className="excel-scorecard-table">
                <thead>
                  <tr>
                    <th style={{ fontSize: '0.85rem' }}>Scorecard Criteria</th>
                    <th style={{ width: '100px', textAlign: 'center', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>Weight</th>
                    <th style={{ width: '100px', textAlign: 'center', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>Score</th>
                    <th style={{ fontSize: '0.85rem' }}>Audit Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {scorecard.sections.map((section, sidx) => (
                    <React.Fragment key={sidx}>
                      <tr className="excel-section-header">
                        <td colSpan={2}>{section.title.replace(/^\d+[\.\:]\s*/, '')}</td>
                        <td style={{ textAlign: 'center', color: '#ffffff' }}>{section.sectionScore}%</td>
                        <td></td>
                      </tr>
                      {section.items.map((item, idx) => (
                        <tr key={idx} className="excel-row">
                          <td className="excel-item-name" style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.name}</td>
                          <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            {Math.round(item.weight * 100)}%
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {item.percentScore === 'NA' ? (
                              <span className="excel-score-badge score-na">
                                NA
                              </span>
                            ) : (
                              <span className={`excel-score-badge ${
                                item.percentScore >= 80 ? 'score-yes' : 
                                item.percentScore >= 60 ? 'score-warning' : 'score-no'
                              }`}>
                                {item.percentScore >= 60 ? (
                                  <Check size={12} style={{ marginRight: '2px' }} />
                                ) : (
                                  <X size={12} style={{ marginRight: '2px' }} />
                                )}
                                {item.percentScore}%
                              </span>
                            )}
                          </td>
                          <td className="excel-comment">{item.comment}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  <tr className="excel-footer-row">
                    <td><strong>Average Score</strong></td>
                    <td style={{ textAlign: 'center' }}><strong>100%</strong></td>
                    <td style={{ textAlign: 'center', color: 'var(--primary)' }}>
                      <strong>{scorecard.finalScore}%</strong>
                    </td>
                    <td>Based on the weighted average of reviewed items.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. Executive Call Summary */}
      <div className="analytics-card">
        <div 
          className="analytics-card-title collapsible-header" 
          onClick={() => setShowSummary(!showSummary)}
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} style={{ color: 'var(--primary)' }} /> 
            <span>Executive Call Summary</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={(e) => { 
                e.stopPropagation(); 
                navigator.clipboard.writeText(call_summary || ''); 
                if (showAlert) showAlert('Copied to clipboard!', 'Success');
                else alert('Copied to clipboard!');
              }}
              title="Copy Summary"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
            >
              <Copy size={14} />
            </button>
            {showSummary ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
        {showSummary && (
          <div className="summary-text" style={{ marginTop: '10px' }}>{call_summary || 'No summary generated.'}</div>
        )}
      </div>

      {/* 4. Customer Sentiment */}
      <div className="analytics-card">
        <div className="analytics-card-title">
          <HeartPulse size={16} style={{ color: '#10b981' }} /> Call Sentiment
        </div>
        <div style={{ marginTop: '10px' }}>
          <span className={`sentiment-badge sentiment-${overall_sentiment || 'NEUTRAL'}`}>
            ● {overall_sentiment || 'NEUTRAL'}
          </span>
        </div>
      </div>

      {/* 5. Speaker Intent Profiles */}
      <div className="analytics-card">
        <div 
          className="analytics-card-title collapsible-header" 
          onClick={() => setShowIntents(!showIntents)}
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Target size={16} style={{ color: '#f59e0b' }} /> 
            <span>Speaker Trait & Intent Profiles</span>
          </div>
          {showIntents ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        {showIntents && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
            {speaker_intents && speaker_intents.length > 0 ? (
              speaker_intents.map((item, idx) => {
                let { isAgent, name: speakerName } = determineSpeakerName(item, recording);
                if (idx === 0 && !isAgent && speaker_intents.length > 1) {
                   const secondSpeaker = determineSpeakerName(speaker_intents[1], recording);
                   if (!secondSpeaker.isAgent) { isAgent = true; speakerName = 'Agent'; }
                } else if (idx === 1 && isAgent && speaker_intents.length > 1) {
                   const firstSpeaker = determineSpeakerName(speaker_intents[0], recording);
                   if (firstSpeaker.isAgent) { isAgent = false; speakerName = 'Customer'; }
                }

                return (
                <div key={idx} className="intent-item">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div className="intent-speaker" style={{ fontWeight: 600, color: isAgent ? 'var(--primary)' : 'var(--text-main)' }}>
                      {speakerName}
                    </div>
                    {item.confidence_level && (
                      <span className="conf-tag" style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: item.confidence_level === 'HIGH' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                        color: item.confidence_level === 'HIGH' ? '#34d399' : '#fbbf24',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        Confidence: {item.confidence_level}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                    {item.emotional_state && (
                      <span style={{ fontSize: '0.72rem', background: 'var(--bg-app)', color: 'var(--text-main)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        Tone: <strong>{item.emotional_state}</strong>
                      </span>
                    )}
                    {item.frustration_level && item.frustration_level !== "Unknown" && item.frustration_level !== "N/A" && (
                      <span style={{ fontSize: '0.72rem', background: 'var(--bg-app)', color: 'var(--text-main)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        Frustration: <strong>{item.frustration_level}</strong>
                      </span>
                    )}
                    {item.calmness_level && item.calmness_level !== "Unknown" && item.calmness_level !== "N/A" && (
                      <span style={{ fontSize: '0.72rem', background: 'var(--bg-app)', color: 'var(--text-main)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        Calmness: <strong>{item.calmness_level}</strong>
                      </span>
                    )}
                    {item.perplexity_level && item.perplexity_level !== "Unknown" && item.perplexity_level !== "N/A" && (
                      <span style={{ fontSize: '0.72rem', background: 'var(--bg-app)', color: 'var(--text-main)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        Perplexity: <strong>{item.perplexity_level}</strong>
                      </span>
                    )}
                    {item.knowledgeability && (
                      <span style={{ fontSize: '0.72rem', background: 'var(--bg-app)', color: 'var(--text-main)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        Knowledge: <strong>{item.knowledgeability}</strong>
                      </span>
                    )}
                    {item.tone_behavior && (
                      <span style={{ fontSize: '0.72rem', background: 'var(--bg-app)', color: 'var(--text-main)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        Behavior: <strong>{item.tone_behavior}</strong>
                      </span>
                    )}
                  </div>

                  <div className="intent-title" style={{ fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px' }}>
                    Primary Goal: {item.primary_intent}
                  </div>
                  {item.key_points && item.key_points.length > 0 && (
                    <ul className="bullet-list" style={{ paddingLeft: '16px', margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {item.key_points.map((pt, pidx) => (
                        <li key={pidx}>{pt}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No intent profile data.</div>
            )}
          </div>
        )}
      </div>

      {/* 6. Action Items */}
      {key_action_items && key_action_items.length > 0 && (
        <div className="analytics-card">
          <div 
            className="analytics-card-title collapsible-header" 
            onClick={() => setShowActionItems(!showActionItems)}
            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckSquare size={16} style={{ color: '#38bdf8' }} /> 
              <span>Action Items & Commitments</span>
            </div>
            {showActionItems ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
          {showActionItems && (
            <ul className="bullet-list" style={{ marginTop: '10px' }}>
              {key_action_items.map((act, idx) => (
                <li key={idx}>{act}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {/* Fullscreen Scorecard Modal */}
      {isFullscreen ? createPortal(
        <div className="scorecard-fullscreen-overlay">
          <div className="scorecard-fullscreen-modal">
            <div className="fullscreen-modal-header">
              <div className="fullscreen-header-title">
                <Award size={20} style={{ color: 'var(--primary)' }} />
                <h2>QA Scorecard Evaluation</h2>
              </div>
               <button 
                 className="btn-minimize-scorecard"
                 onClick={() => setIsFullscreen(false)}
                 style={{
                   background: 'rgba(0, 0, 0, 0.05)',
                   border: 'none',
                   color: 'var(--text-main)',
                   cursor: 'pointer',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   width: '32px',
                   height: '32px',
                   borderRadius: '50%',
                   transition: 'all 0.2s',
                   padding: 0
                 }}
                 title="Minimize Scorecard"
               >
                 <Minimize2 size={16} />
               </button>
            </div>
            
            <div className="fullscreen-modal-body">
              <div className="fullscreen-kpi-summary">
                <div className="scorecard-circle large-circle">
                  <span className="score-num large-num">{scorecard.finalScore}%</span>
                  <span className="score-label large-label">Quality Score</span>
                </div>
                <div className="fullscreen-meta">
                  <h3>Service Desk Quality Grade</h3>
                  <p style={{ margin: '4px 0 12px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Evaluated against the Service Desk Call Review standard.
                  </p>
                  <div className="grade-badge-wrapper">
                    <span className={`grade-badge ${getScoreBadgeClass(scorecard.finalScore)}`} style={{ fontSize: '0.85rem', padding: '6px 14px', color: '#000000' }}>
                      {getScoreGradeText(scorecard.finalScore)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section Score Breakdown Boxes (Fullscreen) */}
              <div className="scorecard-sections-grid fullscreen-grid" style={{ marginBottom: '24px' }}>
                {scorecard.sections.map((section, idx) => {
                  const shortName = section.title.split('. ')[1] || section.title;
                  const score = section.sectionScore;
                  
                  let themeClass = 'theme-danger';
                  if (score >= 85) themeClass = 'theme-success';
                  else if (score >= 70) themeClass = 'theme-warning';

                  const radius = 16;
                  const circumference = 2 * Math.PI * radius;
                  const strokeDashoffset = circumference - (score / 100) * circumference;

                  return (
                    <div className={`scorecard-section-box ${themeClass}`} key={idx}>
                      <div className="section-box-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span className="section-box-title" title={section.title} style={{ flex: 1, marginRight: '8px' }}>{shortName}</span>
                        <div className="pictorial-percentage" style={{ position: 'relative', width: '40px', height: '40px', flexShrink: 0 }}>
                          <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
                            <circle
                              cx="20"
                              cy="20"
                              r={radius}
                              fill="transparent"
                              stroke="var(--border-light)"
                              strokeWidth="3.5"
                            />
                            <circle
                              cx="20"
                              cy="20"
                              r={radius}
                              fill="transparent"
                              stroke="currentColor"
                              strokeWidth="3.5"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                              style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                            />
                          </svg>
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            color: 'currentColor'
                          }}>
                            {score}%
                          </div>
                        </div>
                      </div>
                      <div className="section-box-progress-bar">
                        <div className="progress-bar-fill" style={{ width: `${score}%` }}></div>
                      </div>
                      <div className="section-box-footer">
                        <span>{section.yesCount} of {section.nonNaCount} met</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="excel-table-container fullscreen-table-container">
                <table className="excel-scorecard-table fullscreen-table">
                  <thead>
                    <tr>
                      <th style={{ fontSize: '0.85rem' }}>Scorecard Criteria</th>
                      <th style={{ width: '100px', textAlign: 'center', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>Weight</th>
                      <th style={{ width: '100px', textAlign: 'center', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>Score</th>
                      <th style={{ fontSize: '0.85rem' }}>Audit Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scorecard.sections.map((section, sidx) => (
                      <React.Fragment key={sidx}>
                        <tr className="excel-section-header">
                          <td colSpan={2} style={{ fontSize: '0.85rem', padding: '12px 14px' }}>{section.title}</td>
                          <td style={{ textAlign: 'center', color: 'var(--primary)', fontSize: '0.85rem', padding: '12px 14px' }}>{section.sectionScore}%</td>
                          <td style={{ padding: '12px 14px' }}></td>
                        </tr>
                        {section.items.map((item, idx) => (
                          <tr key={idx} className="excel-row">
                            <td className="excel-item-name" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.82rem', padding: '10px 14px' }}>{item.name}</td>
                            <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '10px 14px' }}>
                              {Math.round(item.weight * 100)}%
                            </td>
                            <td style={{ textAlign: 'center', padding: '10px 14px' }}>
                              {item.percentScore === 'NA' ? (
                                <span className="excel-score-badge score-na" style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                                  NA
                                </span>
                              ) : (
                                <span className={`excel-score-badge ${
                                  item.percentScore >= 80 ? 'score-yes' : 
                                  item.percentScore >= 60 ? 'score-warning' : 'score-no'
                                }`} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                                  {item.percentScore >= 60 ? (
                                    <Check size={12} style={{ marginRight: '2px' }} />
                                  ) : (
                                    <X size={12} style={{ marginRight: '2px' }} />
                                  )}
                                  {item.percentScore}%
                                </span>
                              )}
                            </td>
                            <td className="excel-comment" style={{ fontSize: '0.82rem', padding: '10px 14px' }}>{item.comment}</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                    <tr className="excel-footer-row" style={{ background: 'var(--bg-app)' }}>
                      <td style={{ padding: '12px 14px' }}><strong>Average Score</strong></td>
                      <td style={{ textAlign: 'center', padding: '12px 14px' }}><strong>100%</strong></td>
                      <td style={{ textAlign: 'center', color: 'var(--primary)', padding: '12px 14px' }}>
                        <strong style={{ fontSize: '0.95rem' }}>{scorecard.finalScore}%</strong>
                      </td>
                      <td style={{ padding: '12px 14px' }}>Based on the weighted average of reviewed items.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      , document.body) : null}
    </div>
  );
}
