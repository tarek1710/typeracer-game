import { CloseIcon, TrashIcon } from './icons';
import type { Progress, Settings } from '../game/storage';

const Toggle = ({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-black/30 p-3">
    <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 accent-cyan-400" />
    <span><span className="block font-semibold">{label}</span><span className="text-xs text-slate-400">{hint}</span></span>
  </label>
);

export function SettingsPanel({ settings, progress, onChange, onClose, onRecalibrate, onResetStats }: {
  settings: Settings; progress: Progress; onChange: (s: Settings) => void; onClose: () => void;
  onRecalibrate: () => void; onResetStats: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Settings" onClick={onClose}>
      <div className="pop neon-card w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-ink-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Settings</h2>
          <button onClick={onClose} aria-label="Close settings" className="rounded-lg p-1.5 hover:bg-white/10"><CloseIcon /></button>
        </div>
        <Toggle label="Sound effects" hint="Countdown, overtakes, finish, victory. Typing ticks are subtle and rate-limited." on={settings.sound} onChange={(v) => onChange({ ...settings, sound: v })} />
        <Toggle label="Adaptive rivals" hint="After each race rivals get a little faster if you win, slower if you finish near the back (max ±20%)." on={settings.adaptive} onChange={(v) => onChange({ ...settings, adaptive: v })} />
        <Toggle label="Catch-up assist (off in competitive play)" hint="Very subtle: rivals far ahead slow by at most 5%, rivals far behind speed up by at most 5%. Cars still never teleport." on={settings.catchUp} onChange={(v) => onChange({ ...settings, catchUp: v })} />
        <div className="rounded-xl bg-black/30 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span>Calibrated speed: <b>{progress.skillWpm ? `${progress.skillWpm} WPM` : 'not set'}</b></span>
            <button onClick={() => { onClose(); onRecalibrate(); }} className="rounded-lg bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-slate-950">Recalibrate</button>
          </div>
        </div>
        <button onClick={onResetStats} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-red-500/20"><TrashIcon size={16} /> Reset statistics…</button>
        <p className="text-xs text-slate-500">All data is stored locally in your browser. Nothing is uploaded.</p>
      </div>
    </div>
  );
}
