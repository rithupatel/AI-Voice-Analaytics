import { useState, useEffect } from 'react';

export function useAppLogic() {
  const [activeTab, setActiveTab] = useState('recordings');
  const [recordings, setRecordings] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [selectedWordTimestamps, setSelectedWordTimestamps] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showBatchAgentModal, setShowBatchAgentModal] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [openAgentMenu, setOpenAgentMenu] = useState(null);
  
  const [globalSearch, setGlobalSearch] = useState('');
  const [agentSearchQuery, setAgentSearchQuery] = useState('');

  const [panel1Width, setPanel1Width] = useState(() => {
    const saved = localStorage.getItem('panel1Width');
    return saved ? parseInt(saved, 10) : 260;
  });
  const [panel2Width, setPanel2Width] = useState(() => {
    const saved = localStorage.getItem('panel2Width');
    return saved ? parseInt(saved, 10) : 380;
  });
  const [selectedAgent, setSelectedAgent] = useState(() => localStorage.getItem('selectedAgent') || '');
  const [dateFilterDays, setDateFilterDays] = useState(7);
  const [customDateRange, setCustomDateRange] = useState({ start: null, end: new Date() });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customAgents, setCustomAgents] = useState([]);

  const [panel2SearchTerm, setPanel2SearchTerm] = useState('');
  const [panel2SortBy, setPanel2SortBy] = useState('newest');
  const [panel2Filter, setPanel2Filter] = useState('all');
  const [panel2ViewMode, setPanel2ViewMode] = useState('list');

  useEffect(() => { localStorage.setItem('panel1Width', panel1Width); }, [panel1Width]);
  useEffect(() => { localStorage.setItem('panel2Width', panel2Width); }, [panel2Width]);

  const [departments, setDepartments] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('departments'));
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : ['Sales', 'Tech Support'];
    } catch {
      return ['Sales', 'Tech Support'];
    }
  });
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [newDeptInput, setNewDeptInput] = useState('');

  const [activeMobilePanel, setActiveMobilePanel] = useState('one');
  const [panel3State, setPanel3State] = useState('normal');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showTrendModal, setShowTrendModal] = useState(false);
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [agentToEdit, setAgentToEdit] = useState(null);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailModalData, setEmailModalData] = useState(null);

  const [dialogState, setDialogState] = useState({ isOpen: false, type: 'alert', title: '', message: '', onConfirm: null });
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const showAlert = (message, title = 'Notification') => {
    if (title === 'Success' || message.toLowerCase().includes('copied')) {
      showToast(message);
      return;
    }
    setDialogState({ isOpen: true, type: 'alert', title, message, onConfirm: null });
  };

  const showConfirm = (message, title = 'Confirm Action', onConfirm) => {
    setDialogState({ isOpen: true, type: 'confirm', title, message, onConfirm });
  };

  const closeDialog = () => {
    setDialogState(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleDocumentClick = () => {
      setOpenAgentMenu(null);
      setShowDatePicker(false);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  const isMobileOrTablet = windowWidth < 1024;

  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

  const handleTouchStart = (e) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      if (activeMobilePanel === 'one' && selectedAgent) setActiveMobilePanel('two');
      else if (activeMobilePanel === 'two' && selectedId) setActiveMobilePanel('three');
    }
    if (isRightSwipe) {
      if (activeMobilePanel === 'three') setActiveMobilePanel('two');
      else if (activeMobilePanel === 'two') setActiveMobilePanel('one');
    }
    
    setTouchStartX(0);
    setTouchEndX(0);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowUploadModal(false);
        setShowBatchAgentModal(false);
        setShowJsonModal(false);
        setShowAddAgentModal(false);
        setShowTrendModal(false);
        setShowDatePicker(false);
        setShowAddDeptModal(false);
        setDialogState(prev => prev.isOpen ? { ...prev, isOpen: false } : prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const startResizing1 = (e) => {
    e.preventDefault();
    const startWidth = panel1Width;
    const startX = e.clientX;
    document.body.style.userSelect = 'none';
    const doDrag = (moveEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      const minP1 = 260;
      const minP3 = 450;
      const maxWidth = Math.max(minP1, windowWidth - panel2Width - minP3);
      const clampedWidth = Math.min(Math.max(minP1, newWidth), Math.min(450, maxWidth));
      setPanel1Width(clampedWidth);
    };
    const stopDrag = () => {
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  const startResizing2 = (e) => {
    e.preventDefault();
    const startWidth = panel2Width;
    const startX = e.clientX;
    document.body.style.userSelect = 'none';
    const doDrag = (moveEvent) => {
      const newWidth = startWidth + (moveEvent.clientX - startX);
      const minP2 = 320;
      const minP3 = 450; 
      const maxWidth = Math.max(minP2, windowWidth - panel1Width - minP3);
      const clampedWidth = Math.min(Math.max(minP2, newWidth), Math.min(600, maxWidth));
      setPanel2Width(clampedWidth);
    };
    const stopDrag = () => {
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  const saveAgentToDB = async (agentData) => {
    try {
      await fetch('/api/v1/recordings/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentData)
      });
    } catch(e) {
      console.error("Failed to save agent to DB:", e);
    }
  };

  const fetchAgents = () => {
    fetch('/api/v1/recordings/agents')
      .then(res => res.json())
      .then(async data => {
         let serverAgents = data.agents || [];
         try {
           const local = JSON.parse(localStorage.getItem('customAgents') || '[]');
           if (local.length > 0) {
             for (const la of local) {
                const aName = la.name || la;
                if (!serverAgents.find(sa => sa.name === aName)) {
                   const agentData = typeof la === 'string' ? { name: la, disabled: false } : la;
                   await saveAgentToDB(agentData);
                   serverAgents.push(agentData);
                }
             }
             localStorage.removeItem('customAgents');
           }
         } catch(e) {}
         setCustomAgents(serverAgents);
      })
      .catch(err => console.error('Failed to fetch agents', err));
  };

  const fetchRecordings = () => {
    fetchAgents();
    fetch('/api/v1/recordings')
      .then(res => res.json())
      .then(data => {
        const seen = new Set();
        const unique = [];
        data.forEach(rec => {
          let sig = '';
          if (rec.transcripts && rec.transcripts.length > 0) {
            const fullText = rec.transcripts.map(t => t.text || '').join('');
            sig = fullText.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 150);
          }
          const key = sig || rec.original_filename || rec.title || rec.id;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(rec);
          }
        });
        setRecordings(unique);
      })
      .catch(err => console.error('Failed to fetch recordings', err));
  };

  const fetchSelectedDetail = (id) => {
    if (!id) return;
    fetch(`/api/v1/recordings/${id}`)
      .then(res => res.json())
      .then(data => {
        setSelectedDetail(data);
      })
      .catch(err => console.error('Failed to fetch recording detail', err));
      
    fetch(`/api/v1/recordings/${id}/word-timestamps`)
      .then(res => res.json())
      .then(data => {
        setSelectedWordTimestamps(data || []);
      })
      .catch(err => console.error('Failed to fetch word timestamps', err));
  };

  useEffect(() => {
    fetchRecordings();
    const interval = setInterval(() => {
      fetchRecordings();
      if (selectedId) {
        fetchSelectedDetail(selectedId);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedDetail(null);
      return;
    }
    setLoadingDetail(true);
    fetch(`/api/v1/recordings/${selectedId}`)
      .then(res => res.json())
      .then(data => {
        setSelectedDetail(data);
        setLoadingDetail(false);
      })
      .catch(err => {
        console.error('Failed to fetch recording detail', err);
        setLoadingDetail(false);
      });

    fetch(`/api/v1/recordings/${selectedId}/word-timestamps`)
      .then(res => res.json())
      .then(data => {
        setSelectedWordTimestamps(data || []);
      })
      .catch(err => console.error('Failed to fetch word timestamps', err));
  }, [selectedId]);

  const handleDelete = () => {
    if (!selectedId) return;
    showConfirm('Are you sure you want to delete this recording?', 'Delete Recording', () => {
      fetch(`/api/v1/recordings/${selectedId}`, { method: 'DELETE' })
        .then(() => {
          setSelectedId(null);
          fetchRecordings();
        });
    });
  };

  const handleRenameAgent = (oldName) => {
    const newName = prompt(`Enter new name for ${oldName}:`, oldName);
    if (newName && newName.trim() && newName.trim() !== oldName) {
      const trimmed = newName.trim();
      fetch(`/api/v1/agents/${encodeURIComponent(oldName)}/rename?new_name=${encodeURIComponent(trimmed)}`, { method: 'PATCH' })
        .then(() => {
          setCustomAgents(prev => {
            const arr = prev.filter(a => a !== oldName);
            if (!arr.includes(trimmed)) arr.push(trimmed);
            return arr;
          });
          if (selectedAgent === oldName) setSelectedAgent(trimmed);
          fetchRecordings();
        });
    }
    setOpenAgentMenu(null);
  };

  const handleDeleteAgent = (agentName) => {
    showConfirm(
      `Are you sure you want to delete the agent "${agentName}"? They will be disabled and no new recordings can be added.`,
      'Delete Agent',
      async () => {
        setCustomAgents(prev => {
          const exists = prev.find(a => a.name === agentName);
          if (exists) return prev.map(a => a.name === agentName ? { ...a, disabled: true } : a);
          return [...prev, { name: agentName, disabled: true }];
        });
        try {
          await fetch('/api/v1/recordings/agents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: agentName, disabled: true })
          });
        } catch(e) {
          console.error("Failed to disable agent globally:", e);
        }
      }
    );
    setOpenAgentMenu(null);
  };

  useEffect(() => {
    if (selectedAgent) localStorage.setItem('selectedAgent', selectedAgent);
  }, [selectedAgent]);

  return {
    activeTab, setActiveTab,
    recordings, setRecordings,
    selectedId, setSelectedId,
    selectedDetail, setSelectedDetail,
    selectedWordTimestamps, setSelectedWordTimestamps,
    showUploadModal, setShowUploadModal,
    showBatchAgentModal, setShowBatchAgentModal,
    showJsonModal, setShowJsonModal,
    loadingDetail, setLoadingDetail,
    openAgentMenu, setOpenAgentMenu,
    globalSearch, setGlobalSearch,
    agentSearchQuery, setAgentSearchQuery,
    panel1Width, setPanel1Width,
    panel2Width, setPanel2Width,
    selectedAgent, setSelectedAgent,
    dateFilterDays, setDateFilterDays,
    customDateRange, setCustomDateRange,
    showDatePicker, setShowDatePicker,
    customAgents, setCustomAgents,
    panel2SearchTerm, setPanel2SearchTerm,
    panel2SortBy, setPanel2SortBy,
    panel2Filter, setPanel2Filter,
    panel2ViewMode, setPanel2ViewMode,
    departments, setDepartments,
    selectedDeptFilter, setSelectedDeptFilter,
    showAddDeptModal, setShowAddDeptModal,
    newDeptInput, setNewDeptInput,
    activeMobilePanel, setActiveMobilePanel,
    panel3State, setPanel3State,
    windowWidth, setWindowWidth,
    showTranscript, setShowTranscript,
    showTrendModal, setShowTrendModal,
    showAddAgentModal, setShowAddAgentModal,
    agentToEdit, setAgentToEdit,
    showLogsModal, setShowLogsModal,
    theme, setTheme,
    showEmailModal, setShowEmailModal,
    emailModalData, setEmailModalData,
    dialogState, setDialogState,
    toastMessage, setToastMessage,
    showToast, showAlert, showConfirm, closeDialog,
    isMobileOrTablet, touchStartX, touchEndX,
    handleTouchStart, handleTouchMove, handleTouchEnd,
    startResizing1, startResizing2,
    fetchAgents, saveAgentToDB, fetchRecordings, fetchSelectedDetail,
    handleDelete, handleRenameAgent, handleDeleteAgent
  };
}
