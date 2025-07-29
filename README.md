# AI-Powered Git Repo Visualizer

Visualize and explore the structure of any public or private GitHub repository with interactive graph and tree views. Includes file history, code explanations powered by Gemini AI, and dark mode support.

## Features

- 🌳 **Tree & Graph Views:** Visualize the file structure of any GitHub repo.
- 🔍 **Search & Highlight:** Instantly find and highlight files/folders.
- 🕹️ **Pan/Zoom Controls:** Lock/unlock pan and zoom for better navigation.
- 🕵️ **File History:** View commit history for any file.
- 🤖 **AI Code Explanation:** Get file or selection-level explanations using Gemini AI.
- 🌗 **Dark Mode:** Toggle between light, dark, and system themes.
- 🔑 **GitHub Token Support:** Use your token to avoid API rate limits.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- [npm](https://www.npmjs.com/)

### 1. Clone the Repository

```sh
git clone https://github.com/your-username/your-repo.git
cd your-repo
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
Server runs on [http://localhost:3001](http://localhost:3001)

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
