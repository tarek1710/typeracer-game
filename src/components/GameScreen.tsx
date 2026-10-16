import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { RaceTrack, type RaceTrackHandle } from './RaceTrack';
import { TypingPanel } from './TypingPanel';
import { ResultsDashboard } from './ResultsDashboard';
import { FlagIcon, HomeIcon, PauseIcon, PlayIcon, RestartIcon, VolumeOff, VolumeOn } from './icons';
import { createRace } from '../game/createRace';
import { GameLoop } from '../game/GameLoop';
import { audio } from '../game/audio';
import type { RaceSnapshot } from '../game/RaceStateManager';
import type { RaceConfig, RaceResult } from '../game/types';

interface Props {
  config: RaceConfig;
  sound: boolean;
  onSound: () => void;
  onHome: () => void;
  onProgress: () => void;
  onResult: (r: RaceResult) => void;
}

const SideButton = ({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) => (
  <button onClick={onClick} disabled={disabled} aria-label={label} title={label}
    className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-slate-100 hover:bg-white/20 disabled:opacity-40">
    {children}
  </button>
);

/** Full-screen race: the track fills the screen, the text to type sits at the bottom, controls at the bottom-left. */
export function GameScreen({ config, sound, onSound, onHome, onProgress, onResult }: Props) {
  const [raceId, setRaceId] = useState(0);
  const engine = useMemo(() => createRace(config), [config, raceId]); // eslint-disable-line react-hooks/exhaustive-deps
  const track = useRef<RaceTrackHandle>(null);
  const [snap, setSnap] = useState<RaceSnapshot>(() => engine.getSnapshot());
  const [banner, setBanner] = useState<string | null>(null);
  const reported = useRef<unknown>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const soundRef = useRef(sound);
  soundRef.current = sound;

  // One loop + one set of listeners per engine; everything is torn down on restart/unmount.
  useEffect(() => {
    audio.enabled = soundRef.current;
    audio.unlock();
    setBanner(null);
    setSnap(engine.getSnapshot());
    const s = () => soundRef.current;
    const offs = [
      engine.on('countdown', () => { if (s()) audio.countdown(); }),
      engine.on('start', () => { if (s()) audio.go(); }),
      engine.on('overtake', (ev) => { if (s() && ev.passerId === 'player') audio.overtake(); }),
      engine.on('carFinished', (c) => { if (c.isPlayer && s()) audio.finish(); }),
      engine.on('winner', (c) => setBanner(c.isPlayer ? 'You crossed the line first!' : `${c.name} crossed the line first!`)),
      engine.on('end', (r) => {
        if (reported.current !== engine) { reported.current = engine; onResultRef.current(r); }
        if (s() && r.totalCars > 1) (r.playerWon ? audio.victory() : audio.defeat());
        setSnap(engine.getSnapshot());
      }),
      engine.on('phase', () => setSnap(engine.getSnapshot())),
    ];
    const loop = new GameLoop((dt) => {
      engine.update(dt);
      track.current?.render(engine, dt);
    });
    loop.start();
    engine.startCountdown();
    const hud = window.setInterval(() => setSnap(engine.getSnapshot()), 150);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (engine.phase === 'paused') engine.resume(); else engine.pause();
    };
    const onVis = () => { if (document.hidden) engine.pause(); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      loop.stop();
      window.clearInterval(hud);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVis);
      offs.forEach((off) => off());
    };
  }, [engine]);

  const restart = useCallback(() => setRaceId((n) => n + 1), []);
  const timed = engine.modeCfg.end === 'time';
  const manual = engine.modeCfg.end === 'manual';
  const phase = snap.phase;
  const go = phase === 'racing' && snap.time < 0.9;
  const lang = config.category === 'bangla' ? 'bn' : undefined;
  const left = Math.ceil(snap.timeLeft ?? 0);

  return (
    <main className="fixed inset-0 z-10 flex flex-col gap-2 bg-ink-950 p-2 sm:p-3">
      <div className="relative min-h-0 flex-1">
        <RaceTrack ref={track} engine={engine} />
        {timed && (
          <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-lg bg-black/60 px-3 py-1 font-display text-xl font-bold tabular-nums text-amber-300" aria-label="Time left">
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
          </div>
        )}
        {banner && phase === 'racing' && (
          <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-lg bg-black/60 px-3 py-1 text-sm font-semibold text-amber-300" role="status">{banner}</div>
        )}
        {(phase === 'countdown' || go) && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-live="assertive">
            <span key={go ? 'go' : snap.countdown} className="pop font-display text-7xl font-black neon-text sm:text-9xl">
              {go ? 'GO!' : snap.countdown}
            </span>
          </div>
        )}
        {phase === 'paused' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-black/65 backdrop-blur-sm">
            <span className="font-display text-3xl font-bold">Paused</span>
            <button onClick={() => engine.resume()} className="flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 font-semibold text-slate-950 hover:bg-cyan-300"><PlayIcon /> Resume</button>
            <span className="text-xs text-slate-400">or press Esc</span>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-end gap-2">
        <nav className="flex shrink-0 flex-col gap-2" aria-label="Game controls">
          <SideButton label="Menu" onClick={onHome}><HomeIcon /></SideButton>
          {phase === 'paused'
            ? <SideButton label="Resume" onClick={() => engine.resume()}><PlayIcon /></SideButton>
            : <SideButton label="Pause (Esc)" onClick={() => engine.pause()} disabled={phase !== 'racing' && phase !== 'countdown'}><PauseIcon /></SideButton>}
          <SideButton label="Restart" onClick={restart}><RestartIcon /></SideButton>
          <SideButton label={sound ? 'Mute sound' : 'Turn sound on'} onClick={onSound}>{sound ? <VolumeOn /> : <VolumeOff />}</SideButton>
          {manual && <SideButton label="End practice" onClick={() => engine.finishNow()} disabled={phase !== 'racing' && phase !== 'paused'}><FlagIcon /></SideButton>}
        </nav>
        <TypingPanel engine={engine} phase={phase} lang={lang} />
      </div>

      {phase === 'finished' && snap.result && (
        <ResultsDashboard result={snap.result} onPlayAgain={restart} onHome={onHome} onProgress={onProgress} />
      )}
    </main>
  );
}
