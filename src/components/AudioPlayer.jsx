import { useEffect, useRef, useState } from 'react'
import { useYouTubePlayer } from '../hooks/useYouTubePlayer'

const SPEEDS = [0.5, 0.75, 1]

// Acepta un link de YouTube (watch, youtu.be, shorts, music) o un ID de 11 caracteres.
function parseVideoId(text) {
  const t = text.trim()
  const m = t.match(/(?:youtu\.be\/|v=|shorts\/|embed\/|live\/)([\w-]{11})/)
  if (m) return m[1]
  return /^[\w-]{11}$/.test(t) ? t : null
}

function formatTime(s) {
  if (!Number.isFinite(s)) return '0:00'
  s = Math.floor(s)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

// Reproductor de audio: usa YouTube por debajo pero sin mostrar el video.
export default function AudioPlayer() {
  const hostRef = useRef(null)
  const yt = useYouTubePlayer(hostRef)
  const [link, setLink] = useState('')
  const [linkError, setLinkError] = useState(null)
  const [volume, setVolume] = useState(80)
  const [loopA, setLoopA] = useState(null)
  const [loopB, setLoopB] = useState(null)
  const [looping, setLooping] = useState(false)
  const [scrub, setScrub] = useState(null) // tiempo mientras se arrastra la barra

  // Bucle A–B: al pasar el punto B, vuelve al punto A.
  useEffect(() => {
    if (looping && loopA !== null && loopB !== null && yt.time >= loopB) yt.seek(loopA)
  }, [yt.time, looping, loopA, loopB, yt.seek])

  useEffect(() => yt.setVolume(volume), [volume, yt.setVolume])

  const play = (text) => {
    const id = parseVideoId(text)
    if (!id) {
      if (text.trim()) setLinkError('Eso no parece un link de YouTube. Cópialo desde el botón Compartir.')
      return
    }
    setLinkError(null)
    setLoopA(null)
    setLoopB(null)
    setLooping(false)
    yt.load(id)
  }

  const clearLoop = () => {
    setLoopA(null)
    setLoopB(null)
    setLooping(false)
  }

  const commitScrub = () => {
    if (scrub !== null) yt.seek(scrub)
    setScrub(null)
  }

  const shown = scrub ?? yt.time
  const pct = (t) => (yt.duration ? (t / yt.duration) * 100 : 0)
  const hasTrack = Boolean(yt.videoId)
  const cover = hasTrack ? `https://i.ytimg.com/vi/${yt.videoId}/mqdefault.jpg` : null

  return (
    <section className="side-section player">
      <div className="side-head">
        <h3>Reproductor</h3>
        {yt.playing && <span className="eq" aria-hidden="true"><i /><i /><i /></span>}
      </div>
      <form
        className="player-link"
        onSubmit={(e) => {
          e.preventDefault()
          play(link)
        }}
      >
        <input
          type="text"
          placeholder="Pega aquí el link de YouTube…"
          value={link}
          onChange={(e) => {
            setLink(e.target.value)
            setLinkError(null)
          }}
          onPaste={(e) => {
            // Al pegar el link empieza a sonar, sin apretar nada más.
            const text = e.clipboardData.getData('text')
            if (parseVideoId(text)) {
              e.preventDefault()
              setLink(text.trim())
              play(text)
            }
          }}
        />
      </form>
      {linkError && <p className="player-error">{linkError}</p>}
      {yt.error && <p className="player-error">{yt.error}</p>}

      {/* El reproductor de YouTube queda fuera de la vista: sólo usamos su audio. */}
      <div ref={hostRef} className="player-host" aria-hidden="true" />

      <div className={`player-card ${hasTrack ? '' : 'idle'}`}>
        <div className={`player-cover ${yt.playing ? 'spinning' : ''}`}>
          {cover ? <img src={cover} alt="" /> : <span>♫</span>}
        </div>
        <div className="player-meta">
          <strong>{hasTrack ? yt.info.title || 'Cargando…' : 'Sin canción'}</strong>
          <small>{hasTrack ? yt.info.author : 'Pega un link para empezar'}</small>
        </div>
        <button className="player-play" onClick={yt.toggle} disabled={!hasTrack} title="Reproducir / pausar">
          {yt.playing ? '❚❚' : '▶'}
        </button>
      </div>

      <div className={`player-controls ${hasTrack ? '' : 'disabled'}`}>
        <div className="player-progress">
          <div className="player-track">
            <div className="player-fill" style={{ width: `${pct(shown)}%` }} />
            {loopA !== null && loopB !== null && (
              <div
                className={`player-loop ${looping ? 'on' : ''}`}
                style={{ left: `${pct(loopA)}%`, width: `${pct(loopB) - pct(loopA)}%` }}
              />
            )}
            {loopA !== null && <div className="player-marker" style={{ left: `${pct(loopA)}%` }}>A</div>}
            {loopB !== null && <div className="player-marker" style={{ left: `${pct(loopB)}%` }}>B</div>}
            <div className="player-thumb" style={{ left: `${pct(shown)}%` }} />
          </div>
          <input
            type="range"
            min="0"
            max={yt.duration || 0}
            step="0.1"
            value={shown}
            onChange={(e) => setScrub(Number(e.target.value))}
            onPointerUp={commitScrub}
            onKeyUp={commitScrub}
            aria-label="Progreso de la canción"
          />
          <div className="player-times">
            <span>{formatTime(shown)}</span>
            <span>−{formatTime(Math.max(0, yt.duration - shown))}</span>
          </div>
        </div>

        <div className="player-buttons">
          <button onClick={() => yt.seek(loopA ?? 0)} title="Volver al inicio (o al punto A)">⏮</button>
          <button onClick={() => yt.skip(-10)} title="Retroceder 10 segundos">−10</button>
          <button onClick={() => yt.skip(-5)} title="Retroceder 5 segundos">−5</button>
          <button onClick={() => yt.skip(5)} title="Adelantar 5 segundos">+5</button>
          <button onClick={() => yt.skip(10)} title="Adelantar 10 segundos">+10</button>
        </div>

        <div className="player-row">
          <span className="player-label">Repetir</span>
          <button className={loopA !== null ? 'set' : ''} onClick={() => setLoopA(yt.time)} title="Marca el inicio del pasaje">
            A{loopA !== null && ` ${formatTime(loopA)}`}
          </button>
          <button
            className={loopB !== null ? 'set' : ''}
            onClick={() => {
              if (loopA !== null && yt.time > loopA) {
                setLoopB(yt.time)
                setLooping(true)
              }
            }}
            disabled={loopA === null}
            title="Marca el final del pasaje y empieza a repetir"
          >
            B{loopB !== null && ` ${formatTime(loopB)}`}
          </button>
          {loopB !== null && (
            <button className={looping ? 'on' : ''} onClick={() => setLooping((l) => !l)}>
              {looping ? 'Repitiendo' : 'Pausado'}
            </button>
          )}
          {loopA !== null && (
            <button onClick={clearLoop} title="Quitar repetición">✕</button>
          )}
        </div>

        <div className="player-row">
          <span className="player-label">Vel.</span>
          <div className="segmented">
            {SPEEDS.map((s) => (
              <button key={s} className={yt.rate === s ? 'on' : ''} onClick={() => yt.setRate(s)}>
                {s}×
              </button>
            ))}
          </div>
        </div>
        <div className="player-row">
          <span className="player-label">Vol.</span>
          <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} />
        </div>
      </div>
    </section>
  )
}
