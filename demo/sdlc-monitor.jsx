import { useState, useEffect, useRef, useCallback } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
const STAGES = [
  { id: "confluence", label: "Requirements Ingestion", icon: "📄", agent: "ConfluenceAgent", provider: "ollama",  color: "#3b82f6" },
  { id: "stories",    label: "Jira Story Creation",    icon: "📋", agent: "StoryAgent",      provider: "ollama",  color: "#06b6d4" },
  { id: "po_gate",    label: "PO Review Gate",          icon: "👤", agent: "HUMAN — PO",      provider: null,      color: "#3b82f6", isGate: true },
  { id: "design",     label: "Technical Design (TSD)", icon: "🏗️", agent: "DesignAgent",     provider: "ollama",  color: "#8b5cf6" },
  { id: "arch_gate",  label: "Architect Review Gate",   icon: "🔐", agent: "HUMAN — Arch",    provider: null,      color: "#f59e0b", isGate: true },
  { id: "implement",  label: "Implementation",          icon: "💻", agent: "ImplementAgent",  provider: "ollama",  color: "#10b981" },
  { id: "test",       label: "Test Generation",         icon: "🧪", agent: "TestAgent",       provider: "ollama",  color: "#f59e0b" },
  { id: "review",     label: "Code Review",             icon: "🔍", agent: "ReviewAgent",     provider: "ollama",  color: "#ec4899" },
  { id: "deploy",     label: "Deployment Plan",         icon: "🚀", agent: "DeployAgent",     provider: "ollama",  color: "#3b82f6" },
  { id: "e2e",        label: "E2E Frontend Tests",      icon: "🎭", agent: "E2ETestAgent",    provider: "ollama",  color: "#06b6d4" },
];

const MEMORY_KEYS = [
  { key: "project_context.tech_stack",              label: "Tech Stack",           icon: "🏗️" },
  { key: "project_context.code_conventions",        label: "Code Conventions",     icon: "📏" },
  { key: "project_context.architecture_decisions",  label: "Architecture ADRs",    icon: "📐" },
  { key: "story_state.acceptance_criteria",         label: "Acceptance Criteria",  icon: "✅" },
  { key: "story_state.files_changed",               label: "Files Changed",        icon: "📁" },
  { key: "learnings.test_coverage_map",             label: "Test Coverage Map",    icon: "🧪" },
  { key: "learnings.patterns_used",                 label: "Patterns Used",        icon: "🔗" },
  { key: "story_state.deploy_status",               label: "Deploy Status",        icon: "🚀" },
];

const SAMPLE_REPOS = [
  { name: "app-frontend",  stack: "React/TS",     assigned: false },
  { name: "app-backend",   stack: "Spring Boot",  assigned: false },
  { name: "app-infra",     stack: "Terraform",    assigned: false },
  { name: "app-e2e",       stack: "Playwright",   assigned: false },
];

