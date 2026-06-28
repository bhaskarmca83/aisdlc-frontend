import { useState, useCallback, useRef } from 'react'
import { useWebSocket } from './useWebSocket'
import { startPipeline, approveGate, getStateSnapshot } from '../utils/api'

const STAGES = ['confluence', 'stories', 'design', 'gate', 'implement', 'test', 'review', 'deploy', 'e2e']

const initStageMap = () =>
  Object.fromEntries(STAGES.map((s) => [s, 'idle']))

export function usePipeline() {
  const [executionId,   setExecutionId]   = useState(null)
  const [status,        setStatus]        = useState('idle')   // idle | running | awaiting_approval | completed | error
  const [stageMap,      setStageMap]      = useState(initStageMap)
  const [logs,          setLogs]          = useState([])
  const [toolCalls,     setToolCalls]     = useState([])
  const [stateSnapshot, setStateSnapshot] = useState(null)
  const [metrics,       setMetrics]       = useState({ stories: 0, tokens: 0, cost: 0 })
  const [streamBuffer,  setStreamBuffer]  = useState('')

  const execIdRef = useRef(null)

  const handleMessage = useCallback((msg) => {
    if (!msg) return
    const ts = new Date().toISOString().substr(11, 8)

    if (msg.type === 'stage_update') {
      const stage = msg.stage
      if (STAGES.includes(stage)) {
        setStageMap((prev) => ({ ...prev, [stage]: 'running' }))
      }
      setLogs((prev) => [...prev, { ts, type: 'INFO', text: `Stage: ${stage}`, id: Date.now() }])
    }

    if (msg.type === 'info')  setLogs((p) => [...p, { ts, type: 'INFO',  text: msg.message, id: Date.now() }])
    if (msg.type === 'tool')  {
      setLogs((p) => [...p, { ts, type: 'TOOL',  text: msg.message, id: Date.now() }])
      setToolCalls((p) => [{ ts, name: msg.message, meta: msg.metadata || {} }, ...p].slice(0, 20))
    }
    if (msg.type === 'llm')   setLogs((p) => [...p, { ts, type: 'LLM',   text: msg.message, id: Date.now() }])
    if (msg.type === 'gate')  {
      setLogs((p) => [...p, { ts, type: 'GATE',  text: msg.message, id: Date.now() }])
      setStatus('awaiting_approval')
    }
    if (msg.type === 'error') setLogs((p) => [...p, { ts, type: 'ERROR', text: msg.message, id: Date.now() }])

    if (msg.type === 'llm_stream') {
      setStreamBuffer((prev) => prev + (msg.delta || ''))
    }

    if (msg.type === 'done') {
      const finalStatus = msg.status?.status === 'error' ? 'error' : 'completed'
      setStatus(finalStatus)
      STAGES.forEach((s) => {
        setStageMap((prev) => ({
          ...prev,
          [s]: prev[s] === 'running' ? 'done' : prev[s],
        }))
      })
      setStreamBuffer('')
      if (execIdRef.current) {
        getStateSnapshot(execIdRef.current).then(setStateSnapshot).catch(() => {})
      }
    }

    // Update metrics from state payload
    if (msg.metrics) {
      setMetrics((prev) => ({ ...prev, ...msg.metrics }))
    }
    if (msg.stories_count !== undefined) {
      setMetrics((prev) => ({ ...prev, stories: msg.stories_count }))
    }
  }, [])

  useWebSocket(executionId, handleMessage)

  const run = useCallback(async ({ idea, projectName, confluencePageUrl }) => {
    setLogs([])
    setToolCalls([])
    setStageMap(initStageMap())
    setStreamBuffer('')
    setStateSnapshot(null)
    setMetrics({ stories: 0, tokens: 0, cost: 0 })
    setStatus('running')

    const { execution_id } = await startPipeline({ idea, projectName, confluencePageUrl })
    setExecutionId(execution_id)
    execIdRef.current = execution_id
  }, [])

  const approve = useCallback(async (approved, reason = '') => {
    if (!executionId) return
    await approveGate(executionId, { approved, reason })
    setStatus('running')
    setStageMap((prev) => ({ ...prev, gate: 'done' }))
  }, [executionId])

  const reset = useCallback(() => {
    setExecutionId(null)
    execIdRef.current = null
    setStatus('idle')
    setStageMap(initStageMap())
    setLogs([])
    setToolCalls([])
    setStateSnapshot(null)
    setStreamBuffer('')
    setMetrics({ stories: 0, tokens: 0, cost: 0 })
  }, [])

  return {
    executionId, status, stageMap, logs, toolCalls,
    stateSnapshot, metrics, streamBuffer,
    run, approve, reset,
  }
}
