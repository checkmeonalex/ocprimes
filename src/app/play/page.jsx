import PlayFeedPage from '@/components/layouts/pvideos/play/PlayFeedPage'
import { listPlayVideos } from '@/lib/play/videos'

export const metadata = {
  title: 'Play | Alxora',
  description: 'Browse product videos by leaf category in the Alxora play feed.',
}

export default async function PlayPage() {
  const videos = await listPlayVideos()
  return <PlayFeedPage videos={videos} />
}
