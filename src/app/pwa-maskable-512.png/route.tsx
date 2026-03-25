import { ImageResponse } from 'next/og'

export const runtime = 'edge'

const imageSize = {
  width: 512,
  height: 512,
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
          background: '#2f2019',
          color: '#f8f1e7',
          fontSize: 168,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          padding: 72,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '30%',
            background: 'linear-gradient(135deg, #6c4c3a 0%, #2f2019 100%)',
          }}
        >
          A
        </div>
      </div>
    ),
    imageSize,
  )
}
