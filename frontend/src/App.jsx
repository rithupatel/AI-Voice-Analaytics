import React, { useEffect } from 'react';
import { Grid, Terminal, Moon, Sun, X } from 'lucide-react';

import { useAppLogic } from './hooks/useAppLogic';
import { useAgentStats } from './hooks/useAgentStats';

import AgentSidebar from './components/AgentSidebar';
import RecordingsPanel from './components/RecordingsPanel';
import CallDetailsPanel from './components/CallDetailsPanel';
import PerformanceChartModal from './components/modals/PerformanceChartModal';
import UploadModal from './components/UploadModal';
import BatchAgentUploadModal from './components/BatchAgentUploadModal';
import AddAgentModal from './components/AddAgentModal';
import EditAgentModal from './components/EditAgentModal';
import Stage3JsonModal from './components/Stage3JsonModal';
import EmailModal from './components/EmailModal';
import SystemLogsView from './components/SystemLogsView';
import CustomDialog from './components/CustomDialog';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ info: errorInfo });
    // REMOVED localhost:9999 ping per user request
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#ffebee', color: '#c62828', fontFamily: 'monospace' }}>
          <h2>React Runtime Error:</h2>
          <p>{this.state.error && this.state.error.toString()}</p>
          <pre>{this.state.info && this.state.info.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const logic = useAppLogic();
  const stats = useAgentStats(logic);

  useEffect(() => {
    if (stats.agentStats.length > 0 && !logic.selectedAgent) {
      const preferred = stats.agentStats.find(a => a.name !== "Unknown Agent") || stats.agentStats[0];
      logic.setSelectedAgent(preferred.name);
    }
  }, [stats.agentStats, logic.selectedAgent, logic]);

  useEffect(() => {
    if (logic.selectedAgent && !logic.selectedId) {
      const agentRecs = logic.recordings.filter(r => (r.agent_name || "Unknown Agent") === logic.selectedAgent);
      const readyRecs = agentRecs.filter(r => r.status === 'COMPLETED' || r.status === 'FAILED');
      if (readyRecs.length > 0) logic.setSelectedId(readyRecs[0].id);
    }
  }, [logic.selectedAgent, logic.recordings, logic.selectedId, logic]);

  return (
    <ErrorBoundary>
      <div className="outlook-layout" onTouchStart={logic.handleTouchStart} onTouchMove={logic.handleTouchMove} onTouchEnd={logic.handleTouchEnd}>
        <div className="outlook-top-ribbon" style={{ position: 'relative' }}>
          <div className="ribbon-brand-section">
            <button className="ribbon-icon-btn" title="App Launcher"><Grid size={18} /></button>
          </div>
          <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', letterSpacing: '0.2px' }}>AI Voice Analytics</div>
          <div className="ribbon-actions-section">
            <button className="ribbon-icon-btn" onClick={() => logic.setShowLogsModal(true)}><Terminal size={18} /></button>
            <button className="ribbon-icon-btn" onClick={() => logic.setTheme(logic.theme === 'light' ? 'dark' : 'light')}>
              {logic.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </div>

        <div className="app-container">
          <div className="outlook-workspace" style={{ display: 'flex', flex: 1, overflow: 'hidden', width: '100%' }}>
            
            {((!logic.isMobileOrTablet && logic.panel3State !== 'maximized') || (logic.isMobileOrTablet && logic.activeMobilePanel === 'one')) && (
              <AgentSidebar {...logic} agentStats={stats.agentStats} />
            )}

            {!logic.isMobileOrTablet && logic.panel3State !== 'maximized' && (
              <div className="panel-divider" onMouseDown={logic.startResizing1} />
            )}

            {((!logic.isMobileOrTablet && logic.panel3State !== 'maximized') || (logic.isMobileOrTablet && logic.activeMobilePanel === 'two')) && (
              <RecordingsPanel logic={logic} stats={stats} />
            )}

            {!logic.isMobileOrTablet && logic.panel3State !== 'maximized' && (
              <div className="panel-divider" onMouseDown={logic.startResizing2} />
            )}

            {((!logic.isMobileOrTablet) || (logic.isMobileOrTablet && logic.activeMobilePanel === 'three')) && (
              <CallDetailsPanel {...logic} filteredAgentRecordings={stats.filteredAgentRecordings} />
            )}
            
          </div>
        </div>

        {/* Modals & Dialogs */}
        {logic.showUploadModal && <UploadModal agentName={logic.selectedAgent} onClose={() => logic.setShowUploadModal(false)} onUploadSuccess={(data) => { logic.fetchRecordings(); if (data.recording_id) logic.setSelectedId(data.recording_id); }} showAlert={logic.showAlert} />}
        {logic.showBatchAgentModal && <BatchAgentUploadModal existingAgentNames={logic.customAgents.map(a => a.name)} departments={logic.departments} onClose={() => logic.setShowBatchAgentModal(false)} onUploadSuccess={(agents) => { logic.setCustomAgents(prev => { const newAgents = [...prev]; agents.forEach(a => { const idx = newAgents.findIndex(existing => existing.name === a.name); if (idx >= 0) newAgents[idx] = a; else newAgents.push(a); logic.saveAgentToDB(a); }); return newAgents; }); logic.setShowBatchAgentModal(false); }} />}
        
        {logic.showAddDeptModal && (
          <div className="custom-dialog-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="custom-dialog-content" style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: 'var(--radius-lg)', width: '300px', border: '1px solid var(--border-light)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'var(--text-main)' }}>Add Department</h3>
              <input autoFocus type="text" placeholder="E.g. Marketing" value={logic.newDeptInput} onChange={(e) => logic.setNewDeptInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && logic.newDeptInput.trim()) { const depts = [...new Set([...logic.departments, logic.newDeptInput.trim()])]; logic.setDepartments(depts); localStorage.setItem('departments', JSON.stringify(depts)); logic.setSelectedDeptFilter(logic.newDeptInput.trim()); logic.setShowAddDeptModal(false); } else if (e.key === 'Escape') { logic.setShowAddDeptModal(false); logic.setSelectedDeptFilter(''); } }} style={{ width: '100%', padding: '8px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', marginBottom: '16px', background: 'var(--bg-app)', color: 'var(--text-main)' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}><button className="btn-secondary" onClick={() => { logic.setShowAddDeptModal(false); logic.setSelectedDeptFilter(''); }}>Cancel</button><button className="btn-primary" onClick={() => { if (logic.newDeptInput.trim()) { const depts = [...new Set([...logic.departments, logic.newDeptInput.trim()])]; logic.setDepartments(depts); localStorage.setItem('departments', JSON.stringify(depts)); logic.setSelectedDeptFilter(logic.newDeptInput.trim()); logic.setShowAddDeptModal(false); } }}>Add</button></div>
            </div>
          </div>
        )}

        {logic.showJsonModal && logic.selectedId && <Stage3JsonModal recordingId={logic.selectedId} onClose={() => logic.setShowJsonModal(false)} />}
        {logic.showEmailModal && logic.emailModalData && <EmailModal onClose={() => { logic.setShowEmailModal(false); logic.setEmailModalData(null); }} agentEmail={logic.selectedAgent ? (stats.agentStats.find(a => a.name === logic.selectedAgent)?.email || '') : ''} defaultSubject={`QA Report for ${logic.selectedAgent || 'Agent'}`} defaultBody={`Hello,\n\nPlease find the attached QA Report for the recently analyzed call.\n\nBest,\nQA Team`} pdfBase64={logic.emailModalData.pdfBase64} pdfFilename={logic.emailModalData.pdfFilename} showAlert={logic.showAlert} />}
        {logic.showTrendModal && <PerformanceChartModal agentName={logic.selectedAgent} scoredCalls={(() => { if (!logic.selectedAgent) return []; let agentRecs = logic.recordings.filter(r => (r.agent_name || "Unknown Agent") === logic.selectedAgent); if (logic.dateFilterDays !== 'all') { const filterDate = new Date(new Date().getTime() - logic.dateFilterDays * 24 * 60 * 60 * 1000); agentRecs = agentRecs.filter(r => { try { return new Date(r.created_at.replace(' ', 'T')) >= filterDate; } catch { return false; } }); } const scored = agentRecs.map(r => { const scData = r.analysis?.qa_scorecard ? { finalScore: r.analysis.qa_scorecard.reduce((a,b)=>a+b.score,0) } : null; return { id: r.id, date: r.created_at, score: scData?.finalScore }; }).filter(r => r.score !== null && r.score !== undefined); return scored.sort((a, b) => new Date(a.date.replace(' ', 'T')) - new Date(b.date.replace(' ', 'T'))); })()} onClose={() => logic.setShowTrendModal(false)} />}
        
        {logic.showAddAgentModal && <AddAgentModal existingAgentNames={stats.agentStats.map(a => a.name)} departments={logic.departments} onClose={() => logic.setShowAddAgentModal(false)} onAdd={(agentData) => { const existing = logic.customAgents.find(a => a.name === agentData.name); let finalAgentData = { ...agentData }; if (existing && existing.disabled) { finalAgentData = { ...existing, disabled: false, email: agentData.email || existing.email, department: agentData.department || existing.department }; logic.setCustomAgents(prev => prev.map(a => a.name === agentData.name ? finalAgentData : a)); } else if (!existing) { logic.setCustomAgents(prev => [...prev, agentData]); } logic.saveAgentToDB(finalAgentData); if (agentData.department && !logic.departments.includes(agentData.department)) { const newDepts = [...logic.departments, agentData.department]; logic.setDepartments(newDepts); localStorage.setItem('departments', JSON.stringify(newDepts)); } logic.setSelectedAgent(agentData.name); logic.setSelectedId(null); logic.setShowAddAgentModal(false); }} />}
        {logic.agentToEdit && <EditAgentModal agent={logic.agentToEdit} existingAgentNames={stats.agentStats.map(a => a.name).filter(n => n !== logic.agentToEdit.name)} departments={logic.departments} onClose={() => logic.setAgentToEdit(null)} onEdit={async (oldName, newAgentData) => { logic.setCustomAgents(prev => { const arr = prev.filter(a => a.name !== oldName); arr.push(newAgentData); return arr; }); logic.saveAgentToDB(newAgentData); if (oldName !== newAgentData.name) { try { await fetch(`/api/v1/recordings/agents/${encodeURIComponent(oldName)}/rename?new_name=${encodeURIComponent(newAgentData.name)}`, { method: 'PATCH' }); logic.setRecordings(prev => prev.map(rec => rec.agent_name === oldName ? { ...rec, agent_name: newAgentData.name } : rec )); if (logic.selectedAgent === oldName) logic.setSelectedAgent(newAgentData.name); } catch (e) { logic.showAlert("Agent updated locally, but backend sync failed.", "Error"); } } logic.setAgentToEdit(null); }} />}
        
        {logic.showLogsModal && (
          <div className="modal-overlay" onClick={() => logic.setShowLogsModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '850px', maxWidth: '95%', padding: '0', overflow: 'hidden' }}>
              <div className="modal-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ fontWeight: 600 }}>System Logs</span>
                <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={() => logic.setShowLogsModal(false)}><X size={16} /></button>
              </div>
              <div style={{ height: '600px', display: 'flex', flexDirection: 'column' }}><SystemLogsView /></div>
            </div>
          </div>
        )}

        <CustomDialog isOpen={logic.dialogState.isOpen} type={logic.dialogState.type} title={logic.dialogState.title} message={logic.dialogState.message} onConfirm={() => { if (logic.dialogState.onConfirm) logic.dialogState.onConfirm(); logic.closeDialog(); }} onCancel={logic.closeDialog} />
        {logic.toastMessage && <div style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', background: 'var(--text-main)', color: 'var(--bg-app)', padding: '10px 24px', borderRadius: '24px', boxShadow: 'var(--shadow-lg)', zIndex: 9999, fontSize: '0.9rem', fontWeight: 500, opacity: 0.95 }}>{logic.toastMessage}</div>}
      </div>
    </ErrorBoundary>
  );
}
