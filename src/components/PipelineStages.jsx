const STAGES = [
  { id: 'confluence', label: 'Requirements',  icon: '📄', isGate: false },
  { id: 'stories',    label: 'Jira Stories',  icon: '📝', isGate: false },
  { id: 'po_gate',    label: 'PO Review',     icon: '👤', isGate: true,
    desc: 'Product Owner approves stories' },
  { id: 'design',     label: 'Tech Design',   icon: '🏗️', isGate: false },
  { id: 'arch_gate',  label: 'Arch Review',   icon: '🔐', isGate: true,
    desc: 'Architect approves TSD' },
  { id: 'implement',  label: 'Implement',     icon: '💻', isGate: false },
  { id: 'test',       label: 'Tests',         icon: '🧪', isGate: false },
  { id: 'review',     label: 'Code Review',   icon: '🔍', isGate: false },
  { id: 'deploy',     label: 'Deploy',        icon: '🚀', isGate: false },
  { id: 'e2e',        label: 'E2E Tests',     icon: '🌐', isGate: false },
]

const DOT = {
  idle:    'bg-gray-600',
  running: 'bg-yellow-400 animate-pulse',
  done:    'bg-green-500',
  error:   'bg-red-500',
  waiting: 'bg-yellow-500 animate-pulse',
}

export default function PipelineStages({ stageMap }) {
  return (
    <div className="flex flex-col gap-1 p-4">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Pipeline</h2>
      {STAGES.map((s) => {
        const state = stageMap[s.id] || 'idle'

        if (s.isGate) {
          const isWaiting = state === 'waiting'
          const isDone    = state === 'done'
          return (
            <div
              key={s.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border my-0.5
                ${isWaiting
                  ? 'border-yellow-500/50 bg-yellow-900/20'
                  : isDone
                  ? 'border-green-700/30 bg-green-900/10'
                  : 'border-dark-600/50 border-dashed'}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${DOT[state] || DOT.idle}`} />
              <span className="text-sm">{s.icon}</span>
              <div className="flex flex-col">
                <span className={`text-xs font-semibold
                  ${isWaiting ? 'text-yellow-300' : isDone ? 'text-green-400' : 'text-gray-500'}`}>
                  {s.label}
                </span>
                {isWaiting && (
                  <span className="text-[10px] text-yellow-500/80">{s.desc}</span>
                )}
              </div>
            </div>
          )
        }

        return (
          <div
            key={s.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
              ${state === 'running' ? 'bg-dark-700 border border-yellow-400/30' : 'hover:bg-dark-700'}`}
          >
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${DOT[state] || DOT.idle}`} />
            <span className="text-base">{s.icon}</span>
            <span className={`text-sm
              ${state === 'done'    ? 'text-green-400'
              : state === 'running' ? 'text-yellow-300'
              : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
