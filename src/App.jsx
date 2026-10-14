import { useEffect, useMemo, useState } from 'react'
import Keyboard from './components/Keyboard'
import Waterfall from './components/Waterfall'
import NowPlaying from './components/NowPlaying'
import NotesPanel, { NOTES_STORAGE_KEY } from './components/NotesPanel'
import AudioPlayer from './components/AudioPlayer'
import { useNoteEngine } from './hooks/useNoteEngine'
import { useMidi } from './hooks/useMidi'
import { useComputerKeyboard } from './hooks/useComputerKeyboard'
import { startAudio, setVolume } from './audio/piano'
import { PASTELS, RANGES, keyboardLayout, noteName } from './lib/notes'
import { describe } from './lib/chords'
import { analyzeText } from './lib/keyDetect'
import { load, save } from './lib/storage'

const MIDI_STATUS = {
  connecting: 'Buscando MIDI…',
  ready: 'MIDI listo',
  unsupported: 'Este navegador no soporta MIDI (usa Chrome o Edge)',
  denied: 'Permiso MIDI denegado',
}

export default function App() {
  const [audio, setAudio] = useState('off') // off | loading | ready
  const [soundOn, setSoundOn] = useState(true)
  const [volume, setVol] = useState(-6)
  const [latin, setLatin] = useState(true)
  const [labels, setLabels] = useState('c') // none | c | all
  const [range, setRange] = useState(61)
  const [speed, setSpeed] = useState(140)
  const [sparkles, setSparkles] = useState(true)
  const [showKeyHints, setShowKeyHints] = useState(true)
  const [baseNote, setBaseNote] = useState(60)
  const [notesText, setNotesText] = useState(() => load(NOTES_STORAGE_KEY, ''))
  const [showSidebar, setShowSidebar] = useState(() => load('show-sidebar', true))
  const [scaleKey, setScaleKey] = useState(null) // tonalidad resaltada en el teclado

  const engine = useNoteEngine({ soundOn })
  const midi = useMidi(engine)
  useComputerKeyboard({ ...engine, baseNote, setBaseNote })

  const layout = useMemo(() => keyboardLayout(...RANGES[range]), [range])

  // El sonido se activa con el primer clic o tecla (regla de los navegadores).
  useEffect(() => {
    if (audio !== 'off') return
    const unlock = () => {
      setAudio('loading')
      startAudio().then(() => setAudio('ready'))
    }
    window.addEventListener('pointerdown', unlock, { once: true })
    window.addEventListener('keydown', unlock, { once: true })
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [audio])

  useEffect(() => setVolume(volume), [volume])
  useEffect(() => save('show-sidebar', showSidebar), [showSidebar])

  const current = describe([...engine.active.keys()].sort((a, b) => a - b))
  const currentChord = current?.chord ? current.title : null

  // Tonalidad de la letra con acordes pegada en Notas.
  const analysis = useMemo(() => analyzeText(notesText), [notesText])
  const detected = analysis.result?.key ?? null
  const scaleShown = Boolean(scaleKey && detected && scaleKey.symbol === detected.symbol)

  // Si cambia la tonalidad detectada mientras se muestra, actualizamos el teclado.
  useEffect(() => {
    if (scaleKey && !scaleShown) setScaleKey(detected)
  }, [detected?.symbol])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <button
            className={`sidebar-toggle ${showSidebar ? 'on' : ''}`}
            onClick={() => setShowSidebar((v) => !v)}
            title={showSidebar ? 'Ocultar panel (piano a pantalla completa)' : 'Mostrar reproductor, notas y tonalidad'}
          >
            {showSidebar ? '⟨' : '☰'}
            <span>{showSidebar ? 'Ocultar panel' : 'Panel'}</span>
          </button>
          <div className="logo">
            {PASTELS.slice(0, 7).map((c, i) => (
              <span key={i} style={{ background: c }} />
            ))}
          </div>
          <div>
            <h1>Piano Pastel</h1>
            <p>Toca y mira cómo cada nota cobra color</p>
          </div>
        </div>

        <div className="status">
          <span className={`chip ${midi.status === 'ready' ? (midi.inputs.length ? 'ok' : 'warn') : 'warn'}`}>
            <i />
            {midi.status === 'ready'
              ? midi.inputs.length
                ? `${midi.inputs.length} teclado${midi.inputs.length > 1 ? 's' : ''} MIDI`
                : 'Conecta un teclado MIDI'
              : MIDI_STATUS[midi.status]}
          </span>
          <span className={`chip ${audio === 'ready' ? 'ok' : 'warn'}`}>
            <i />
            {audio === 'ready' ? 'Sonido listo' : audio === 'loading' ? 'Cargando piano…' : 'Haz clic para activar el sonido'}
          </span>
        </div>
      </header>

      <div className={`workspace ${showSidebar ? 'with-sidebar' : ''}`}>
        {/* Se oculta con CSS (no se desmonta) para que la música siga sonando. */}
        <aside className="sidebar" hidden={!showSidebar}>
          <AudioPlayer />
          <NotesPanel text={notesText} setText={setNotesText} currentChord={currentChord} />
        </aside>

        <div className="center">
          <section className="controls">
            {midi.inputs.length > 0 && (
              <label>
                Teclado MIDI
                <select value={midi.selectedId} onChange={(e) => midi.setSelectedId(e.target.value)}>
                  <option value="all">Todos</option>
                  {midi.inputs.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Teclas
              <select value={range} onChange={(e) => setRange(Number(e.target.value))}>
                {Object.keys(RANGES).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>
            <label>
              Nombres
              <div className="segmented">
                <button className={latin ? 'on' : ''} onClick={() => setLatin(true)}>Do Re Mi</button>
                <button className={!latin ? 'on' : ''} onClick={() => setLatin(false)}>C D E</button>
              </div>
            </label>
            <label>
              Etiquetas
              <div className="segmented">
                <button className={labels === 'none' ? 'on' : ''} onClick={() => setLabels('none')}>Ninguna</button>
                <button className={labels === 'c' ? 'on' : ''} onClick={() => setLabels('c')}>Sólo Do</button>
                <button className={labels === 'all' ? 'on' : ''} onClick={() => setLabels('all')}>Todas</button>
              </div>
            </label>
            <label>
              Velocidad
              <input type="range" min="40" max="400" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
            </label>
            <label>
              Volumen
              <input type="range" min="-30" max="6" value={volume} onChange={(e) => setVol(Number(e.target.value))} />
            </label>
            <div className="toggles">
              <button className={`toggle ${soundOn ? 'on' : ''}`} onClick={() => setSoundOn((s) => !s)}>
                {soundOn ? 'Sonido' : 'Silencio'}
              </button>
              <button className={`toggle ${sparkles ? 'on' : ''}`} onClick={() => setSparkles((s) => !s)}>
                Chispas
              </button>
              <button className={`toggle ${showKeyHints ? 'on' : ''}`} onClick={() => setShowKeyHints((s) => !s)}>
                Atajos
              </button>
            </div>
          </section>

          <NowPlaying
            active={engine.active}
            latin={latin}
            sustain={engine.sustain}
            analysis={analysis}
            scaleShown={scaleShown}
            onToggleScale={() => setScaleKey(scaleShown ? null : detected)}
          />

          <main className="stage">
            <Waterfall layout={layout} subscribe={engine.subscribe} speed={speed} sparkles={sparkles} />
            <Keyboard
              layout={layout}
              active={engine.active}
              noteOn={engine.noteOn}
              noteOff={engine.noteOff}
              latin={latin}
              labels={labels}
              baseNote={baseNote}
              showKeyHints={showKeyHints}
              scale={scaleKey}
            />
          </main>
        </div>
      </div>

      <footer className="help">
        <span><kbd>A</kbd>–<kbd>Ñ</kbd> teclas blancas · <kbd>W</kbd> <kbd>E</kbd> <kbd>T</kbd> <kbd>Y</kbd> <kbd>U</kbd> negras</span>
        <span><kbd>Z</kbd>/<kbd>X</kbd> octava ({noteName(baseNote, latin)})</span>
        <span><kbd>Espacio</kbd> pedal</span>
      </footer>
    </div>
  )
}
