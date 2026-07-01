import { useState } from 'react'

const GATE_CONFIG = {
  po_gate: {
    title:   'PO Review — Approve Stories',
    color:   'blue',
    desc:    'Stories have been created in Jira. Review them and approve to proceed to Technical Design.',
    approve: 'Approve Stories → Proceed to Design',
    reject:  'Reject — Revise Stories',
  },
  arch_gate: {
    title:   'Architect Review — Approve TSD',
    color:   'amber',
    desc:    'Technical Design Document has been published to Confluence. Review the architecture and approve to start implementation.',
    approve: 'Approve TSD → Start Implementation',
    reject:  'Reject — Revise Design',
  },
}

const JIRA_BASE = import.meta.env.VITE_JIRA_BASE_URL || 'https://bhaskarwork.atlassian.net'
const CONF_BASE = import.meta.env.VITE_CONFLUENCE_BASE_URL || 'https://bhaskarwork.atlassian.net/wiki'

function StoryCard({ story, jiraProject }) {
  const key  = story.jira_key
  const real = key && !key.includes('TBD')
  const pts  = story.story_points || '?'
  const prio = story.priority || ''
  const acs  = story.acceptance_criteria || []

  return (
    <div className="border border-dark-600 rounded p-2 text-xs bg-dark-900/40">
      <div className="flex items-start justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {real ? (
            <a
              href={`${JIRA_BASE}/browse/${key}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-mono font-semibold"
            >
              {key}
            </a>
          ) : (
            <span className="text-gray-500 font-mono">[in-memory]</span>
          )}
          <span className="text-gray-500">·</span>
          <span className="text-gray-400">{pts}pts</span>
          {prio && <span className="text-gray-500">{prio}</span>}
        </div>
        <span className="text-gray-500 shrink-0">{acs.length} ACs</span>
      </div>
      <p className="text-gray-300 leading-snug">{story.summary}</p>
      {acs.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {acs.slice(0, 2).map((ac, i) => (
            <li key={i} className="text-gray-500 truncate">· {ac}</li>
          ))}
          {acs.length > 2 && (
            <li className="text-gray-600">+ {acs.length - 2} more</li>
          )}
        </ul>
      )}
    </div>
  )
}

export default function ApprovalGate({ status, activeGate, gateMessage, stateSnapshot, onApprove }) {
  const [reason, setReason] = useState('')

  const waiting = status === 'awaiting_approval' && activeGate
  const cfg     = GATE_CONFIG[activeGate] || GATE_CONFIG.arch_gate

  const isAmber    = cfg?.color === 'amber'
  const borderCls  = isAmber ? 'border-yellow-600/50'        : 'border-blue-600/50'
  const bgCls      = isAmber ? 'bg-yellow-900/20'            : 'bg-blue-900/20'
  const titleCls   = isAmber ? 'text-yellow-300'             : 'text-blue-300'

  const stories   = stateSnapshot?.stories || []
  const jiraProj  = stateSnapshot?.target_jira_project || ''
  const confSpace = stateSnapshot?.target_confluence_space || 'SD'
  const reqPageId = stateSnapshot?.confluence_requirements_page_id || ''
  const tsdPageId = stateSnapshot?.confluence_tsd_page_id || ''
  const testCases = stateSnapshot?.test_cases || []

  if (!waiting) {
    return (
      <div className="p-4 text-gray-500 text-sm text-center mt-8">
        {status === 'idle'
          ? 'Gates will appear here during pipeline run'
          : 'All gates passed'}
      </div>
    )
  }

  return (
    <div className="p-3 flex flex-col gap-3">
      {/* Gate header */}
      <div className={`border rounded-lg p-3 ${borderCls} ${bgCls}`}>
        <h3 className={`font-semibold text-sm mb-1 ${titleCls}`}>{cfg.title}</h3>
        <p className="text-gray-400 text-xs leading-relaxed">{cfg.desc}</p>

        {/* Confluence links */}
        <div className="flex gap-3 mt-2 flex-wrap">
          {reqPageId && (
            <a
              href={`${CONF_BASE}/spaces/${confSpace}/pages/${reqPageId}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              📄 Requirements PRD
            </a>
          )}
          {tsdPageId && (
            <a
              href={`${CONF_BASE}/spaces/${confSpace}/pages/${tsdPageId}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-amber-400 hover:text-amber-300 underline"
            >
              🏗 Technical Design
            </a>
          )}
          {jiraProj && (
            <a
              href={`${JIRA_BASE}/jira/software/projects/${jiraProj}/boards`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              🎯 Jira Board
            </a>
          )}
        </div>
      </div>

      {/* Story cards (PO gate) */}
      {activeGate === 'po_gate' && stories.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-semibold">{stories.length} Stories</span>
            {testCases.length > 0 && (
              <span className="text-xs text-gray-500">{testCases.length} test cases derived</span>
            )}
          </div>
          {stories.map((s, i) => (
            <StoryCard key={i} story={s} jiraProject={jiraProj} />
          ))}
        </div>
      )}

      {/* Raw gate message fallback when no structured data */}
      {gateMessage && stories.length === 0 && (
        <div className="bg-dark-900/60 rounded p-3 text-xs text-gray-300 font-mono leading-relaxed whitespace-pre-wrap">
          {gateMessage}
        </div>
      )}

      {/* Rejection reason input */}
      <div>
        <label className="text-xs text-gray-400 mb-1 block">Note / rejection reason</label>
        <textarea
          className="w-full bg-dark-700 border border-dark-600 rounded p-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-yellow-500/50"
          rows={2}
          placeholder="Add a note or explain why you're rejecting…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => { onApprove(true, reason); setReason('') }}
          className="flex-1 bg-green-700 hover:bg-green-600 text-white text-xs font-semibold py-2.5 px-3 rounded-lg transition-colors"
        >
          ✅ {cfg.approve}
        </button>
        <button
          onClick={() => { onApprove(false, reason); setReason('') }}
          className="flex-1 bg-red-800 hover:bg-red-700 text-white text-xs font-semibold py-2.5 px-3 rounded-lg transition-colors"
        >
          ❌ {cfg.reject}
        </button>
      </div>
    </div>
  )
}
