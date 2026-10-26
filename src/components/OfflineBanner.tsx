import React from 'react';
import { WifiOff } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOnline }) => {
  if (isOnline) return null;

  return (
    <div 
      role="status" 
      aria-live="polite"
      className="w-full bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2 text-amber-300 text-xs font-medium"
    >
      <WifiOff className="w-3.5 h-3.5 flex-shrink-0 animate-pulse" />
      <span>Offline Mode — Showing cached AI intelligence feed</span>
    </div>
  );
};
