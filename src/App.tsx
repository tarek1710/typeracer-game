import { useCallback, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { MenuScreen, type RaceOptions } from './components/MenuScreen';
import { GameScreen } from './components/GameScreen';
import { ProgressDashboard } from './components/ProgressDashboard';
import { SettingsPanel } from './components/SettingsPanel';
import { audio } from './game/audio';
import { loadProgress, loadSettings, recordRace, resetProgress, saveSettings, type Progress, type Settings } from './game/storage';
import type { RaceConfig, RaceResult } from './game/types';

type Screen = 'menu' | 'race' | 'progress';

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [showSettings, setShowSettings] = useState(false);
  const [resetAsk, setResetAsk] = useState(false);
  const [options, setOptions] = useState<RaceOptions>({ mode: 'classic', category: 'intermediate', timeLimit: 60, customText: '' });
  const [config, setConfig] = useState<RaceConfig | null>(null);

  useEffect(() => { audio.enabled = settings.sound; saveSettings(settings); }, [settings]);

  const onStart = () => {
    audio.unlock();
    setConfig({
      mode: options.mode, category: options.category, difficulty: 'normal',
      customText: options.customText, timeLimit: options.timeLimit,
    });
    setScreen('race');
  };

  const onResult = useCallback((r: RaceResult) => setProgress(recordRace(r, false)), []);
  const toggleSound = () => setSettings({ ...settings, sound: !settings.sound });
  const showProgress = () => { setProgress(loadProgress()); setScreen('progress'); };

  return (
    <div className="min-h-screen">
      {screen !== 'race' && (
        <Header sound={settings.sound} onSound={toggleSound}
          onHome={() => setScreen('menu')} onSettings={() => setShowSettings(true)} onProgress={showProgress} />
      )}
      {screen === 'menu' && (
        <MenuScreen options={options} onOptions={setOptions} progress={progress} onStart={onStart} onProgress={showProgress} />
      )}
      {screen === 'race' && config && (
        <GameScreen config={config} sound={settings.sound} onSound={toggleSound} onHome={() => setScreen('menu')} onProgress={showProgress} onResult={onResult} />
      )}
      {screen === 'progress' && (
        <ProgressDashboard progress={progress} onBack={() => setScreen('menu')} onReset={() => setProgress(resetProgress())} />
      )}
      {showSettings && (
        <SettingsPanel settings={settings} onChange={setSettings} onClose={() => setShowSettings(false)}
          onResetStats={() => { setShowSettings(false); setResetAsk(true); }} />
      )}
      {resetAsk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="alertdialog" aria-modal="true" aria-label="Confirm reset">
          <div className="pop w-full max-w-sm rounded-2xl border border-white/10 bg-ink-900 p-5">
            <p className="mb-4">Erase all local statistics?</p>
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
