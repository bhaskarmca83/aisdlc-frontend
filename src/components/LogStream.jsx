import { useEffect, useRef } from 'react'

const BADGE = {
  INFO:  'bg-blue-900 text-blue-300',
  TOOL:  'bg-green-900 text-green-300',
  LLM:   'bg-purple-900 text-purple-300',
  GATE:  'bg-yellow-900 text-yellow-300',
  DONE:  'bg-green-800 text-green-200',
  ERROR: 'bg-red-900 text-red-300',
  ROUTE: 'bg-orange-900 text-orange-300',
}

export default function LogStream({ logs, streamBuffer }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, streamBuffer])

  return (
    <div className="flex-1 overflow-y-auto font-mono text-xs p-3 space-y-0.5">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-2 items-start py-0.5 hover:bg-dark-700 rounded px-1">
          <span className="text-gray-500 flex-shrink-0 w-16">{log.ts}</span>
          <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold w-14 text-center ${BADGE[log.type] || 'bg-gray-800 text-gray-400'}`}>
            {log.type}
          </span>
          <span className="text-gray-300 break-all">{log.text}</span>
        </div>
      ))}

      {streamBuffer && (
        <div className="flex gap-2 items-start py-0.5 px-1">
          <span className="text-gray-500 flex-shrink-0 w-16" />
          <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold w-14 text-center bg-purple-900 text-purple-300">LLM</span>
          <span className="text-purple-200 break-all">
            {streamBuffer}
            <span className="inline-block w-1.5 h-3 bg-purple-400 ml-0.5 animate-blink" />
          </span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
