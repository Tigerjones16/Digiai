import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

interface InstallPromptProps {
  pwaState: ReturnType<typeof usePWA>;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({ pwaState }) => {
  const { isInstallable, isInstalled, isIOS, triggerInstall } = pwaState;
  const [showIosModal, setShowIosModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // If already installed or dismissed, hide banner
  if (isInstalled || dismissed) return null;

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <div 
        role="region" 
        aria-label="PWA Installation"
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 p-4 rounded-2xl bg-[#16161a] border border-[#0071e3]/40 shadow-2xl flex items-center justify-between gap-3 animate-fade-in"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0071e3] flex items-center justify-center text-white flex-shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white">Install DigAI App</h3>
            <p className="text-[11px] text-white/70">Access offline & read full-screen</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={triggerInstall}
            className="min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-semibold flex items-center justify-center transition-all shadow-md active:scale-95"
            aria-label="Install DigAI to home screen"
          >
            Install
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/50 hover:text-white"
            aria-label="Dismiss installation prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <div 
          role="region"
          aria-label="iOS Installation Guide Banner"
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 p-3.5 rounded-2xl bg-[#16161a] border border-white/10 shadow-2xl flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2.5">
            <Share className="w-4 h-4 text-[#0071e3] flex-shrink-0" />
            <span className="text-xs text-white/90">Add to iPhone Home Screen</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowIosModal(true)}
              className="min-h-[44px] px-3 text-xs font-semibold text-[#0071e3] hover:underline"
              aria-label="View iOS install instructions"
            >
              How to
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/40 hover:text-white"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showIosModal && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="iOS Installation Instructions"
          >
            <div className="w-full max-w-sm rounded-3xl bg-[#141418] border border-white/15 p-6 shadow-2xl">
              <h3 className="text-base font-bold text-white mb-2">Install on iPhone / iPad</h3>
              <p className="text-xs text-white/70 leading-relaxed mb-4">
                1. Tap the <strong className="text-white">Share</strong> icon in the bottom Safari toolbar.<br />
                2. Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.<br />
                3. Tap <strong className="text-white">Add</strong> in the top right.
              </p>
              <button
                onClick={() => setShowIosModal(false)}
                className="w-full min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center transition-all"
                aria-label="Close guide"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
