import { useEffect, useRef } from 'react'
import { colorOf, pitchClass, shade } from '../lib/notes'

// Lienzo donde cada nota tocada nace en el teclado y sube como una cinta
// de color pastel. Al tocarla salen chispas y un anillo de onda.
export default function Waterfall({ layout, subscribe, speed, sparkles }) {
  const canvasRef = useRef(null)
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  const opts = useRef({ speed, sparkles })
  opts.current = { speed, sparkles }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const ribbons = [] // { midi, start, end, velocity }
    const open = new Map() // midi -> ribbon activo
    const particles = []
    const ripples = []
    let width = 0
    let height = 0
    let raf

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const r = canvas.getBoundingClientRect()
      width = r.width
      height = r.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const keyRect = (midi) => {
      const k = layoutRef.current.byMidi.get(midi)
      if (!k) return null
      const pad = k.black ? 1 : 3
      return { x: k.x * width + pad, w: k.w * width - pad * 2 }
    }

    const unsubscribe = subscribe((type, midi, velocity) => {
      const now = performance.now()
      if (type === 'on') {
        const ribbon = { midi, start: now, end: null, velocity }
        ribbons.push(ribbon)
        open.set(midi, ribbon)
        const k = keyRect(midi)
        if (!k) return
        const cx = k.x + k.w / 2
        ripples.push({ x: cx, born: now, color: colorOf(midi), w: k.w })
        if (opts.current.sparkles) {
          const count = 8 + Math.round(velocity * 14)
          for (let i = 0; i < count; i++) {
            const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9
            const v = 60 + Math.random() * 220 * velocity
            particles.push({
              x: cx + (Math.random() - 0.5) * k.w,
              y: height - 2,
              vx: Math.cos(a) * v,
              vy: Math.sin(a) * v,
              life: 0,
              ttl: 0.6 + Math.random() * 0.9,
              size: 1.5 + Math.random() * 3.5,
              color: colorOf(midi + (Math.random() < 0.25 ? 7 : 0)),
              star: Math.random() < 0.35,
            })
          }
        }
      } else {
        const ribbon = open.get(midi)
        if (ribbon) ribbon.end = now
        open.delete(midi)
      }
    })

    const roundRect = (x, y, w, h, r) => {
      r = Math.min(r, w / 2, h / 2)
      ctx.beginPath()
      ctx.roundRect(x, y, w, h, r)
    }

    const drawStar = (x, y, r) => {
      ctx.beginPath()
      for (let i = 0; i < 8; i++) {
        const rad = i % 2 === 0 ? r * 2 : r * 0.6
        const a = (i * Math.PI) / 4
        ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad)
      }
      ctx.closePath()
      ctx.fill()
    }

    let last = performance.now()
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const pxPerMs = opts.current.speed / 1000
      ctx.clearRect(0, 0, width, height)

      // Guías suaves en cada Do para ubicarse.
      ctx.lineWidth = 1
      for (const k of layoutRef.current.keys) {
        if (pitchClass(k.midi) !== 0) continue
        const x = Math.round(k.x * width) + 0.5
        ctx.strokeStyle = 'rgba(120, 110, 160, 0.08)'
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }

      // Cintas de notas.
      for (let i = ribbons.length - 1; i >= 0; i--) {
        const n = ribbons[i]
        const top = height - (now - n.start) * pxPerMs
        const bottom = n.end === null ? height : height - (now - n.end) * pxPerMs
        if (bottom < -20) {
          ribbons.splice(i, 1)
          continue
        }
        const k = keyRect(n.midi)
        if (!k) continue
        const h = Math.max(6, bottom - top)
        const color = colorOf(n.midi)
        const alpha = 0.55 + n.velocity * 0.45
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.shadowColor = color
        ctx.shadowBlur = n.end === null ? 18 : 8
        ctx.fillStyle = color
        roundRect(k.x, bottom - h, k.w, h, 8)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.strokeStyle = shade(color, 0.18)
        ctx.lineWidth = 1.2
        ctx.stroke()
        // Brillo interior.
        ctx.globalAlpha = alpha * 0.55
        ctx.fillStyle = '#ffffff'
        roundRect(k.x + 3, bottom - h + 3, Math.max(2, k.w * 0.22), Math.max(2, h - 6), 4)
        ctx.fill()
        ctx.restore()
      }

      // Ondas en la línea del teclado.
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i]
        const t = (now - r.born) / 700
        if (t >= 1) {
          ripples.splice(i, 1)
          continue
        }
        ctx.save()
        ctx.globalAlpha = (1 - t) * 0.7
        ctx.strokeStyle = shade(r.color, 0.1)
        ctx.lineWidth = 2.5 * (1 - t) + 0.5
        ctx.beginPath()
        ctx.ellipse(r.x, height, r.w * 0.6 + t * 50, 6 + t * 30, 0, Math.PI, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }

      // Chispas.
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life += dt
        if (p.life >= p.ttl) {
          particles.splice(i, 1)
          continue
        }
        p.vy += 140 * dt
        p.vx *= 0.985
        p.x += p.vx * dt
        p.y += p.vy * dt
        const fade = 1 - p.life / p.ttl
        ctx.globalAlpha = fade
        ctx.fillStyle = shade(p.color, 0.05)
        if (p.star) drawStar(p.x, p.y, p.size * 0.7)
        else {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * fade + 0.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      unsubscribe()
    }
  }, [subscribe])

  return <canvas ref={canvasRef} className="waterfall" />
}
