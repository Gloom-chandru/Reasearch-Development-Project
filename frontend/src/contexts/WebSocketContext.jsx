import React, { createContext, useContext, useState, useCallback } from 'react'

/**
 * WebSocketContext — factory for authenticated per-classroom WebSocket connections.
 *
 * Every connection now performs JWT authentication as the first message:
 *   1. Socket opens
 *   2. Client sends {"type":"auth","token":"<JWT>"} immediately
 *   3. Server responds {"type":"auth_ok"} or {"type":"auth_error"} + closes
 *   4. After auth_ok, normal events flow (attendance_confirmed, session_state, led_event)
 */

const WebSocketContext = createContext(null)

export function WebSocketProvider({ children }) {
  const [activeConnections, setActiveConnections] = useState(0)

  const connected = activeConnections > 0

  /**
   * Open an authenticated WebSocket to /ws/classroom/{classroomId}.
   * Returns the WebSocket instance; caller closes it on cleanup.
   *
   * @param {number} classroomId
   * @param {object} handlers - { onMessage, onOpen, onClose, onError, onAuthOk }
   * @returns WebSocket
   */
  const createClassroomSocket = useCallback((classroomId, handlers = {}) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const ws = new WebSocket(`${protocol}//${host}/ws/classroom/${classroomId}`)

    ws.onopen = () => {
      setActiveConnections(n => n + 1)
      // Send JWT auth frame — server waits up to 5 seconds for this
      const token = localStorage.getItem('token')
      if (token) {
        ws.send(JSON.stringify({ type: 'auth', token }))
      } else {
        // No token: server will reject; surface as error
        handlers.onError?.(new Error('No auth token found — please log in'))
        ws.close()
      }
      handlers.onOpen?.()
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        // auth_error: server rejected our token — close and surface error
        if (data.type === 'auth_error') {
          handlers.onError?.(new Error(data.detail || 'WebSocket auth failed'))
          ws.close()
          return
        }

        // auth_ok: authenticated — notify caller, don't propagate as a data message
        if (data.type === 'auth_ok') {
          handlers.onAuthOk?.(data)
          return
        }

        handlers.onMessage?.(data)
      } catch {
        // ignore non-JSON frames (e.g. raw pong bytes)
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
