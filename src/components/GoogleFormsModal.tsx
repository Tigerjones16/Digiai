import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  ExternalLink, 
  Trash2, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  MessageSquare,
  BarChart3,
  Sparkles,
  LogOut,
  Send
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  googleSignIn, 
  logoutUser, 
  getAccessToken 
} from '../services/firebase';
import { 
  listUserGoogleForms, 
  createGoogleForm, 
  deleteGoogleForm,
  getGoogleFormDetails,
  getGoogleFormResponses,
  GoogleDriveFormItem,
  GoogleFormDetails,
  GoogleFormResponse,
  PREDEFINED_FORM_TEMPLATES
} from '../services/googleFormsService';

interface GoogleFormsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onAuthSuccess: (user: User, token: string) => void;
  onLogout: () => void;
}

export const GoogleFormsModal: React.FC<GoogleFormsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'responses'>('list');
  const [forms, setForms] = useState<GoogleDriveFormItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Form Creation State
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number>(0);
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Form Details & Responses State
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [selectedFormDetails, setSelectedFormDetails] = useState<GoogleFormDetails | null>(null);
  const [formResponses, setFormResponses] = useState<GoogleFormResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Destructive Confirmation Dialog State (Mandatory requirement from Workspace skill)
  const [deleteCandidate, setDeleteCandidate] = useState<GoogleDriveFormItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sign-in in progress
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (isOpen && currentUser) {
      loadForms();
    }
  }, [isOpen, currentUser]);

  const loadForms = async () => {
    setError(null);
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Please sign in with Google to access your Google Forms.');
      }
      const items = await listUserGoogleForms(token);
      setForms(items);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Google Forms.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onAuthSuccess(res.user, res.accessToken);
        setStatusMsg('Successfully connected Google account.');
        setTimeout(() => setStatusMsg(null), 3500);
      }
    } catch (err: any) {
      setError(err?.message || 'Google authentication was not completed.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    onLogout();
    setForms([]);
    setSelectedFormDetails(null);
    setFormResponses([]);
    setActiveTab('list');
  };

  const handleCreateFromTemplate = async () => {
    const token = await getAccessToken();
    if (!token) {
      setError('Please sign in to create Google Forms.');
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      let title = '';
      let desc = '';
      let questions: any[] = [];

      if (selectedTemplateIndex === 999) {
        // Custom
        if (!customTitle.trim()) {
          throw new Error('Please enter a title for your custom Google Form.');
        }
        title = customTitle.trim();
        desc = customDescription.trim();
        questions = [
          {
            title: 'Your feedback or perspective:',
            type: 'TEXT',
            required: true,
          },
        ];
      } else {
        const tmpl = PREDEFINED_FORM_TEMPLATES[selectedTemplateIndex];
        title = tmpl.title;
        desc = tmpl.description;
        questions = tmpl.questions;
      }

      const created = await createGoogleForm(title, desc, questions, token, currentUser?.uid);
      setStatusMsg(`Successfully created "${created.info.title}"!`);
      setTimeout(() => setStatusMsg(null), 4000);

      // Reload list and switch to list
      await loadForms();
      setActiveTab('list');
      setCustomTitle('');
      setCustomDescription('');
    } catch (err: any) {
      setError(err?.message || 'Failed to create Google Form.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleInspectForm = async (formItem: GoogleDriveFormItem) => {
    const token = await getAccessToken();
    if (!token) return;

    setSelectedFormId(formItem.id);
    setActiveTab('responses');
    setLoadingResponses(true);
    setError(null);

    try {
      const [details, responses] = await Promise.all([
        getGoogleFormDetails(formItem.id, token),
        getGoogleFormResponses(formItem.id, token).catch(() => []),
      ]);
      setSelectedFormDetails(details);
      setFormResponses(responses);
    } catch (err: any) {
      setError(err?.message || 'Failed to load form responses.');
    } finally {
      setLoadingResponses(false);
    }
  };

  const confirmDeleteForm = async () => {
    if (!deleteCandidate) return;
    const token = await getAccessToken();
    if (!token) return;

    setIsDeleting(true);
    try {
      await deleteGoogleForm(deleteCandidate.id, token, currentUser?.uid);
      setForms((prev) => prev.filter((f) => f.id !== deleteCandidate.id));
      if (selectedFormId === deleteCandidate.id) {
        setSelectedFormId(null);
        setSelectedFormDetails(null);
        setActiveTab('list');
      }
      setStatusMsg(`Moved "${deleteCandidate.name}" to trash.`);
      setTimeout(() => setStatusMsg(null), 3000);
      setDeleteCandidate(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete form.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-[#0e0e13] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-label="Google Forms Integration"
      >
        {/* Modal Header */}
        <header className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#13131a]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">Google Forms</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Workspace
                </span>
              </div>
              <p className="text-xs text-white/50">
                Create AI feedback surveys, comprehension polls, and inspect live responses
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/50 hover:text-white rounded-lg transition-colors"
            aria-label="Close Google Forms modal"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Auth / Account Bar */}
        <div className="px-4 py-3 bg-white/[0.02] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
          {currentUser ? (
            <div className="flex items-center gap-2 text-white/80">
              {currentUser.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.displayName || 'User'} 
                  className="w-6 h-6 rounded-full border border-white/20"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#0071e3] text-white flex items-center justify-center text-[11px] font-bold">
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                </div>
              )}
              <span className="truncate max-w-[200px] font-medium">{currentUser.email || currentUser.displayName}</span>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Connected
              </span>
            </div>
          ) : (
            <span className="text-white/60">
              Sign in with Google to create and view your Google Forms
            </span>
          )}

          {currentUser ? (
            <button
              onClick={handleLogout}
              className="min-h-[36px] px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-rose-400 flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            /* Official Google Sign-In button specification */
            <button 
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white hover:bg-neutral-100 text-[#1f1f1f] text-xs font-semibold shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          )}
        </div>

        {/* Status Alerts */}
        {statusMsg && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {error && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 px-4 pt-2 gap-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('list')}
            className={`min-h-[40px] px-3.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'list'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>My Google Forms ({forms.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`min-h-[40px] px-3.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'create'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create AI Form</span>
          </button>
          {selectedFormDetails && (
            <button
              onClick={() => setActiveTab('responses')}
              className={`min-h-[40px] px-3.5 border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'responses'
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-white/50 hover:text-white/80'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Form Inspector</span>
            </button>
          )}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {!currentUser ? (
            <div className="py-12 text-center space-y-4 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 mx-auto flex items-center justify-center">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">Connect Google Forms</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Connect your Google Account to create real Google Forms surveys from DigAI news stories, distribute comprehension quizzes, and inspect live responses directly in the app.
              </p>
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-100 text-[#1f1f1f] text-sm font-semibold shadow-lg active:scale-95 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
              </button>
            </div>
          ) : activeTab === 'list' ? (
            /* Forms List */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-white/50">
                <span>Google Drive Forms ({forms.length})</span>
                <button
                  onClick={loadForms}
                  disabled={loading}
                  className="min-h-[36px] px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 flex items-center gap-1.5 transition-colors"
                  aria-label="Refresh forms"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-white/40 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-400" />
                  <p>Fetching Google Forms from your Google Drive...</p>
                </div>
              ) : forms.length === 0 ? (
                <div className="py-10 text-center space-y-3 border border-dashed border-white/10 rounded-2xl p-6">
                  <FileText className="w-8 h-8 mx-auto text-white/30" />
                  <p className="text-sm font-medium text-white/80">No Google Forms Found</p>
                  <p className="text-xs text-white/50 max-w-sm mx-auto">
                    You haven't created any Google Forms yet. Click "Create AI Form" above to launch an instant AI digest feedback survey or comprehension quiz.
                  </p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="min-h-[40px] px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Your First Form</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {forms.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-purple-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                          <h4 className="text-sm font-semibold text-white truncate">{item.name}</h4>
                        </div>
                        {item.modifiedTime && (
                          <p className="text-[11px] text-white/40">
                            Modified: {new Date(item.modifiedTime).toLocaleDateString()} at {new Date(item.modifiedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Responder Form Link */}
                        <a
                          href={`https://docs.google.com/forms/d/${item.id}/viewform`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[36px] px-2.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs flex items-center gap-1 transition-colors"
                          title="Open fillable responder form"
                        >
                          <Send className="w-3 h-3" />
                          <span>Fill / Share</span>
                        </a>

                        {/* Inspector / Responses */}
                        <button
                          onClick={() => handleInspectForm(item)}
                          className="min-h-[36px] px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-xs flex items-center gap-1 transition-colors"
                          title="View questions and submissions"
                        >
                          <BarChart3 className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>

                        {/* Edit in Google Forms */}
                        <a
                          href={`https://docs.google.com/forms/d/${item.id}/edit`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                          title="Edit form structure in Google Forms"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        {/* Delete Candidate Trigger (Opens Confirmation Modal) */}
                        <button
                          onClick={() => setDeleteCandidate(item)}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 transition-colors"
                          aria-label={`Delete form ${item.name}`}
                          title="Move to trash"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'create' ? (
            /* Create Form Tab */
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Select a Form Template</h3>
                <p className="text-xs text-white/50">
                  Pre-configured Google Forms tailored to DigAI readers and learners.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PREDEFINED_FORM_TEMPLATES.map((tmpl, idx) => (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplateIndex(idx)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedTemplateIndex === idx
                        ? 'bg-purple-500/15 border-purple-500 text-white'
                        : 'bg-white/[0.03] border-white/10 text-white/70 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-semibold text-xs text-white">{tmpl.title}</span>
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <p className="text-[11px] text-white/50 line-clamp-2 leading-relaxed">
                      {tmpl.description}
                    </p>
                    <div className="mt-2 text-[10px] text-purple-300 font-mono">
                      {tmpl.questions.length} questions included
                    </div>
                  </div>
                ))}

                {/* Custom Option */}
                <div
                  onClick={() => setSelectedTemplateIndex(999)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedTemplateIndex === 999
                      ? 'bg-purple-500/15 border-purple-500 text-white'
                      : 'bg-white/[0.03] border-white/10 text-white/70 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-xs text-white">Custom Google Form</span>
                    <Plus className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <p className="text-[11px] text-white/50 line-clamp-2 leading-relaxed">
                    Specify your own title and description for custom surveys or community queries.
                  </p>
                  <div className="mt-2 text-[10px] text-purple-300 font-mono">
                    Custom questions
                  </div>
                </div>
              </div>

              {selectedTemplateIndex === 999 && (
                <div className="space-y-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/10">
                  <div>
                    <label className="block text-xs font-medium text-white/80 mb-1">Form Title</label>
                    <input
                      type="text"
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="e.g. DigAI Community Survey on DeepSeek-V3"
                      maxLength={200}
                      className="w-full min-h-[44px] px-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/80 mb-1">Form Description</label>
                    <textarea
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="Brief context for responders..."
                      rows={2}
                      maxLength={500}
                      className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              )}

              {/* Questions preview */}
              {selectedTemplateIndex !== 999 && (
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                  <span className="text-[11px] font-mono uppercase text-white/40 block">Questions Included:</span>
                  <ul className="space-y-1.5 text-xs text-white/70 list-disc list-inside">
                    {PREDEFINED_FORM_TEMPLATES[selectedTemplateIndex].questions.map((q, i) => (
                      <li key={i} className="leading-relaxed">
                        <span className="text-white/90 font-medium">{q.title}</span>{' '}
                        <span className="text-[10px] text-white/40 font-mono">({q.type})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={handleCreateFromTemplate}
                  disabled={isCreating}
                  className="w-full min-h-[44px] rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreating ? 'Creating Form in Google Forms...' : 'Generate Google Form Now'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Responses & Inspector Tab */
            <div className="space-y-4">
              {loadingResponses ? (
                <div className="py-12 text-center text-xs text-white/40 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-400" />
                  <p>Loading questions and responses from Google Forms API...</p>
                </div>
              ) : selectedFormDetails ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">{selectedFormDetails.info.title}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300">
                        {formResponses.length} Submissions
                      </span>
                    </div>
                    {selectedFormDetails.info.description && (
                      <p className="text-xs text-white/60">{selectedFormDetails.info.description}</p>
                    )}

                    <div className="pt-2 flex flex-wrap gap-2 text-xs">
                      {selectedFormDetails.responderUri && (
                        <a
                          href={selectedFormDetails.responderUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          <span>Fill Out Form</span>
                        </a>
                      )}
                      <a
                        href={`https://docs.google.com/forms/d/${selectedFormDetails.formId}/edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Edit in Google Forms</span>
                      </a>
                    </div>
                  </div>

                  {/* Form Questions */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold text-white/70 uppercase font-mono">
                      Form Questions ({selectedFormDetails.items?.length || 0})
                    </h5>
                    <div className="space-y-2">
                      {selectedFormDetails.items?.map((item, idx) => (
                        <div key={item.itemId || idx} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
                          <p className="font-medium text-white/90">
                            {idx + 1}. {item.title}
                          </p>
                          {item.questionItem?.question.choiceQuestion && (
                            <div className="mt-1.5 pl-3 border-l border-white/10 space-y-1">
                              {item.questionItem.question.choiceQuestion.options.map((opt, oIdx) => (
                                <p key={oIdx} className="text-[11px] text-white/50">
                                  • {opt.value}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Form Submissions / Responses */}
                  <div className="space-y-2 pt-2">
                    <h5 className="text-xs font-semibold text-white/70 uppercase font-mono">
                      Submissions ({formResponses.length})
                    </h5>
                    {formResponses.length === 0 ? (
                      <p className="text-xs text-white/40 italic p-3 rounded-xl bg-white/[0.02]">
                        No submissions recorded yet. Share the fillable form link above to gather responses!
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {formResponses.map((resp, rIdx) => (
                          <div key={resp.responseId || rIdx} className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] text-white/40 font-mono">
                              <span>Submission #{rIdx + 1}</span>
                              <span>{new Date(resp.lastSubmittedTime || resp.createTime).toLocaleString()}</span>
                            </div>
                            {resp.answers && Object.entries(resp.answers).map(([qId, ans]) => (
                              <div key={qId} className="pt-1">
                                <p className="text-white/80 font-medium">
                                  {ans.textAnswers?.answers.map((a) => a.value).join(', ') || 'No answer'}
                                </p>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Destructive User Confirmation Dialog (MANDATORY Workspace Requirement) */}
        {deleteCandidate && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md bg-[#16161f] border border-rose-500/30 rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Delete Google Form?</h4>
                  <p className="text-xs text-white/50">This action will move the file to trash.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 text-xs text-white/80 space-y-1">
                <p className="font-semibold text-white truncate">"{deleteCandidate.name}"</p>
                <p className="text-[11px] text-white/50">ID: {deleteCandidate.id}</p>
              </div>

              <p className="text-xs text-white/70 leading-relaxed">
                Are you sure you want to delete this form from your Google Drive account? Any existing responder links will stop receiving submissions.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeleteCandidate(null)}
                  disabled={isDeleting}
                  className="min-h-[40px] px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteForm}
                  disabled={isDeleting}
                  className="min-h-[40px] px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
