import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

let socket = null

function getSocket() {
  if (!socket) {
    socket = io(URL, { autoConnect: false })
  }
  return socket
}

export default function useSocket() {
  const socketRef = useRef(getSocket())

  useEffect(() => {
    const s = socketRef.current
    if (!s.connected) {
      s.connect()
    }
    return () => {}
  }, [])

  const emit = (event, data) => socketRef.current.emit(event, data)
  const on = (event, cb) => socketRef.current.on(event, cb)
  const off = (event, cb) => socketRef.current.off(event, cb)

  return { socket: socketRef.current, emit, on, off }
}
