import { useState } from 'react'

const GATE_CONFIG = {
  po_gate: {
    title:    'PO Review — Approve Stories',
    emoji:    '👤',
    color:    'blue',
    desc:     'Stories have been created in Jira. Review them and approve to proceed to Technical Design.',
    approve:  'Approve Stories → Proceed to Design',
    reject:   'Reject — Revise Stories',
  },
  arch_gate: {
    title:    'Architect Review — Approve TSD',
    emoji:    '🔐',
    color:    'amber',
    desc:     'Technical Design Document has been published to Confluence. Review the architecture and approve to start implementation.',
    approve:  'Approve TSD → Start Implementation',
    reject:   'Reject — Revise Design',
  },
}

export default function ApprovalGate({ status, activeGate, gateMessage, onApprove }) {
  const [reason, setReason] = useState('')

  const waiting = status === 'awaiting_approval' && activeGate
  const cfg     = GATE_CONFIG[activeGate] || GATE_CONFIG.arch_gate

  const isAmber = cfg?.color === 'amber'
  const borderCls  = isAmber ? 'border-yellow-600/50'  : 'border-blue-600/50'
  const bgCls      = isAmber ? 'bg-yellow-900/20'       : 'bg-blue-900/20'
  const titleCls   = isAmber ? 'text-yellow-300'        : 'text-blue-300'
  const approveCls = isAmber ? 'bg-green-700 hover:bg-green-600' : 'bg-green-700 hover:bg-green-600'

  if (!waiting) {
    const pastGates = status !== 'idle' && !waiting
    return (
      <div className="p-4 text-gray-500 text-sm text-center mt-8">
        {status === 'idle'
          ? 'Gates will appear here during pipeline run'
          : pastGates
          ? 'All gates passed'
          : 'Waiting for pipeline to reach a gate…'}
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className={`border rounded-lg p-4 ${borderCls} ${bgCls}`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">{cfg.emoji}</span>
          <h3 className={`font-semibold text-base ${titleCls}`}>{cfg.title}</h3>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed mb-3">{cfg.desc}</p>
        {gateMessage && (
          <div className="bg-dark-900/60 rounded p-3 text-xs text-gray-300 font-mono leading-relaxed">
            {gateMessage}
          </div>
        )}
      </div>

      <div>
        <label className="text-xs text-gray-400 mb-1 block">Note (optional)</label>
        <textarea
          className="w-full bg-dark-700 border border-dark-600 rounded p-2 text-sm text-gray-200 resize-none focus:outline-none focus:border-yellow-500/50"
          rows={2}
          placeholder="Add a review note..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => { onApprove(true, reason); setReason('') }}
          className={`flex-1 ${approveCls} text-white text-xs font-semibold py-2.5 px-3 rounded-lg transition-colors`}
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
