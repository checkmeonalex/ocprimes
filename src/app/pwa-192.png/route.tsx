import { ImageResponse } from 'next/og'

export const runtime = 'edge'

const imageSize = {
  width: 192,
  height: 192,
}

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f8f1e7 0%, #f4e5d2 100%)',
          color: '#2f2019',
          fontSize: 62,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        A
      </div>
    ),
    imageSize,
  )
}
