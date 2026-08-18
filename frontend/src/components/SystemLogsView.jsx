import React, { useEffect, useState, useRef } from 'react';
import { 
  Terminal, RefreshCw, Search, Copy, Download, 
  ArrowDown, AlertCircle, Info, AlertTriangle, Check
} from 'lucide-react';

export default function SystemLogsView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [linesCount, setLinesCount] = useState(250);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL'); // ALL, INFO, WARNING, ERROR
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const [systemLogPath, setSystemLogPath] = useState('');
  
  const consoleEndRef = useRef(null);
  const consoleBodyRef = useRef(null);

  const fetchLogs = () => {
    setLoading(true);
    fetch(`/api/v1/recordings/logs/system?lines=${linesCount}`)
      .then(res => res.json())
      .then(data => {
        setLogs(data.logs || []);
        setSystemLogPath(data.log_path || '');
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch system logs:', err);
        setLoading(false);
      });
  };

  // Poll logs periodically
  useEffect(() => {
    fetchLogs();
    const interval = setInterval(() => {
      fetchLogs();
    }, 3000);
    return () => clearInterval(interval);
  }, [linesCount]);

  // Handle auto scroll
  useEffect(() => {
    if (autoScroll && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // Filter logs based on search and log level
  const getFilteredLogs = () => {
    return logs.filter(line => {
      const matchesSearch = line.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesLevel = true;
      if (levelFilter === 'INFO') {
        matchesLevel = line.includes('[INFO]');
      } else if (levelFilter === 'WARNING') {
        matchesLevel = line.includes('[WARNING]');
      } else if (levelFilter === 'ERROR') {
        matchesLevel = line.includes('[ERROR]');
      }
      
      return matchesSearch && matchesLevel;
    });
  };

  const handleCopy = () => {
    const textToCopy = getFilteredLogs().join('\n');
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([logs.join('\n')], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "system_logs.log";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Parse log line levels to style differently
  const formatLogLine = (line, index) => {
    let typeClass = 'log-line-info';
    let icon = <Info size={12} className="log-type-icon info-icon" />;
    
    if (line.includes('[WARNING]')) {
      typeClass = 'log-line-warning';
      icon = <AlertTriangle size={12} className="log-type-icon warning-icon" />;
    } else if (line.includes('[ERROR]')) {
      typeClass = 'log-line-error';
      icon = <AlertCircle size={12} className="log-type-icon error-icon" />;
    }

    return (
      <div className={`log-line ${typeClass}`} key={index}>
        <span className="log-line-number">{index + 1}</span>
        <span className="log-line-icon-wrapper">{icon}</span>
        <span className="log-line-text">{line}</span>
      </div>
    );
  };

  const filteredLogs = getFilteredLogs();

  return (
    <div className="system-logs-container">
      {/* Ribbon Bar Controls */}
      <div className="logs-header-ribbon">
        <div className="logs-title-section">
          <Terminal className="logs-title-icon" size={20} />
          <div>
            <h2 className="logs-title">System Logs</h2>
            <div className="logs-subtitle">{systemLogPath || 'Retrieving log filepath...'}</div>
          </div>
        </div>

        <div className="logs-controls-section">
          {/* Search */}
          <div className="logs-search-wrapper">
            <Search size={14} className="logs-search-icon" />
            <input 
              type="text" 
              placeholder="Search logs..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="logs-search-input"
            />
          </div>

          {/* Level Filter Buttons */}
          <div className="logs-level-selector">
            {['ALL', 'INFO', 'WARNING', 'ERROR'].map(lvl => (
              <button
                key={lvl}
                className={`logs-level-btn ${levelFilter === lvl ? 'active' : ''}`}
                onClick={() => setLevelFilter(lvl)}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Lines Select */}
          <div className="logs-lines-selector">
            <label htmlFor="lines-select">Lines: </label>
            <select 
              id="lines-select"
              value={linesCount}
              onChange={(e) => setLinesCount(Number(e.target.value))}
              className="logs-lines-dropdown"
            >
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
          </div>

          {/* Actions */}
          <button className="btn-secondary" onClick={fetchLogs} title="Refresh Logs" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} />
          </button>
          <button className="btn-secondary" onClick={handleCopy} title="Copy Filtered Logs">
            {copied ? <Check size={14} style={{ color: 'green' }} /> : <Copy size={14} />}
          </button>
          <button className="btn-secondary" onClick={handleDownload} title="Download Full Log File">
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Terminal Display */}
      <div className="console-display-wrapper">
        <div className="console-titlebar">
          <div className="console-dot red"></div>
          <div className="console-dot yellow"></div>
          <div className="console-dot green"></div>
          <div className="console-title-text">root@voice-analytics-backend:~</div>
          <div className="console-stats">
            Showing {filteredLogs.length} of {logs.length} entries
          </div>
        </div>

        <div className="console-body" ref={consoleBodyRef}>
          {filteredLogs.length > 0 ? (
            filteredLogs.map((line, idx) => formatLogLine(line, idx))
          ) : (
            <div className="console-empty">
              No matching log entries found.
            </div>
          )}
          <div ref={consoleEndRef} />
        </div>

        {/* Floating AutoScroll Toggle */}
        <button 
          className={`autoscroll-toggle-btn ${autoScroll ? 'active' : ''}`}
          onClick={() => setAutoScroll(!autoScroll)}
          title="Toggle Auto-Scroll to Bottom"
        >
          <ArrowDown size={14} />
          <span>Auto-Scroll {autoScroll ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </div>
  );
}
