import { useEffect, useRef, useState } from 'react'
import { DEFAULT_KEY_COLOR, hexToRgb, over, rgbToHex } from '../lib/notes'

const PRESETS = ['#CDB4F6', '#FFB3BA', '#FFC8A2', '#FFE08A', '#B5EAD7', '#A8D8F0', '#B9C6F5', '#F7B5DA']
const CHANNELS = [
  { name: 'R', tint: '#FF6B6B' },
  { name: 'G', tint: '#4CC38A' },
  { name: 'B', tint: '#5B8DEF' },
]

// Botón con muestra de color que despliega un panel RGB para las teclas.
export default function ColorPanel({ color, setColor }) {
  const [open, setOpen] = useState(false)
  const [hexDraft, setHexDraft] = useState(color)
  const ref = useRef(null)
  const rgb = hexToRgb(color)

  useEffect(() => setHexDraft(color), [color])

  // Cerrar al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const setChannel = (i, v) => {
    const next = [...rgb]
    next[i] = Math.min(255, Math.max(0, Number(v) || 0))
    setColor(rgbToHex(...next))
  }

  const commitHex = (v) => {
    const clean = v.trim().replace(/^#?/, '#')
    if (/^#[0-9a-f]{6}$/i.test(clean)) setColor(clean.toUpperCase())
    else setHexDraft(color)
  }

  return (
    <div className="color-picker" ref={ref}>
      <label>
        Color
        <button className={`color-trigger ${open ? 'on' : ''}`} onClick={() => setOpen((o) => !o)}>
          <span className="color-swatch" style={{ background: color }} />
          {color}
        </button>
      </label>

      {open && (
        <div className="color-panel">
          <div className="color-ramp" title="Intensidad según la fuerza del toque">
            {[0.3, 0.475, 0.65, 0.825, 1].map((a) => (
              <span key={a} style={{ background: over(color, a) }} />
            ))}
          </div>
          <small className="color-hint">Suave → fuerte: la opacidad depende de la fuerza del toque</small>

          {CHANNELS.map((c, i) => (
            <div className="color-row" key={c.name}>
              <b style={{ color: c.tint }}>{c.name}</b>
              <input
                type="range"
                min="0"
                max="255"
                value={rgb[i]}
                style={{ accentColor: c.tint }}
                onChange={(e) => setChannel(i, e.target.value)}
              />
              <input
                type="number"
                min="0"
                max="255"
                value={rgb[i]}
                onChange={(e) => setChannel(i, e.target.value)}
              />
            </div>
          ))}

          <div className="color-row">
            <b>HEX</b>
            <input
              className="color-hex"
              value={hexDraft}
              onChange={(e) => setHexDraft(e.target.value)}
              onBlur={(e) => commitHex(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && commitHex(e.currentTarget.value)}
            />
            <button className="toggle" onClick={() => setColor(DEFAULT_KEY_COLOR)}>Reset</button>
          </div>

          <div className="color-presets">
            {PRESETS.map((p) => (
              <button
                key={p}
                className={p === color ? 'on' : ''}
                style={{ background: p }}
                title={p}
                onClick={() => setColor(p)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
