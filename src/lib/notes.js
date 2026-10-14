// Utilidades de notas: nombres, colores pastel y geometría del teclado.

const NAMES_EN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const NAMES_LATIN = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si']
const BLACK = new Set([1, 3, 6, 8, 10])

// Un color pastel por cada nota de la escala cromática (círculo de color).
export const PASTELS = [
  '#FFB3BA', // Do   rosa
  '#FFC8A2', // Do#  durazno
  '#FFDFA3', // Re   mantequilla
  '#FFF3A3', // Re#  limón
  '#D4F5A8', // Mi   pistacho
  '#B5EAD7', // Fa   menta
  '#A8E6E2', // Fa#  aqua
  '#A8D8F0', // Sol  cielo
  '#B9C6F5', // Sol# pervinca
  '#CDB4F6', // La   lavanda
  '#E8B4F0', // La#  lila
  '#F7B5DA', // Si   chicle
]

export const pitchClass = (midi) => ((midi % 12) + 12) % 12
export const octaveOf = (midi) => Math.floor(midi / 12) - 1
export const isBlack = (midi) => BLACK.has(pitchClass(midi))
export const colorOf = (midi) => PASTELS[pitchClass(midi)]

export function noteName(midi, latin = true, withOctave = true) {
  const name = (latin ? NAMES_LATIN : NAMES_EN)[pitchClass(midi)]
  return withOctave ? `${name}${octaveOf(midi)}` : name
}

// Nombre en inglés (para Tone.js y Tonal).
export const toneName = (midi) => `${NAMES_EN[pitchClass(midi)]}${octaveOf(midi)}`

// Oscurece un color hex para bordes y texto.
export function shade(hex, amount = 0.25) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 255) * (1 - amount))
  const g = Math.round(((n >> 8) & 255) * (1 - amount))
  const b = Math.round((n & 255) * (1 - amount))
  return `rgb(${r}, ${g}, ${b})`
}

export const RANGES = {
  25: [48, 72],
  49: [36, 84],
  61: [36, 96],
  88: [21, 108],
}

// Calcula la posición horizontal (0..1) de cada tecla. La usan tanto el
// teclado como la cascada de notas, así siempre quedan alineados.
export function keyboardLayout(low, high) {
  // Las teclas de los extremos deben ser blancas.
  if (isBlack(low)) low -= 1
  if (isBlack(high)) high += 1

  const whites = []
  for (let m = low; m <= high; m++) if (!isBlack(m)) whites.push(m)
  const whiteW = 1 / whites.length
  const blackW = whiteW * 0.6

  // Pequeño desplazamiento de cada tecla negra, como en un piano real.
  const blackOffset = { 1: -0.12, 3: 0.12, 6: -0.15, 8: 0, 10: 0.15 }

  const keys = []
  let whiteIndex = 0
  for (let m = low; m <= high; m++) {
    if (!isBlack(m)) {
      keys.push({ midi: m, black: false, x: whiteIndex * whiteW, w: whiteW })
      whiteIndex++
    } else {
      const center = whiteIndex * whiteW + blackOffset[pitchClass(m)] * blackW
      keys.push({ midi: m, black: true, x: center - blackW / 2, w: blackW })
    }
  }
  const byMidi = new Map(keys.map((k) => [k.midi, k]))
  return { low, high, keys, byMidi, whiteW }
}
