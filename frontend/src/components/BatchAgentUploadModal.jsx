import React, { useState, useEffect } from 'react';
import { X, UploadCloud, Plus, Trash2, AlertCircle, Download } from 'lucide-react';

export default function BatchAgentUploadModal({ existingAgentNames = [], departments = [], onClose, onUploadSuccess }) {
  const [activeTab, setActiveTab] = useState('csv'); // 'csv' or 'manual'
  const [error, setError] = useState('');
  
  // CSV State
  const [csvFile, setCsvFile] = useState(null);
  
  // Manual State
  const [manualRows, setManualRows] = useState([
    { name: '', email: '', department: '', error: '' }
  ]);
  const [errorCsvContent, setErrorCsvContent] = useState('');

  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [onClose]);

  const downloadTemplate = () => {
    const csvContent = "Name,Email,Department\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "agent_batch_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError("File must be a strictly .csv file.");
        setCsvFile(null);
        return;
      }
      setCsvFile(file);
      setError('');
    }
  };

  const handleManualRowChange = (index, field, value) => {
    const updated = [...manualRows];
    updated[index][field] = value;
    updated[index].error = ''; // clear error on change
    setManualRows(updated);
  };

  const addManualRow = () => {
    setManualRows([...manualRows, { name: '', email: '', department: '', error: '' }]);
  };

  const removeManualRow = (index) => {
    if (manualRows.length === 1) return;
    const updated = [...manualRows];
    updated.splice(index, 1);
    setManualRows(updated);
  };

  const handleSubmit = () => {
    setError('');
    setErrorCsvContent('');
    if (activeTab === 'csv') {
      if (!csvFile) {
        setError('Please select a CSV file first.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        
        if (lines.length < 2) {
          setError('CSV file must contain a header row and at least one data row.');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredHeaders = ['name', 'email', 'department'];
        
        const hasAllHeaders = requiredHeaders.every(req => headers.includes(req));
        if (!hasAllHeaders) {
          setError('CSV must strictly contain headers: Name, Email, Department.');
          return;
        }

        const nameIdx = headers.indexOf('name');
        const emailIdx = headers.indexOf('email');
        const deptIdx = headers.indexOf('department');

        const parsedAgents = [];
        let hasErrors = false;
        const errorRows = ['Name,Email,Department,Error']; // new clean header
        const seenNamesInCsv = new Set();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const toTitleCase = (str) => str.split(' ').filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');

        for (let i = 1; i < lines.length; i++) {
          const originalLine = lines[i];
          const columns = originalLine.split(',').map(c => c.trim());
          if (columns.length < 3) continue;

          let name = (columns[nameIdx] || '').replace(/(^"|"$)/g, '');
          let email = (columns[emailIdx] || '').replace(/(^"|"$)/g, '');
          let department = (columns[deptIdx] || '').replace(/(^"|"$)/g, '');

          const cleanName = toTitleCase(name);
          const cleanEmail = email;
          const cleanDept = department;

          let rowError = '';
          if (!cleanName || !cleanEmail || !cleanDept) {
            rowError = 'All fields (Name, Email, Department) are mandatory';
          } else if (!emailRegex.test(cleanEmail)) {
            rowError = 'Invalid email format';
          } else if (existingAgentNames.includes(cleanName)) {
            rowError = 'Name already exists in system';
          } else if (seenNamesInCsv.has(cleanName)) {
            rowError = 'Duplicate name in this file';
          } else {
            seenNamesInCsv.add(cleanName);
            parsedAgents.push({ name: cleanName, email: cleanEmail, department: cleanDept });
          }

          // Build a clean output row ignoring any old Error column
          const outputLine = `"${cleanName}","${cleanEmail}","${cleanDept}"`;
          if (rowError) {
            hasErrors = true;
            errorRows.push(`${outputLine},"${rowError}"`);
          } else {
            errorRows.push(`${outputLine},""`);
          }
        }

        if (hasErrors) {
          setError('Duplicates or errors found in the file. Please download the error file below, correct them, and re-upload.');
          setErrorCsvContent(errorRows.join('\n'));
          return;
        }

        if (parsedAgents.length === 0) {
          setError('No valid agent rows found in CSV.');
          return;
        }

        onUploadSuccess(parsedAgents);
        onClose();
      };
      
      reader.onerror = () => {
        setError('Failed to read the file.');
      };
      
      reader.readAsText(csvFile);

    } else {
      // Manual Entry Submit
      const toTitleCase = (str) => str.split(' ').filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');

      let hasError = false;
      const seenNames = new Set();
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const updatedRows = manualRows.map((row) => {
        const name = toTitleCase(row.name.trim());
        const email = row.email.trim();
        const department = row.department.trim();
        let rowError = '';

        if (!name || !email || !department) {
          rowError = 'All fields are mandatory';
          hasError = true;
        } else if (!emailRegex.test(email)) {
          rowError = 'Invalid email format';
          hasError = true;
        } else if (existingAgentNames.includes(name)) {
          rowError = 'name already exists';
          hasError = true;
        } else if (seenNames.has(name)) {
          rowError = 'duplicate in list';
          hasError = true;
        } else {
          seenNames.add(name);
        }

        return { ...row, name, email, department, error: rowError };
      });

      if (hasError) {
        setManualRows(updatedRows);
        setError('Please fix the errors in the rows below.');
        return;
      }

      onUploadSuccess(updatedRows.map(r => ({ name: r.name, email: r.email, department: r.department })));
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '550px' }}>
        <div className="modal-header">
          <span style={{ fontWeight: 600 }}>Batch Add Agents</span>
          <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', gap: '16px' }}>
            <div 
              style={{ padding: '8px 4px', cursor: 'pointer', borderBottom: activeTab === 'csv' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'csv' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600 }}
              onClick={() => { setActiveTab('csv'); setError(''); }}
            >
              CSV Upload
            </div>
            <div 
              style={{ padding: '8px 4px', cursor: 'pointer', borderBottom: activeTab === 'manual' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'manual' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600 }}
              onClick={() => { setActiveTab('manual'); setError(''); }}
            >
              Manual Entry
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(239,68,68,0.07)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '0.85rem' }}>
                <AlertCircle size={16} /> {error}
              </div>
              {errorCsvContent && (
                <button 
                  onClick={() => {
                    const blob = new Blob([errorCsvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", "agent_batch_errors.csv");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  className="btn-secondary"
                  style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: '0.75rem', borderColor: 'var(--border-light)', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Download size={14} /> Download Error CSV
                </button>
              )}
            </div>
          )}

          {/* CSV Tab */}
          {activeTab === 'csv' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Please upload a strictly formatted .csv file containing exactly these headers: <strong>Name, Email, Department</strong>.
                </div>
                <button 
                  onClick={downloadTemplate}
                  className="btn-secondary" 
                  style={{ fontSize: '0.75rem', padding: '4px 8px', whiteSpace: 'nowrap' }}
                >
                  <Download size={14} style={{ marginRight: '4px' }} /> Template
                </button>
              </div>
              <div
                className="dropzone"
                onClick={() => document.getElementById('csv-file-input').click()}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '32px 16px', background: 'var(--bg-panel)', border: '1px dashed var(--border-light)', borderRadius: 'var(--radius-md)' }}
              >
                <UploadCloud size={36} style={{ color: 'var(--primary)' }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  {csvFile ? csvFile.name : 'Click to select CSV file'}
                </div>
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={handleCsvChange}
                />
              </div>
            </div>
          )}

          {/* Manual Tab */}
          {activeTab === 'manual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
              <datalist id="departments-list">
                {departments.map((dept, index) => (
                  <option key={index} value={dept} />
                ))}
              </datalist>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Enter agent details manually below.
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1.5fr 30px', gap: '8px', fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)', paddingBottom: '4px', borderBottom: '1px solid var(--border-light)' }}>
                <div>Name *</div>
                <div>Email *</div>
                <div>Department *</div>
                <div style={{ width: '28px' }}></div>
              </div>

              {manualRows.map((row, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1.5fr 30px', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={row.name}
                    onChange={(e) => handleManualRowChange(idx, 'name', e.target.value)}
                    style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={row.email}
                    onChange={(e) => handleManualRowChange(idx, 'email', e.target.value)}
                    style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                  />
                    <input
                      type="text"
                      list="departments-list"
                      placeholder="e.g. Sales"
                      value={row.department}
                      onChange={(e) => handleManualRowChange(idx, 'department', e.target.value)}
                      style={{ padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                    />
                  <button 
                    onClick={() => removeManualRow(idx)}
                    disabled={manualRows.length === 1}
                    style={{ background: 'transparent', border: 'none', color: manualRows.length === 1 ? 'var(--border-light)' : '#ef4444', cursor: manualRows.length === 1 ? 'not-allowed' : 'pointer', padding: '4px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                  </div>
                  {row.error && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px' }}>{row.error}</div>}
                </div>
              ))}

              <button 
                onClick={addManualRow}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, alignSelf: 'flex-start', marginTop: '8px' }}
              >
                <Plus size={14} /> Add Row
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSubmit}>
              Add Agents
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
