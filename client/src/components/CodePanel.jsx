import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodePanel = ({ file, onClose, repoUrl, token }) => {
  // State to manage the panel's width
  const [panelWidth, setPanelWidth] = useState(window.innerWidth / 3);
  
  const [explanation, setExplanation] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState('Copy');
  const [commits, setCommits] = useState([]);
  const [activeTab, setActiveTab] = useState('code');

  // This function handles the drag-to-resize logic
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = panelWidth;

    const handleMouseMove = (moveEvent) => {
      const newWidth = startWidth - (moveEvent.clientX - startX);
      // Add constraints to prevent the panel from becoming too small or too large
      if (newWidth > 350 && newWidth < window.innerWidth - 400) {
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [panelWidth]);

  useEffect(() => {
    if (file && file.path) {
      setActiveTab('code');
      setCommits([]);
      const fetchCommits = async () => {
        try {
          const response = await axios.post('http://localhost:3001/api/commits', { repoUrl, token, filepath: file.path, branch: file.branch });
          setCommits(response.data);
        } catch (error) {
          console.error("Failed to fetch commits", error);
        }
      };
      fetchCommits();
    }
  }, [file, repoUrl, token]);

  if (!file) {
    return <div className="w-0 bg-gray-800 transition-all duration-300" />;
  }

  const handleExplain = async (context, code) => {
    setIsExplaining(true);
    setExplanation('🧠 Thinking...');
    try {
      const response = await axios.post('http://localhost:3001/api/explain', { code: code || file.content, context });
      setExplanation(response.data.explanation);
    } catch (error) {
      setExplanation('Sorry, I had trouble generating an explanation.');
    } finally {
      setIsExplaining(false);
    }
  };
  
  const handleLineExplain = () => {
    const selectedText = window.getSelection().toString();
    if (selectedText) {
      handleExplain('line', selectedText);
    } else {
      setExplanation("Please select some code in the file to explain.");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(file.content);
    setCopyButtonText('Copied!');
    setTimeout(() => setCopyButtonText('Copy'), 2000);
  };

  return (
    // This container holds the resizer and the panel content
    <div className="flex h-screen flex-shrink-0" style={{ width: `${panelWidth}px` }}>
      {/* The Draggable Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="w-2 h-full bg-gray-600 hover:bg-indigo-500 cursor-col-resize transition-colors duration-200"
      />

      {/* The Panel Content */}
      <div className="flex-1 bg-gray-800 text-white flex flex-col shadow-2xl overflow-hidden">
        <header className="p-4 bg-gray-900 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-semibold truncate" title={file.path}>{file.path}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
        </header>

        <div className="border-b border-gray-700 flex-shrink-0">
          <nav className="flex space-x-4 px-4">
            <button onClick={() => setActiveTab('code')} className={`py-2 px-1 text-sm font-medium ${activeTab === 'code' ? 'border-b-2 border-indigo-400 text-white' : 'text-gray-400'}`}>Code</button>
            <button onClick={() => setActiveTab('history')} className={`py-2 px-1 text-sm font-medium ${activeTab === 'history' ? 'border-b-2 border-indigo-400 text-white' : 'text-gray-400'}`}>History ({commits.length})</button>
          </nav>
        </div>
        
        {activeTab === 'code' && (
          <div className="flex-1 p-2 overflow-y-auto relative">
            <button onClick={handleCopy} className="absolute top-4 right-4 bg-gray-700 text-xs px-2 py-1 rounded hover:bg-gray-600">{copyButtonText}</button>
            <SyntaxHighlighter language="javascript" style={vscDarkPlus} showLineNumbers customStyle={{ margin: 0, background: 'transparent' }}>
              {file.content || ''}
            </SyntaxHighlighter>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="flex-1 p-4 overflow-y-auto">
            {commits.map(c => (
              <div key={c.sha} className="mb-4 pb-4 border-b border-gray-700">
                <p className="text-sm text-gray-300 truncate">{c.commit.message}</p>
                <p className="text-xs text-gray-400 mt-1">{c.commit.author.name} - {new Date(c.commit.author.date).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
        
        <div className="p-4 bg-gray-900 flex-shrink-0">
          <div className="flex gap-2 mb-4">
              <button onClick={() => handleExplain('file')} disabled={isExplaining} className="flex-1 bg-blue-600 p-2 rounded hover:bg-blue-700 disabled:bg-blue-400">Explain File</button>
              <button onClick={handleLineExplain} disabled={isExplaining} className="flex-1 bg-purple-600 p-2 rounded hover:bg-purple-700 disabled:bg-purple-400">Explain Selection</button>
          </div>
          {explanation && (
            <div className="p-3 bg-gray-700 rounded text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
              {explanation}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodePanel;