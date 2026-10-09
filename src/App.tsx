import { useCallback, useEffect, useMemo, useState } from 'react';
import { Header } from './components/Header';
import { MenuScreen, type RaceOptions } from './components/MenuScreen';
import { CalibrationScreen } from './components/CalibrationScreen';
import { GameScreen } from './components/GameScreen';
import { ProgressDashboard } from './components/ProgressDashboard';
import { SettingsPanel } from './components/SettingsPanel';
import { audio } from './game/audio';
import {
  loadProgress, loadSettings, recordRace, resetProgress, saveSettings, setSkill,
  type Progress, type Settings,
} from './game/storage';
import type { RaceConfig, RaceResult } from './game/types';

type Screen = 'menu' | 'calibrate' | 'race' | 'progress';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [showSettings, setShowSettings] = useState(false);
  const [resetAsk, setResetAsk] = useState(false);
  const [options, setOptions] = useState<RaceOptions>({ mode: 'classic', category: 'intermediate', timeLimit: 60, customText: '' });
  const [config, setConfig] = useState<RaceConfig | null>(null);
  const [pendingStart, setPendingStart] = useState(false);

  useEffect(() => { audio.enabled = settings.sound; saveSettings(settings); }, [settings]);

  const startRace = useCallback((skill: number, p: Progress) => {
    audio.unlock();
    setConfig({
      mode: options.mode, category: options.category, difficulty: settings.difficulty, skillWpm: skill,
      customText: options.customText, timeLimit: options.timeLimit,
      adaptiveOffset: settings.adaptive ? p.adaptiveOffset : 0, catchUp: settings.catchUp,
    });
    setScreen('race');
  }, [options, settings]);

  const onStart = () => {
    audio.unlock();
    if (progress.skillWpm) startRace(progress.skillWpm, progress);
    else { setPendingStart(true); setScreen('calibrate'); }
  };

  const onResult = useCallback((r: RaceResult) => setProgress(recordRace(r, settings.adaptive)), [settings.adaptive]);
  const inRace = screen === 'race';
  const raceConfig = useMemo(() => config, [config]);

  return (
    <div className="min-h-screen">
      <Header
        difficulty={settings.difficulty} onDifficulty={(difficulty) => setSettings({ ...settings, difficulty })} difficultyLocked={inRace}
        sound={settings.sound} onSound={() => setSettings({ ...settings, sound: !settings.sound })}
        onHome={() => setScreen('menu')} onSettings={() => setShowSettings(true)} onProgress={() => { setProgress(loadProgress()); setScreen('progress'); }}
      />
      {screen === 'menu' && (
        <MenuScreen options={options} onOptions={setOptions} progress={progress} onStart={onStart}
          onCalibrate={() => { setPendingStart(false); setScreen('calibrate'); }}
          onProgress={() => setScreen('progress')} />
      )}
      {screen === 'calibrate' && (
        <CalibrationScreen
          onCancel={() => { setPendingStart(false); setScreen('menu'); }}
          onDone={(wpm) => {
            const p = setSkill(wpm);
            setProgress(p);
            if (pendingStart) { setPendingStart(false); startRace(p.skillWpm!, p); } else setScreen('menu');
          }} />
      )}
      {screen === 'race' && raceConfig && (
        <GameScreen config={raceConfig} sound={settings.sound} onHome={() => setScreen('menu')}
          onProgress={() => { setProgress(loadProgress()); setScreen('progress'); }} onResult={onResult} />
      )}
      {screen === 'progress' && (
        <ProgressDashboard progress={progress} onBack={() => setScreen('menu')} onReset={() => setProgress(resetProgress())} />
      )}
      {showSettings && (
        <SettingsPanel settings={settings} progress={progress} onChange={setSettings} onClose={() => setShowSettings(false)}
          onRecalibrate={() => { setPendingStart(false); setScreen('calibrate'); }} onResetStats={() => { setShowSettings(false); setResetAsk(true); }} />
      )}
      {resetAsk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="alertdialog" aria-modal="true" aria-label="Confirm reset">
          <div className="pop w-full max-w-sm rounded-2xl border border-white/10 bg-ink-900 p-5">
            <p className="mb-4">Erase all local statistics? Your calibrated speed is kept.</p>
            <div className="flex gap-2">
              <button onClick={() => { setProgress(resetProgress()); setResetAsk(false); }} className="rounded-lg bg-red-500 px-4 py-2 font-semibold">Reset</button>
              <button onClick={() => setResetAsk(false)} className="rounded-lg bg-white/10 px-4 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
