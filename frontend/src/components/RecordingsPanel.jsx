import React from 'react';
import { ChevronLeft, Search, Calendar, ArrowDownUp, Download, Plus, Copy } from 'lucide-react';
import DatePicker from 'react-datepicker';
import { getScoreColor } from '../utils/scoreUtils';
import RecordingsTable from './RecordingsTable';
import OverallAnalytics, { generateAnalyticsPDF } from './OverallAnalytics';
import { exportAgentRecordingsCSV } from './LLMInsightsPanel';

export default function RecordingsPanel({
  logic, stats
}) {
  return (
    <div className="panel-two" style={{ width: logic.isMobileOrTablet ? '100%' : `${logic.panel2Width}px`, flexShrink: logic.isMobileOrTablet ? 1 : 0, flexGrow: logic.isMobileOrTablet ? 1 : 0, minHeight: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-light)', background: 'var(--bg-app)' }}>
      <div className="panel-header" style={{ padding: '16px', borderBottom: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {logic.isMobileOrTablet && (
          <button 
            className="btn-secondary" 
            onClick={() => logic.setActiveMobilePanel('one')}
            style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', alignSelf: 'flex-start', marginBottom: '4px' }}
          >
            <ChevronLeft size={14} /> Back to Agents
          </button>
        )}
        <div className="agent-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h3 className="agent-name-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', opacity: logic.customAgents.find(a => a.name === logic.selectedAgent)?.disabled ? 0.6 : 1, flexWrap: 'wrap' }}>
              {logic.selectedAgent && stats.agentStats.find(a => a.name === logic.selectedAgent)?.trendColor && stats.agentStats.find(a => a.name === logic.selectedAgent).trendColor !== 'var(--text-muted)' && (
                 <div 
                   onClick={() => logic.setShowTrendModal(true)}
                   title="Click to view full performance chart"
                   style={{ 
                     width: '12px', 
                     height: '12px', 
                     borderRadius: '50%', 
                     backgroundColor: stats.agentStats.find(a => a.name === logic.selectedAgent).trendColor,
                     cursor: 'pointer',
                     boxShadow: '0 0 4px rgba(0,0,0,0.2)'
                   }} 
                 />
              )}
              {logic.selectedAgent || "Select Agent"}
              {logic.selectedAgent && stats.agentStats.find(a => a.name === logic.selectedAgent)?.email && !logic.customAgents.find(a => a.name === logic.selectedAgent)?.disabled && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(stats.agentStats.find(a => a.name === logic.selectedAgent).email);
                    logic.showAlert('Agent email copied to clipboard!', 'Success');
                  }}
                  title="Copy Email"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: '4px', marginLeft: '6px' }}
                >
                  <Copy size={14} />
                </button>
              )}
              {logic.customAgents.find(a => a.name === logic.selectedAgent)?.disabled && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-panel-hover)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>Inactive</span>}
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {!logic.customAgents.find(a => a.name === logic.selectedAgent)?.disabled && (
              <>
                <button 
                  className="btn-secondary" 
                  onClick={() => exportAgentRecordingsCSV(stats.filteredAgentRecordings, logic.selectedAgent)} 
                  style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}
                >
                  <Download size={12} style={{ marginRight: '4px' }} /> CSV
                </button>
                <button 
                  className="btn-secondary" 
                  onClick={() => generateAnalyticsPDF(stats.filteredAgentRecordings, logic.selectedAgent, logic.dateFilterDays, logic.customDateRange)} 
                  style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}
                >
                  <Download size={12} style={{ marginRight: '4px' }} /> PDF
                </button>
              </>
            )}
            {!logic.customAgents.find(a => a.name === logic.selectedAgent)?.disabled && (
              <button className="btn-primary" onClick={() => logic.setShowUploadModal(true)} style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}>
                <Plus size={12} style={{ marginRight: '4px' }} /> Add Calls
              </button>
            )}
          </div>
        </div>

        {/* Quick Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '8px', marginTop: '6px' }}>
          {/* Search Bar */}
          <div className="search-box">
            <Search className="search-icon" size={14} style={{ color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="search-input"
              placeholder="Search call ID, keyword..."
              value={logic.panel2SearchTerm}
              onChange={(e) => logic.setPanel2SearchTerm(e.target.value)}
              style={{ background: 'var(--bg-app)' }}
            />
          </div>
          
          {/* Sort & Date Dropdowns */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
            {/* Date Range Dropdown */}
            <div 
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Calendar size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <select 
                className="blue-dropdown"
                value={logic.dateFilterDays} 
                onChange={(e) => {
                  const val = e.target.value;
                  logic.setDateFilterDays(val === 'all' || val === 'custom' ? val : parseInt(val));
                  if (val === 'custom') {
                    logic.setShowDatePicker(true);
                  } else {
                    logic.setShowDatePicker(false);
                  }
                }}
                style={{ width: '100%', textOverflow: 'ellipsis' }}
              >
                <option value={7}>Past 7 Days</option>
                <option value={30}>Past 30 Days</option>
                <option value={90}>Past 90 Days</option>
                <option value="custom">
                  {logic.dateFilterDays === 'custom' && logic.customDateRange.start && logic.customDateRange.end
                    ? `${String(logic.customDateRange.start.getDate()).padStart(2, '0')}/${String(logic.customDateRange.start.getMonth() + 1).padStart(2, '0')}/${logic.customDateRange.start.getFullYear()} - ${String(logic.customDateRange.end.getDate()).padStart(2, '0')}/${String(logic.customDateRange.end.getMonth() + 1).padStart(2, '0')}/${logic.customDateRange.end.getFullYear()}`
                    : 'Customize'}
                </option>
              </select>
              
              {/* Custom Date Picker Popup */}
              {logic.showDatePicker && logic.dateFilterDays === 'custom' && (
                <div 
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    boxShadow: 'var(--shadow-md)',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Start Date</label>
                      <DatePicker
                        selected={logic.customDateRange.start}
                        onChange={(date) => logic.setCustomDateRange(prev => ({ ...prev, start: date }))}
                        selectsStart
                        startDate={logic.customDateRange.start}
                        endDate={logic.customDateRange.end}
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        placeholderText="dd/MM/yyyy"
                        dateFormat="dd/MM/yyyy"
                        className="date-picker-input"
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>End Date</label>
                      <DatePicker
                        selected={logic.customDateRange.end}
                        onChange={(date) => logic.setCustomDateRange(prev => ({ ...prev, end: date }))}
                        selectsEnd
                        startDate={logic.customDateRange.start}
                        endDate={logic.customDateRange.end}
                        minDate={logic.customDateRange.start}
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        placeholderText="dd/MM/yyyy"
                        dateFormat="dd/MM/yyyy"
                        className="date-picker-input"
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button 
                      className="btn-primary" 
                      style={{ padding: '4px 16px', fontSize: '0.75rem', borderRadius: '4px' }}
                      onClick={() => logic.setShowDatePicker(false)}
                    >
                      OK
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
              <ArrowDownUp size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <select 
                className="blue-dropdown"
                value={logic.panel2SortBy}
                onChange={(e) => logic.setPanel2SortBy(e.target.value)}
                style={{ width: '100%', textOverflow: 'ellipsis' }}
              >
                <option value="newest">Newest First</option>
                <option value="lowest_score">Lowest Score First</option>
                <option value="highest_score">Highest Score First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Panel 2 View Mode Toggle */}
        <div style={{ display: 'flex', background: 'var(--bg-sidebar)', borderRadius: 'var(--radius-sm)', padding: '2px', marginTop: '4px', border: '1px solid var(--border-light)' }}>
          <button 
            onClick={() => logic.setPanel2ViewMode('list')}
            style={{ 
              flex: 1, padding: '6px', fontSize: '0.82rem', fontWeight: logic.panel2ViewMode === 'list' ? 600 : 500,
              background: logic.panel2ViewMode === 'list' ? 'var(--primary)' : '#E2E8F0',
              color: logic.panel2ViewMode === 'list' ? '#ffffff' : '#1E3A8A',
              border: 'none', borderRadius: '10px',
              boxShadow: logic.panel2ViewMode === 'list' ? '0 2px 4px rgba(59,130,246,0.3)' : 'none',
              cursor: 'pointer', transition: 'all 0.2s'
            }}>
            Recordings
          </button>
          <button 
            onClick={() => logic.setPanel2ViewMode('analytics')}
            style={{ 
              flex: 1, padding: '6px', fontSize: '0.82rem', fontWeight: logic.panel2ViewMode === 'analytics' ? 600 : 500,
              background: logic.panel2ViewMode === 'analytics' ? 'var(--primary)' : '#E2E8F0',
              color: logic.panel2ViewMode === 'analytics' ? '#ffffff' : '#1E3A8A',
              border: 'none', borderRadius: '10px',
              boxShadow: logic.panel2ViewMode === 'analytics' ? '0 2px 4px rgba(59,130,246,0.3)' : 'none',
              cursor: 'pointer', transition: 'all 0.2s'
            }}>
            Analytics
          </button>
        </div>
        {stats.agentSummaryStats ? (
          <div className="agent-stats-summary-grid" style={{ 
            display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: '8px', marginTop: '6px',
            background: 'var(--bg-card)', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid #94a3b8'
          }}>
            <div style={{ flex: 1, minWidth: '50px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Calls</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>{stats.agentSummaryStats.count}</span>
            </div>
            <div style={{ flex: 1, minWidth: '50px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '1px solid #94a3b8' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Max Score</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: getScoreColor(stats.agentSummaryStats.maxScore) }}>{stats.agentSummaryStats.maxScore}</span>
            </div>
            <div style={{ flex: 1, minWidth: '50px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '1px solid #94a3b8' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Min Score</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: getScoreColor(stats.agentSummaryStats.minScore) }}>{stats.agentSummaryStats.minScore}</span>
            </div>
            <div style={{ flex: 1, minWidth: '50px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '2px', borderLeft: '1px solid #94a3b8' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Average</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: getScoreColor(stats.agentSummaryStats.avgScore) }}>{stats.agentSummaryStats.avgScore}</span>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            Select an agent to see their overview.
          </div>
        )}
      </div>

      <div className="panel-recordings-list" style={{ 
        flex: logic.panel2ViewMode === 'analytics' ? 1 : 0, 
        overflowY: logic.panel2ViewMode === 'analytics' ? 'auto' : 'hidden', 
        background: 'var(--bg-card)', borderTop: logic.panel2ViewMode === 'analytics' ? '1px solid var(--border-light)' : 'none',
        position: logic.panel2ViewMode === 'analytics' ? 'relative' : 'absolute',
        top: logic.panel2ViewMode === 'analytics' ? 'auto' : '-9999px', left: logic.panel2ViewMode === 'analytics' ? 'auto' : '-9999px',
        width: logic.panel2ViewMode === 'analytics' ? 'auto' : '100%', minWidth: logic.panel2ViewMode === 'analytics' ? 'auto' : '800px',
        opacity: logic.panel2ViewMode === 'analytics' ? 1 : 0, pointerEvents: logic.panel2ViewMode === 'analytics' ? 'auto' : 'none',
        zIndex: logic.panel2ViewMode === 'analytics' ? 1 : -1
      }}>
        <OverallAnalytics recordings={stats.filteredAgentRecordings} agentName={logic.selectedAgent} dateFilterDays={logic.dateFilterDays} customDateRange={logic.customDateRange} />
      </div>

      {logic.panel2ViewMode === 'list' && (
        <div className="panel-recordings-list" style={{ flex: 1, overflowY: 'auto' }}>
          <RecordingsTable 
            recordings={stats.filteredAgentRecordings} 
            selectedId={logic.selectedId} 
            onSelect={logic.setSelectedId} 
            isMobileOrTablet={logic.isMobileOrTablet} 
            setActiveMobilePanel={logic.setActiveMobilePanel} 
          />
        </div>
      )}
    </div>
  );
}
