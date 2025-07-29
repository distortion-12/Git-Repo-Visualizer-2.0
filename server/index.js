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
    // Use the provided branch, or fetch the default branch if none is given
    const branchName = branch || (await axios.get(`${GITHUB_API_URL}/repos/${owner}/${repo}`, { headers })).data.default_branch;
    const treeUrl = `${GITHUB_API_URL}/repos/${owner}/${repo}/git/trees/${branchName}?recursive=1`;
    const treeResponse = await axios.get(treeUrl, { headers });
    res.json(treeResponse.data.tree);
  } catch (error) {
    res.status(error.response?.status || 500).json({ message: error.response?.data?.message || 'Failed to fetch repository data.' });
  }
});

// NEW: Endpoint to get all branches for a repo
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
    res.json(branchesResponse.data.map(b => b.name)); // Send back an array of branch names
  } catch (error) {
    res.status(error.response?.status || 500).json({ message: 'Failed to fetch branches.' });
  }
});

// NEW: Endpoint to get commit history for a specific file
app.post('/api/commits', async (req, res) => {
    const { repoUrl, token, filepath, branch } = req.body;
    const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = repoUrl.match(urlPattern);
    if (!match) return res.status(400).json({ message: 'Invalid GitHub repository URL.' });

    const owner = match[1];
    const repo = match[2].replace('.git', '');
    const headers = createHeaders(token);

    try {
        const commitsUrl = `${GITHUB_API_URL}/repos/${owner}/${repo}/commits?path=${filepath}&sha=${branch}`;
        const commitsResponse = await axios.get(commitsUrl, { headers });
        res.json(commitsResponse.data);
    } catch (error) {
        res.status(error.response?.status || 500).json({ message: 'Failed to fetch commits.' });
    }
});


// The existing endpoints for content and AI explanation remain the same
app.post('/api/content', async (req, res) => {
    const { repoUrl, fileSha, token } = req.body;
    const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = repoUrl.match(urlPattern);
    if (!match) return res.status(400).json({ message: 'Invalid GitHub repository URL.' });
    if (!fileSha) return res.status(400).json({ message: 'File SHA is required.' });
    const owner = match[1];
    const repo = match[2].replace('.git', '');
    const headers = { 'Accept': 'application/vnd.github.v3.raw' };
    if (token) headers['Authorization'] = `token ${token}`;
    try {
        const contentUrl = `${GITHUB_API_URL}/repos/${owner}/${repo}/git/blobs/${fileSha}`;
        const contentResponse = await axios.get(contentUrl, { headers });
        res.json({ content: contentResponse.data });
    } catch (error) {
        res.status(error.response?.status || 500).json({ message: 'Failed to fetch file content.' });
    }
});

app.post('/api/explain', async (req, res) => {
    const { code, context } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) return res.status(500).json({ message: 'API Key not found on server.' });
    if (!code) return res.status(400).json({ message: 'Code to explain is required.' });
    const prompt = context === 'line'
      ? `Explain the following line(s) of code. Be concise and clear:\n\n\`\`\`\n${code}\n\`\`\``
      : `Provide a high-level summary of the following code file. What is its primary purpose and responsibility? Explain it to a new developer on the team:\n\n\`\`\`\n${code}\n\`\`\``;
    try {
        const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
        const payload = { contents: [{ parts: [{ text: prompt }] }] };
        const geminiResponse = await axios.post(GEMINI_API_URL, payload);
        res.json({ explanation: geminiResponse.data.candidates[0].content.parts[0].text });
    } catch (error) {
        res.status(500).json({ message: 'Failed to get explanation from AI.' });
    }
});


app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});