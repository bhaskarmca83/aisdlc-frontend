import { useState } from 'react'
import { usePipeline } from './hooks/usePipeline'
import PipelineStages     from './components/PipelineStages'
import LogStream          from './components/LogStream'
import MemoryViewer       from './components/MemoryViewer'
import ToolCallInspector  from './components/ToolCallInspector'
import ApprovalGate       from './components/ApprovalGate'
import RepoPanel          from './components/RepoPanel'

const TABS = ['Memory', 'Tools', 'Gate']

export default function App() {
  const {
    executionId, status, stageMap, logs, toolCalls,
    stateSnapshot, metrics, streamBuffer,
    run, approve, reset,
  } = usePipeline()

  const [idea,        setIdea]        = useState('')
  const [projectName, setProjectName] = useState('SDLC Project')
  const [activeTab,   setActiveTab]   = useState('Memory')
  const [error,       setError]       = useState('')

  const handleRun = async () => {
    if (!idea.trim()) { setError('Please enter an idea'); return }
    setError('')
    try {
      await run({ idea, projectName })
    } catch (e) {
      setError(e.message)
    }
  }

  const statusColor = {
    idle:               'text-gray-500',
    running:            'text-yellow-400',
    awaiting_approval:  'text-yellow-300',
    completed:          'text-green-400',
    error:              'text-red-400',
  }[status] || 'text-gray-400'

  return (
    <div className="h-screen flex flex-col bg-dark-900 text-gray-100 overflow-hidden">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-dark-600 bg-dark-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-white">AI SDLC Orchestrator</span>
          <span className={`text-xs font-semibold uppercase tracking-wide ${statusColor}`}>
            {status}
          </span>
          {executionId && (
            <span className="text-[10px] text-gray-600 font-mono">{executionId.slice(0, 8)}…</span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>Stories: <strong className="text-white">{metrics.stories}</strong></span>
          <span>Tokens: <strong className="text-white">{metrics.tokens.toLocaleString()}</strong></span>
          <span>Est. Cost: <strong className="text-white">${metrics.cost.toFixed(4)}</strong></span>
        </div>
      </header>

      {/* Main 3-column layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Pipeline stages + Repo panel */}
        <aside className="w-52 flex-shrink-0 bg-dark-800 border-r border-dark-600 flex flex-col overflow-y-auto">
          <PipelineStages stageMap={stageMap} />
          <div className="border-t border-dark-600 mt-2" />
          <RepoPanel stateSnapshot={stateSnapshot} />
        </aside>

        {/* Center: Log stream */}
        <main className="flex-1 flex flex-col overflow-hidden border-r border-dark-600">
          <LogStream logs={logs} streamBuffer={streamBuffer} />

          {/* Bottom input bar */}
          <div className="border-t border-dark-600 p-3 bg-dark-800 flex-shrink-0">
            {error && <div className="text-red-400 text-xs mb-2">{error}</div>}
            <input
              type="text"
              placeholder="Project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-1.5 text-sm text-gray-200 mb-2 focus:outline-none focus:border-blue-500/50"
              disabled={status === 'running' || status === 'awaiting_approval'}
            />
            <textarea
              placeholder="Describe your feature idea… (e.g. Add JWT auth to the Spring Boot app with login/register endpoints)"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={3}
              className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-blue-500/50"
              disabled={status === 'running' || status === 'awaiting_approval'}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleRun}
                disabled={status === 'running' || status === 'awaiting_approval'}
                className="flex-1 bg-blue-700 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                {status === 'running' ? '⚙️ Running…' : '▶ Run Pipeline'}
              </button>
              <button
                onClick={reset}
                className="bg-dark-700 hover:bg-dark-600 text-gray-400 text-sm py-2 px-3 rounded-lg transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </main>

        {/* Right: Tabs */}
        <aside className="w-72 flex-shrink-0 bg-dark-800 flex flex-col overflow-hidden">
          <div className="flex border-b border-dark-600">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`flex-1 py-2 text-xs font-semibold transition-colors ${
                  activeTab === t
                    ? 'text-white border-b-2 border-blue-500 bg-dark-700'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'Memory' && <MemoryViewer stateSnapshot={stateSnapshot} />}
            {activeTab === 'Tools'  && <ToolCallInspector toolCalls={toolCalls} />}
            {activeTab === 'Gate'   && <ApprovalGate status={status} onApprove={approve} />}
          </div>
        </aside>

      </div>
    </div>
  )
}
