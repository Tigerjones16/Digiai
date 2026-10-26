import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  Key, 
  Trash2, 
  Check, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Cpu, 
  HardDriveDownload,
  Terminal
} from 'lucide-react';
import { EncryptedApiKeyData } from '../types';
import { 
  encryptApiKey, 
  decryptApiKey, 
  validateApiKeyFormat, 
  maskApiKey 
} from '../utils/security';
import { soundFx } from '../utils/audio';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedEncryptedData: EncryptedApiKeyData | null;
  onSaveEncryptedKey: (data: EncryptedApiKeyData) => void;
  onClearKey: () => void;
  privacySanitizeEnabled: boolean;
  onTogglePrivacySanitize: (enabled: boolean) => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({
  isOpen,
  onClose,
  savedEncryptedData,
  onSaveEncryptedKey,
  onClearKey,
  privacySanitizeEnabled,
  onTogglePrivacySanitize,
}) => {
  const [inputKey, setInputKey] = useState('');
  const [customPassphrase, setCustomPassphrase] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleValidateAndSave = async () => {
    soundFx.playTap();
    setValidationError(null);
    setTestResult(null);

    const check = validateApiKeyFormat(inputKey);
    if (!check.valid) {
      setValidationError(check.reason || 'Invalid API key format');
      return;
    }

    try {
      const encrypted = await encryptApiKey(inputKey, customPassphrase || undefined);
      onSaveEncryptedKey(encrypted);
      setInputKey('');
      setSaveSuccess(true);
      soundFx.playSuccess();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setValidationError(err.message || 'Encryption failed');
    }
  };

  const handleTestConnection = async () => {
    soundFx.playTap();
    setIsTesting(true);
    setTestResult(null);

    let keyToTest = inputKey.trim();
    if (!keyToTest && savedEncryptedData) {
      try {
        keyToTest = await decryptApiKey(savedEncryptedData, customPassphrase || undefined);
      } catch {
        setTestResult({
          success: false,
          message: 'Could not decrypt stored key with provided passphrase.',
        });
        setIsTesting(false);
        return;
      }
    }

    if (!keyToTest) {
      setTestResult({
        success: false,
        message: 'Please enter a Gemini API Key to test.',
      });
      setIsTesting(false);
      return;
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Respond with "Connection verified successfully" in 5 words.',
          userApiKey: keyToTest,
        }),
      });

      if (res.ok) {
        soundFx.playSuccess();
        setTestResult({
          success: true,
          message: 'Key connection authenticated successfully with Gemini API.',
        });
      } else {
        const errorData = await res.json().catch(() => ({}));
        setTestResult({
          success: false,
          message: errorData.message || 'Authentication failed. Check API key permissions.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error while testing API key.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleRemove = () => {
    soundFx.playTap();
    onClearKey();
    setInputKey('');
    setTestResult(null);
    setValidationError(null);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div 
        className="w-full max-w-lg rounded-3xl apple-glass p-6 sm:p-8 bg-[#0c0c0e]/95 border border-white/15 shadow-2xl relative overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Security & Encrypted API Key Vault"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white apple-headline">Security & Privacy Vault</h3>
              <p className="text-xs text-white/50">Client-Side AES-256 Hardware Encryption</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="apple-press p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Key Status Card */}
        <div className="my-5 p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-[11px] font-mono text-white/40 uppercase">Vault Status</div>
            <div className="text-sm font-semibold text-white mt-0.5 flex items-center gap-1.5">
              {savedEncryptedData ? (
                <>
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Key Secured: {savedEncryptedData.maskedKey}</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4 text-amber-400" />
                  <span className="text-white/80">Using Server Key / Local RAG Engine</span>
                </>
              )}
            </div>
          </div>

          {savedEncryptedData && (
            <button
              onClick={handleRemove}
              className="apple-press text-xs px-3 py-1.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 flex items-center gap-1.5 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Shred Key</span>
            </button>
          )}
        </div>

        {/* Enter API Key Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-white/80 mb-1.5">
              Custom Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder={savedEncryptedData ? 'Enter new key to replace' : 'AIzaSy...'}
                className="w-full pl-3.5 pr-10 py-2.5 bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/10 focus:border-[#0071e3] rounded-xl text-xs sm:text-sm font-mono text-white placeholder-white/30 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-white/40 mt-1">
              Obtain your key from Google AI Studio. Stored strictly in your browser with AES-GCM.
            </p>
          </div>

          {/* Optional Master Passphrase */}
          <div>
            <label className="block text-xs font-medium text-white/80 mb-1.5 flex items-center justify-between">
              <span>Custom Passphrase (Optional)</span>
              <span className="text-[10px] text-white/40">100k PBKDF2 rounds</span>
            </label>
            <input
              type="password"
              value={customPassphrase}
              onChange={(e) => setCustomPassphrase(e.target.value)}
              placeholder="Leave empty for device-bound salt"
              className="w-full px-3.5 py-2.5 bg-white/5 hover:bg-white/10 focus:bg-white/10 border border-white/10 focus:border-[#0071e3] rounded-xl text-xs sm:text-sm text-white placeholder-white/30 outline-none transition-all"
            />
          </div>

          {/* Privacy Shield Toggle */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Client Privacy Shield</div>
              <div className="text-[11px] text-white/50">
                Redact accidental emails, numbers, and tokens before sending to RAG/LLM
              </div>
            </div>
            <button
              onClick={() => {
                soundFx.playTap();
                onTogglePrivacySanitize(!privacySanitizeEnabled);
              }}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center ${
                privacySanitizeEnabled ? 'bg-[#0071e3]' : 'bg-white/20'
              }`}
              aria-label="Toggle Privacy Shield"
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  privacySanitizeEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Validation or Test Result Feedback */}
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {testResult.success ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              <span>{testResult.message}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>API key encrypted and locked securely in browser vault!</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="apple-press flex-1 py-2.5 rounded-xl border border-white/20 hover:bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <button
              onClick={handleValidateAndSave}
              disabled={!inputKey.trim()}
              className={`apple-press flex-1 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                inputKey.trim()
                  ? 'bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-lg shadow-[#0071e3]/30'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Save Encrypted</span>
            </button>
          </div>
        </div>

        {/* Encryption Specifications Badge */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] text-white/40 font-mono">
          <span>CIPHER: AES-GCM 256</span>
          <span>ROUNDS: 100,000 PBKDF2</span>
          <span>STORAGE: ZERO TELEMETRY</span>
        </div>
      </div>
    </div>
  );
};
