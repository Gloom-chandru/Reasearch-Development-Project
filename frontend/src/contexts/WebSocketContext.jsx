import React, { createContext, useContext, useState, useCallback } from 'react'

/**
 * WebSocketContext provides a factory for creating per-classroom WebSocket
 * connections. The old approach tried to connect to /ws/classroom (no ID),
 * which doesn't match any backend route and always produced a 404.
 *
 * Instead we expose a `createClassroomSocket` helper that individual pages
 * (ClassroomDisplay, live recognition page) use to open a properly-parameterised
 * connection to /ws/classroom/{classroom_id}.
 *
 * The `connected` indicator in the Layout header now reflects whether ANY
 * classroom WebSocket is currently open, without trying to maintain one
 * permanently from a context that has no classroom ID.
 */

const WebSocketContext = createContext(null)

export function WebSocketProvider({ children }) {
  const [activeConnections, setActiveConnections] = useState(0)

  const connected = activeConnections > 0

  /**
   * Open a WebSocket to /ws/classroom/{classroomId}.
   * Returns the WebSocket instance; caller is responsible for closing it.
   * @param {number} classroomId
   * @param {object} handlers - { onMessage, onOpen, onClose, onError }
   * @returns WebSocket
   */
  const createClassroomSocket = useCallback((classroomId, handlers = {}) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const ws = new WebSocket(`${protocol}//${host}/ws/classroom/${classroomId}`)

    ws.onopen = () => {
      setActiveConnections(n => n + 1)
      handlers.onOpen?.()
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handlers.onMessage?.(data)
      } catch {
        // ignore non-JSON frames (e.g. pong)
      }
    }

    ws.onclose = () => {
      setActiveConnections(n => Math.max(0, n - 1))
      handlers.onClose?.()
    }

    ws.onerror = (err) => {
      handlers.onError?.(err)
    }

    return ws
  }, [])

  const send = useCallback((ws, data) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
    }
  }, [])

  return (
    <WebSocketContext.Provider value={{ connected, createClassroomSocket, send }}>
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  return useContext(WebSocketContext)
}