// ─── Styles ──────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600&family=Inter:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #070d1a; }
  :root {
    --bg: #070d1a; --surface: #0d1526; --surface2: #121e36;
    --border: #1a2840; --border2: #1f3050;
    --text: #e2e8f0; --muted: #64748b; --dim: #94a3b8;
    --blue: #3b82f6; --cyan: #06b6d4; --green: #10b981;
    --amber: #f59e0b; --purple: #8b5cf6; --pink: #ec4899; --red: #ef4444;
    --mono: 'JetBrains Mono', monospace;
    --sans: 'Inter', sans-serif;
  }
  .app { min-height:100vh; background:var(--bg); color:var(--text); font-family:var(--sans); display:flex; flex-direction:column; }
  /* Header */
  .hdr { background:var(--surface); border-bottom:1px solid var(--border); padding:14px 20px; display:flex; align-items:center; gap:16px; flex-shrink:0; }
  .hdr-logo { font-size:20px; }
  .hdr-title { font-size:15px; font-weight:700; color:#fff; }
  .hdr-sub { font-size:11px; color:var(--muted); font-family:var(--mono); }
  .hdr-right { margin-left:auto; display:flex; align-items:center; gap:10px; }
  .status-dot { width:8px; height:8px; border-radius:50%; background:var(--green); }
  .status-dot.idle { background:var(--muted); }
  .status-dot.running { animation:pulse 1s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
  .status-label { font-size:11px; font-family:var(--mono); color:var(--dim); }
  /* Layout */
  .body { display:grid; grid-template-columns:260px 1fr 320px; flex:1; overflow:hidden; height:calc(100vh - 53px); }
  /* Left sidebar - pipeline */
  .sidebar { background:var(--surface); border-right:1px solid var(--border); display:flex; flex-direction:column; overflow-y:auto; }
  .sidebar-section { padding:14px 16px; border-bottom:1px solid var(--border); }
  .sidebar-label { font-size:10px; font-family:var(--mono); color:var(--muted); letter-spacing:2px; text-transform:uppercase; margin-bottom:12px; }
  .stage-item { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:8px; margin-bottom:3px; cursor:pointer; transition:all 0.15s; position:relative; }
  .stage-item:hover { background:var(--surface2); }
  .stage-item.active { background:rgba(59,130,246,0.12); }
  .stage-item.done .stage-status-dot { background:var(--green); }
  .stage-item.running .stage-status-dot { background:var(--blue); animation:pulse 1s infinite; }
  .stage-item.error .stage-status-dot { background:var(--red); }
  .stage-item.gate-item { background:rgba(245,158,11,0.06); border:1px dashed rgba(245,158,11,0.25); margin:6px 0; cursor:default; }
  .stage-item.gate-item.waiting { background:rgba(245,158,11,0.12); }
  .stage-status-dot { width:7px; height:7px; border-radius:50%; background:var(--border2); flex-shrink:0; }
  .stage-icon-s { font-size:14px; flex-shrink:0; width:20px; text-align:center; }
  .stage-info { flex:1; min-width:0; }
  .stage-name-s { font-size:12px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .stage-agent-s { font-size:10px; color:var(--muted); font-family:var(--mono); }
  .stage-time { font-size:10px; color:var(--muted); font-family:var(--mono); flex-shrink:0; }
  /* Center - logs */
  .center { display:flex; flex-direction:column; overflow:hidden; }
  .center-top { display:grid; grid-template-columns:1fr 1fr 1fr; gap:1px; background:var(--border); border-bottom:1px solid var(--border); flex-shrink:0; }
  .metric-box { background:var(--surface); padding:14px 18px; }
  .metric-val { font-size:20px; font-weight:700; font-family:var(--mono); }
  .metric-label { font-size:11px; color:var(--muted); margin-top:2px; }
  .log-area { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:3px; }
  .log-entry { display:flex; gap:10px; padding:6px 10px; border-radius:6px; transition:background 0.15s; font-size:12px; line-height:1.5; }
  .log-entry:hover { background:var(--surface); }
  .log-time { font-family:var(--mono); font-size:10px; color:var(--muted); flex-shrink:0; padding-top:1px; }
  .log-type { font-family:var(--mono); font-size:10px; padding:1px 6px; border-radius:4px; flex-shrink:0; height:18px; margin-top:1px; }
  .log-type.info { background:rgba(59,130,246,0.15); color:#93c5fd; }
  .log-type.tool { background:rgba(16,185,129,0.15); color:#6ee7b7; }
  .log-type.llm  { background:rgba(139,92,246,0.15); color:#c4b5fd; }
  .log-type.gate { background:rgba(245,158,11,0.15); color:#fcd34d; }
  .log-type.error{ background:rgba(239,68,68,0.15); color:#fca5a5; }
  .log-type.done { background:rgba(16,185,129,0.15); color:#6ee7b7; }
  .log-msg { color:var(--dim); flex:1; }
  .log-msg strong { color:var(--text); font-weight:500; }
  .log-msg code { font-family:var(--mono); font-size:10px; background:rgba(255,255,255,0.05); padding:1px 5px; border-radius:3px; color:#c4b5fd; }
  /* Controls */
  .controls { background:var(--surface); border-top:1px solid var(--border); padding:12px 16px; display:flex; gap:10px; align-items:center; flex-shrink:0; }
  .input-box { flex:1; background:var(--bg); border:1px solid var(--border2); border-radius:8px; padding:8px 14px; font-size:13px; color:var(--text); font-family:var(--sans); outline:none; }
  .input-box:focus { border-color:var(--blue); }
  .input-box::placeholder { color:var(--muted); }
  .btn { padding:8px 16px; border-radius:8px; border:none; font-size:12px; font-weight:600; cursor:pointer; transition:all 0.15s; font-family:var(--sans); }
  .btn-primary { background:var(--blue); color:#fff; }
  .btn-primary:hover { background:#2563eb; }
  .btn-primary:disabled { background:#1e3a5f; color:var(--muted); cursor:not-allowed; }
  .btn-amber { background:rgba(245,158,11,0.2); color:#fcd34d; border:1px solid rgba(245,158,11,0.3); }
  .btn-amber:hover { background:rgba(245,158,11,0.3); }
  .btn-ghost { background:transparent; color:var(--dim); border:1px solid var(--border2); }
  .btn-ghost:hover { border-color:var(--border2); background:var(--surface2); }
  /* Right panel */
  .right-panel { background:var(--surface); border-left:1px solid var(--border); display:flex; flex-direction:column; overflow:hidden; }
  .rp-tabs { display:flex; border-bottom:1px solid var(--border); flex-shrink:0; }
  .rp-tab { flex:1; padding:10px 6px; text-align:center; font-size:11px; font-family:var(--mono); color:var(--muted); cursor:pointer; border-bottom:2px solid transparent; transition:all 0.15s; }
  .rp-tab.active { color:var(--blue); border-bottom-color:var(--blue); }
  .rp-content { flex:1; overflow-y:auto; padding:14px; }
  /* Memory viewer */
  .mem-item { background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:12px; margin-bottom:8px; }
  .mem-header { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
  .mem-icon { font-size:14px; }
  .mem-key { font-family:var(--mono); font-size:10px; color:var(--cyan); }
  .mem-label { font-size:12px; font-weight:500; }
  .mem-value { font-size:11px; color:var(--dim); font-family:var(--mono); background:var(--bg); padding:8px 10px; border-radius:6px; line-height:1.6; word-break:break-all; }
  .mem-empty { font-size:11px; color:var(--border2); font-style:italic; }
  /* Repo panel */
  .repo-item { display:flex; align-items:center; gap:10px; padding:10px 12px; border:1px solid var(--border); border-radius:8px; margin-bottom:8px; }
  .repo-dot { width:8px; height:8px; border-radius:50%; background:var(--border2); flex-shrink:0; }
  .repo-dot.assigned { background:var(--green); }
  .repo-name-r { font-family:var(--mono); font-size:12px; color:var(--cyan); flex:1; }
  .repo-stack { font-size:10px; color:var(--muted); }
  /* Tool calls */
  .tool-call { background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.15); border-radius:8px; padding:10px 12px; margin-bottom:8px; }
  .tool-call-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
  .tool-call-name { font-family:var(--mono); font-size:12px; color:#6ee7b7; }
  .tool-call-time { font-size:10px; color:var(--muted); font-family:var(--mono); }
  .tool-call-args { font-family:var(--mono); font-size:10px; color:var(--dim); background:var(--bg); padding:6px 8px; border-radius:4px; word-break:break-all; line-height:1.6; }
  /* Gate UI */
  .gate-card { background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.25); border-radius:12px; padding:20px; text-align:center; }
  .gate-title { font-size:16px; font-weight:700; color:#fcd34d; margin-bottom:8px; }
  .gate-desc { font-size:12px; color:var(--dim); margin-bottom:16px; line-height:1.6; }
  .gate-btns { display:flex; gap:8px; justify-content:center; }
  .btn-approve { background:rgba(16,185,129,0.2); color:#6ee7b7; border:1px solid rgba(16,185,129,0.3); }
  .btn-approve:hover { background:rgba(16,185,129,0.35); }
  .btn-reject { background:rgba(239,68,68,0.2); color:#fca5a5; border:1px solid rgba(239,68,68,0.3); }
  .btn-reject:hover { background:rgba(239,68,68,0.35); }
  /* Streaming cursor */
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
  .cursor { display:inline-block; width:6px; height:12px; background:var(--blue); margin-left:2px; animation:blink 1s infinite; vertical-align:middle; }
  /* Scrollbar */
  ::-webkit-scrollbar { width:4px; }
  ::-webkit-scrollbar-track { background:transparent; }
  ::-webkit-scrollbar-thumb { background:var(--border2); border-radius:2px; }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const now = () => new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
let logIdCounter = 0;
const makeLog = (type, msg) => ({ id: ++logIdCounter, time: now(), type, msg });

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SDLCMonitor() {
  const [stageStatus, setStageStatus] = useState({});   // stageId → 'idle'|'running'|'done'|'error'|'waiting'
  const [logs, setLogs] = useState([]);
  const [memory, setMemory] = useState({});
  const [repos, setRepos] = useState(SAMPLE_REPOS);
  const [toolCalls, setToolCalls] = useState([]);
  const [rightTab, setRightTab] = useState("memory");
  const [running, setRunning] = useState(false);
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [ideaInput, setIdeaInput] = useState("Build a user authentication system with JWT login, registration, profile management, and role-based access control for our app.");
  const [stats, setStats] = useState({ stories: 0, tokens: 0, cost: 0 });
  const [currentStage, setCurrentStage] = useState(null);
  const [streamText, setStreamText] = useState("");
  const logRef = useRef(null);
  const abortRef = useRef(null);
  const resumeRef = useRef(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs, streamText]);

  const addLog = useCallback((type, msg) => {
    setLogs(prev => [...prev, makeLog(type, msg)]);
  }, []);

  const setStage = (id, status) => {
    setCurrentStage(id);
    setStageStatus(prev => ({ ...prev, [id]: status }));
  };

  const updateMemory = (key, value) => {
    setMemory(prev => ({ ...prev, [key]: value }));
  };

  const addToolCall = (name, args, result) => {
    setToolCalls(prev => [{ id: Date.now(), name, args, result, time: now() }, ...prev.slice(0, 19)]);
  };

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  // ── Call Claude API ──────────────────────────────────────────────────────
  const callClaude = async (systemPrompt, userPrompt, onToken) => {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        stream: true,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      })
    });
    if (!resp.ok) throw new Error(`API ${resp.status}`);
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "content_block_delta" && data.delta?.text) {
              full += data.delta.text;
              onToken(full);
            }
          } catch {}
        }
      }
    }
    return full;
  };

  // ── Stage Runners ─────────────────────────────────────────────────────────
  const runStage = async (stageId, stageName, agentLabel, system, prompt) => {
    setStage(stageId, "running");
    addLog("info", `<strong>${agentLabel}</strong> started — stage: <code>${stageName}</code>`);
    addLog("llm", `LLM invoked → streaming response...`);
    setStreamText("");
    const result = await callClaude(system, prompt, (text) => setStreamText(text));
    setStreamText("");
    setStage(stageId, "done");
    addLog("done", `<strong>${agentLabel}</strong> completed ✓`);
    return result;
  };

  // ── Main Orchestration ────────────────────────────────────────────────────
  const runPipeline = async () => {
    setRunning(true);
    setLogs([]);
    setStageStatus({});
    setMemory({});
    setToolCalls([]);
    setRepos(SAMPLE_REPOS);
    setStats({ stories: 0, tokens: 0, cost: 0 });
    setWaitingForApproval(false);

    addLog("info", `Pipeline started for idea: <strong>"${ideaInput.slice(0, 80)}…"</strong>`);
    await delay(400);

    try {
      // ── Stage 1: Confluence Ingestion ───────────────────────────────────
      setStage("confluence", "running");
      addLog("tool", `Tool called → <code>confluence_read</code> · space: MY-SPACE, page: idea-doc`);
      addToolCall("confluence_read", '{ "space": "MY-SPACE", "pageId": "idea-doc-001" }', "Page content loaded (4.2KB)");
      await delay(600);

      const confluenceResult = await runStage(
        "confluence", "Confluence Ingestion", "ConfluenceAgent",
        "You are a requirements extraction agent. Extract structured requirements from the given idea. Return JSON with: { requirements: string[], acceptance_criteria: string[], tech_hints: string[] }. Be concise.",
        `Extract requirements from this idea: "${ideaInput}"`
      );

      let requirements, acceptanceCriteria;
      try {
        const clean = confluenceResult.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        requirements = parsed.requirements || [];
        acceptanceCriteria = parsed.acceptance_criteria || [];
      } catch {
        requirements = ["User authentication", "JWT token management", "Role-based access control"];
        acceptanceCriteria = ["User can register with email/password", "User can login and receive JWT", "Routes are protected by role"];
      }
      updateMemory("project_context.architecture_decisions", "Spring Boot + React + JWT");
      updateMemory("project_context.tech_stack", "Java 21, Spring Boot 3, React 18, PostgreSQL");
      addLog("info", `Extracted <strong>${requirements.length} requirements</strong> and <strong>${acceptanceCriteria.length} acceptance criteria</strong>`);
      setStats(s => ({ ...s, tokens: s.tokens + 480 }));
      await delay(300);

      // ── Stage 2: Story Generation ───────────────────────────────────────
      addLog("tool", `Tool called → <code>jira_create_epic</code> · project: MYAPP`);
      addToolCall("jira_create_epic", '{ "project": "MYAPP", "summary": "User Authentication System" }', "Epic MYAPP-42 created");
      await delay(500);

      const storyResult = await runStage(
        "stories", "Epic & Story Gen", "StoryAgent",
        `You are a Jira story generation agent. Given requirements and acceptance criteria, generate 3-5 user stories in JSON format: { stories: [{ id, summary, description, acceptance_criteria: string[], story_points, repos: string[] }] }. Keep it concise.`,
        `Requirements: ${requirements.slice(0, 3).join(", ")}.\nAcceptance criteria: ${acceptanceCriteria.slice(0, 3).join(", ")}`
      );

      let stories;
      try {
        const clean = storyResult.replace(/```json|```/g, "").trim();
        stories = JSON.parse(clean).stories || [];
      } catch {
        stories = [
          { id: "MYAPP-43", summary: "User Registration API", repos: ["app-backend"] },
          { id: "MYAPP-44", summary: "JWT Login Endpoint", repos: ["app-backend"] },
          { id: "MYAPP-45", summary: "Login UI Form", repos: ["app-frontend", "app-backend"] },
        ];
      }

      const storyCount = stories.length || 3;
      setStats(s => ({ ...s, stories: storyCount, tokens: s.tokens + 620, cost: +(s.cost + 0.008).toFixed(4) }));
      updateMemory("story_state.acceptance_criteria", acceptanceCriteria.slice(0, 3).join(" | "));

      stories.forEach(st => {
        addLog("tool", `Tool called → <code>jira_create_story</code> · <code>${st.id || "MYAPP-4X"}</code>: ${st.summary || "New story"}`);
        addToolCall("jira_create_story", JSON.stringify({ summary: st.summary, epic: "MYAPP-42" }), `Story ${st.id} created`);
      });

      const assignedRepos = [...new Set(stories.flatMap(s => s.repos || ["app-backend"]))];
      setRepos(prev => prev.map(r => ({ ...r, assigned: assignedRepos.includes(r.name) })));
      addLog("info", `Repos assigned: <code>${assignedRepos.join(", ")}</code>`);
      await delay(300);

      // ── Stage 3: Solution Design ────────────────────────────────────────
      addLog("tool", `Tool called → <code>mermaid_generator</code> · diagram type: sequence`);
      addToolCall("mermaid_generator", '{ "type": "sequence", "actors": ["Client","API","AuthService","DB"] }', "Mermaid diagram generated (24 lines)");
      await delay(400);

      const designResult = await runStage(
        "design", "Solution Design", "DesignAgent",
        "You are a solution architect agent. Produce a brief Technical Design Summary for the given stories. Include: architecture approach, key components, API endpoints, data model notes, security considerations. Keep under 200 words.",
        `Design solution for: ${stories.map(s => s.summary || s).slice(0, 3).join(", ")}`
      );

      updateMemory("project_context.architecture_decisions", designResult.slice(0, 180) + "...");
      addLog("tool", `Tool called → <code>confluence_write</code> · page: TSD-Auth-System`);
      addToolCall("confluence_write", '{ "title": "TSD: Auth System", "space": "TECH" }', "Page created: https://wiki/TSD-Auth-System");
      setStats(s => ({ ...s, tokens: s.tokens + 890, cost: +(s.cost + 0.014).toFixed(4) }));
      await delay(300);

      // ── GATE 1: PO Review ───────────────────────────────────────────────
      setStage("po_gate", "waiting");
      setWaitingForApproval(true);
      setRightTab("gate");
      addLog("gate", `⏸ <strong>PO REVIEW GATE</strong> — ${storyCount} stories created in Jira. PO must approve before design starts.`);
      addToolCall("jira_notify", '{ "project": "CTS", "message": "Stories ready for PO review" }', "PO notified ✓");

      await new Promise(resolve => { resumeRef.current = resolve; });
      setWaitingForApproval(false);
      setStage("po_gate", "done");
      addLog("gate", `✅ <strong>PO Approved stories</strong> — proceeding to Technical Design`);
      await delay(400);

      // ── Stage 3: Solution Design ────────────────────────────────────────
      addLog("tool", `Tool called → <code>mermaid_generator</code> · diagram type: sequence`);
      addToolCall("mermaid_generator", '{ "type": "sequence", "actors": ["Client","API","AuthService","DB"] }', "Mermaid diagram generated (24 lines)");
      await delay(400);

      const designResult = await runStage(
        "design", "Technical Design", "DesignAgent",
        "You are a solution architect agent. Produce a brief Technical Design Summary for the given stories. Include: architecture approach, key components, API endpoints, data model notes, security considerations. Keep under 200 words.",
        `Design solution for: ${stories.map(s => s.summary || s).slice(0, 3).join(", ")}`
      );

      updateMemory("project_context.architecture_decisions", designResult.slice(0, 180) + "...");
      addLog("tool", `Tool called → <code>confluence_create_page</code> · title: TSD — Auth System`);
      addToolCall("confluence_create_page", '{ "space": "SD", "parent": "50200578", "title": "TSD: Auth System" }', "Page id=50200999 created");
      addLog("tool", `Tool called → <code>jira_add_comment</code> · CTS-43: TSD link attached for arch review`);
      setStats(s => ({ ...s, tokens: s.tokens + 890, cost: +(s.cost + 0.014).toFixed(4) }));
      await delay(300);

      // ── GATE 2: Architect Review ─────────────────────────────────────────
      setStage("arch_gate", "waiting");
      setWaitingForApproval(true);
      setRightTab("gate");
      addLog("gate", `⏸ <strong>ARCHITECT REVIEW GATE</strong> — TSD published to Confluence. Architect must approve before implementation.`);
      addLog("gate", `Notification sent → <code>slack_notify</code> · channel: #arch-reviews`);
      addToolCall("slack_notify", '{ "channel": "#arch-reviews", "message": "TSD ready for review", "url": "https://wiki/SD/pages/50200999" }', "Notification sent ✓");

      await new Promise(resolve => { resumeRef.current = resolve; });
      setWaitingForApproval(false);
      setRightTab("memory");
      setStage("arch_gate", "done");
      addLog("gate", `✅ <strong>Architect approved TSD</strong> — pipeline resuming`);
      await delay(400);

      // ── Stage 4: Implementation ─────────────────────────────────────────
      addLog("tool", `Tool called → <code>github_branch</code> · repo: app-backend · branch: feature/MYAPP-43-auth`);
      addToolCall("github_branch", '{ "repo": "app-backend", "branch": "feature/MYAPP-43-auth" }', "Branch created ✓");
      addLog("tool", `Tool called → <code>github_branch</code> · repo: app-frontend · branch: feature/MYAPP-45-login-ui`);
      await delay(300);

      const codeResult = await runStage(
        "implement", "Implementation", "ImplementationAgent",
        "You are a code implementation agent. Generate a concise but real Spring Boot JWT authentication controller snippet with register and login endpoints. Include package declaration, imports, and the controller class. Keep it practical.",
        `Implement: JWT Authentication for ${stories[0]?.summary || "User Auth"}. Show the main AuthController.java with /api/auth/register and /api/auth/login endpoints.`
      );

      updateMemory("story_state.files_changed", "AuthController.java, JwtService.java, UserRepository.java, LoginForm.tsx");
      updateMemory("learnings.patterns_used", "Repository pattern, Service layer, JWT stateless auth, Spring Security filter chain");
      addLog("tool", `Tool called → <code>github_commit</code> · 3 files · "feat(auth): implement JWT register and login endpoints"`);
      addToolCall("github_commit", '{ "files": ["AuthController.java","JwtService.java"], "message": "feat(auth): JWT endpoints" }', "Committed: sha abc1234");
      setStats(s => ({ ...s, tokens: s.tokens + 1100, cost: +(s.cost + 0.017).toFixed(4) }));
      await delay(300);

      // ── Stage 5: Test Generation ────────────────────────────────────────
      addLog("tool", `Tool called → <code>file_writer</code> · AuthControllerTest.java`);
      addToolCall("file_writer", '{ "path": "src/test/AuthControllerTest.java" }', "File written (87 lines)");

      const testResult = await runStage(
        "test", "Test Generation", "TestAgent",
        "You are a test generation agent. Write a concise JUnit 5 test class for a Spring Boot JWT auth controller. Include @SpringBootTest, MockMvc, tests for register success, login success, and login with bad credentials. Keep it under 60 lines.",
        `Write tests for: ${stories[0]?.summary || "JWT Auth Controller"} with endpoints /api/auth/register and /api/auth/login`
      );

      updateMemory("learnings.test_coverage_map", "AuthController: 87%, JwtService: 92%, UserService: 78%");
      addLog("tool", `Tool called → <code>test_runner</code> · maven test · result: 12 passed, 0 failed`);
      addToolCall("test_runner", '{ "command": "mvn test", "module": "auth" }', "✓ 12 tests passed, coverage: 87%");
      addLog("info", `Coverage: <strong>87%</strong> — threshold met ✓`);
      setStats(s => ({ ...s, tokens: s.tokens + 780, cost: +(s.cost + 0.011).toFixed(4) }));
      await delay(300);

      // ── Stage 6: Code Review ────────────────────────────────────────────
      addLog("tool", `Tool called → <code>security_scan</code> · semgrep · 0 critical, 1 warning`);
      addToolCall("security_scan", '{ "tool": "semgrep", "repo": "app-backend" }', "0 critical, 1 warning: token expiry not configurable");

      const reviewResult = await runStage(
        "review", "Code Review", "ReviewAgent",
        "You are a code review agent. Provide a concise structured code review with: APPROVED or REQUEST_CHANGES verdict, 2-3 specific inline comments, security notes, and a summary. Keep under 150 words.",
        `Review the JWT auth implementation. Focus on: security best practices, error handling, Spring Security config, test coverage adequacy.`
      );

      updateMemory("learnings.review_comments", reviewResult.slice(0, 200));
      addLog("tool", `Tool called → <code>github_create_pr</code> · "feat: JWT auth system" → main`);
      addToolCall("github_create_pr", '{ "title": "feat: JWT auth system", "base": "main" }', "PR #47 created: github.com/org/app-backend/pull/47");
      addLog("info", `PR #47 created with <strong>3 inline comments</strong> — status: APPROVED`);
      setStats(s => ({ ...s, tokens: s.tokens + 650, cost: +(s.cost + 0.010).toFixed(4) }));
      await delay(300);

      // ── Stage 7: Deploy ──────────────────────────────────────────────────
      for (const env of ["dev", "staging", "prod"]) {
        addLog("tool", `Tool called → <code>ci_trigger</code> · env: <code>${env}</code>`);
        addToolCall("ci_trigger", `{ "env": "${env}", "pr": "47" }`, `Deploy to ${env} started`);
        await delay(env === "prod" ? 600 : 350);
        addLog("tool", `Tool called → <code>health_checker</code> · <code>${env}</code> → 200 OK`);
        addToolCall("health_checker", `{ "url": "https://${env}.myapp.com/health" }`, `200 OK — latency: ${env === "prod" ? "42" : "28"}ms`);
        addLog("info", `✅ <code>${env}</code> deployment healthy`);
      }
      setStage("deploy", "done");
      updateMemory("story_state.deploy_status", "dev: ✅  staging: ✅  prod: ✅");
      updateMemory("tool_config.env_urls", "dev: https://dev.myapp.com | staging: https://staging.myapp.com | prod: https://myapp.com");
      setStats(s => ({ ...s, tokens: s.tokens + 220, cost: +(s.cost + 0.003).toFixed(4) }));
      await delay(300);

      // ── Stage 8: E2E Tests ───────────────────────────────────────────────
      addLog("tool", `Tool called → <code>file_writer</code> · auth.spec.ts (Playwright)`);
      addToolCall("file_writer", '{ "path": "e2e/auth.spec.ts", "framework": "playwright" }', "E2E spec written (54 lines)");

      await runStage(
        "e2e", "E2E Frontend Tests", "E2ETestAgent",
        "You are an E2E test generation agent. Write a concise Playwright TypeScript test spec for a login flow. Include: navigate to login page, fill credentials, submit, verify redirect to dashboard, verify user name displayed. Keep under 40 lines.",
        `Write Playwright E2E tests for the login user story covering: registration page, login flow, dashboard redirect, role-based nav visibility.`
      );

      addLog("tool", `Tool called → <code>playwright_runner</code> · 3 envs · 8 tests`);
      addToolCall("playwright_runner", '{ "spec": "auth.spec.ts", "envs": ["dev","staging","prod"] }', "✓ 8/8 tests passed across all envs");
      addLog("tool", `Tool called → <code>screenshot_capturer</code> · 6 screenshots saved`);
      addLog("info", `E2E results: <strong>8/8 tests passed</strong> across dev, staging, prod ✅`);
      updateMemory("learnings.e2e_test_suite", "auth.spec.ts: register_flow, login_success, login_invalid, dashboard_redirect, nav_admin, nav_user, logout, token_expiry");
      setStats(s => ({ ...s, tokens: s.tokens + 540, cost: +(s.cost + 0.008).toFixed(4) }));

      addLog("done", `🎉 <strong>Pipeline complete!</strong> Story MYAPP-43 fully implemented, tested, and deployed.`);
      setCurrentStage(null);

    } catch (err) {
      addLog("error", `Pipeline error: <strong>${err.message}</strong>`);
      if (currentStage) setStage(currentStage, "error");
    } finally {
      setRunning(false);
      setStreamText("");
    }
  };

  const handleApprove = () => { if (resumeRef.current) resumeRef.current(true); };
  const handleReset = () => { setLogs([]); setStageStatus({}); setMemory({}); setToolCalls([]); setRepos(SAMPLE_REPOS); setStats({ stories: 0, tokens: 0, cost: 0 }); setCurrentStage(null); setStreamText(""); setWaitingForApproval(false); };

  const isIdle = !running;

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {/* Header */}
        <div className="hdr">
          <div className="hdr-logo">⚡</div>
          <div>
            <div className="hdr-title">SDLC Orchestration Platform</div>
            <div className="hdr-sub">LangGraph · Bedrock · Vertex AI · 9 Agents</div>
          </div>
          <div className="hdr-right">
            <div className={`status-dot ${running ? "running" : "idle"}`}></div>
            <div className="status-label">{running ? (waitingForApproval ? "WAITING FOR APPROVAL" : "RUNNING") : "IDLE"}</div>
          </div>
        </div>

        <div className="body">
          {/* Left: Pipeline Sidebar */}
          <div className="sidebar">
            <div className="sidebar-section">
              <div className="sidebar-label">SDLC Pipeline</div>
              {STAGES.map(s => {
                const status = stageStatus[s.id] || "idle";
                if (s.isGate) return (
                  <div key={s.id} className={`stage-item gate-item ${status === "waiting" ? "waiting" : ""}`}>
                    <span className="stage-icon-s">{s.icon}</span>
                    <div className="stage-info">
                      <div className="stage-name-s" style={{ color: status === "waiting" ? "#fcd34d" : "#64748b", fontSize: "11px" }}>{s.label}</div>
                      {status === "waiting" && <div className="stage-agent-s" style={{ color: "#f59e0b" }}>awaiting approval...</div>}
                    </div>
                  </div>
                );
                return (
                  <div key={s.id} className={`stage-item ${status} ${currentStage === s.id ? "active" : ""}`}>
                    <div className="stage-status-dot"></div>
                    <span className="stage-icon-s">{s.icon}</span>
                    <div className="stage-info">
                      <div className="stage-name-s">{s.label}</div>
                      <div className="stage-agent-s">{s.agent}</div>
                    </div>
                    {status === "done" && <span className="stage-time" style={{ color: "#10b981" }}>✓</span>}
                    {status === "running" && <span className="stage-time" style={{ color: "#3b82f6" }}>…</span>}
                  </div>
                );
              })}
            </div>
            <div className="sidebar-section" style={{ flex: 1 }}>
              <div className="sidebar-label">Repositories</div>
              {repos.map(r => (
                <div key={r.name} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderBottom: "1px solid #1a2840" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: r.assigned ? "#10b981" : "#1f3050", flexShrink: 0 }}></div>
                  <div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: r.assigned ? "#06b6d4" : "#475569" }}>{r.name}</div>
                    <div style={{ fontSize: 10, color: "#475569" }}>{r.stack}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center: Logs */}
          <div className="center">
            <div className="center-top">
              <div className="metric-box">
                <div className="metric-val" style={{ color: "#06b6d4" }}>{stats.stories}</div>
                <div className="metric-label">Stories Generated</div>
              </div>
              <div className="metric-box">
                <div className="metric-val" style={{ color: "#8b5cf6" }}>{stats.tokens.toLocaleString()}</div>
                <div className="metric-label">Tokens Used</div>
              </div>
              <div className="metric-box">
                <div className="metric-val" style={{ color: "#10b981" }}>${stats.cost.toFixed(4)}</div>
                <div className="metric-label">Est. Cost</div>
              </div>
            </div>

            <div className="log-area" ref={logRef}>
              {logs.length === 0 && (
                <div style={{ textAlign: "center", color: "#1f3050", padding: "60px 0", fontFamily: "var(--mono)", fontSize: 13 }}>
                  Enter an idea below and click Run Pipeline
                </div>
              )}
              {logs.map(log => (
                <div key={log.id} className="log-entry">
                  <span className="log-time">{log.time}</span>
                  <span className={`log-type ${log.type}`}>{log.type.toUpperCase()}</span>
                  <span className="log-msg" dangerouslySetInnerHTML={{ __html: log.msg }}></span>
                </div>
              ))}
              {streamText && (
                <div className="log-entry" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 8 }}>
                  <span className="log-time">{now()}</span>
                  <span className="log-type llm">STREAM</span>
                  <span className="log-msg" style={{ whiteSpace: "pre-wrap", fontFamily: "var(--mono)", fontSize: 11 }}>
                    {streamText}<span className="cursor"></span>
                  </span>
                </div>
              )}
            </div>

            <div className="controls">
              <input
                className="input-box"
                value={ideaInput}
                onChange={e => setIdeaInput(e.target.value)}
                placeholder="Describe your feature idea..."
                disabled={running}
              />
              <button className="btn btn-primary" onClick={runPipeline} disabled={running || !ideaInput.trim()}>
                {running ? "Running…" : "▶ Run Pipeline"}
              </button>
              <button className="btn btn-ghost" onClick={handleReset} disabled={running}>Reset</button>
            </div>
          </div>

          {/* Right: Memory / Tools / Gate */}
          <div className="right-panel">
            <div className="rp-tabs">
              {["memory", "tools", "gate"].map(t => (
                <div key={t} className={`rp-tab ${rightTab === t ? "active" : ""}`} onClick={() => setRightTab(t)}>
                  {t === "memory" ? "🧠 MEMORY" : t === "tools" ? "🔧 TOOLS" : "🔐 GATE"}
                </div>
              ))}
            </div>
            <div className="rp-content">
              {rightTab === "memory" && (
                <div>
                  <div style={{ fontSize: 11, color: "#475569", fontFamily: "var(--mono)", marginBottom: 12 }}>
                    // Shared SDLCState — persists across all stories
                  </div>
                  {MEMORY_KEYS.map(m => (
                    <div key={m.key} className="mem-item">
                      <div className="mem-header">
                        <span className="mem-icon">{m.icon}</span>
                        <div>
                          <div className="mem-label">{m.label}</div>
                          <div className="mem-key">{m.key}</div>
                        </div>
                      </div>
                      {memory[m.key]
                        ? <div className="mem-value">{memory[m.key]}</div>
                        : <div className="mem-empty">not yet populated</div>}
                    </div>
                  ))}
                </div>
              )}
              {rightTab === "tools" && (
                <div>
                  <div style={{ fontSize: 11, color: "#475569", fontFamily: "var(--mono)", marginBottom: 12 }}>
                    // Tool calls — most recent first
                  </div>
                  {toolCalls.length === 0 && <div style={{ color: "#1f3050", fontSize: 12, fontFamily: "var(--mono)" }}>No tool calls yet</div>}
                  {toolCalls.map(tc => (
                    <div key={tc.id} className="tool-call">
                      <div className="tool-call-header">
                        <span className="tool-call-name">⚙ {tc.name}</span>
                        <span className="tool-call-time">{tc.time}</span>
                      </div>
                      <div className="tool-call-args" style={{ marginBottom: 4 }}>args: {tc.args}</div>
                      <div className="tool-call-args" style={{ color: "#6ee7b7" }}>→ {tc.result}</div>
                    </div>
                  ))}
                </div>
              )}
              {rightTab === "gate" && (
                <div>
                  {waitingForApproval ? (
                    <div className="gate-card">
                      <div style={{ fontSize: 28, marginBottom: 8 }}>🔐</div>
                      <div className="gate-title">Approval Required</div>
                      <div className="gate-desc">
                        The Design Agent has completed the Technical Solution Document (TSD) and architecture diagrams in Confluence. An architect must review and approve before implementation begins.
                      </div>
                      <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "10px 12px", marginBottom: 16, fontSize: 11, fontFamily: "var(--mono)", color: "#94a3b8", textAlign: "left" }}>
                        📄 TSD: Auth System<br/>
                        🏗️ Flow: Login Sequence Diagram<br/>
                        📐 ADR: JWT vs Sessions<br/>
                        🔒 Security Review Checklist
                      </div>
                      <div className="gate-btns">
                        <button className="btn btn-approve" onClick={handleApprove}>✅ Approve &amp; Continue</button>
                        <button className="btn btn-reject" onClick={handleReset}>❌ Reject &amp; Restart</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", color: "#1f3050", padding: "40px 0", fontFamily: "var(--mono)", fontSize: 12 }}>
                      {Object.values(stageStatus).includes("done")
                        ? "✅ Gate was approved — pipeline completed"
                        : "Gate will appear when Design stage completes"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
