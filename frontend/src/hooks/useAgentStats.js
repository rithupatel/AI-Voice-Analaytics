import { useMemo } from 'react';
import { getScorecardData } from '../components/LLMInsightsPanel';

export function useAgentStats({
  recordings,
  customAgents,
  selectedAgent,
  globalSearch,
  panel2SearchTerm,
  dateFilterDays,
  customDateRange,
  panel2Filter,
  panel2SortBy
}) {
  // Group recordings by agent name and calculate aggregate stats
  const agentStats = useMemo(() => {
    const stats = {};
    
    // Pre-populate with custom added agents
    customAgents.forEach(agent => {
      const cleanName = agent.name.trim();
      stats[cleanName] = { name: cleanName, email: agent.email || '', department: (agent.department || '').trim(), disabled: agent.disabled, count: 0, totalScore: 0, scoredCount: 0 };
    });

    recordings.forEach(rec => {
      let name = (rec.agent_name || "Unknown Agent").trim();
      
      // Case-insensitive match against existing stats
      const existingKey = Object.keys(stats).find(k => k.toLowerCase() === name.toLowerCase());
      if (existingKey) {
        name = existingKey;
      }

      if (!stats[name]) {
        stats[name] = { name, email: '', department: '', disabled: false, count: 0, totalScore: 0, scoredCount: 0 };
      }
      stats[name].count++;
      
      const analysis = rec.analysis || {};
      const hasScorecard = analysis.qa_scorecard || (analysis.empathy_score !== undefined);
      if (hasScorecard) {
        const scData = getScorecardData(analysis, rec.duration_seconds || 0);
        if (scData) {
          stats[name].totalScore += scData.finalScore;
          stats[name].scoredCount++;
        }
      }
    });
    
    return Object.values(stats).map(stat => {
      const avgScore = stat.scoredCount > 0 ? Math.round(stat.totalScore / stat.scoredCount) : 0;
      
      let trendText = "";
      let trendIcon = "";
      let trendColor = "";
      
      if (avgScore >= 90) {
         trendText = "Excellent";
         trendIcon = "📈";
         trendColor = "#10b981";
      } else if (avgScore >= 75) {
         trendText = "Stable";
         trendIcon = "➖";
         trendColor = "#f59e0b";
      } else if (avgScore > 0) {
         trendText = "Needs Improvement";
         trendIcon = "📉";
         trendColor = "#ef4444";
      } else {
         trendText = "No Data";
         trendIcon = "➖";
         trendColor = "var(--text-muted)";
      }

      return {
        name: stat.name,
        email: stat.email,
        department: stat.department,
        disabled: stat.disabled,
        count: stat.count,
        avgScore,
        trendText,
        trendIcon,
        trendColor
      };
    }).sort((a, b) => {
      const scoreA = (a.count === 0 || a.avgScore === 0) ? 200 : a.avgScore;
      const scoreB = (b.count === 0 || b.avgScore === 0) ? 200 : b.avgScore;
      if (scoreA !== scoreB) return scoreA - scoreB;
      return b.count - a.count;
    });
  }, [recordings, customAgents]);

  // Filter recordings for selected agent and date range
  const filteredAgentRecordings = useMemo(() => {
    if (!selectedAgent) return [];
    
    let list = recordings.filter(r => (r.agent_name || "Unknown Agent") === selectedAgent);
    
    // Global ribbon search filter
    if (globalSearch) {
      list = list.filter(r => {
        const titleMatch = r.title.toLowerCase().includes(globalSearch.toLowerCase());
        const fileMatch = r.original_filename.toLowerCase().includes(globalSearch.toLowerCase());
        const analysis = r.analysis || {};
        const summaryMatch = (analysis.call_summary || "").toLowerCase().includes(globalSearch.toLowerCase());
        return titleMatch || fileMatch || summaryMatch;
      });
    }

    // Panel 2 Search Bar
    if (panel2SearchTerm) {
      const q = panel2SearchTerm.toLowerCase();
      list = list.filter(r => {
        const idMatch = r.id.toLowerCase().includes(q);
        const fileMatch = r.original_filename.toLowerCase().includes(q);
        
        let transcriptMatch = false;
        if (r.transcripts) {
           transcriptMatch = r.transcripts.some(t => (t.text || "").toLowerCase().includes(q));
        } else if (r.analysis && r.analysis.aligned_transcript) {
           transcriptMatch = r.analysis.aligned_transcript.some(t => (t.text || "").toLowerCase().includes(q));
        }
        
        return idMatch || fileMatch || transcriptMatch;
      });
    }

    // Date Filter
    if (dateFilterDays === 'custom') {
      if (customDateRange.start || customDateRange.end) {
        const startDate = customDateRange.start ? new Date(customDateRange.start) : new Date('2000-01-01');
        startDate.setHours(0, 0, 0, 0);
        
        let endDate = customDateRange.end ? new Date(customDateRange.end) : new Date('2100-01-01');
        endDate.setHours(23, 59, 59, 999);
        
        list = list.filter(rec => {
          if (!rec.created_at) return false;
          const cleanedDateStr = rec.created_at.replace(' ', 'T');
          const recDate = new Date(cleanedDateStr);
          return recDate >= startDate && recDate <= endDate;
        });
      }
    } else if (dateFilterDays !== 'all') {
      const now = new Date();
      const filterDate = new Date(now.getTime() - dateFilterDays * 24 * 60 * 60 * 1000);
      
      list = list.filter(rec => {
        if (!rec.created_at) return false;
        const cleanedDateStr = rec.created_at.replace(' ', 'T');
        const recDate = new Date(cleanedDateStr);
        return recDate >= filterDate;
      });
    }

    // Filter Tags
    if (panel2Filter === 'low_qa') {
      list = list.filter(r => {
        const scData = getScorecardData(r.analysis || {}, r.duration_seconds || 0);
        return scData && scData.finalScore < 50;
      });
    } else if (panel2Filter === 'high_frustration') {
      list = list.filter(r => {
         const intents = (r.analysis || {}).speaker_intents || [];
         return intents.some(intent => {
            const f = intent.frustration_level || "";
            return f.includes("7") || f.includes("8") || f.includes("9") || f.includes("10") || f === "High";
         });
      });
    }

    // Sort By
    list = [...list].sort((a, b) => {
       if (panel2SortBy === 'newest') {
          return new Date(b.created_at.replace(' ', 'T')) - new Date(a.created_at.replace(' ', 'T'));
       }
       
       const scoreA = (getScorecardData(a.analysis || {}, a.duration_seconds || 0) || {}).finalScore || 0;
       const scoreB = (getScorecardData(b.analysis || {}, b.duration_seconds || 0) || {}).finalScore || 0;
       
       if (panel2SortBy === 'lowest_score') {
          return scoreA - scoreB;
       }
       if (panel2SortBy === 'highest_score') {
          return scoreB - scoreA;
       }
       return 0;
    });

    return list;
  }, [selectedAgent, recordings, dateFilterDays, customDateRange, globalSearch, panel2SearchTerm, panel2Filter, panel2SortBy]);

  // Agent dynamic summary stats
  const agentSummaryStats = useMemo(() => {
    if (!selectedAgent) return null;
    const agentRecs = recordings.filter(r => (r.agent_name || "Unknown Agent") === selectedAgent);
    
    const count = agentRecs.length;
    if (count === 0) return { count: 0, maxScore: '-', minScore: '-', avgScore: '-' };

    let totalScore = 0;
    let scoredCount = 0;
    let maxScore = -Infinity;
    let minScore = Infinity;
    
    agentRecs.forEach(rec => {
      const analysis = rec.analysis || {};
      const hasScorecard = analysis.qa_scorecard || (analysis.empathy_score !== undefined);
      if (hasScorecard) {
        const scData = getScorecardData(analysis, rec.duration_seconds || 0);
        if (scData) {
          const score = scData.finalScore;
          totalScore += score;
          scoredCount++;
          if (score > maxScore) maxScore = score;
          if (score < minScore) minScore = score;
        }
      }
    });
    
    const avgScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0;
    
    return {
      count,
      maxScore: maxScore === -Infinity ? '-' : `${maxScore}%`,
      minScore: minScore === Infinity ? '-' : `${minScore}%`,
      avgScore: scoredCount > 0 ? `${avgScore}%` : '-'
    };
  }, [selectedAgent, recordings]);

  return { agentStats, filteredAgentRecordings, agentSummaryStats };
}
