import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000";


function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderMarkdown(text) {
  if (!text) return "";

 
  const codeBlocks = [];
  let processed = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    const escapedCode = escapeHtml(code.trimEnd());
    const displayLang = (lang || "code").toUpperCase();
    const html = `
      <div style="margin: 14px 0; border: 1px solid var(--border-primary, #DEDCD3); border-radius: 10px; overflow: hidden; background: #1C1C1A; box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05));">
        <div style="display: flex; justify-content: space-between; align-items: center; background: #262624; padding: 6px 14px; border-bottom: 1px solid #333330; font-size: 11px; font-family: var(--font-mono, monospace); color: #E8C968; letter-spacing: 0.5px;">
          <span>${displayLang}</span>
        </div>
        <pre style="margin: 0; padding: 14px 16px; overflow-x: auto; font-family: var(--font-mono, monospace); font-size: 12.5px; line-height: 1.6; color: #F8F7F2;"><code>${escapedCode}</code></pre>
      </div>
    `;
    codeBlocks.push(html);
    return placeholder;
  });

  
  const lines = processed.split("\n");
  const parsedLines = [];
  let inTable = false;
  let tableRows = [];

  const flushTable = () => {
    if (tableRows.length >= 2) {
      let tableHtml = '<div style="overflow-x:auto;margin:14px 0;"><table style="width:100%;border-collapse:collapse;font-size:12.5px;font-family:var(--font-sans, sans-serif);border:1px solid #DEDCD3;border-radius:8px;overflow:hidden;background:#FFFFFF;">';
      
      const headerCols = tableRows[0].split('|').map(c => c.trim()).filter((c, idx, arr) => (idx > 0 && idx < arr.length - 1) || (arr.length <= 2 && Boolean(c)));
      tableHtml += '<thead style="background:#F2EFE9;color:#1C1C1A;border-bottom:2px solid #DEDCD3;"><tr>';
      headerCols.forEach(col => {
        tableHtml += `<th style="padding:10px 14px;text-align:left;border:1px solid #DEDCD3;font-weight:600;font-size:12px;letter-spacing:0.3px;">${col}</th>`;
      });
      tableHtml += '</tr></thead><tbody>';

      const dataRows = tableRows.slice(tableRows[1].includes('---') ? 2 : 1);
      dataRows.forEach((row, rIdx) => {
        const cols = row.split('|').map(c => c.trim()).filter((c, idx, arr) => (idx > 0 && idx < arr.length - 1) || (arr.length <= 2 && Boolean(c)));
        const bg = rIdx % 2 === 0 ? '#FFFFFF' : '#FAF8F5';
        tableHtml += `<tr style="background:${bg};">`;
        cols.forEach(col => {
          tableHtml += `<td style="padding:8px 14px;border:1px solid #EBE8DE;color:#1C1C1A;">${col}</td>`;
        });
        tableHtml += '</tr>';
      });

      tableHtml += '</tbody></table></div>';
      parsedLines.push(tableHtml);
    } else {
      tableRows.forEach(r => parsedLines.push(r));
    }
    tableRows = [];
    inTable = false;
  };

  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      tableRows.push(trimmed);
    } else {
      if (inTable) {
        flushTable();
      }
      parsedLines.push(line);
    }
  }
  if (inTable) {
    flushTable();
  }

  let body = parsedLines.join("\n");

  body = body
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#1C1C1A;font-weight:600;">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em style="color:#6F6D67;">$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:#F2EFE9;color:#5A315D;padding:2px 6px;border-radius:4px;font-family:var(--font-mono, monospace);font-size:0.88em;border:1px solid #DEDCD3;">$1</code>')
    .replace(/^#### (.*$)/gm, '<h5 style="color:#5A315D;margin:14px 0 4px;font-size:0.9em;text-transform:uppercase;letter-spacing:0.8px;font-weight:700;">$1</h5>')
    .replace(/^### (.*$)/gm, '<h4 style="color:#1C1C1A;margin:16px 0 6px;font-size:1em;letter-spacing:0.3px;font-weight:600;">$1</h4>')
    .replace(/^## (.*$)/gm, '<h3 style="color:#1C1C1A;margin:20px 0 8px;font-size:1.15em;border-bottom:1px solid #DEDCD3;padding-bottom:4px;font-weight:600;">$1</h3>')
    .replace(/^# (.*$)/gm, '<h2 style="color:#5A315D;margin:24px 0 10px;font-size:1.35em;border-bottom:1px solid #DEDCD3;padding-bottom:6px;font-weight:700;">$1</h2>')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #DEDCD3;margin:18px 0;" />')
    .replace(/^> (.*$)/gm, '<blockquote style="border-left:3px solid #C66B52;padding:6px 14px;margin:10px 0;color:#6F6D67;background:#FDFBF8;border-radius:0 6px 6px 0;font-style:italic;">$1</blockquote>')
    .replace(/^[*-] (.*$)/gm, '<div style="display:flex;gap:8px;margin:5px 0;line-height:1.5"><span style="color:#5A315D;font-weight:bold;">•</span><span>$1</span></div>')
    .replace(/^(\d+)\. (.*$)/gm, '<div style="display:flex;gap:8px;margin:5px 0;line-height:1.5"><span style="color:#C66B52;font-family:var(--font-mono, monospace);font-weight:600;min-width:18px">$1.</span><span>$2</span></div>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#5A315D;text-decoration:none;border-bottom:1px solid #5A315D;font-weight:500;">$1</a>')
    .replace(/\n/g, '<br/>');

  
  codeBlocks.forEach((block, idx) => {
    body = body.replace(`__CODE_BLOCK_${idx}__`, block);
  });

  return body;
}

function TechBadge({ icon, name, confidence }) {
  const isHigh = confidence === 'high';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: isHigh ? 'var(--brand-plum-soft, #F5EEF6)' : 'var(--bg-subtle, #F2EFE9)',
      border: `1px solid ${isHigh ? 'var(--brand-plum-light, #E8DDE9)' : 'var(--border-primary, #DEDCD3)'}`,
      borderRadius: 9999, padding: '4px 12px', fontSize: 12.5,
      color: isHigh ? 'var(--brand-plum, #5A315D)' : 'var(--text-primary, #1C1C1A)',
      fontFamily: 'var(--font-sans, sans-serif)',
      fontWeight: 500,
      boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.03))'
    }}>
      <span>{icon}</span>
      <span>{name}</span>
    </div>
  );
}

