import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodePanel = ({ file, repoUrl, token, onClose, onHide, sidebarWidth = 360, onResizeSidebar }) => {
  const [explanation, setExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [provider, setProvider] = useState('gemini');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiInput, setShowApiInput] = useState(false);
  const [commits, setCommits] = useState([]);
  const [showCommits, setShowCommits] = useState(false);
  const panelRef = useRef(null);
  const codeRef = useRef(null);
  const [codeHeight, setCodeHeight] = useState(() => {
    const saved = Number(localStorage.getItem('codePaneHeight'));
    return Number.isFinite(saved) && saved >= 120 ? saved : 220;
  });
  const [explanationHeight, setExplanationHeight] = useState(() => {
    const saved = Number(localStorage.getItem('explanationPaneHeight'));
    return Number.isFinite(saved) && saved >= 120 ? saved : 240;
  });

  useEffect(() => {
    // Load saved keys from localStorage per provider
    const saved = localStorage.getItem(`ai-key-${provider}`);
    if (saved) setApiKey(saved);
  }, [provider]);

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.__onResizeSidebar = onResizeSidebar;
    }
  }, [onResizeSidebar]);

  useEffect(() => { localStorage.setItem('codePaneHeight', String(codeHeight)); }, [codeHeight]);
  useEffect(() => { localStorage.setItem('explanationPaneHeight', String(explanationHeight)); }, [explanationHeight]);

  const startVResize = (e) => {
    const startY = e.clientY;
    const panelH = panelRef.current?.getBoundingClientRect().height || 600;
    const startH = codeRef.current?.getBoundingClientRect().height || codeHeight;
    const minH = 120;
    const maxH = Math.max(minH, panelH - 180);
    const onMove = (ev) => {
      const delta = ev.clientY - startY;
      const next = Math.min(maxH, Math.max(minH, Math.round(startH + delta)));
      setCodeHeight(next);
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const startVResizeExplain = (e) => {
    const startY = e.clientY;
    const panelH = panelRef.current?.getBoundingClientRect().height || 600;
    const startH = explanationHeight;
    const minH = 120;
    const maxH = Math.max(minH, panelH - 180);
    const onMove = (ev) => {
      const delta = ev.clientY - startY;
      const next = Math.min(maxH, Math.max(minH, Math.round(startH + delta)));
      setExplanationHeight(next);
    };
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleExplain = async (context) => {
    if (!apiKey) {
      setShowApiInput(true);
      setExplanation('Please enter your API Key to get an explanation.');
      return;
    }
    setShowApiInput(false);
    setIsExplaining(true);
    setExplanation('🧠 Thinking...');

    try {
      const response = await axios.post('http://localhost:3001/api/explain', { 
        code: file.content, 
        context,
        apiKey,
        provider,
        model
      });
      setExplanation(response.data.explanation);
    } catch (error) {
      setExplanation(`Sorry, an error occurred. ${error.response?.data?.message || ''}`);
    } finally {
      setIsExplaining(false);
    }
  };

  const fetchCommits = async () => {
    if (!file?.path) return;
    try {
      const resp = await axios.post('http://localhost:3001/api/commits', { repoUrl, token, filepath: file.path });
      setCommits(resp.data);
      setShowCommits(true);
    } catch (e) {
      console.error(e);
    }
  };

  const saveKey = () => {
    if (apiKey) localStorage.setItem(`ai-key-${provider}`, apiKey);
    setShowApiInput(false);
  };

  if (!file) {
    return (
    <aside ref={panelRef} className="sidebar right-sidebar" style={{ width: sidebarWidth, position:'relative' }}>
        <h2 className="sidebar-title">Selected Node Info</h2>
        <div className="node-info-placeholder">
          <p>Select a file or directory to see details.</p>
        </div>
        <div className="resizer" onMouseDown={(e)=>startResize(e)} />
      </aside>
    );
  }

  return (
  <aside ref={panelRef} className="sidebar right-sidebar" style={{ width: sidebarWidth, position:'relative' }}>
     <button onClick={onClose} className="close-button" title="Clear selection">&times;</button>
     {onHide && (
      <button className="minimize-button" onClick={onHide} title="Hide panel">⟩</button>
     )}
      <h2 className="sidebar-title">{file.path}</h2>

      <div className="node-info">
        <p><strong>Type:</strong> {file.type || 'Unknown'}</p>
        <p><strong>SHA:</strong> {file.sha?.substring(0, 10) || 'N/A'}</p>
      </div>

      <div ref={codeRef} className="code-preview" style={{ height: codeHeight, maxHeight: 'none' }}>
        {file.isBinary ? (
          <div style={{ padding: '0.75rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>This file appears to be binary ({file.mime || 'unknown'}). Preview is disabled.</div>
            {file.base64 && (
              <a
                href={`data:${file.mime || 'application/octet-stream'};base64,${file.base64}`}
                download={file.path?.split('/').pop() || 'download'}
                className="explain-button"
              >
                Download
              </a>
            )}
          </div>
        ) : (
          <SyntaxHighlighter language="javascript" style={atomDark} customStyle={{ margin: 0, background: '#1f2937', fontSize: '0.8em' }}>
            {file.content || 'No content to display for this item.'}
          </SyntaxHighlighter>
        )}
      </div>
      <div className="h-resizer" onMouseDown={startVResize} title="Drag to resize" />
      
      {file.type === 'File' && (
        <div className="explanation-section">
          <div className="ai-selectors" style={{ display: 'flex', gap: '0.5rem' }}>
            <select value={provider} onChange={(e)=>setProvider(e.target.value)} className="api-key-input">
              <option value="gemini">Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="grok">Grok</option>
            </select>
            <input value={model} onChange={(e)=>setModel(e.target.value)} placeholder="Model (optional)" className="api-key-input" />
          </div>
          <button onClick={() => handleExplain('file')} disabled={isExplaining || file.content === 'Loading...'} className="explain-button">
            {isExplaining ? 'Thinking...' : 'Explain with AI'}
          </button>
          
          {showApiInput && (
            <div className="api-key-input-container">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={provider === 'gemini' ? 'Enter Gemini API Key' : provider === 'openai' ? 'Enter OpenAI API Key' : 'Enter xAI (Grok) API Key'}
                className="api-key-input"
              />
              <button onClick={saveKey} className="explain-button" style={{ marginTop: '0.5rem' }}>Save Key</button>
            </div>
          )}

          {explanation && (
            <>
              <div className="h-resizer" onMouseDown={startVResizeExplain} title="Drag to resize" />
              <div className="explanation-box" style={{ height: explanationHeight, maxHeight: 'none', overflowY: 'auto' }}>
                {explanation}
              </div>
            </>
          )}

          <button className="explain-button" onClick={fetchCommits}>View File History</button>
          {showCommits && (
            <div className="explanation-box" style={{ maxHeight: '200px' }}>
              {(commits || []).map(c => (
                <div key={c.sha} style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 600 }}>{c.commit?.author?.name} • {new Date(c.commit?.author?.date).toLocaleString()}</div>
                  <div style={{ color: '#9ca3af' }}>{c.commit?.message}</div>
                </div>
              ))}
              {(!commits || commits.length === 0) && <div>No history available.</div>}
            </div>
          )}
        </div>
      )}
      <div className="resizer" onMouseDown={(e)=>startResize(e)} />
    </aside>
  );
};

export default CodePanel;

// --- Resize support ---
function startResize(e){
  const panel = e.currentTarget.parentElement;
  const startX = e.clientX;
  const startWidth = panel.getBoundingClientRect().width;
  const onMove = (ev)=>{
    const delta = startX - ev.clientX; // dragging left increases width
    const newW = startWidth + delta;
    const cb = panel?.__onResizeSidebar;
    if (typeof cb === 'function') cb(newW);
  };
  const onUp = ()=>{ window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
}