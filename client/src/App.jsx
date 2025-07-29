import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import RepoGraph from './components/RepoGraph';
import TreeView from './components/TreeView';
import CodePanel from './components/CodePanel';
import { text } from 'd3';

const ThemeToggle = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.classList.toggle('dark', isDark);
    localStorage.setItem('theme', theme);
  }, [theme]);
  const cycleTheme = () => {
    const themes = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };
  return (
    <button onClick={cycleTheme} className="absolute top-4 right-4 z-20 p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
      {theme === 'light' && '☀️'}
      {theme === 'dark' && '🌙'}
      {theme === 'system' && '🖥️'}
    </button>
  );
};

function App() {
  const [repoUrl, setRepoUrl] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [repoData, setRepoData] = useState(null);
  const [status, setStatus] = useState({ message: 'Enter a repository to begin.', type: 'info' });
  const [isLoading, setIsLoading] = useState(false);
  const [currentView, setCurrentView] = useState('graph');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  // --- NEW STATE FOR ZOOM LOCK ---
  const [isZoomEnabled, setIsZoomEnabled] = useState(false); // Default to locked

  const fetchRepoData = useCallback(async (branchToFetch) => {
    setIsLoading(true);
    setRepoData(null);
    setSelectedFile(null);
    setStatus({ message: `Fetching structure for branch: ${branchToFetch || 'default'}...`, type: 'info' });
    try {
      const treeResponse = await axios.post('http://localhost:3001/api/tree', { repoUrl, token: githubToken, branch: branchToFetch });
      setRepoData(treeResponse.data);
      if (branches.length === 0) {
        const branchesResponse = await axios.post('http://localhost:3001/api/branches', { repoUrl, token: githubToken });
        setBranches(branchesResponse.data);
        if (!branchToFetch) {
            const defaultBranch = (await axios.get(`https://api.github.com/repos/${repoUrl.split('/')[3]}/${repoUrl.split('/')[4]}`, { headers: { Authorization: `token ${githubToken}` }})).data.default_branch;
            setSelectedBranch(defaultBranch || branchesResponse.data[0]);
        }
      }
      setStatus({ message: `Success! Found ${treeResponse.data.length} items.`, type: 'success' });
    } catch (error) {
      setStatus({ message: `Error: ${error.response?.data?.message || 'An unexpected error occurred.'}`, type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [repoUrl, githubToken, branches.length]);

  const handleVisualizeClick = (e) => {
    e.preventDefault();
    setBranches([]);
    setSelectedBranch('');
    fetchRepoData(null);
  };

  useEffect(() => {
    if (selectedBranch && branches.length > 0) {
      const currentBranch = branches.find(b => b === selectedBranch);
      if(currentBranch) fetchRepoData(selectedBranch);
    }
  }, [selectedBranch]);

  const handleNodeClick = useCallback(async (node) => {
    if (node.type !== 'blob') return;
    setSelectedFile({ path: node.path, sha: node.sha, content: 'Loading content...', branch: selectedBranch || 'default' });
    try {
      const response = await axios.post('http://localhost:3001/api/content', { repoUrl, fileSha: node.sha, token: githubToken });
      setSelectedFile(prev => ({ ...prev, content: response.data.content }));
    } catch (error) {
      setSelectedFile(prev => ({ ...prev, content: 'Error: Could not load file content.' }));
    }
  }, [repoUrl, githubToken, selectedBranch]);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans transition-colors duration-300">
      <ThemeToggle />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-8 w-full">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">AI-Powered Repo Visualizer</h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">Visualize a repository's file structure.</p>
          </header>

          <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <form onSubmit={handleVisualizeClick}>
              <div className="mb-4">
                <label htmlFor="repo-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GitHub Repository URL</label>
                <input id="repo-url" type="text" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md" required />
              </div>
              <div className="mb-4">
                <label htmlFor="github-token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GitHub Token (Optional)</label>
                <input id="github-token" type="text" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md" placeholder="Enter token to avoid rate limits" />
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
                {isLoading ? 'Loading...' : 'Visualize'}
              </button>
            </form>
          </div>

          {status.message && <p className={`text-center my-4 font-medium ${ status.type === 'error' ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>{status.message}</p>}

          {repoData && (
            <>
              <div className="max-w-3xl mx-auto my-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md" placeholder="Search for files to highlight..." />
                <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md">
                  <option value="" disabled>Select a branch</option>
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="max-w-3xl mx-auto mb-4">
                <div className="flex justify-center bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                  <button onClick={() => setCurrentView('graph')} className={`w-full py-2 px-4 text-sm font-medium rounded-md transition-colors ${currentView === 'graph' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}>Graph View</button>
                  <button onClick={() => setCurrentView('tree')} className={`w-full py-2 px-4 text-sm font-medium rounded-md transition-colors ${currentView === 'tree' ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}>Tree View</button>
                </div>
              </div>
              {/* Add relative positioning to the main container */}
              <main className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 w-full relative">
                {/* --- NEW ZOOM TOGGLE BUTTON --- */}
                <button
                  onClick={() => setIsZoomEnabled(!isZoomEnabled)}
                  className="absolute top-2 right-2 z-10 p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xl"
                  title={isZoomEnabled ? "Lock Pan/Zoom" : "Unlock Pan/Zoom"}
                >
                  {isZoomEnabled ?'🔍🔓' : '🔍🔒'}
                </button>
                {/* --- PASS PROP TO COMPONENTS --- */}
                {currentView === 'graph' ? <RepoGraph data={repoData} onNodeClick={handleNodeClick} searchTerm={searchTerm} isZoomEnabled={isZoomEnabled} /> : <TreeView data={repoData} onNodeClick={handleNodeClick} searchTerm={searchTerm} isZoomEnabled={isZoomEnabled} />}
              </main>
            </>
          )}
        </div>
      </div>
      <CodePanel file={selectedFile} onClose={() => setSelectedFile(null)} repoUrl={repoUrl} token={githubToken} />
    </div>
  );
}

export default App;