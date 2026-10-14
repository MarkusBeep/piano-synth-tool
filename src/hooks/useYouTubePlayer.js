import { useCallback, useEffect, useRef, useState } from 'react'

// Carga la IFrame API de YouTube una sola vez.
let apiPromise = null
function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (apiPromise) return apiPromise
  apiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve(window.YT)
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(script)
  })
  return apiPromise
}

const ERRORS = {
  2: 'El enlace del video no es válido.',
  5: 'Este video no se puede reproducir aquí.',
  100: 'El video no existe o es privado.',
  101: 'El dueño no permite reproducir este video fuera de YouTube.',
  150: 'El dueño no permite reproducir este video fuera de YouTube.',
  153: 'YouTube rechazó el reproductor (falta el origen de la página).',
}

// Controla un reproductor de YouTube dentro de `hostRef` y expone tiempo,
// duración y comandos para practicar (saltar, velocidad, volumen).
export function useYouTubePlayer(hostRef) {
  const playerRef = useRef(null)
  const volumeRef = useRef(80)
  const [videoId, setVideoId] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [rate, setRateState] = useState(1)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState({ title: '', author: '' })

  // Leemos el tiempo actual varias veces por segundo para la barra de progreso.
  useEffect(() => {
    const id = setInterval(() => {
      const p = playerRef.current
      if (!p?.getCurrentTime) return
      setTime(p.getCurrentTime() || 0)
      const d = p.getDuration?.() || 0
      if (d) setDuration(d)
    }, 200)
    return () => clearInterval(id)
  }, [])

  // Precargamos la API para que la canción empiece apenas se pegue el link.
  useEffect(() => {
    loadYouTubeApi()
  }, [])

  useEffect(
    () => () => {
      playerRef.current?.destroy?.()
      playerRef.current = null
    },
    []
  )

  const load = useCallback(
    async (id) => {
      setError(null)
      setInfo({ title: '', author: '' })
      setVideoId(id)
      setTime(0)
      setDuration(0)
      if (playerRef.current?.loadVideoById) {
        playerRef.current.loadVideoById(id)
        return
      }
      const YT = await loadYouTubeApi()
      // El reproductor reemplaza su elemento, así que le damos uno que React no controla.
      const el = document.createElement('div')
      hostRef.current.replaceChildren(el)
      playerRef.current = new YT.Player(el, {
        videoId: id,
        width: '100%',
        height: '100%',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, autoplay: 1 },
        events: {
          onReady: (e) => e.target.setVolume(volumeRef.current),
          onStateChange: (e) => {
            setPlaying(e.data === YT.PlayerState.PLAYING)
            const data = e.target.getVideoData?.()
            if (data?.title) setInfo({ title: data.title, author: data.author })
          },
          onError: (e) => setError(ERRORS[e.data] ?? 'No se pudo reproducir el video.'),
          onPlaybackRateChange: (e) => setRateState(e.data),
        },
      })
    },
    [hostRef]
  )

  const setVolume = useCallback((v) => {
    volumeRef.current = v
    playerRef.current?.setVolume?.(v)
  }, [])

  const seek = useCallback((seconds) => {
    const p = playerRef.current
    if (!p?.seekTo) return
    const d = p.getDuration?.() || Infinity
    const t = Math.max(0, Math.min(d, seconds))
    p.seekTo(t, true)
    setTime(t)
  }, [])

  const skip = useCallback((delta) => {
    const p = playerRef.current
    if (p?.getCurrentTime) seek(p.getCurrentTime() + delta)
  }, [seek])

  const toggle = useCallback(() => {
    const p = playerRef.current
    if (!p?.getPlayerState) return
    if (p.getPlayerState() === 1) p.pauseVideo()
    else p.playVideo()
  }, [])

  const setRate = useCallback((r) => {
    playerRef.current?.setPlaybackRate?.(r)
    setRateState(r)
  }, [])

  return {
    videoId,
    playing,
    time,
    duration,
    rate,
    error,
    info,
    load,
    seek,
    skip,
    toggle,
    setRate,
    setVolume,
  }
}
