import React, { useState, useCallback, useEffect } from 'react';
import RepoGraph from './components/RepoGraph';
import TreeView from './components/TreeView';
import CodePanel from './components/CodePanel'; // This will now be our right-side panel
import BackgroundFX from './components/BackgroundFX';
import { fetchRepoTree, fetchFileContent, parseRepoUrl } from './utils/githubApi';

function App() {
  const [view, setView] = useState('input'); // 'input' or 'visualizer'
  const [repoUrl, setRepoUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [repoData, setRepoData] = useState(null);
  const [status, setStatus] = useState({ message: 'Enter a repository URL to begin.', type: 'info' });
  const [isValidRepoUrl, setIsValidRepoUrl] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [currentVis, setCurrentVis] = useState('graph'); // 'graph' or 'tree'
  const [selectedFile, setSelectedFile] = useState(null);
  const [isZoomEnabled, setIsZoomEnabled] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tilt, setTilt] = useState({rx:0, ry:0});
  const [panelOpen, setPanelOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [isLayoutExpanded, setIsLayoutExpanded] = useState(false);
  const [originalSidebarWidth] = useState(360);
  const expandedSidebarWidth = 600;

  // Landing page form submission
  const handleVisualizeClick = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setRepoData(null);
    setSelectedFile(null);
    
    // Validate URL early and give a friendly message
    try {
      parseRepoUrl(repoUrl);
    } catch {
      setIsLoading(false);
      setStatus({ 
        message: 'Please enter a full GitHub repository URL like https://github.com/owner/repo', 
        type: 'error' 
      });
      return;
    }

    setStatus({ message: 'Fetching repository structure...', type: 'info' });

    try {
      const treeData = await fetchRepoTree(repoUrl, githubToken);
      setRepoData(treeData);
      setStatus({ message: `Success! Found ${treeData.length} items.`, type: 'success' });
      setView('visualizer'); // Switch to the visualizer view
    } catch (error) {
      setStatus({ message: `Error: ${error.message}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Live URL validation
  useEffect(() => {
    if (!repoUrl) { setIsValidRepoUrl(true); return; }
    try {
      parseRepoUrl(repoUrl);
      setIsValidRepoUrl(true);
    } catch {
      setIsValidRepoUrl(false);
    }
  }, [repoUrl]);

  // Node click handler for graph/tree
  const handleNodeClick = useCallback(async (node) => {
  if (node.type !== 'blob') {
        setSelectedFile({
            path: node.id || node.path,
            type: 'Directory',
            sha: node.sha,
        });
        // Don't expand layout for directories, keep current graph state
        return;
    };
    
    // Only expand layout when a file is selected (not directory)
    setIsLayoutExpanded(true);
    setSidebarWidth(expandedSidebarWidth);
    setPanelOpen(true);
    
    // Set preliminary data while content loads
  setSelectedFile({ path: node.path, type: 'File', sha: node.sha, content: 'Loading...' });

    try {
  const payload = await fetchFileContent(repoUrl, node.sha, githubToken, node.path);
  setSelectedFile(prev => ({ ...prev, content: payload.content, base64: payload.base64, isBinary: payload.isBinary, mime: payload.mime }));
    } catch (error) {
      setSelectedFile(prev => ({ ...prev, content: 'Error: Could not load file content.' }));
    }
  }, [repoUrl, githubToken, expandedSidebarWidth]);

  // Handle hovering back to graph area to restore layout
  // Only restore if there's an active file selection and layout is expanded
  const handleGraphHover = useCallback(() => {
    if (isLayoutExpanded && selectedFile && selectedFile.type === 'File') {
      setIsLayoutExpanded(false);
      setSidebarWidth(originalSidebarWidth);
    }
  }, [isLayoutExpanded, selectedFile, originalSidebarWidth]);

  // Handle clearing selection and restoring layout
  const handleClearSelection = useCallback(() => {
    setSelectedFile(null);
    setIsLayoutExpanded(false);
    setSidebarWidth(originalSidebarWidth);
  }, [originalSidebarWidth]);
  
  // Render Input/Landing Page
  if (view === 'input') {
    return (
      <div className="input-view" style={{ position: 'relative' }}>
        <BackgroundFX intensity={1} />
        <div style={{ position:'relative', zIndex:1, width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div className="input-box">
          <img src={'/logo.png'} onError={(e)=>{e.currentTarget.onerror=null; e.currentTarget.src='/logo.svg';}} alt="Logo" className="logo-hero" />
          <h1 className="title">AI-Powered Repo Visualizer</h1>
          <p className="subtitle">Effortlessly explore and understand code structures.</p>
          <form onSubmit={handleVisualizeClick}>
            <div className="input-wrap">
              <span className="input-icon">🔗</span>
              <input 
                type="text" 
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="GitHub Repository URL"
                required 
              />
            </div>
            {!isValidRepoUrl && (
              <div className="status text-red-400" style={{ marginTop: '-0.5rem' }}>
                Format: https://github.com/owner/repo
              </div>
            )}
            <div className="input-wrap">
              <span className="input-icon">🛡️</span>
              <input 
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="GitHub Personal Access Token (Optional)" 
              />
            </div>
            <button type="submit" disabled={isLoading || !isValidRepoUrl} className="cta-sheen">
              {isLoading ? 'Loading...' : 'Visualize'}
            </button>
            <div className="hint">Tokens are used only for GitHub API rate limits and never stored on the server.</div>
          </form>
           {status.message && <p className={`status ${ status.type === 'error' ? 'text-red-400' : 'text-gray-400'}`}>{status.message}</p>}
        </div>
          </div>
      </div>
    );
  }

  // Render Visualizer Page
  return (
    <div className={`visualizer-view two-col layout-transition`} style={{ position:'relative', gridTemplateColumns: panelOpen ? `1fr ${sidebarWidth}px` : '1fr' }}>
      <BackgroundFX intensity={1.2} />
      <div style={{ position:'relative', zIndex:1, display:'contents' }}>
      {/* Main Content */}
      <main className="main-content" onMouseEnter={handleGraphHover}>
        <header className="main-header">
           <div className="button-group">
              <button onClick={() => setCurrentVis('graph')} className={currentVis === 'graph' ? 'active' : ''}>Graph View</button>
              <button onClick={() => setCurrentVis('tree')} className={currentVis === 'tree' ? 'active' : ''}>Tree View</button>
            </div>
          <div className="toolbar">
            <button onClick={()=> setPanelOpen(v => !v)} title={panelOpen ? "Hide Right Panel" : "Show Right Panel"}>
              {panelOpen ? '⟩⟩' : '⟨⟨'}
            </button>
            <input type="search" placeholder="Search..." className="search-bar" value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
            <button onClick={() => setIsZoomEnabled(!isZoomEnabled)} title={isZoomEnabled ? "Lock Pan/Zoom" : "Unlock Pan/Zoom"}>
              {isZoomEnabled ? '🔍🔓' : '🔍🔒'}
            </button>
          </div>
        </header>
      <div 
        className="vis-container" 
        onMouseMove={(e)=>{
          const r = e.currentTarget.getBoundingClientRect();
          const cx = (e.clientX - r.left)/r.width - 0.5;
          const cy = (e.clientY - r.top)/r.height - 0.5;
          setTilt({ rx: cy*6, ry: -cx*6 });
        }} 
        onMouseLeave={()=>setTilt({rx:0,ry:0})} 
        onMouseEnter={handleGraphHover}
        style={{ perspective:'1200px' }}
      >
        <div style={{ transform:`rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`, transformStyle:'preserve-3d', transition:'transform .12s ease' , width:'100%', height:'100%' }}>
           {currentVis === 'graph' 
              ? <RepoGraph data={repoData} onNodeClick={handleNodeClick} isZoomEnabled={isZoomEnabled} searchTerm={searchTerm} /> 
              : <TreeView data={repoData} onNodeClick={handleNodeClick} isZoomEnabled={isZoomEnabled} searchTerm={searchTerm} />}
        </div>
        </div>
      </main>

       {/* Right Sidebar (CodePanel) */}
       {panelOpen && (
         <CodePanel 
          file={selectedFile}
          repoUrl={repoUrl}
          token={githubToken}
          onClose={handleClearSelection}
          onHide={()=> setPanelOpen(false)}
          sidebarWidth={sidebarWidth}
          onResizeSidebar={(w)=> setSidebarWidth(Math.min(800, Math.max(260, Math.round(w))))}
         />
       )}
      </div>
    </div>
  );
}

export default App;