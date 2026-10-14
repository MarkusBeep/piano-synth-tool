import { useEffect, useRef } from 'react'

// Fila "A S D F..." = teclas blancas, fila "W E T Y U..." = teclas negras.
// Z / X bajan o suben una octava. Barra espaciadora = pedal.
const KEY_TO_OFFSET = {
  a: 0, w: 1, s: 2, e: 3, d: 4, f: 5, t: 6, g: 7, y: 8, h: 9, u: 10, j: 11,
  k: 12, o: 13, l: 14, p: 15, 'ñ': 16, ';': 16, "'": 17,
}

export const COMPUTER_KEY_LABELS = Object.fromEntries(
  Object.entries(KEY_TO_OFFSET)
    .filter(([k]) => k !== ';' && k !== "'")
    .map(([k, v]) => [v, k.toUpperCase()])
)

export function useComputerKeyboard({ noteOn, noteOff, setSustain, baseNote, setBaseNote }) {
  const pressed = useRef(new Map())
  const state = useRef({ noteOn, noteOff, setSustain, baseNote, setBaseNote })
  state.current = { noteOn, noteOff, setSustain, baseNote, setBaseNote }

  useEffect(() => {
    const isTyping = (e) => ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)

    const down = (e) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey) return
      const key = e.key.toLowerCase()
      const s = state.current
      if (key === ' ') {
        e.preventDefault()
        if (!e.repeat) s.setSustain(true)
        return
      }
      if (e.repeat) return
      if (key === 'z') return s.setBaseNote((b) => Math.max(24, b - 12))
      if (key === 'x') return s.setBaseNote((b) => Math.min(96, b + 12))
      if (!(key in KEY_TO_OFFSET) || pressed.current.has(key)) return
      const midi = s.baseNote + KEY_TO_OFFSET[key]
      pressed.current.set(key, midi)
      s.noteOn(midi, 0.75, 'keyboard')
    }

    const up = (e) => {
      const key = e.key.toLowerCase()
      if (key === ' ') return state.current.setSustain(false)
      const midi = pressed.current.get(key)
      if (midi === undefined) return
      pressed.current.delete(key)
      state.current.noteOff(midi)
    }

    // Si la ventana pierde el foco, soltamos todo para que no queden notas pegadas.
    const blur = () => {
      pressed.current.forEach((midi) => state.current.noteOff(midi))
      pressed.current.clear()
      state.current.setSustain(false)
    }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])
}
