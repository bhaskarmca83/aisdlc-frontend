const STAGES = [
  { id: 'confluence', label: 'Confluence', icon: '📄' },
  { id: 'stories',    label: 'Stories',    icon: '📝' },
  { id: 'design',     label: 'Design',     icon: '🎨' },
  { id: 'gate',       label: 'Gate',       icon: '🔐' },
  { id: 'implement',  label: 'Implement',  icon: '💻' },
  { id: 'test',       label: 'Test',       icon: '🧪' },
  { id: 'review',     label: 'Review',     icon: '🔍' },
  { id: 'deploy',     label: 'Deploy',     icon: '🚀' },
  { id: 'e2e',        label: 'E2E Tests',  icon: '🌐' },
]

const DOT = {
  idle:    'bg-gray-600',
  running: 'bg-yellow-400 animate-pulse',
  done:    'bg-green-500',
  error:   'bg-red-500',
}

export default function PipelineStages({ stageMap }) {
  return (
    <div className="flex flex-col gap-1 p-4">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Pipeline</h2>
      {STAGES.map((s) => {
        const state = stageMap[s.id] || 'idle'
        return (
          <div
            key={s.id}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
              ${state === 'running' ? 'bg-dark-700 border border-yellow-400/30' : 'hover:bg-dark-700'}`}
          >
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${DOT[state]}`} />
            <span className="text-base">{s.icon}</span>
            <span className={`text-sm ${state === 'done' ? 'text-green-400' : state === 'running' ? 'text-yellow-300' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
