import { colorOf, noteName, shade } from '../lib/notes'
import { describe } from '../lib/chords'
import KeyCard from './KeyCard'

export default function NowPlaying({ active, latin, sustain, analysis, scaleShown, onToggleScale }) {
  const midis = [...active.keys()].sort((a, b) => a - b)
  const info = describe(midis)

  // La tarjeta del acorde se pinta con el color de su nota raíz.
  let chordStyle
  if (info) {
    const rootColor = colorOf(info.root)
    chordStyle = {
      background: rootColor,
      color: shade(rootColor, 0.62),
      boxShadow: `0 6px 24px ${rootColor}`,
      '--sub': shade(rootColor, 0.45),
    }
  }

  return (
    <section className="now">
      <div className="now-main">
        <div className="now-label">
          Estás tocando
          {sustain && <span className="pedal">Pedal</span>}
        </div>
        <div className={`chord-card ${info ? 'on' : ''}`} style={chordStyle} key={info?.title}>
          {info ? (
            <strong>{info.title}</strong>
          ) : (
            <span className="muted">Toca 2 o más notas para ver el intervalo o acorde</span>
          )}
        </div>
        <div className="now-notes">
          {midis.length === 0 && <span className="now-empty">Toca una tecla…</span>}
          {midis.map((m) => (
            <span key={m} className="note-tag">
              <i style={{ background: colorOf(m) }} />
              {noteName(m, latin)}
            </span>
          ))}
        </div>
      </div>

      <div className="now-side">
        <div className="now-label">Tonalidad de la canción</div>
        <KeyCard analysis={analysis} scaleShown={scaleShown} onToggleScale={onToggleScale} />
      </div>
    </section>
  )
}