function StatCard({ value, label, accent }) {
  return (
    <div style={{
      flex: 1, minWidth: 100,
      background: 'var(--bg-card, #FFFFFF)',
      border: '1px solid var(--border-card, #DEDCD3)',
      borderRadius: 12, padding: '16px 18px', textAlign: 'center',
      position: 'relative', overflow: 'hidden',
      boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.04))',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: accent || 'var(--brand-plum, #5A315D)'
      }} />
      <div style={{
        fontSize: 26, fontWeight: 700, color: 'var(--text-primary, #1C1C1A)',
        fontFamily: 'var(--font-sans, sans-serif)', lineHeight: 1.1
      }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary, #6F6D67)', marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 600 }}>
        {label}
      </div>
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const isError = msg.isError;
  return (
    <div style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 16, animation: 'fadeIn 0.25s ease'
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: isError ? '#FDE8E8' : 'var(--brand-plum-soft, #F5EEF6)',
          border: `1px solid ${isError ? '#F8B4B4' : 'var(--brand-plum-light, #E8DDE9)'}`,
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 15, marginRight: 10, flexShrink: 0, marginTop: 2
        }}>{isError ? '⚠️' : '🧠'}</div>
      )}
      <div style={{
        maxWidth: '82%',
        background: isUser ? 'var(--brand-plum, #5A315D)' : (isError ? '#FFF5F5' : 'var(--bg-card, #FFFFFF)'),
        border: `1px solid ${isUser ? 'var(--brand-plum, #5A315D)' : (isError ? '#FBD5D5' : 'var(--border-card, #DEDCD3)')}`,
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        padding: '14px 18px', fontSize: 13.5, lineHeight: 1.65,
        color: isUser ? '#FFFFFF' : (isError ? '#9B1C1C' : 'var(--text-primary, #1C1C1A)'),
        fontFamily: 'var(--font-sans, sans-serif)',
        boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))'
      }}
        dangerouslySetInnerHTML={{ __html: isUser ? escapeHtml(msg.content) : renderMarkdown(msg.content) }}
      />
    </div>
  );
}


function SarvamFlourish() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, opacity: 0.85 }}>
      <svg width="80" height="24" viewBox="0 0 120 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M60 4C52 14 38 18 20 18C12 18 4 15 0 10C8 24 28 26 44 20C52 17 56 12 60 8C64 12 68 17 76 20C92 26 112 24 120 10C116 15 108 18 100 18C82 18 68 14 60 4Z" fill="#C66B52" opacity="0.9" />
        <circle cx="60" cy="5" r="3" fill="#5A315D" />
        <path d="M48 10C42 6 34 5 26 6C32 9 38 12 44 14C46 12 47 11 48 10Z" fill="#E8C968" />
        <path d="M72 10C78 6 86 5 94 6C88 9 82 12 76 14C74 12 73 11 72 10Z" fill="#E8C968" />
      </svg>
    </div>
  );
}


