import { Chord } from 'tonal'
import { noteName } from './notes'

const INTERVALS = [
  'Unísono', '2ª menor', '2ª mayor', '3ª menor', '3ª mayor', '4ª justa', 'Tritono',
  '5ª justa', '6ª menor', '6ª mayor', '7ª menor', '7ª mayor', 'Octava',
]

// Tipos de acorde comunes: se prefieren al elegir entre varias lecturas posibles.
const COMMON_TYPES = new Set([
  'major', 'minor', 'diminished', 'augmented', 'dominant seventh', 'major seventh',
  'minor seventh', 'half-diminished', 'diminished seventh', 'suspended fourth',
  'suspended second', 'sixth', 'minor sixth', 'fifth', 'major ninth', 'minor ninth',
  'dominant ninth',
])

// Cifrado americano limpio: "CM" -> "C", "CM/E" -> "C/E", "CMaj7" -> "Cmaj7".
const toSymbol = (s) =>
  s.replace(/^([A-G][#b]?)M(?=\/|$)/, '$1').replace(/^([A-G][#b]?)Maj/, '$1maj')

// Devuelve el intervalo (2 notas) o el acorde en cifrado americano (3+ notas).
export function describe(midis) {
  if (midis.length === 2) {
    const diff = midis[1] - midis[0]
    const name =
      diff <= 12 ? INTERVALS[diff]
      : diff % 12 === 0 ? `${diff / 12} octavas`
      : `${INTERVALS[diff % 12]} compuesta`
    return { title: name, root: midis[0], chord: false }
  }
  if (midis.length < 3) return null
  const names = [...new Set(midis.map((m) => noteName(m, false, false)))]
  const candidates = Chord.detect(names)
  if (!candidates.length) return null
  // Preferimos los acordes comunes (ej. "CM/E" antes que "Em#5").
  const symbol = candidates.find((s) => COMMON_TYPES.has(Chord.get(s).type)) ?? candidates[0]
  const tonic = Chord.get(symbol).tonic
  const root = midis.find((m) => noteName(m, false, false) === tonic) ?? midis[0]
  return { title: toSymbol(symbol), root, chord: true }
}
