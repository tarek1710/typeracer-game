import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RaceTrack, type RaceTrackHandle } from './RaceTrack';
import { TypingPanel } from './TypingPanel';
import { ResultsDashboard } from './ResultsDashboard';
import { PauseIcon, PlayIcon, RestartIcon, FlagIcon } from './icons';
import { createRace } from '../game/createRace';
import { GameLoop } from '../game/GameLoop';
import { audio } from '../game/audio';
import type { RaceSnapshot } from '../game/RaceStateManager';
import type { RaceConfig, RaceResult } from '../game/types';

interface Props {
  config: RaceConfig;
  sound: boolean;
  onHome: () => void;
  onProgress: () => void;
  onResult: (r: RaceResult) => void;
}

export function GameScreen({ config, sound, onHome, onProgress, onResult }: Props) {
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
      engine.on('overtake', (ev) => {
        if (!s()) return;
        if (ev.passerId === 'player') audio.overtake();
      }),
      engine.on('carFinished', (c) => { if (c.isPlayer && s()) audio.finish(); }),
      engine.on('winner', (c) => { if (!c.isPlayer) setBanner(`${c.name} crossed the line first!`); else setBanner('You crossed the line first!'); }),
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
    const hud = window.setInterval(() => setSnap(engine.getSnapshot()), 100);
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
  const phase = snap.phase;
  const go = phase === 'racing' && snap.time < 0.9;
  const lang = config.category === 'bangla' ? 'bn' : undefined;

  return (
    <main className="flex w-full flex-col gap-2 px-2 pb-2 pt-2 sm:px-3" style={{ height: 'calc(100dvh - 3.25rem)', minHeight: 560 }}>
      <div className="relative min-h-[220px] flex-1">
        <RaceTrack ref={track} engine={engine} />
        {(phase === 'countdown' || go) && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-live="assertive">
            <span key={go ? 'go' : snap.countdown} className="pop font-display text-6xl font-black neon-text sm:text-8xl">
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

      {banner && phase === 'racing' && <p className="text-center text-sm font-semibold text-amber-300" role="status">{banner}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {phase === 'paused' ? (
          <button onClick={() => engine.resume()} className="flex items-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"><PlayIcon size={16} /> Resume</button>
        ) : (
          <button onClick={() => engine.pause()} disabled={phase !== 'racing' && phase !== 'countdown'} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15 disabled:opacity-40"><PauseIcon size={16} /> Pause</button>
        )}
        <button onClick={restart} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"><RestartIcon size={16} /> Restart</button>
        {engine.modeCfg.end === 'manual' && (
          <button onClick={() => engine.finishNow()} disabled={phase !== 'racing' && phase !== 'paused'} className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40"><FlagIcon size={16} /> End practice</button>
        )}
        {timed && <span className="font-display text-lg font-bold tabular-nums text-amber-300" aria-label="Time left">{Math.ceil(snap.timeLeft ?? 0)}s</span>}
        <span className="ml-auto text-xs text-slate-500">Esc = pause</span>
      </div>


      <TypingPanel engine={engine} phase={phase} lang={lang} sound={sound} />

      {phase === 'finished' && snap.result && (
        <ResultsDashboard result={snap.result} onPlayAgain={restart} onHome={onHome} onProgress={onProgress} />
      )}
    </main>
  );
}
