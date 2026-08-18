import React from 'react';
import { UploadCloud, Search, MoreVertical } from 'lucide-react';

export default function AgentSidebar({
  isMobileOrTablet,
  panel1Width,
  activeMobilePanel,
  panel3State,
  setShowAddAgentModal,
  setShowBatchAgentModal,
  departments,
  selectedDeptFilter,
  setSelectedDeptFilter,
  setNewDeptInput,
  setShowAddDeptModal,
  agentSearchQuery,
  setAgentSearchQuery,
  agentStats,
  selectedAgent,
  setSelectedAgent,
  recordings,
  setSelectedId,
  setActiveMobilePanel,
  openAgentMenu,
  setOpenAgentMenu,
  setAgentToEdit,
  handleDeleteAgent
}) {
  return (
    <div className="panel-one" style={{ width: isMobileOrTablet ? '100%' : `${panel1Width}px`, flexShrink: isMobileOrTablet ? 1 : 0, flexGrow: isMobileOrTablet ? 1 : 0, minHeight: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border-light)', background: 'var(--bg-sidebar)' }}>
      <div className="panel-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '48px' }}>
        <span className="panel-title" style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)' }}>Agents</span>
      </div>
      <div style={{ padding: '12px', borderBottom: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button 
          className="btn-primary"
          onClick={() => setShowAddAgentModal(true)}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          + Add Agent
        </button>
        <button 
          className="btn-secondary"
          onClick={() => setShowBatchAgentModal(true)}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <UploadCloud size={14} /> Batch Upload
        </button>
      </div>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-light)', display: 'flex', gap: '8px' }}>
        <select
          className="blue-dropdown"
          value={selectedDeptFilter}
          onChange={(e) => {
            if (e.target.value === '__ADD__') {
              setNewDeptInput('');
              setShowAddDeptModal(true);
            } else {
              setSelectedDeptFilter(e.target.value);
            }
          }}
          style={{ flex: 1 }}
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
          <option value="__ADD__">+ Add Department...</option>
        </select>
      </div>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-light)' }}>
        <div className="search-box">
          <Search className="search-icon" size={14} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="search-input"
            placeholder="Search agents..."
            value={agentSearchQuery}
            onChange={(e) => setAgentSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="agent-list-container" style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {(() => {
          const filteredAgents = agentStats.filter(agent => {
            const matchesSearch = agent.name.toLowerCase().startsWith(agentSearchQuery.toLowerCase());
            const matchesDept = selectedDeptFilter ? agent.department === selectedDeptFilter : true;
            return matchesSearch && matchesDept;
          });
          if (filteredAgents.length === 0) {
            return <div className="empty-panel-text" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No agents found.</div>;
          }
          const activeAgents = filteredAgents.filter(a => !a.disabled);
          const inactiveAgents = filteredAgents.filter(a => a.disabled);
          
          const renderAgent = (agent) => (
            <div 
              key={agent.name} 
              className={`agent-list-item ${selectedAgent === agent.name ? 'active-item' : ''}`}
              onClick={() => {
                setSelectedAgent(agent.name);
                const agentRecs = recordings.filter(r => (r.agent_name || "Unknown Agent") === agent.name);
                if (agentRecs.length > 0) {
                  setSelectedId(agentRecs[0].id);
                } else {
                  setSelectedId(null);
                }
                if (isMobileOrTablet) {
                  setActiveMobilePanel('two');
                }
              }}
            >
              <div className="agent-avatar" style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: agent.disabled ? 'var(--border-light)' : (agent.avgScore > 0 ? agent.trendColor : (selectedAgent === agent.name ? 'var(--primary)' : 'var(--border-light)')),
                color: agent.disabled ? 'var(--text-muted)' : (agent.avgScore > 0 ? '#ffffff' : (selectedAgent === agent.name ? '#ffffff' : 'var(--text-muted)')),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 600
              }}>
                <span>{agent.name.substring(0, 2).toUpperCase()}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0, opacity: agent.disabled ? 0.6 : 1 }}>
                <div className="item-title" style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-main)' }}>{agent.name}</div>
                <div className="agent-item-sub" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span>{agent.count} calls</span>
                  <span>•</span>
                  <span>{agent.avgScore > 0 ? `${agent.avgScore}% avg` : 'No score'}</span>
                </div>
              </div>
              
              <div style={{ position: 'relative' }}>
                {!agent.disabled && (
                  <>
                    <button 
                      className="agent-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenAgentMenu(openAgentMenu === agent.name ? null : agent.name);
                      }}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-muted)' }}
                    >
                      <MoreVertical size={14} />
                    </button>
                    {openAgentMenu === agent.name && (
                      <div className="agent-menu-dropdown" style={{
                        position: 'absolute', right: 0, top: '24px', background: 'var(--bg-panel)', border: '1px solid var(--border-light)', 
                        borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)', zIndex: 100, padding: '4px 0', minWidth: '120px'
                      }}>
                        <div 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setAgentToEdit(agentStats.find(a => a.name === agent.name) || agent);
                            setOpenAgentMenu(null);
                          }} 
                          style={{ padding: '8px 12px', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--text)' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-panel-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          Edit
                        </div>
                        <div 
                          onClick={(e) => { e.stopPropagation(); handleDeleteAgent(agent.name); }} 
                          style={{ padding: '8px 12px', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--accent-sentiment-neg)' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-panel-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          Delete
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );

          return (
            <>
              {activeAgents.length > 0 && activeAgents.map(renderAgent)}
              {inactiveAgents.length > 0 && (
                <>
                  <div style={{ padding: '16px 12px 8px 12px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Inactive Agents
                  </div>
                  {inactiveAgents.map(renderAgent)}
                </>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