export default function App() {
  const [githubUrl, setGithubUrl] = useState("");
  const [repoId, setRepoId] = useState(null);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState("chat");
  const [indexing, setIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState("");

  
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const studioRef = useRef(null);

  
  const [readme, setReadme] = useState("");
  const [readmeLoading, setReadmeLoading] = useState(false);
  const [readmeError, setReadmeError] = useState("");
  const [copied, setCopied] = useState(false);

  
  const [graph, setGraph] = useState(null);
  const [graphLoading, setGraphLoading] = useState(false);

  
  const [envInputs, setEnvInputs] = useState([]);
  const [envValues, setEnvValues] = useState({});
  const [dockerFiles, setDockerFiles] = useState(null);
  const [deployLoading, setDeployLoading] = useState(false);
  const [deployData, setDeployData] = useState(null);
  const [deployLogs, setDeployLogs] = useState([]);
  const [deployStatus, setDeployStatus] = useState(null);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [doctorDiagnosis, setDoctorDiagnosis] = useState("");

  
  const [resourceEstimate, setResourceEstimate] = useState(null);
  const [codeRisk, setCodeRisk] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  
  useEffect(() => {
    let interval;
    if (deployData && deployData.deploy_id) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API}/deploy/status/${deployData.deploy_id}`);
          setDeployStatus(res.data);
          const logsRes = await axios.get(`${API}/deploy/logs/${deployData.deploy_id}`);
          setDeployLogs(logsRes.data.logs || []);
        } catch (e) {
          
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [deployData]);

  
  const scrollToStudio = () => {
    studioRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  
  const handleIndex = async () => {
    if (!githubUrl.trim()) return;
    setIndexing(true);
    setMessages([]);
    setStats(null);
    setReadme("");
    setReadmeError("");
    setGraph(null);
    setRepoId(null);
    setDeployData(null);
    setDeployStatus(null);
    setDeployLogs([]);
    setResourceEstimate(null);
    setCodeRisk(null);

    const steps = [
      "Cloning repository...",
      "Parsing file structure...",
      "Running AST code chunking...",
      "Building ChromaDB embeddings...",
      "Mapping dependency topology...",
      "Detecting tech stack..."
    ];
    let i = 0;
    setIndexProgress(steps[0]);
    const interval = setInterval(() => {
      i++;
      if (i < steps.length) {
        setIndexProgress(steps[i]);
      }
    }, 2500);

    try {
      const res = await axios.post(`${API}/repomind/index`, { github_url: githubUrl.trim() });
      clearInterval(interval);
      setRepoId(res.data.repo_id);
      setStats(res.data);
      setActiveTab("chat");
      const stackNames = (res.data.tech_stack || []).map(t => t.name).join(', ') || 'Unknown';
      setMessages([{
        role: "assistant",
        content: `Repository indexed successfully!\n\n**${res.data.files_indexed} files** analyzed across **${res.data.chunks_created} semantic chunks**.\n\n**Detected Stack:** ${stackNames}\n\nAsk me anything about this codebase, or switch to **Deploy & Run** to launch it locally with $0 cost.`
      }]);
    } catch (err) {
      clearInterval(interval);
      const detail = err.response?.data?.detail || "Failed to index repo. Make sure it's a public GitHub URL.";
      alert(detail);
    }
    setIndexProgress("");
    setIndexing(false);
  };

  
  const handleAsk = async () => {
    if (!question.trim() || loading || !repoId) return;
    const q = question.trim();
    setMessages(prev => [...prev, { role: "user", content: q }]);
    setQuestion("");
    setLoading(true);
    try {
      const res = await axios.post(`${API}/repomind/ask`, { repo_id: repoId, question: q });
      setMessages(prev => [...prev, { role: "assistant", content: res.data.answer }]);
    } catch (err) {
      const detail = err.response?.data?.detail || "Error retrieving answer. Please verify backend service.";
      setMessages(prev => [...prev, { role: "assistant", content: `**Error:** ${detail}`, isError: true }]);
    }
    setLoading(false);
  };

  
  const handleReadme = async (forceReload = false) => {
    setActiveTab("readme");
    if (readme && !forceReload) return;
    setReadmeLoading(true);
    setReadmeError("");
    try {
      const res = await axios.get(`${API}/repomind/readme/${repoId}`);
      setReadme(res.data.readme);
    } catch (err) {
      const detail = err.response?.data?.detail || "Error generating README.";
      setReadmeError(detail);
    }
    setReadmeLoading(false);
  };

  const handleGraph = async () => {
    setActiveTab("graph");
    if (graph) return;
    setGraphLoading(true);
    try {
      const res = await axios.get(`${API}/repomind/graph/${repoId}`);
      setGraph(res.data);
    } catch (err) {
      alert("Error loading dependency graph.");
    }
    setGraphLoading(false);
  };

  const loadDeployTab = async () => {
    setActiveTab("deploy");
    if (!envInputs.length) {
      try {
        const [envRes, docRes, mlRes] = await Promise.all([
          axios.post(`${API}/deploy/inspect-env`, { repo_id: repoId }),
          axios.post(`${API}/deploy/generate-dockerfile`, { repo_id: repoId }),
          axios.get(`${API}/ml/resource-estimate/${repoId}`)
        ]);
        setEnvInputs(envRes.data.env_vars || []);
        const defaults = {};
        (envRes.data.env_vars || []).forEach(item => {
          defaults[item.key] = item.default_value || "";
        });
        setEnvValues(defaults);
        setDockerFiles(docRes.data);
        setResourceEstimate(mlRes.data);
      } catch (e) {
      }
    }
  };

  const handleLaunchApp = async () => {
    setDeployLoading(true);
    setDoctorDiagnosis("");
    try {
      const res = await axios.post(`${API}/deploy/launch`, {
        repo_id: repoId,
        env_vars: envValues
      });
      setDeployData(res.data);
      setDeployStatus({ is_running: true, port: res.data.port, url: res.data.url, status: "starting" });
    } catch (err) {
      const detail = err.response?.data?.detail || "Failed to launch application.";
      alert(detail);
    }
    setDeployLoading(false);
  };

  const handleStopApp = async () => {
    if (!deployData) return;
    try {
      await axios.post(`${API}/deploy/stop/${deployData.deploy_id}`);
      setDeployStatus(prev => ({ ...prev, is_running: false, status: "stopped" }));
    } catch (err) {
      alert("Failed to stop deployment.");
    }
  };

  const handleRunAiDoctor = async () => {
    if (!deployLogs.length) return;
    setDoctorLoading(true);
    try {
      const rawText = deployLogs.map(l => l.line).join("\n");
      const res = await axios.post(`${API}/deploy/doctor`, {
        repo_id: repoId,
        error_logs: rawText
      });
      setDoctorDiagnosis(res.data.diagnosis);
    } catch (err) {
      alert("AI Doctor failed to diagnose logs.");
    }
    setDoctorLoading(false);
  };

  const loadMlTab = async () => {
    setActiveTab("ml");
    if (!codeRisk || !resourceEstimate) {
      setMlLoading(true);
      try {
        const [riskRes, resRes] = await Promise.all([
          axios.get(`${API}/ml/code-risk/${repoId}`),
          axios.get(`${API}/ml/resource-estimate/${repoId}`)
        ]);
        setCodeRisk(riskRes.data);
        setResourceEstimate(resRes.data);
      } catch (e) {
      }
      setMlLoading(false);
    }
  };

  const copyReadme = () => {
    if (!readme) return;
    navigator.clipboard.writeText(readme);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const suggestions = [
    "What is the main entry point?",
    "What are the main API routes?",
    "Explain the project architecture",
    "How is authentication handled?",
    "What databases and external services are used?",
    "Find potential bugs or security risks"
  ];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background-color: #F8F7F2;
          color: #1C1C1A;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          overflow-x: hidden;
        }

        /* Animations */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.03); }
        }
        @keyframes subtleFlow {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }

        /* Interactive utilities */
        .interactive-card {
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .interactive-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px -4px rgba(28, 28, 26, 0.08);
          border-color: #C66B52 !important;
        }
        
        .pill-btn {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pill-btn:hover {
          transform: translateY(-1px);
        }
        .pill-btn:active {
          transform: translateY(1px);
        }

        .suggestion-pill {
          transition: all 0.15s ease;
        }
        .suggestion-pill:hover {
          background: #E8DDE9 !important;
          color: #5A315D !important;
          border-color: #5A315D !important;
        }

        .tab-button {
          transition: all 0.18s ease;
        }
        .tab-button:hover {
          color: #5A315D !important;
          background: #FAF8F5 !important;
        }

        input:focus {
          outline: none;
          border-color: #5A315D !important;
          box-shadow: 0 0 0 3px rgba(90, 49, 93, 0.12);
        }
      `}</style>

      
      <div style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        background: `
          radial-gradient(ellipse 90% 55% at 50% -8%, rgba(224, 122, 60, 0.24), rgba(248, 247, 242, 0) 70%),
          radial-gradient(ellipse 60% 45% at 85% 10%, rgba(90, 49, 93, 0.10), rgba(248, 247, 242, 0) 65%),
          radial-gradient(ellipse 50% 40% at 15% 15%, rgba(232, 201, 104, 0.15), rgba(248, 247, 242, 0) 60%)
        `,
        opacity: 0.95
      }} />

      
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        
        <header style={{
          position: 'sticky',
          top: 14,
          zIndex: 100,
          maxWidth: 960,
          width: 'calc(100% - 32px)',
          margin: '14px auto 0',
          padding: '10px 20px',
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid #DEDCD3',
          borderRadius: 9999,
          boxShadow: '0 4px 20px -2px rgba(28, 28, 26, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'fadeIn 0.4s ease'
        }}>
         
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: '#5A315D',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(90, 49, 93, 0.25)'
            }}>
              🧠
            </div>
            <span style={{
              fontSize: 17,
              fontWeight: 800,
              letterSpacing: '-0.5px',
              color: '#1C1C1A',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}>
              Neuro<span style={{ color: '#5A315D' }}>Deploy</span>
            </span>
          </div>

         
          <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <a href="#how-it-works" style={{ textDecoration: 'none', color: '#6F6D67', fontSize: 13.5, fontWeight: 500, transition: 'color 0.2s' }}
               onMouseOver={e => e.currentTarget.style.color = '#1C1C1A'}
               onMouseOut={e => e.currentTarget.style.color = '#6F6D67'}>
              How it works
            </a>
            <a href="#features" style={{ textDecoration: 'none', color: '#6F6D67', fontSize: 13.5, fontWeight: 500, transition: 'color 0.2s' }}
               onMouseOver={e => e.currentTarget.style.color = '#1C1C1A'}
               onMouseOut={e => e.currentTarget.style.color = '#6F6D67'}>
              Features
            </a>
            <a href="https://github.com" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#6F6D67', fontSize: 13.5, fontWeight: 500, transition: 'color 0.2s' }}
               onMouseOver={e => e.currentTarget.style.color = '#1C1C1A'}
               onMouseOut={e => e.currentTarget.style.color = '#6F6D67'}>
              GitHub
            </a>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={scrollToStudio}
              className="pill-btn"
              style={{
                background: '#1C1C1A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 9999,
                padding: '8px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 8px rgba(28, 28, 26, 0.15)'
              }}
            >
              <span>Get Started</span>
              <span style={{ fontSize: 14 }}>→</span>
            </button>
          </div>
        </header>

        <section style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: '64px 20px 48px',
          textAlign: 'center',
          animation: 'fadeIn 0.6s ease'
        }}>
          
          <SarvamFlourish />
          
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: '#5A315D',
            fontSize: 12.5,
            fontWeight: 600,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            marginBottom: 16,
            background: 'rgba(90, 49, 93, 0.06)',
            padding: '4px 14px',
            borderRadius: 9999,
            border: '1px solid rgba(90, 49, 93, 0.15)'
          }}>
            <span>Autonomous Dev &amp; Deploy Platform</span>
          </div>

          
          <h1 style={{
            fontFamily: "'Instrument Serif', 'Lora', Georgia, serif",
            fontSize: 'clamp(2.75rem, 5.8vw, 4.4rem)',
            fontWeight: 400,
            lineHeight: 1.1,
            color: '#1C1C1A',
            letterSpacing: '-0.02em',
            margin: '0 auto 20px',
            maxWidth: 820
          }}>
            From code to deployment,<br />
            <span style={{ fontStyle: 'italic', color: '#5A315D' }}>intelligently.</span>
          </h1>

          
          <p style={{
            fontSize: 'clamp(1rem, 1.8vw, 1.15rem)',
            lineHeight: 1.65,
            color: '#6F6D67',
            maxWidth: 620,
            margin: '0 auto 34px',
            fontFamily: "'Plus Jakarta Sans', sans-serif"
          }}>
            NeuroDeploy analyzes your repository and helps generate, validate, and automate the infrastructure needed to deploy your application.
          </p>

          
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={scrollToStudio}
              className="pill-btn"
              style={{
                background: '#5A315D',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 9999,
                padding: '14px 30px',
                fontSize: 14.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 16px rgba(90, 49, 93, 0.25)'
              }}
            >
              <span>Deploy a Repository</span>
              <span>→</span>
            </button>
            <button
              onClick={scrollToStudio}
              className="pill-btn"
              style={{
                background: '#FFFFFF',
                color: '#1C1C1A',
                border: '1px solid #DEDCD3',
                borderRadius: 9999,
                padding: '14px 26px',
                fontSize: 14.5,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(28, 28, 26, 0.04)'
              }}
            >
              Explore NeuroDeploy
            </button>
          </div>
        </section>

       

        
        <section id="features" style={{
          maxWidth: 960,
          margin: '0 auto 64px',
          padding: '0 20px'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 20
          }}>
            
            <div className="interactive-card" style={{
              background: '#FFFFFF',
              border: '1px solid #DEDCD3',
              borderRadius: 16,
              padding: '24px 22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: '#F8F7F2',
                    border: '1px solid #DEDCD3',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18
                  }}>
                    🔍
                  </div>
                  <span style={{
                    fontSize: 12,
                    fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 700,
                    color: '#9E9B91'
                  }}>01</span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1A', marginBottom: 8 }}>
                  Repository Analysis
                </h3>
                <p style={{ fontSize: 13.5, color: '#6F6D67', lineHeight: 1.55 }}>
                  Understand the structure and requirements of your project automatically with AST parsing and ChromaDB embeddings.
                </p>
              </div>
              <div style={{ marginTop: 18, fontSize: 12, color: '#5A315D', fontWeight: 600 }}>
                Instant semantic chunking →
              </div>
            </div>

            
            <div className="interactive-card" style={{
              background: '#FFFFFF',
              border: '1px solid #DEDCD3',
              borderRadius: 16,
              padding: '24px 22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(90, 49, 93, 0.06)',
                    border: '1px solid #E8DDE9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18
                  }}>
                    ⚙️
                  </div>
                  <span style={{
                    fontSize: 12,
                    fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 700,
                    color: '#9E9B91'
                  }}>02</span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1A', marginBottom: 8 }}>
                  Infrastructure Generation
                </h3>
                <p style={{ fontSize: 13.5, color: '#6F6D67', lineHeight: 1.55 }}>
                  Generate the production deployment configuration your application needs, including multi-stage Dockerfiles and compose setups.
                </p>
              </div>
              <div style={{ marginTop: 18, fontSize: 12, color: '#5A315D', fontWeight: 600 }}>
                Automated Dockerfiles →
              </div>
            </div>

            
            <div className="interactive-card" style={{
              background: '#FFFFFF',
              border: '1px solid #DEDCD3',
              borderRadius: 16,
              padding: '24px 22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 16
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: '#F8F7F2',
                    border: '1px solid #DEDCD3',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18
                  }}>
                    🚀
                  </div>
                  <span style={{
                    fontSize: 12,
                    fontFamily: 'var(--font-mono, monospace)',
                    fontWeight: 700,
                    color: '#9E9B91'
                  }}>03</span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1C1C1A', marginBottom: 8 }}>
                  CI/CD Automation
                </h3>
                <p style={{ fontSize: 13.5, color: '#6F6D67', lineHeight: 1.55 }}>
                  Turn your project into a repeatable deployment workflow with zero-cost local sandboxes and intelligent AI log diagnosis.
                </p>
              </div>
              <div style={{ marginTop: 18, fontSize: 12, color: '#5A315D', fontWeight: 600 }}>
                1-click local launch →
              </div>
            </div>
          </div>
        </section>

        
        <section ref={studioRef} id="product-studio" style={{
          maxWidth: 960,
          margin: '0 auto 64px',
          padding: '0 20px',
          width: '100%'
        }}>
          
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: '#5A315D',
              background: 'rgba(90, 49, 93, 0.06)',
              padding: '4px 12px',
              borderRadius: 9999
            }}>
              Live Deployment Studio
            </span>
            <h2 style={{
              fontFamily: "'Instrument Serif', 'Lora', Georgia, serif",
              fontSize: '2.2rem',
              color: '#1C1C1A',
              fontWeight: 400,
              marginTop: 8
            }}>
              Deploy &amp; inspect your project
            </h2>
          </div>

          
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #DEDCD3',
            borderRadius: 20,
            boxShadow: '0 16px 40px -8px rgba(28, 28, 26, 0.08), 0 4px 16px -2px rgba(28, 28, 26, 0.03)',
            overflow: 'hidden'
          }}>
            
            <div style={{
              padding: '12px 18px',
              background: '#F2EFE9',
              borderBottom: '1px solid #DEDCD3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#E2DFD6', display: 'inline-block' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#E2DFD6', display: 'inline-block' }} />
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#E2DFD6', display: 'inline-block' }} />
              </div>

              
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #DEDCD3',
                borderRadius: 6,
                padding: '4px 16px',
                fontSize: 12,
                fontFamily: 'var(--font-mono, monospace)',
                color: '#6F6D67',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <span style={{ color: '#2E7D52' }}>🔒</span>
                <span>neurodeploy.local / studio</span>
              </div>

              
              <div style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono, monospace)',
                color: '#5A315D',
                fontWeight: 600
              }}>
                100% Free · CPU Engine
              </div>
            </div>

            <div style={{ padding: '24px 20px', background: '#FAF8F5' }}>

              
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #DEDCD3',
                borderRadius: 14,
                padding: 18,
                marginBottom: 18,
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div style={{ fontSize: 11, color: '#5A315D', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10, fontWeight: 700 }}>
                  ▸ Repository Source URL
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    style={{
                      flex: 1, minWidth: 240, padding: '12px 16px', borderRadius: 8,
                      border: '1px solid #DEDCD3', background: '#FFFFFF',
                      color: '#1C1C1A', fontSize: 13.5,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      transition: 'all 0.2s'
                    }}
                    placeholder="https://github.com/username/repository"
                    value={githubUrl}
                    onChange={e => setGithubUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleIndex()}
                    disabled={indexing}
                  />
                  <button
                    className="pill-btn"
                    onClick={handleIndex}
                    disabled={indexing || !githubUrl.trim()}
                    style={{
                      background: indexing ? '#6F6D67' : '#5A315D',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 8,
                      padding: '12px 24px',
                      cursor: indexing ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      fontSize: 13.5,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 6px rgba(90, 49, 93, 0.2)'
                    }}
                  >
                    {indexing ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>⏳</span> {indexProgress || "Analyzing..."}
                      </span>
                    ) : '⬡ Index Repository'}
                  </button>
                </div>

                
                {stats && (
                  <div style={{ marginTop: 18, animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                      <StatCard value={stats.files_indexed} label="Files" accent="#5A315D" />
                      <StatCard value={stats.chunks_created} label="Chunks" accent="#5A315D" />
                      <StatCard value={stats.graph_nodes} label="Graph Nodes" accent="#C66B52" />
                      <StatCard value={stats.graph_edges} label="Graph Edges" accent="#C66B52" />
                    </div>

                   
                    {stats.tech_stack && stats.tech_stack.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: '#6F6D67', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, fontWeight: 700 }}>
                          Detected Tech Stack
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {stats.tech_stack.map((t, i) => (
                            <TechBadge key={i} icon={t.icon} name={t.name} confidence={t.confidence} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              
              {repoId && (
                <div style={{ animation: 'fadeIn 0.4s ease' }}>
                  
                  <div style={{
                    display: 'flex',
                    gap: 6,
                    marginBottom: 16,
                    background: '#FFFFFF',
                    padding: 6,
                    borderRadius: 10,
                    border: '1px solid #DEDCD3',
                    flexWrap: 'wrap'
                  }}>
                    {[
                      { id: 'chat', label: '💬 Chat & Q&A', action: () => setActiveTab('chat') },
                      { id: 'deploy', label: '🚀 Deploy & Run (Phase 3)', action: loadDeployTab },
                      { id: 'ml', label: '📊 ML Risk & Resources', action: loadMlTab },
                      { id: 'readme', label: '📄 Auto README', action: () => handleReadme(false) },
                      { id: 'graph', label: '🕸️ Dependency Graph', action: handleGraph },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        className="tab-button"
                        onClick={tab.action}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: 12.5,
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          background: activeTab === tab.id ? '#5A315D' : 'transparent',
                          color: activeTab === tab.id ? '#FFFFFF' : '#6F6D67',
                          border: 'none',
                          boxShadow: activeTab === tab.id ? '0 2px 6px rgba(90, 49, 93, 0.2)' : 'none'
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  
                  {activeTab === 'chat' && (
                    <div style={{ background: '#FFFFFF', border: '1px solid #DEDCD3', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                      <div style={{ height: 420, overflowY: 'auto', padding: '20px 20px 10px', background: '#FCFAF6' }}>
                        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
                        {loading && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#5A315D', fontSize: 13, margin: '8px 0 16px' }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#F5EEF6', border: '1px solid #E8DDE9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🧠</div>
                            <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 500 }}>
                              Searching codebase context &amp; generating answer...
                            </span>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {messages.length <= 1 && (
                        <div style={{ padding: '8px 18px 12px', display: 'flex', flexWrap: 'wrap', gap: 6, background: '#FFFFFF', borderTop: '1px solid #F2EFE9' }}>
                          {suggestions.map((s, i) => (
                            <button
                              key={i}
                              className="suggestion-pill"
                              onClick={() => { setQuestion(s); }}
                              style={{
                                background: '#F8F7F2', border: '1px solid #DEDCD3',
                                borderRadius: 9999, padding: '5px 12px', fontSize: 12,
                                color: '#6F6D67', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                                fontWeight: 500
                              }}
                            >{s}</button>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: '1px solid #DEDCD3', background: '#FFFFFF' }}>
                        <input
                          style={{
                            flex: 1, padding: '11px 16px', borderRadius: 8,
                            border: '1px solid #DEDCD3', background: '#FFFFFF',
                            color: '#1C1C1A', fontSize: 13.5,
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            transition: 'border-color 0.2s'
                          }}
                          placeholder="Ask about the codebase, functions, API routes, or architecture..."
                          value={question}
                          onChange={e => setQuestion(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAsk()}
                          disabled={loading}
                        />
                        <button
                          className="pill-btn"
                          onClick={handleAsk}
                          disabled={loading || !question.trim()}
                          style={{
                            background: '#5A315D', color: '#FFFFFF',
                            border: 'none', borderRadius: 8,
                            padding: '11px 22px', cursor: 'pointer', fontWeight: 700,
                            fontSize: 16, boxShadow: '0 2px 6px rgba(90, 49, 93, 0.2)'
                          }}
                        >↑</button>
                      </div>
                    </div>
                  )}

                  
                  {activeTab === 'deploy' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      
                      <div style={{
                        background: '#FFFFFF', border: '1px solid #DEDCD3', borderRadius: 14, padding: 18,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                      }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1A', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            🚀 Local Zero-Cost Sandbox Deployment
                          </div>
                          <div style={{ fontSize: 12.5, color: '#6F6D67', marginTop: 4 }}>
                            Runs your app in an isolated process on an auto-allocated local port with live health checks.
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          {deployStatus && deployStatus.is_running ? (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <a
                                href={deployStatus.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  background: '#E9F4EE', border: '1px solid #C6E7D2', borderRadius: 8,
                                  color: '#2E7D52', padding: '9px 18px', textDecoration: 'none', fontWeight: 700,
                                  fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif"
                                }}
                              >
                                🔗 Open {deployStatus.url}
                              </a>
                              <button
                                onClick={handleStopApp}
                                style={{
                                  background: '#FDE8E8', border: '1px solid #F8B4B4', borderRadius: 8,
                                  color: '#9B1C1C', padding: '9px 18px', cursor: 'pointer', fontWeight: 700,
                                  fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif"
                                }}
                              >
                                ⏹ Stop App
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={handleLaunchApp}
                              disabled={deployLoading}
                              className="pill-btn"
                              style={{
                                background: '#5A315D', border: 'none', borderRadius: 8,
                                color: '#FFFFFF', padding: '10px 24px', cursor: 'pointer', fontWeight: 700,
                                fontSize: 13.5, fontFamily: "'Plus Jakarta Sans', sans-serif",
                                boxShadow: '0 2px 6px rgba(90, 49, 93, 0.2)'
                              }}
                            >
                              {deployLoading ? "Launching..." : "⚡ 1-Click Launch Sandbox"}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Resource & Environment Config Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                        {/* Left: Environment Variables Form */}
                        <div style={{ background: '#FFFFFF', border: '1px solid #DEDCD3', borderRadius: 14, padding: 18 }}>
                          <div style={{ fontSize: 11, color: '#5A315D', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 12 }}>
                            ▸ Auto-Discovered Environment Variables
                          </div>
                          {envInputs.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                              {envInputs.map((env, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{
                                    width: 140, fontSize: 11.5, fontFamily: "var(--font-mono, monospace)",
                                    color: env.required ? '#C66B52' : '#5A315D', fontWeight: 600,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                  }}>
                                    {env.key}
                                  </span>
                                  <input
                                    style={{
                                      flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #DEDCD3',
                                      background: '#FFFFFF', color: '#1C1C1A', fontSize: 12, fontFamily: "var(--font-mono, monospace)"
                                    }}
                                    placeholder={env.default_value || "Enter value..."}
                                    value={envValues[env.key] || ""}
                                    onChange={e => setEnvValues({ ...envValues, [env.key]: e.target.value })}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize: 12.5, color: '#6F6D67', fontStyle: 'italic' }}>
                              No required environment variables detected in code.
                            </div>
                          )}
                        </div>

                        
                        {resourceEstimate && (
                          <div style={{ background: '#FFFFFF', border: '1px solid #DEDCD3', borderRadius: 14, padding: 18 }}>
                            <div style={{ fontSize: 11, color: '#5A315D', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 12 }}>
                              ▸ ML Resource Optimization Profile
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                              <div style={{ background: '#FAF8F5', border: '1px solid #EBE8DE', borderRadius: 8, padding: '10px 12px' }}>
                                <div style={{ fontSize: 10.5, color: '#6F6D67', textTransform: 'uppercase', fontWeight: 600 }}>Recommended RAM</div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: '#5A315D', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                  {resourceEstimate.recommended_ram_mb} MB
                                </div>
                              </div>
                              <div style={{ background: '#FAF8F5', border: '1px solid #EBE8DE', borderRadius: 8, padding: '10px 12px' }}>
                                <div style={{ fontSize: 10.5, color: '#6F6D67', textTransform: 'uppercase', fontWeight: 600 }}>CPU Allocation</div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: '#C66B52', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                  {resourceEstimate.recommended_cpu_cores} Cores
                                </div>
                              </div>
                            </div>
                            <div style={{ fontSize: 12, color: '#6F6D67', marginTop: 10 }}>
                              ✓ {resourceEstimate.reasoning}
                            </div>
                          </div>
                        )}
                      </div>

                     
                      <div style={{ background: '#1C1C1A', border: '1px solid #333330', borderRadius: 14, overflow: 'hidden' }}>
                        <div style={{
                          padding: '10px 16px', background: '#262624', borderBottom: '1px solid #333330',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 11, color: '#E8C968', textTransform: 'uppercase', letterSpacing: 1.5, fontFamily: "var(--font-mono, monospace)", fontWeight: 700 }}>
                              ▸ Live Terminal Stream
                            </span>
                            {deployStatus && (
                              <span style={{
                                fontSize: 11, padding: '2px 8px', borderRadius: 4, fontFamily: "var(--font-mono, monospace)",
                                background: deployStatus.is_running ? '#0d2a0d' : '#2a0d0d',
                                color: deployStatus.is_running ? '#7dff9b' : '#ff9b9b',
                                border: `1px solid ${deployStatus.is_running ? '#2a5a2a' : '#5a2a2a'}`
                              }}>
                                {deployStatus.is_running ? `● Port ${deployStatus.port} · ${deployStatus.uptime_seconds}s` : 'Stopped'}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={handleRunAiDoctor}
                            disabled={doctorLoading || !deployLogs.length}
                            style={{
                              background: '#333330', border: '1px solid #444440', borderRadius: 6,
                              color: '#FFFFFF', padding: '4px 12px', fontSize: 11.5, cursor: 'pointer',
                              fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600
                            }}
                          >
                            {doctorLoading ? "Diagnosing..." : "🩺 AI Doctor (Diagnose)"}
                          </button>
                        </div>

                        
                        {doctorDiagnosis && (
                          <div style={{ padding: '14px 18px', background: '#241414', borderBottom: '1px solid #442020', color: '#F8B4B4', fontSize: 12.5 }}>
                            <div style={{ fontWeight: 700, color: '#FF8080', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>🩺 AI Doctor Root Cause &amp; Fix:</span>
                            </div>
                            <div dangerouslySetInnerHTML={{ __html: renderMarkdown(doctorDiagnosis) }} />
                          </div>
                        )}

                        <div style={{
                          padding: 14, height: 260, overflowY: 'auto', background: '#141412',
                          fontFamily: "var(--font-mono, monospace)", fontSize: 11.5, lineHeight: 1.6
                        }}>
                          {deployLogs.length > 0 ? (
                            deployLogs.map((log, idx) => (
                              <div key={idx} style={{
                                color: log.is_anomaly ? '#FF8080' : '#E5E4DE',
                                background: log.is_anomaly ? 'rgba(255,100,100,0.12)' : 'transparent',
                                padding: '1px 4px', borderRadius: 2
                              }}>
                                {log.is_anomaly && <span style={{ color: '#FF6464', fontWeight: 700, marginRight: 6 }}>[ANOMALY]</span>}
                                {log.line}
                              </div>
                            ))
                          ) : (
                            <div style={{ color: '#6F6D67', fontStyle: 'italic' }}>
                              Sandbox idle. Click "Launch Sandbox" above to run and view streaming logs.
                            </div>
                          )}
                        </div>
                      </div>

                     
                      {dockerFiles && (
                        <div style={{ background: '#FFFFFF', border: '1px solid #DEDCD3', borderRadius: 14, padding: 18 }}>
                          <div style={{ fontSize: 11, color: '#5A315D', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 12 }}>
                            ▸ Generated Multi-Stage Dockerfile &amp; Compose (Production Ready)
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                            <div>
                              <div style={{ fontSize: 12, color: '#1C1C1A', fontWeight: 600, marginBottom: 6, fontFamily: "var(--font-mono, monospace)" }}>Dockerfile</div>
                              <pre style={{
                                background: '#1C1C1A', border: '1px solid #333330', borderRadius: 8, padding: 12,
                                fontSize: 11, maxHeight: 200, overflowY: 'auto', color: '#F8F7F2', fontFamily: "var(--font-mono, monospace)"
                              }}><code>{dockerFiles.dockerfile}</code></pre>
                            </div>
                            <div>
                              <div style={{ fontSize: 12, color: '#1C1C1A', fontWeight: 600, marginBottom: 6, fontFamily: "var(--font-mono, monospace)" }}>docker-compose.yml</div>
                              <pre style={{
                                background: '#1C1C1A', border: '1px solid #333330', borderRadius: 8, padding: 12,
                                fontSize: 11, maxHeight: 200, overflowY: 'auto', color: '#F8F7F2', fontFamily: "var(--font-mono, monospace)"
                              }}><code>{dockerFiles.compose}</code></pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  
                  {activeTab === 'ml' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {mlLoading ? (
                        <div style={{ padding: 48, textAlign: 'center', color: '#5A315D' }}>
                          <div style={{ fontSize: 24, marginBottom: 10 }}>🧠 📊 ⚡</div>
                          Calculating AST cyclomatic complexity &amp; training anomaly models...
                        </div>
                      ) : codeRisk && (
                        <>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                            <StatCard value={`${codeRisk.overall_health_score}/100`} label="Codebase Health" accent={codeRisk.overall_health_score > 70 ? "#2E7D52" : "#C66B52"} />
                            <StatCard value={codeRisk.total_analyzed_files} label="Analyzed Files" accent="#5A315D" />
                            <StatCard value={codeRisk.high_risk_files} label="High Risk Files" accent="#C66B52" />
                            <StatCard value={resourceEstimate?.recommended_ram_mb ? `${resourceEstimate.recommended_ram_mb}MB` : '256MB'} label="ML RAM Target" accent="#5A315D" />
                          </div>

                          
                          <div style={{ background: '#FFFFFF', border: '1px solid #DEDCD3', borderRadius: 14, overflow: 'hidden' }}>
                            <div style={{ padding: '12px 18px', background: '#F2EFE9', borderBottom: '1px solid #DEDCD3', fontSize: 11, color: '#5A315D', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
                              ▸ AST Complexity &amp; Fragility Hotspots
                            </div>
                            <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: "var(--font-mono, monospace)" }}>
                                <thead style={{ background: '#FAF8F5', color: '#1C1C1A', borderBottom: '1px solid #DEDCD3' }}>
                                  <tr>
                                    <th style={{ padding: '8px 14px', textAlign: 'left' }}>File Path</th>
                                    <th style={{ padding: '8px 14px', textAlign: 'center' }}>Lines (LOC)</th>
                                    <th style={{ padding: '8px 14px', textAlign: 'center' }}>Complexity</th>
                                    <th style={{ padding: '8px 14px', textAlign: 'center' }}>Functions</th>
                                    <th style={{ padding: '8px 14px', textAlign: 'center' }}>Risk Score</th>
                                    <th style={{ padding: '8px 14px', textAlign: 'center' }}>Risk Level</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {codeRisk.files.map((file, idx) => (
                                    <tr key={idx} style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#FAF8F5', borderBottom: '1px solid #EBE8DE' }}>
                                      <td style={{ padding: '8px 14px', color: '#1C1C1A', fontWeight: 500 }}>{file.filepath}</td>
                                      <td style={{ padding: '8px 14px', textAlign: 'center', color: '#5A315D' }}>{file.loc}</td>
                                      <td style={{ padding: '8px 14px', textAlign: 'center', color: '#C66B52' }}>{file.complexity}</td>
                                      <td style={{ padding: '8px 14px', textAlign: 'center', color: '#6F6D67' }}>{file.functions}</td>
                                      <td style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 700, color: file.risk_score > 60 ? '#9B1C1C' : '#5A315D' }}>{file.risk_score}</td>
                                      <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                                        <span style={{
                                          padding: '2px 8px', borderRadius: 9999, fontSize: 10.5, fontWeight: 600,
                                          background: file.risk_level === 'High' ? '#FDE8E8' : (file.risk_level === 'Medium' ? '#FEF08A' : '#E9F4EE'),
                                          color: file.risk_level === 'High' ? '#9B1C1C' : (file.risk_level === 'Medium' ? '#713F12' : '#2E7D52')
                                        }}>{file.risk_level}</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* ── Tab 4: README ── */}
                  {activeTab === 'readme' && (
                    <div style={{ background: '#FFFFFF', border: '1px solid #DEDCD3', borderRadius: 14, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid #DEDCD3', background: '#F2EFE9' }}>
                        <span style={{ fontSize: 11, color: '#5A315D', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
                          ▸ AI-Generated README.md
                        </span>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => handleReadme(true)}
                            disabled={readmeLoading}
                            style={{
                              background: '#FFFFFF', border: '1px solid #DEDCD3', borderRadius: 6,
                              color: '#1C1C1A', padding: '5px 12px', cursor: 'pointer', fontSize: 11.5,
                              fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600
                            }}
                          >↻ Regenerate</button>
                          <button
                            onClick={copyReadme}
                            disabled={!readme || readmeLoading}
                            style={{
                              background: copied ? '#E9F4EE' : '#5A315D',
                              border: `1px solid ${copied ? '#C6E7D2' : '#5A315D'}`,
                              borderRadius: 6, color: copied ? '#2E7D52' : '#FFFFFF',
                              padding: '5px 14px', cursor: 'pointer', fontSize: 11.5,
                              fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600
                            }}
                          >{copied ? '✓ Copied!' : 'Copy Markdown'}</button>
                        </div>
                      </div>

                      {readmeLoading ? (
                        <div style={{ padding: 48, textAlign: 'center', color: '#5A315D' }}>
                          <div style={{ fontSize: 24, marginBottom: 12 }}>🧠 ⬡ 📄</div>
                          <div style={{ fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            Synthesizing architecture &amp; generating professional README.md...
                          </div>
                        </div>
                      ) : readmeError ? (
                        <div style={{ padding: 32, textAlign: 'center', color: '#9B1C1C' }}>
                          <div style={{ fontSize: 22, marginBottom: 10 }}>⚠️</div>
                          <div style={{ fontSize: 13, marginBottom: 16 }}>{readmeError}</div>
                          <button
                            onClick={() => handleReadme(true)}
                            style={{
                              background: '#FDE8E8', border: '1px solid #F8B4B4', borderRadius: 6,
                              color: '#9B1C1C', padding: '8px 16px', cursor: 'pointer', fontSize: 12,
                              fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600
                            }}
                          >Try Again</button>
                        </div>
                      ) : (
                        <div style={{ padding: '24px 28px', maxHeight: 520, overflowY: 'auto', background: '#FFFFFF' }}
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(readme) }}
                        />
                      )}
                    </div>
                  )}

                  {/* ── Tab 5: Dependency Graph ── */}
                  {activeTab === 'graph' && (
                    <div style={{ background: '#FFFFFF', border: '1px solid #DEDCD3', borderRadius: 14, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 18px', borderBottom: '1px solid #DEDCD3', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F2EFE9' }}>
                        <span style={{ fontSize: 11, color: '#5A315D', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
                          ▸ Import Dependency Graph
                        </span>
                        {graph && (
                          <span style={{ fontSize: 11, color: '#6F6D67', fontFamily: "var(--font-mono, monospace)" }}>
                            {graph.nodes.length} modules · {graph.edges.length} connections
                          </span>
                        )}
                      </div>

                      {graphLoading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#5A315D' }}>
                          <span>Mapping dependency topology...</span>
                        </div>
                      ) : graph && graph.edges.length > 0 ? (
                        <div style={{ maxHeight: 480, overflowY: 'auto', padding: 18 }}>
                          {graph.edges.slice(0, 100).map((e, i) => (
                            <div key={i} style={{
                              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                              borderBottom: '1px solid #F2EFE9', fontSize: 12, fontFamily: "var(--font-mono, monospace)"
                            }}>
                              <span style={{ color: '#5A315D', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: 600 }}>{e.from}</span>
                              <span style={{ color: '#C66B52', flexShrink: 0 }}>──▶</span>
                              <span style={{ color: '#1C1C1A', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{e.to}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: 36, textAlign: 'center', color: '#6F6D67' }}>
                          No inter-module dependencies detected in this repository.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── 6. Differentiation Section ── */}
        <section style={{
          maxWidth: 960,
          margin: '0 auto 64px',
          padding: '0 20px',
          width: '100%'
        }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: '#5A315D',
              background: 'rgba(90, 49, 93, 0.06)',
              padding: '4px 12px',
              borderRadius: 9999
            }}>
              Intelligence + Automation
            </span>
            <h2 style={{
              fontFamily: "'Instrument Serif', 'Lora', Georgia, serif",
              fontSize: '2.4rem',
              color: '#1C1C1A',
              fontWeight: 400,
              marginTop: 8
            }}>
              More than deployment automation.
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: 20
          }}>
            {/* Traditional Deployment */}
            <div className="interactive-card" style={{
              background: '#F8F7F2',
              border: '1px solid #DEDCD3',
              borderRadius: 16,
              padding: '24px 22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#6F6D67',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span>⚡</span> Traditional Deployment
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    "Manual configuration",
                    "Write Dockerfiles",
                    "Configure CI/CD",
                    "Debug build failures",
                    "Manage environment configuration",
                    "Repeat for every project"
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#6F6D67' }}>
                      <span style={{ color: '#C66B52', fontSize: 12, fontWeight: 700 }}>✕</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid #EBE8DE', fontSize: 12, color: '#9E9B91' }}>
                Fragmented tools &amp; manual guesswork
              </div>
            </div>

            {/* NeuroDeploy */}
            <div className="interactive-card" style={{
              background: '#FFFFFF',
              border: '1px solid #5A315D',
              borderRadius: 16,
              padding: '24px 22px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 8px 24px -4px rgba(90, 49, 93, 0.08)'
            }}>
              <div>
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#5A315D',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <span>🧠</span> NeuroDeploy
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    "Understands the repository",
                    "Generates infrastructure",
                    "Validates generated configuration",
                    "Explains deployment failures",
                    "Recommends deployment configuration",
                    "Automates CI/CD setup"
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, color: '#1C1C1A', fontWeight: 500 }}>
                      <span style={{ color: '#2E7D52', fontSize: 13, fontWeight: 700 }}>✓</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid #E8DDE9', fontSize: 12, color: '#5A315D', fontWeight: 600 }}>
                Continuous AST intelligence &amp; 1-click orchestration
              </div>
            </div>
          </div>
        </section>

        {/* ── 7. Use Cases Section ── */}
        <section style={{
          maxWidth: 960,
          margin: '0 auto 64px',
          padding: '0 20px',
          width: '100%'
        }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: '#5A315D',
              background: 'rgba(90, 49, 93, 0.06)',
              padding: '4px 12px',
              borderRadius: 9999
            }}>
              Use Cases
            </span>
            <h2 style={{
              fontFamily: "'Instrument Serif', 'Lora', Georgia, serif",
              fontSize: '2.4rem',
              color: '#1C1C1A',
              fontWeight: 400,
              marginTop: 8
            }}>
              Built for everyone building software.
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 16
          }}>
            {[
              {
                role: "Student / Developer",
                icon: "🎓",
                quote: "Deploy projects without spending hours configuring infrastructure."
              },
              {
                role: "Startup",
                icon: "🚀",
                quote: "Turn repositories into deployable applications faster."
              },
              {
                role: "Development Teams",
                icon: "👥",
                quote: "Standardize deployment workflows across projects."
              },
              {
                role: "DevOps",
                icon: "🛠️",
                quote: "Automate repetitive infrastructure configuration and validation."
              }
            ].map((uc, i) => (
              <div key={i} className="interactive-card" style={{
                background: '#FFFFFF',
                border: '1px solid #DEDCD3',
                borderRadius: 16,
                padding: '22px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div>
                  <div style={{ fontSize: 24, marginBottom: 12 }}>{uc.icon}</div>
                  <h3 style={{ fontSize: 14.5, fontWeight: 700, color: '#1C1C1A', marginBottom: 8 }}>
                    {uc.role}
                  </h3>
                  <p style={{ fontSize: 13, color: '#6F6D67', lineHeight: 1.55 }}>
                    “{uc.quote}”
                  </p>
                </div>
                <div style={{ marginTop: 14, fontSize: 11.5, color: '#5A315D', fontWeight: 600 }}>
                  Explore workflow →
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 8. Security & Reliability Section ── */}
        <section style={{
          maxWidth: 960,
          margin: '0 auto 64px',
          padding: '0 20px',
          width: '100%'
        }}>
          <div style={{
            background: '#FFFFFF',
            border: '1px solid #DEDCD3',
            borderRadius: 20,
            padding: '36px 28px',
            boxShadow: '0 8px 30px -4px rgba(28, 28, 26, 0.04)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: '#2E7D52',
                background: '#E9F4EE',
                padding: '4px 12px',
                borderRadius: 9999
              }}>
                Reliability &amp; Verification
              </span>
              <h2 style={{
                fontFamily: "'Instrument Serif', 'Lora', Georgia, serif",
                fontSize: '2.4rem',
                color: '#1C1C1A',
                fontWeight: 400,
                marginTop: 8
              }}>
                Built for reliable deployments.
              </h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 14
            }}>
              {[
                { title: "Environment validation", desc: "Inspects required environment variables and parameter bindings automatically." },
                { title: "Build verification", desc: "Validates multi-stage Docker build steps and dependency resolutions." },
                { title: "Health checks", desc: "Actively verifies local sandbox ports and service response uptime." },
                { title: "Deployment status", desc: "Provides live process status and real-time streaming terminal logs." },
                { title: "Failure explanations", desc: "AI Doctor analyzes stderr traces to diagnose errors and suggest fixes." },
                { title: "Configuration validation", desc: "Pre-validates docker-compose schemas before container execution." }
              ].map((item, i) => (
                <div key={i} className="interactive-card" style={{
                  background: '#F8F7F2',
                  border: '1px solid #DEDCD3',
                  borderRadius: 12,
                  padding: '16px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: '#1C1C1A' }}>
                    <span style={{ color: '#2E7D52', fontWeight: 700 }}>✓</span>
                    <span>{item.title}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6F6D67', lineHeight: 1.5, paddingLeft: 18 }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 9. Final Call to Action ── */}
        <section style={{
          maxWidth: 960,
          margin: '0 auto 64px',
          padding: '0 20px',
          width: '100%'
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F5EEF6 100%)',
            border: '1px solid #E8DDE9',
            borderRadius: 20,
            padding: '48px 24px',
            textAlign: 'center',
            boxShadow: '0 8px 30px -4px rgba(90, 49, 93, 0.08)'
          }}>
            <h2 style={{
              fontFamily: "'Instrument Serif', 'Lora', Georgia, serif",
              fontSize: '2.5rem',
              color: '#1C1C1A',
              fontWeight: 400,
              marginBottom: 12
            }}>
              Ready to deploy smarter?
            </h2>
            <p style={{
              fontSize: 14.5,
              color: '#6F6D67',
              maxWidth: 480,
              margin: '0 auto 24px'
            }}>
              Experience zero-cost local sandbox deployments and AI-driven infrastructure generation for your GitHub repositories.
            </p>
            <button
              onClick={scrollToStudio}
              className="pill-btn"
              style={{
                background: '#1C1C1A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 9999,
                padding: '14px 32px',
                fontSize: 14.5,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(28, 28, 26, 0.15)'
              }}
            >
              Get Started →
            </button>
          </div>
        </section>

        {/* ── 7. Minimal Footer ── */}
        <footer style={{
          borderTop: '1px solid #DEDCD3',
          background: '#F8F7F2',
          padding: '32px 20px 48px',
          marginTop: 'auto'
        }}>
          <div style={{
            maxWidth: 960,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🧠</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1C1C1A' }}>NeuroDeploy</span>
              <span style={{ fontSize: 12, color: '#9E9B91', marginLeft: 8 }}>© 2026 Autonomous Dev &amp; Deploy</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 13, color: '#6F6D67' }}>
              <a href="https://github.com" target="_blank" rel="noreferrer" style={{ color: '#6F6D67', textDecoration: 'none', transition: 'color 0.2s' }}
                 onMouseOver={e => e.currentTarget.style.color = '#1C1C1A'}
                 onMouseOut={e => e.currentTarget.style.color = '#6F6D67'}>
                GitHub
              </a>
              <span style={{ color: '#DEDCD3' }}>·</span>
              <a href="#how-it-works" style={{ color: '#6F6D67', textDecoration: 'none', transition: 'color 0.2s' }}
                 onMouseOver={e => e.currentTarget.style.color = '#1C1C1A'}
                 onMouseOut={e => e.currentTarget.style.color = '#6F6D67'}>
                Documentation
              </a>
              <span style={{ color: '#DEDCD3' }}>·</span>
              <span style={{ color: '#5A315D', fontWeight: 600 }}>$0 Cloud Bill · Local Compute</span>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}