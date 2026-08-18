import React, { useState } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';

export default function AddAgentModal({ existingAgentNames = [], departments = [], onClose, onAdd }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');

  const toTitleCase = (str) => {
    return str.split(' ').filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  const handleNameChange = (e) => {
    const newName = e.target.value;
    setName(newName);
    setNameError('');
    setError('');
    
    if (existingAgentNames.includes(toTitleCase(newName.trim()))) {
      setNameError("Name already exists");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    setError('');
    
    const cleanName = toTitleCase(name.trim());
    const cleanEmail = email.trim();
    const cleanDept = department.trim();

    if (!cleanName || !cleanEmail || !cleanDept) {
      setError("Please fill all the mandatory parameters.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (existingAgentNames.includes(cleanName)) {
      setNameError("Name already exists");
      return;
    }

    onAdd({
      name: cleanName,
      email: cleanEmail,
      department: cleanDept
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '400px' }}>
        <div className="modal-header">
          <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={18} style={{ color: 'var(--primary)' }} /> Add New Agent
          </span>
          <button className="btn-secondary" style={{ padding: '4px 8px' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <datalist id="add-agent-dept-list">
            {departments.map((dept, index) => (
              <option key={index} value={dept} />
            ))}
          </datalist>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Enter the agent's details below to create a new profile.
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '0.8rem', background: 'rgba(239,68,68,0.07)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Full Name *</label>
              <input
                type="text"
                placeholder="e.g. John Doe"
                value={name}
                onChange={handleNameChange}
                onKeyDown={handleKeyDown}
                autoFocus
                style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
              />
              {nameError && <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px' }}>{nameError}</div>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Email *</label>
              <input
                type="email"
                placeholder="e.g. john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Department *</label>
              <input
                type="text"
                list="add-agent-dept-list"
                placeholder="e.g. Sales"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border-light)', background: 'var(--bg-app)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSubmit}>
              Create Agent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
