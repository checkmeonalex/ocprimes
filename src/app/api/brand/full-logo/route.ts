import { readFile } from 'node:fs/promises'
import path from 'node:path'

export async function GET() {
  const filePath = path.join(process.cwd(), 'src', 'app', 'storage', 'fulllogo.png')
  const buffer = await readFile(filePath)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
