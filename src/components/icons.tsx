import type { ReactNode, SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (children: ReactNode) =>
  function Icon({ size = 18, ...rest }: P) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>{children}</svg>
    );
  };

// Lucide-style 24px stroke icons (inlined so the project has no extra icon dependency).
export const HomeIcon = base(<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></>);
export const VolumeOn = base(<><path d="M11 5L6 9H3v6h3l5 4V5z" /><path d="M15.5 8.5a5 5 0 010 7" /><path d="M18.5 5.5a9 9 0 010 13" /></>);
export const VolumeOff = base(<><path d="M11 5L6 9H3v6h3l5 4V5z" /><path d="M22 9l-6 6M16 9l6 6" /></>);
export const SettingsIcon = base(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></>);
export const PlayIcon = base(<path d="M6 4l14 8-14 8V4z" />);
export const PauseIcon = base(<><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>);
export const RestartIcon = base(<><path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8" /><path d="M3 3v5h5" /></>);
export const FlagIcon = base(<><path d="M4 22V4" /><path d="M4 4h13l-2 4 2 4H4" /></>);
export const ZapIcon = base(<path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />);
export const TimerIcon = base(<><path d="M10 2h4" /><path d="M12 14l3-3" /><circle cx="12" cy="14" r="8" /></>);
export const TargetIcon = base(<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>);
export const DumbbellIcon = base(<><path d="M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12" /></>);
export const FileTextIcon = base(<><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z" /><path d="M14 3v6h6M8 13h8M8 17h6" /></>);
export const TrophyIcon = base(<><path d="M8 21h8M12 17v4" /><path d="M7 4h10v5a5 5 0 01-10 0V4z" /><path d="M17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3" /></>);
export const ChartIcon = base(<><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 5-6" /></>);
export const CloseIcon = base(<path d="M18 6L6 18M6 6l12 12" />);
export const KeyboardIcon = base(<><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" /></>);
export const GaugeIcon = base(<><path d="M12 14l4-4" /><path d="M3.3 19a10 10 0 1117.4 0" /></>);
export const CheckIcon = base(<path d="M20 6L9 17l-5-5" />);
export const TrashIcon = base(<><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></>);
