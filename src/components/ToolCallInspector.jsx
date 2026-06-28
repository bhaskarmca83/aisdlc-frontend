export default function ToolCallInspector({ toolCalls }) {
  if (!toolCalls.length) {
    return (
      <div className="p-4 text-gray-500 text-sm text-center mt-8">
        No tool calls yet
      </div>
    )
  }

  return (
    <div className="p-3 overflow-y-auto h-full">
      <h3 className="text-xs text-gray-400 uppercase tracking-widest mb-3">
        Tool Calls <span className="text-gray-600">({toolCalls.length})</span>
      </h3>
      <div className="space-y-2">
        {toolCalls.map((tc, i) => (
          <div key={i} className="bg-dark-700 rounded p-2 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-green-400 text-xs truncate max-w-[70%]">{tc.name}</span>
              <span className="text-gray-600 text-[10px]">{tc.ts}</span>
            </div>
            {tc.meta && Object.keys(tc.meta).length > 0 && (
              <pre className="text-[10px] text-gray-400 mt-1 overflow-x-auto max-h-24">
                {JSON.stringify(tc.meta, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
