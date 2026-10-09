import { HomeIcon, SettingsIcon, VolumeOff, VolumeOn, ChartIcon } from './icons';
import type { Difficulty } from '../game/types';

const DIFFS: Difficulty[] = ['easy', 'normal', 'hard'];

export function Header({ difficulty, onDifficulty, difficultyLocked, sound, onSound, onHome, onSettings, onProgress }: {
  difficulty: Difficulty; onDifficulty: (d: Difficulty) => void; difficultyLocked: boolean;
  sound: boolean; onSound: () => void; onHome: () => void; onSettings: () => void; onProgress: () => void;
}) {
  const btn = 'flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/15';
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2 sm:px-4">
        <button onClick={onHome} className="flex items-center gap-2" aria-label="TypeRacer home">
          <span className="font-display text-lg font-black tracking-wider neon-text sm:text-xl">TYPE<span className="text-fuchsia-400">RACER</span></span>
        </button>
        <button onClick={onHome} className={`${btn} ml-1`} aria-label="Home" title="Home"><HomeIcon /></button>
        <div className="ml-auto flex items-center gap-2">
          <div role="radiogroup" aria-label="Difficulty" title={difficultyLocked ? 'Finish or leave the race to change difficulty' : 'Difficulty'}
            className={`flex rounded-lg bg-white/10 p-0.5 text-xs font-semibold ${difficultyLocked ? 'opacity-50' : ''}`}>
            {DIFFS.map((d) => (
              <button key={d} role="radio" aria-checked={difficulty === d} disabled={difficultyLocked} onClick={() => onDifficulty(d)}
                className={`rounded-md px-2 py-1.5 capitalize sm:px-3 ${difficulty === d ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:text-white'}`}>{d}</button>
            ))}
          </div>
          <button onClick={onProgress} className={btn} aria-label="Progress" title="My progress"><ChartIcon /></button>
          <button onClick={onSound} className={btn} aria-label={sound ? 'Mute sound' : 'Enable sound'} title="Sound">{sound ? <VolumeOn /> : <VolumeOff />}</button>
          <button onClick={onSettings} className={btn} aria-label="Settings" title="Settings"><SettingsIcon /></button>
        </div>
      </div>
    </header>
  );
}
