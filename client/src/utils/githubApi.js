import axios from 'axios';
import { Base64 } from 'js-base64';

const GITHUB_API_BASE = 'https://api.github.com';

// Helper function to create headers
const createHeaders = (token) => {
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  return headers;
};

// Parse GitHub repository URL
export const parseRepoUrl = (repoUrl) => {
  if (!repoUrl || typeof repoUrl !== 'string') throw new Error('Invalid GitHub repository URL.');
  // Accept forms like:
  // - https://github.com/owner/repo
  // - https://github.com/owner/repo/
  // - https://github.com/owner/repo.git
  // - https://github.com/owner/repo/tree/main
  // - https://github.com/owner/repo/blob/main/path
  const pattern = /^https?:\/\/([^\/]*\.)?github\.com\/([^\/]+)\/([^\/#?]+)(?:[\/#?].*)?$/i;
  const m = repoUrl.trim().match(pattern);
  if (!m) throw new Error('Invalid GitHub repository URL.');
  const owner = m[2];
  const repo = m[3].replace(/\.git$/i, '');
  return { owner, repo };
};

// Fetch repository tree
export const fetchRepoTree = async (repoUrl, token, branch = null) => {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const headers = createHeaders(token);

  try {
    // Get default branch if not specified
    const branchName = branch || (await axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, { headers })).data.default_branch;
    
    // Get repository tree
    const treeUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${branchName}?recursive=1`;
    const treeResponse = await axios.get(treeUrl, { headers });
    
    return treeResponse.data.tree;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch repository data.');
  }
};

// Fetch file content
export const fetchFileContent = async (repoUrl, fileSha, token, path) => {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const headers = createHeaders(token);

  try {
    const contentUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/blobs/${fileSha}`;
    const response = await axios.get(contentUrl, { headers });
    const { content, encoding, size } = response.data || {};

    if (encoding === 'base64' && typeof content === 'string') {
      // Try to decode base64 content
      let decoded = '';
      try { 
        // Use js-base64 for reliable browser-compatible base64 decoding
        decoded = Base64.decode(content);
      } catch (e) {
        decoded = '';
      }
      
      const controlChars = /[\x00-\x08\x0E-\x1F]/g;
      const nonTextRatio = decoded ? ((decoded.match(controlChars) || []).length / Math.max(1, decoded.length)) : 1;
      const isLikelyText = decoded && nonTextRatio < 0.02;

      // Determine MIME type from extension
      let mime = 'application/octet-stream';
      if (path) {
        const lower = path.toLowerCase();
        if (lower.endsWith('.json')) mime = 'application/json';
        else if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.ts') || lower.endsWith('.tsx')) mime = 'text/javascript';
        else if (lower.endsWith('.md')) mime = 'text/markdown';
        else if (lower.endsWith('.css')) mime = 'text/css';
        else if (lower.endsWith('.html')) mime = 'text/html';
        else if (lower.endsWith('.png')) mime = 'image/png';
        else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = 'image/jpeg';
        else if (lower.endsWith('.svg')) mime = 'image/svg+xml';
      }

      return {
        isBinary: !isLikelyText || !decoded,
        mime,
        size,
        content: isLikelyText ? decoded : null,
        base64: content,
      };
    }
    
    return { isBinary: false, content: response.data, base64: null };
  } catch (error) {
    throw new Error('Failed to fetch file content.');
  }
};

// Fetch file commits
export const fetchFileCommits = async (repoUrl, token, filepath, branch = null) => {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const headers = createHeaders(token);

  try {
    // Get default branch if not specified
    const targetBranch = branch || (await axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, { headers })).data.default_branch;
    
    const commitsUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?path=${encodeURIComponent(filepath)}&sha=${encodeURIComponent(targetBranch)}`;
    const commitsResponse = await axios.get(commitsUrl, { headers });
    
    return commitsResponse.data;
  } catch (error) {
    throw new Error('Failed to fetch commits.');
  }
};

// Get AI explanation (direct API calls)
export const getAIExplanation = async (code, context, apiKey, provider = 'gemini', model = '') => {
  if (!apiKey) {
    throw new Error('API Key is required.');
  }
  if (!code) {
    throw new Error('Code to explain is required.');
  }

  const prompt = context === 'line'
    ? `Explain the following line(s) of code. Be concise and clear:\n\n\`\`\`\n${code}\n\`\`\``
    : `Provide a high-level summary of the following code file. What is its primary purpose and responsibility? Explain it to a new developer on the team:\n\n\`\`\`\n${code}\n\`\`\``;

  try {
    let explanationText = '';

    if (provider === 'gemini') {
      const m = model || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const payload = { contents: [{ parts: [{ text: prompt }] }] };
      const response = await axios.post(url, payload);
      explanationText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (provider === 'openai') {
      const m = model || 'gpt-4o-mini';
      const url = 'https://api.openai.com/v1/chat/completions';
      const payload = {
        model: m,
        messages: [
          { role: 'system', content: 'You are a helpful code explainer. Provide clear, accurate, concise explanations.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2
      };
      const response = await axios.post(url, payload, { 
        headers: { Authorization: `Bearer ${apiKey}` } 
      });
      explanationText = response.data?.choices?.[0]?.message?.content || '';
    } else if (provider === 'grok') {
      const m = model || 'grok-2-latest';
      const url = 'https://api.x.ai/v1/chat/completions';
      const payload = {
        model: m,
        messages: [
          { role: 'system', content: 'You are a helpful code explainer. Provide clear, accurate, concise explanations.' },
          { role: 'user', content: prompt }
        ]
      };
      const response = await axios.post(url, payload, { 
        headers: { Authorization: `Bearer ${apiKey}` } 
      });
      explanationText = response.data?.choices?.[0]?.message?.content || '';
    } else {
      throw new Error('Unsupported provider.');
    }

    if (!explanationText) {
      throw new Error('Empty response from provider');
    }
    
    return explanationText;
  } catch (error) {
    console.error('AI Explain Error:', error.response?.data || error.message);
    throw new Error('Failed to get explanation from AI.');
  }
};