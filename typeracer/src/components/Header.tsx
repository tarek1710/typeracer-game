import { HomeIcon, SettingsIcon, VolumeOff, VolumeOn, ChartIcon } from './icons';

export function Header({ sound, onSound, onHome, onSettings, onProgress }: {
  sound: boolean; onSound: () => void; onHome: () => void; onSettings: () => void; onProgress: () => void;
}) {
  const btn = 'flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/15';
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/85 backdrop-blur" style={{ height: '3.25rem' }}>
      <div className="flex h-full items-center gap-2 px-3 sm:px-4">
        <button onClick={onHome} className="flex items-center gap-2" aria-label="TypeRacer home">
          <span className="font-display text-lg font-black tracking-wider neon-text sm:text-xl">TYPE<span className="text-fuchsia-400">RACER</span></span>
        </button>
        <button onClick={onHome} className={`${btn} ml-1`} aria-label="Home" title="Home"><HomeIcon /></button>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={onProgress} className={btn} aria-label="Progress" title="My progress"><ChartIcon /></button>
          <button onClick={onSound} className={btn} aria-label={sound ? 'Mute sound' : 'Enable sound'} title="Sound">{sound ? <VolumeOn /> : <VolumeOff />}</button>
          <button onClick={onSettings} className={btn} aria-label="Settings" title="Settings"><SettingsIcon /></button>
        </div>
      </div>
    </header>
  );
}
