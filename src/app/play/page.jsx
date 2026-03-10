import PlayFeedPage from '@/components/layouts/pvideos/play/PlayFeedPage'
import { listPlayVideos } from '@/lib/play/videos'

export const metadata = {
  title: 'Play | OcPrimes',
  description: 'Browse product videos by leaf category in the OcPrimes play feed.',
}

export default async function PlayPage() {
  const videos = await listPlayVideos()
  return <PlayFeedPage videos={videos} />
}
