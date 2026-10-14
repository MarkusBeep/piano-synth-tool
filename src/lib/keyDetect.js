// Detecta la tonalidad de una canción a partir de texto copiado de una web
// (letra con acordes). Entiende cifrado americano (Am, G7, C/E) y latino
// (Lam, Sol7, Do/Mi), en líneas de acordes o entre corchetes [Am].

const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const LATIN_PC = { do: 0, re: 2, mi: 4, fa: 5, sol: 7, la: 9, si: 11 }

// Sufijo de acorde: calidad + extensiones (7, maj7, sus4, add9, b5, (9)…).
const SUFFIX = /^(maj|Maj|M|min|mi|m|-|dim|°|º|o|aug|\+|sus)?(\d{1,2})?((?:sus[24]?|add\d{1,2}|maj\d{0,2}|[b#]\d{1,2}|\([^)]*\)|\+|-|\d)*)$/

function parseRoot(token) {
  const latin = token.match(/^(do|re|mi|fa|sol|la|si)([#b♯♭]?)/i)
  if (latin) {
    const acc = latin[2]
    const pc = LATIN_PC[latin[1].toLowerCase()] + (acc === '#' || acc === '♯' ? 1 : acc ? -1 : 0)
    return { pc: (pc + 12) % 12, rest: token.slice(latin[0].length) }
  }
  const en = token.match(/^([A-G])([#b♯♭]?)/)
  if (en) {
    const acc = en[2]
    const pc = LETTER_PC[en[1]] + (acc === '#' || acc === '♯' ? 1 : acc ? -1 : 0)
    return { pc: (pc + 12) % 12, rest: token.slice(en[0].length) }
  }
  return null
}

// Convierte "Am7", "Lam", "F#m7b5", "Sol/Si" en { root, quality, text }.
export function parseChord(token) {
  const root = parseRoot(token)
  if (!root) return null
  let rest = root.rest
  const slash = rest.lastIndexOf('/')
  if (slash !== -1) {
    if (!parseRoot(rest.slice(slash + 1))) return null
    rest = rest.slice(0, slash)
  }
  const m = rest.match(SUFFIX)
  if (!m) return null
  const q = m[1] ?? ''
  let quality = 'maj'
  if (['m', 'mi', 'min', '-'].includes(q)) quality = /b5/.test(m[3]) ? 'dim' : 'min'
  else if (['dim', '°', 'º', 'o'].includes(q)) quality = 'dim'
  else if (['aug', '+'].includes(q)) quality = 'aug'
  else if (q === 'sus' || /^sus/.test(m[3])) quality = 'sus'
  return { root: root.pc, quality, text: token }
}

const IGNORE = /^(\||\|\||-+|x\d+|\d+x|%|\/|n\.?c\.?|\(|\)|:)$/i
const LABEL = /^[A-Za-zÁÉÍÓÚáéíóúñÑ ]{2,20}:\s*/ // "Intro:", "Coro:", "Verse 1:"

// Busca los acordes del texto, en orden.
export function extractChords(text) {
  const chords = []
  for (const rawLine of text.split(/\r?\n/)) {
    // Formato con corchetes: [Am]letra [G]letra
    const bracketed = [...rawLine.matchAll(/\[([^\]\s]{1,12})\]/g)]
    if (bracketed.length) {
      for (const b of bracketed) {
        const c = parseChord(b[1])
        if (c) chords.push(c)
      }
      continue
    }
    // Línea de acordes: todas sus palabras deben ser acordes (así "La casa"
    // o "Mi amor" en la letra no se confunden con acordes).
    const line = rawLine.replace(LABEL, '').replace(/[()]/g, ' ').trim()
    if (!line) continue
    const tokens = line.split(/\s+/).filter((t) => !IGNORE.test(t))
    if (!tokens.length) continue
    const parsed = tokens.map(parseChord)
    if (parsed.every(Boolean)) chords.push(...parsed)
  }
  return chords
}

const MAJOR = { steps: [0, 2, 4, 5, 7, 9, 11], qualities: ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'], romans: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] }
const MINOR = { steps: [0, 2, 3, 5, 7, 8, 10], qualities: ['min', 'dim', 'maj', 'min', 'min', 'maj', 'maj'], romans: ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'] }

// Romano del acorde dentro de la tonalidad, o null si está fuera de ella.
export function romanFor(chord, tonic, mode) {
  const scale = mode === 'major' ? MAJOR : MINOR
  const deg = scale.steps.indexOf((chord.root - tonic + 12) % 12)
  if (deg === -1) {
    // En menor, el V mayor y el vii° (escala armónica) son muy comunes.
    if (mode === 'minor' && (chord.root - tonic + 12) % 12 === 11 && chord.quality === 'dim') return 'vii°'
    return null
  }
  const expected = scale.qualities[deg]
  if (mode === 'minor' && deg === 4 && chord.quality === 'maj') return 'V'
  if (chord.quality === expected || chord.quality === 'sus') return scale.romans[deg]
  return null
}

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const LATIN_NAMES = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' }

// Cantidad de sostenidos (+) o bemoles (−) de cada tonalidad mayor.
const MAJOR_SIGNATURE = [0, -5, 2, -3, 4, -1, 6, 1, -4, 3, -2, 5]

export function keyInfo(tonic, mode) {
  const sig = MAJOR_SIGNATURE[mode === 'major' ? tonic : (tonic + 3) % 12]
  const names = sig < 0 ? FLAT_NAMES : SHARP_NAMES
  const name = names[tonic]
  const latin = name.replace(/^[A-G]/, (l) => LATIN_NAMES[l]).replace('#', '♯').replace(/b$/, '♭')
  const steps = (mode === 'major' ? MAJOR : MINOR).steps
  return {
    tonic,
    mode,
    symbol: mode === 'major' ? name : `${name}m`,
    spanish: `${latin} ${mode === 'major' ? 'mayor' : 'menor'}`,
    signature: sig === 0 ? 'sin alteraciones' : `${Math.abs(sig)} ${sig > 0 ? 'sostenido' : 'bemol'}${Math.abs(sig) > 1 ? (sig > 0 ? 's' : 'es') : ''}`,
    scale: steps.map((s) => names[(tonic + s) % 12]),
    pcs: new Set(steps.map((s) => (tonic + s) % 12)),
  }
}

// Prueba las 24 tonalidades y se queda con la que mejor explica los acordes.
export function detectKey(chords) {
  if (chords.length < 2) return null
  const first = chords[0]
  const last = chords[chords.length - 1]
  const results = []

  for (let tonic = 0; tonic < 12; tonic++) {
    for (const mode of ['major', 'minor']) {
      const scale = mode === 'major' ? MAJOR : MINOR
      const tonicQuality = scale.qualities[0]
      const isTonic = (c) => c.root === tonic && c.quality === tonicQuality
      let score = 0
      let fits = 0
      for (const c of chords) {
        if (romanFor(c, tonic, mode)) {
          score += 2
          fits++
        } else if (scale.steps.includes((c.root - tonic + 12) % 12)) score += 0.5
        else score -= 1
        if (isTonic(c)) score += 1
      }
      // Las canciones suelen empezar y, sobre todo, terminar en la tónica.
      if (isTonic(first)) score += 3
      if (isTonic(last)) score += 4
      results.push({ tonic, mode, score, fit: fits / chords.length })
    }
  }

  results.sort((a, b) => b.score - a.score)
  const [best, second] = results
  return {
    key: keyInfo(best.tonic, best.mode),
    fit: best.fit,
    alternative: second && best.score - second.score < 3 ? keyInfo(second.tonic, second.mode) : null,
  }
}

// Resumen para mostrar: acordes únicos en orden de aparición, con su romano.
export function analyzeText(text) {
  const chords = extractChords(text)
  const result = detectKey(chords)
  if (!result) return { chords, result: null, unique: [] }
  const seen = new Map()
  for (const c of chords) {
    const id = `${c.root}-${c.quality}`
    if (!seen.has(id)) seen.set(id, { ...c, count: 0, roman: romanFor(c, result.key.tonic, result.key.mode) })
    seen.get(id).count++
  }
  return { chords, result, unique: [...seen.values()] }
}
