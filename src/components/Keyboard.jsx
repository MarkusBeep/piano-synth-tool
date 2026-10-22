import { useEffect, useRef } from 'react'
import { noteName, over, pitchClass, rgba, shade, velocityAlpha } from '../lib/notes'
import { COMPUTER_KEY_LABELS } from '../hooks/useComputerKeyboard'

export default function Keyboard({ layout, active, noteOn, noteOff, latin, labels, baseNote, showKeyHints, scale, keyColor }) {
  const pointerNotes = useRef(new Map()) // pointerId -> midi

  // Soltar cualquier nota del mouse si el puntero se suelta fuera del teclado.
  useEffect(() => {
    const release = (e) => {
      const midi = pointerNotes.current.get(e.pointerId)
      if (midi !== undefined) {
        noteOff(midi)
        pointerNotes.current.delete(e.pointerId)
      }
    }
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
    return () => {
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', release)
    }
  }, [noteOff])

  // Más fuerte mientras más abajo en la tecla se toque, como en un piano real.
  const velocityFrom = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    return Math.min(1, Math.max(0.3, 0.3 + ((e.clientY - r.top) / r.height) * 0.7))
  }

  const press = (midi) => (e) => {
    e.preventDefault()
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    pointerNotes.current.set(e.pointerId, midi)
    noteOn(midi, velocityFrom(e), 'mouse')
  }

  // Deslizar el dedo/mouse sobre las teclas hace glissando.
  const enter = (midi) => (e) => {
    const current = pointerNotes.current.get(e.pointerId)
    if (current === undefined || current === midi) return
    noteOff(current)
    pointerNotes.current.set(e.pointerId, midi)
    noteOn(midi, velocityFrom(e), 'mouse')
  }

  const label = (midi) => {
    if (labels === 'none') return null
    if (labels === 'c' && pitchClass(midi) !== 0) return null
    return noteName(midi, latin, labels === 'c' || pitchClass(midi) === 0)
  }

  return (
    <div className="keyboard" onContextMenu={(e) => e.preventDefault()}>
      {layout.keys.map((k) => {
        const on = active.get(k.midi)
        const hint = showKeyHints ? COMPUTER_KEY_LABELS[k.midi - baseNote] : null
        const text = k.black ? null : label(k.midi)
        const inScale = scale?.pcs.has(pitchClass(k.midi))
        const isTonic = scale && pitchClass(k.midi) === scale.tonic
        // Un solo color; la intensidad (opacidad) sale de la fuerza del toque.
        const base = k.black ? '#3b3652' : '#ffffff'
        const alpha = on ? velocityAlpha(on.velocity) : isTonic ? 0.45 : k.black ? 0.4 : 0.25
        const style = {
          left: `${k.x * 100}%`,
          width: `${k.w * 100}%`,
          '--note': over(keyColor, alpha, base),
          '--note-dark': shade(keyColor, 0.35),
          '--note-glow': rgba(keyColor, alpha),
        }
        return (
          <div
            key={k.midi}
            className={`key ${k.black ? 'black' : 'white'} ${on ? 'on' : ''} ${inScale ? 'in-scale' : ''} ${isTonic ? 'tonic' : ''}`}
            style={style}
            onPointerDown={press(k.midi)}
            onPointerEnter={enter(k.midi)}
            title={noteName(k.midi, latin)}
          >
            {isTonic && <span className="tonic-dot" />}
            {hint && <span className="key-hint">{hint}</span>}
            {text && <span className="key-label">{text}</span>}
          </div>
        )
      })}
    </div>
  )
}
