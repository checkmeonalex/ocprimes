/* eslint-disable @next/next/no-img-element */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'

const LOGO_FILE_PATH = path.join(process.cwd(), 'public', 'icons', 'alxora-favicon.png')

let logoDataUrlPromise

const getLogoDataUrl = async () => {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = readFile(LOGO_FILE_PATH).then(
      (buffer) => `data:image/png;base64,${buffer.toString('base64')}`,
    )
  }

  return logoDataUrlPromise
}

export const renderPwaIcon = async ({
  size,
  background,
  inset,
  cardBackground,
  borderRadius = 0,
}: {
  size: number
  background: string
  inset: number
  cardBackground: string
  borderRadius?: number | string
}) => {
  const logoSrc = await getLogoDataUrl()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background,
          padding: inset,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: cardBackground,
            borderRadius,
          }}
        >
          <img
            src={logoSrc}
            alt='Alxora'
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
    },
  )
}
