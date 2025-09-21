import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;
const GITHUB_API_URL = 'https://api.github.com';

// Helper function to create headers
const createHeaders = (token) => {
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  return headers;
};

// --- API Endpoints ---

// Modified to accept a branch name
app.post('/api/tree', async (req, res) => {
  const { repoUrl, token, branch } = req.body;
  const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = repoUrl.match(urlPattern);
  if (!match) return res.status(400).json({ message: 'Invalid GitHub repository URL.' });

  const owner = match[1];
  const repo = match[2].replace('.git', '');
  const headers = createHeaders(token);

  try {
    const branchName = branch || (await axios.get(`${GITHUB_API_URL}/repos/${owner}/${repo}`, { headers })).data.default_branch;
    const treeUrl = `${GITHUB_API_URL}/repos/${owner}/${repo}/git/trees/${branchName}?recursive=1`;
    const treeResponse = await axios.get(treeUrl, { headers });
    res.json(treeResponse.data.tree);
  } catch (error) {
    res.status(error.response?.status || 500).json({ message: error.response?.data?.message || 'Failed to fetch repository data.' });
  }
});

app.post('/api/branches', async (req, res) => {
  const { repoUrl, token } = req.body;
  const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = repoUrl.match(urlPattern);
  if (!match) return res.status(400).json({ message: 'Invalid GitHub repository URL.' });

  const owner = match[1];
  const repo = match[2].replace('.git', '');
  const headers = createHeaders(token);

  try {
    const branchesUrl = `${GITHUB_API_URL}/repos/${owner}/${repo}/branches`;
    const branchesResponse = await axios.get(branchesUrl, { headers });
    res.json(branchesResponse.data.map(b => b.name));
  } catch (error) {
    res.status(error.response?.status || 500).json({ message: 'Failed to fetch branches.' });
  }
});

app.post('/api/commits', async (req, res) => {
  const { repoUrl, token, filepath, branch } = req.body;
  const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = repoUrl.match(urlPattern);
  if (!match) return res.status(400).json({ message: 'Invalid GitHub repository URL.' });

  const owner = match[1];
  const repo = match[2].replace('.git', '');
  const headers = createHeaders(token);

  try {
    // If branch not provided, use default branch
    const targetBranch = branch || (await axios.get(`${GITHUB_API_URL}/repos/${owner}/${repo}`, { headers })).data.default_branch;
    const commitsUrl = `${GITHUB_API_URL}/repos/${owner}/${repo}/commits?path=${encodeURIComponent(filepath)}&sha=${encodeURIComponent(targetBranch)}`;
    const commitsResponse = await axios.get(commitsUrl, { headers });
    res.json(commitsResponse.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ message: 'Failed to fetch commits.' });
  }
});

app.post('/api/content', async (req, res) => {
  const { repoUrl, fileSha, token, path: filePath } = req.body;
  const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = repoUrl.match(urlPattern);
  if (!match) return res.status(400).json({ message: 'Invalid GitHub repository URL.' });
  if (!fileSha) return res.status(400).json({ message: 'File SHA is required.' });
  const owner = match[1];
  const repo = match[2].replace('.git', '');
  const headers = createHeaders(token);
  try {
    const contentUrl = `${GITHUB_API_URL}/repos/${owner}/${repo}/git/blobs/${fileSha}`;
    const resp = await axios.get(contentUrl, { headers });
    const { content, encoding, size } = resp.data || {};
    if (encoding === 'base64' && typeof content === 'string') {
      // Try to detect if it's text
      let decoded = '';
      try { decoded = Buffer.from(content, 'base64').toString('utf-8'); } catch {}
      const controlChars = /[\x00-\x08\x0E-\x1F]/g; // excludes tabs/newlines
      const nonTextRatio = decoded ? ((decoded.match(controlChars) || []).length / Math.max(1, decoded.length)) : 1;
      const isLikelyText = decoded && nonTextRatio < 0.02;

      // naive mime from extension
      let mime = 'application/octet-stream';
      if (filePath) {
        const lower = filePath.toLowerCase();
        if (lower.endsWith('.json')) mime = 'application/json';
        else if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.ts') || lower.endsWith('.tsx')) mime = 'text/javascript';
        else if (lower.endsWith('.md')) mime = 'text/markdown';
        else if (lower.endsWith('.css')) mime = 'text/css';
        else if (lower.endsWith('.html')) mime = 'text/html';
        else if (lower.endsWith('.png')) mime = 'image/png';
        else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mime = 'image/jpeg';
        else if (lower.endsWith('.svg')) mime = 'image/svg+xml';
      }

      return res.json({
        isBinary: !isLikelyText || !decoded,
        mime,
        size,
        content: isLikelyText ? decoded : null,
        base64: content,
      });
    }
    // Fallback
    res.json({ isBinary: false, content: resp.data, base64: null });
  } catch (error) {
    res.status(error.response?.status || 500).json({ message: 'Failed to fetch file content.' });
  }
});

// Generalized AI explain endpoint supporting multiple providers
app.post('/api/explain', async (req, res) => {
  const { code, context, apiKey, provider = 'gemini', model } = req.body;
  if (!apiKey) return res.status(400).json({ message: 'API Key is required.' });
  if (!code) return res.status(400).json({ message: 'Code to explain is required.' });

  const prompt = context === 'line'
    ? `Explain the following line(s) of code. Be concise and clear:\n\n\`\`\`\n${code}\n\`\`\``
    : `Provide a high-level summary of the following code file. What is its primary purpose and responsibility? Explain it to a new developer on the team:\n\n\`\`\`\n${code}\n\`\`\``;

  try {
    let explanationText = '';

    if (provider === 'gemini') {
      const m = model || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const payload = { contents: [{ parts: [{ text: prompt }] }] };
      const resp = await axios.post(url, payload);
      explanationText = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
      const resp = await axios.post(url, payload, { headers: { Authorization: `Bearer ${apiKey}` } });
      explanationText = resp.data?.choices?.[0]?.message?.content || '';
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
      const resp = await axios.post(url, payload, { headers: { Authorization: `Bearer ${apiKey}` } });
      explanationText = resp.data?.choices?.[0]?.message?.content || '';
    } else {
      return res.status(400).json({ message: 'Unsupported provider.' });
    }

    if (!explanationText) throw new Error('Empty response from provider');
    res.json({ explanation: explanationText });
  } catch (error) {
    console.error('AI Explain Error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to get explanation from AI.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});