import React from 'react';
import { Mail, Mic, BarChart2, Settings, Plus, Terminal } from 'lucide-react';

export default function NavRail({ activeTab, setActiveTab, onOpenUpload }) {
  return (
    <div className="nav-rail">
      <div className="rail-brand" title="Voice Analytics Outlook Dashboard">
        VA
      </div>
      <div className="rail-menu">
        <button
          className={`rail-item ${activeTab === 'recordings' ? 'active' : ''}`}
          onClick={() => setActiveTab('recordings')}
          title="Recordings Inbox"
        >
          <Mic size={20} />
        </button>
        <button
          className={`rail-item ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
          title="Overall Analytics"
        >
          <BarChart2 size={20} />
        </button>
        <button
          className={`rail-item ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
          title="System Logs"
        >
          <Terminal size={20} />
        </button>
        <button
          className="rail-item"
          onClick={onOpenUpload}
          title="Upload New Recording"
        >
          <Plus size={20} />
        </button>
      </div>
      <div style={{ marginTop: 'auto' }}>
        <button className="rail-item" title="Settings">
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
}
