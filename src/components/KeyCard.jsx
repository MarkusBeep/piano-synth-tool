import { colorOf, shade } from '../lib/notes'

// Tarjeta con la tonalidad detectada del texto pegado (letra + acordes).
export default function KeyCard({ analysis, scaleShown, onToggleScale }) {
  const { chords, result, unique } = analysis

  if (!result) {
    return (
      <div className="key-card empty">
        <p className="muted small">
          {chords.length === 1
            ? 'Encontré 1 acorde. Pega más de la canción para detectar la tonalidad.'
            : 'Pega en Notas la letra con acordes de una canción y te digo en qué tonalidad está.'}
        </p>
      </div>
    )
  }

  const { key, fit, alternative } = result
  const color = colorOf(key.tonic)
  const confidence = fit >= 0.85 ? 'Alta' : fit >= 0.6 ? 'Media' : 'Baja'

  return (
    <div className="key-card">
      <div
        className="key-badge"
        style={{ background: color, color: shade(color, 0.62) }}
      >
        <strong>{key.symbol}</strong>
        <span>
          {key.spanish} · {key.signature}
        </span>
      </div>

      <div className="key-meta small">
        <span>
          Confianza <b>{confidence}</b> ({Math.round(fit * 100)}% de acordes en la escala)
        </span>
        {alternative && (
          <span>
            También podría ser <b>{alternative.symbol}</b>
          </span>
        )}
      </div>

      <div className="key-scale small">
        Escala: <b>{key.scale.join(' – ')}</b>
      </div>

      <div className="key-chords">
        {unique.map((c) => (
          <span
            key={`${c.root}-${c.quality}`}
            className={`key-chord ${c.roman ? '' : 'out'}`}
            style={c.roman ? { background: colorOf(c.root), color: shade(colorOf(c.root), 0.6) } : undefined}
            title={c.roman ? `Grado ${c.roman} · aparece ${c.count} ${c.count === 1 ? 'vez' : 'veces'}` : 'Fuera de la escala (acorde prestado o de paso)'}
          >
            <b>{c.text}</b>
            <small>{c.roman ?? 'fuera'}</small>
          </span>
        ))}
      </div>

      <button className={`scale-toggle ${scaleShown ? 'on' : ''}`} onClick={onToggleScale}>
        {scaleShown ? 'Ocultar escala del teclado' : 'Ver escala en el teclado'}
      </button>
    </div>
  )
}
