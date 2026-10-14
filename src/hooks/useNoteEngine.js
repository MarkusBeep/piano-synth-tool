import { useCallback, useRef, useState } from 'react'
import { playNote, stopNote } from '../audio/piano'

// Centraliza las notas que llegan de cualquier fuente (MIDI, mouse, teclado
// de la computadora): actualiza el estado visual, el sonido y avisa a la cascada.
export function useNoteEngine({ soundOn }) {
  const [active, setActive] = useState(() => new Map())
  const [sustain, setSustainState] = useState(false)
  const activeRef = useRef(new Map())
  const sustainRef = useRef(false)
  const sustainedRef = useRef(new Set())
  const listenersRef = useRef(new Set())
  const soundRef = useRef(soundOn)
  soundRef.current = soundOn

  const emit = (type, midi, velocity) => {
    listenersRef.current.forEach((fn) => fn(type, midi, velocity))
  }

  const commit = () => setActive(new Map(activeRef.current))

  const noteOn = useCallback((midi, velocity = 0.8, source = 'mouse') => {
    if (activeRef.current.has(midi)) {
      // Si la nota ya sonaba, la volvemos a atacar.
      emit('off', midi)
    }
    sustainedRef.current.delete(midi)
    activeRef.current.set(midi, { velocity, source, at: performance.now() })
    commit()
    if (soundRef.current) playNote(midi, velocity)
    emit('on', midi, velocity)
  }, [])

  const noteOff = useCallback((midi) => {
    if (!activeRef.current.has(midi)) return
    activeRef.current.delete(midi)
    commit()
    emit('off', midi)
    if (sustainRef.current) sustainedRef.current.add(midi)
    else stopNote(midi)
  }, [])

  const setSustain = useCallback((down) => {
    sustainRef.current = down
    setSustainState(down)
    if (!down) {
      sustainedRef.current.forEach((m) => stopNote(m))
      sustainedRef.current.clear()
    }
  }, [])

  const allOff = useCallback(() => {
    ;[...activeRef.current.keys()].forEach((m) => {
      emit('off', m)
      stopNote(m)
    })
    activeRef.current.clear()
    commit()
  }, [])

  const subscribe = useCallback((fn) => {
    listenersRef.current.add(fn)
    return () => listenersRef.current.delete(fn)
  }, [])

  return { active, sustain, noteOn, noteOff, setSustain, allOff, subscribe }
}
