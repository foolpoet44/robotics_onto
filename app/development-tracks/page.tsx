import DevelopmentTrackDashboard from "../components/DevelopmentTrackDashboard";
import {
  getDevelopmentCandidates,
  getDevelopmentTrack,
} from "../lib/server-data";

export default async function DevelopmentTracksPage() {
  const trackId = "smartfactory-tech-leader";
  const [track, candidates] = await Promise.all([
    getDevelopmentTrack(trackId),
    getDevelopmentCandidates(trackId),
  ]);
  if (!track) {
    return null;
  }
  return <DevelopmentTrackDashboard candidates={candidates} track={track} />;
}
