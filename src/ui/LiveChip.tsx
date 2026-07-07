import WeatherChip from './WeatherChip';

export default function LiveChip({ atGym, ouraError }: { atGym: boolean; ouraError: string | null }) {
  if (atGym) return <span className="live-chip gym">AT THE GYM</span>;
  if (ouraError) return <span className="live-chip alert" title={ouraError}>Oura sync failed</span>;
  return <WeatherChip />;
}
