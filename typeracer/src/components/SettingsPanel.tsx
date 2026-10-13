import { CloseIcon, TrashIcon } from './icons';
import type { Settings } from '../game/storage';

export function SettingsPanel({ settings, onChange, onClose, onResetStats }: {
  settings: Settings; onChange: (s: Settings) => void; onClose: () => void; onResetStats: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Settings" onClick={onClose}>
      <div className="pop neon-card w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-ink-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Settings</h2>
          <button onClick={onClose} aria-label="Close settings" className="rounded-lg p-1.5 hover:bg-white/10"><CloseIcon /></button>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-black/30 p-3">
          <input type="checkbox" checked={settings.sound} onChange={(e) => onChange({ ...settings, sound: e.target.checked })} className="mt-1 h-4 w-4 accent-cyan-400" />
          <span><span className="block font-semibold">Sound effects</span><span className="text-xs text-slate-400">Countdown, overtakes, finish, victory. Typing ticks are subtle and rate-limited.</span></span>
        </label>
        <button onClick={onResetStats} className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-red-500/20"><TrashIcon size={16} /> Reset statistics…</button>
        <p className="text-xs text-slate-500">All data is stored locally in your browser. Nothing is uploaded.</p>
      </div>
    </div>
  );
}
