# AI-Powered Repo Visualizer 2.0 🚀

A stunning sci-fi themed repository visualization tool that transforms GitHub repositories into interactive 3D-style graphs with AI-powered code explanations.

![AI-Powered Repo Visualizer](client/public/logo.svg)

## 🌟 Live Demo
[Visit the deployed application](https://git-repo-visualizer.netlify.app)

## Features

### 🎨 Sci-Fi UI/UX
- **Animated starfield background** with nebula effects
- **Neon glow effects** on nodes and interactive elements
- **3D parallax tilt** on mouse movement
- **Glassmorphism design** with backdrop blur effects
- **Responsive layout** with resizable panels

### 📊 Visualization Modes
- **Graph View**: Force-directed network visualization with animated links
- **Tree View**: Hierarchical tree structure with glow effects
- **Interactive search** with real-time highlighting
- **Zoom and pan controls** with lock/unlock toggle

### 🤖 AI-Powered Explanations
- **Multi-provider support**: Choose between Gemini, OpenAI, or Grok (xAI)
- **File-level explanations**: Get AI summaries of code files
- **Secure API key storage**: Keys stored locally in browser
- **Binary file handling**: Safe preview for images and other non-text files

### 🔧 Developer Features
- **Resizable panels**: Adjust code view and explanation areas
- **Collapsible sidebar**: Hide panels for full-width visualization
- **File history**: View commit history for selected files
- **GitHub integration**: Works with public and private repos (with token)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- [npm](https://www.npmjs.com/)

### 1. Clone the Repository

```sh
git clone https://github.com/distortion-12/Git-Repo-Visualizer-2.0.git
cd Git-Repo-Visualizer-2.0
```

### 2. Setup the Server

```sh
cd server
cp .env.example .env   # Or manually create .env (see below)
npm install
```

Edit `.env` and add your GitHub token and Gemini API key:
```
GITHUB_TOKEN=your-github-token-here
GEMINI_API_KEY=your-gemini-api-key-here
```

Start the server:
```sh
npm start
```
## Deployment (Netlify)

This app can run 100% on the frontend using the GitHub API and optional AI providers. The `server/` folder is not required for deployment and is kept only for optional local proxying. For Netlify, deploy the `client` project as a SPA.

Netlify settings (already in `netlify.toml`):

- Base directory: `client`
- Build command: `npm run build`
- Publish directory: `dist`
- SPA redirect: handled by `_redirects` and the `[[redirects]]` rule

If your dashboard build settings differ, update them or delete overrides so Netlify uses `netlify.toml`.

Troubleshooting:
- Seeing 404 on refresh or deep links? Ensure `client/public/_redirects` contains: `/* /index.html 200`.
- Browser console shows requests to `http://localhost:3001/...`? Update to the latest code: the app no longer calls a backend. Clear caches and redeploy.
- GitHub API rate limits? Provide a Personal Access Token in the landing form (it is used only in the browser and not stored).

## Optional local server (legacy)

If you want to run the optional server for local proxying, you can start it and the client locally. The server runs on [http://localhost:3001](http://localhost:3001). The deployed app does not require it.

### 3. Setup the Client

```sh
cd ../client
npm install
npm run dev
```
Client runs on [http://localhost:5173](http://localhost:5173) (Vite default)

## Usage

1. Enter a GitHub repository URL (e.g., `https://github.com/facebook/react`).
2. (Optional) Enter your GitHub token to avoid rate limits.
3. Click **Visualize**.
4. Switch between **Graph** and **Tree** views.
5. Click any file to view its content, commit history, and get AI explanations.

## Project Structure

```
client/
  src/
    components/
      CodePanel.jsx
      RepoGraph.jsx
      TreeView.jsx
    App.jsx
    main.jsx
    index.css
  public/
  index.html
  package.json
  tailwind.config.js
  postcss.config.js

server/
  index.js
  .env
  package.json
```

## Tech Stack

- **Frontend:** React, D3.js, Tailwind CSS, Vite
- **Backend:** Node.js, Express, Axios
- **AI:** Gemini API (Google Generative Language)
- **Other:** GitHub REST API

## Environment Variables

See [`server/.env`](server/.env):

- `GITHUB_TOKEN` – Your GitHub Personal Access Token (with `public_repo` scope)
- `GEMINI_API_KEY` – Your Gemini API key

## License

MIT

---

**Made with ❤️ for exploring
