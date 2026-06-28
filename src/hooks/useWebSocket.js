import { useEffect, useRef, useCallback } from 'react'

const WS_BASE = 'ws://localhost:8000'

export function useWebSocket(executionId, onMessage) {
  const wsRef     = useRef(null)
  const activeRef = useRef(false)

  const connect = useCallback(() => {
    if (!executionId || wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(`${WS_BASE}/ws/events/${executionId}`)
    wsRef.current = ws
    activeRef.current = true

    ws.onopen    = () => console.log('[WS] connected', executionId)
    ws.onclose   = () => { if (activeRef.current) setTimeout(connect, 2000) }
    ws.onerror   = (e) => console.error('[WS] error', e)
    ws.onmessage = (e) => {
      try { onMessage(JSON.parse(e.data)) } catch { /* ignore malformed */ }
    }
  }, [executionId, onMessage])

  useEffect(() => {
    connect()
    return () => {
      activeRef.current = false
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { send }
}
