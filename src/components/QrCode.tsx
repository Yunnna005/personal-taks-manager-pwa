import { encode } from 'uqr'

/** A QR code drawn as one SVG path, black on white so every camera reads it. */
export default function QrCode({ text, className = '' }: { text: string; className?: string }) {
  const { data, size } = encode(text, { border: 2 })
  let path = ''
  data.forEach((row, y) =>
    row.forEach((on, x) => {
      if (on) path += `M${x} ${y}h1v1h-1z`
    }),
  )

  return (
    <svg
      role="img"
      aria-label={`QR code for ${text}`}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={`bg-white ${className}`}
    >
      <path d={path} fill="#000" />
    </svg>
  )
}
