import { useEffect, useRef, useState } from 'react'

// Conecta con teclados MIDI usando la Web MIDI API (Chrome, Edge, Opera).
export function useMidi({ noteOn, noteOff, setSustain }) {
  const [status, setStatus] = useState('connecting') // connecting | ready | unsupported | denied
  const [inputs, setInputs] = useState([])
  const [selectedId, setSelectedId] = useState('all')
  const handlers = useRef({ noteOn, noteOff, setSustain })
  handlers.current = { noteOn, noteOff, setSustain }
  const selectedRef = useRef(selectedId)
  selectedRef.current = selectedId

  useEffect(() => {
    if (!navigator.requestMIDIAccess) {
      setStatus('unsupported')
      return
    }
    let access
    let cancelled = false

    const onMessage = (inputId) => (e) => {
      if (selectedRef.current !== 'all' && selectedRef.current !== inputId) return
      const [statusByte, data1, data2] = e.data
      const command = statusByte & 0xf0
      const { noteOn, noteOff, setSustain } = handlers.current
      if (command === 0x90 && data2 > 0) noteOn(data1, data2 / 127, 'midi')
      else if (command === 0x80 || (command === 0x90 && data2 === 0)) noteOff(data1)
      else if (command === 0xb0 && data1 === 64) setSustain(data2 >= 64)
    }

    const refresh = () => {
      const list = []
      access.inputs.forEach((input) => {
        input.onmidimessage = onMessage(input.id)
        list.push({ id: input.id, name: input.name, manufacturer: input.manufacturer })
      })
      setInputs(list)
    }

    navigator
      .requestMIDIAccess()
      .then((a) => {
        if (cancelled) return
        access = a
        refresh()
        access.onstatechange = refresh
        setStatus('ready')
      })
      .catch(() => !cancelled && setStatus('denied'))

    return () => {
      cancelled = true
      if (access) {
        access.onstatechange = null
        access.inputs.forEach((input) => (input.onmidimessage = null))
      }
    }
  }, [])

  return { status, inputs, selectedId, setSelectedId }
}
