import React, { useState, useEffect } from 'react';
import { X, Youtube, Save, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { extractYouTubeId, saveExperimentVideo, deleteExperimentVideo } from '../../services/videoService';

interface AdminVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  labId: string;
  labTitle: string;
  initialVideoId?: string;
  initialTitle?: string;
  onSaved?: () => void;
}

export const AdminVideoModal: React.FC<AdminVideoModalProps> = ({
  isOpen,
  onClose,
  labId,
  labTitle,
  initialVideoId = '',
  initialTitle = '',
  onSaved,
}) => {
  const [videoInput, setVideoInput] = useState(initialVideoId);
  const [titleInput, setTitleInput] = useState(initialTitle || `${labTitle} - Practical Demonstration`);
  const [extractedId, setExtractedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setVideoInput(initialVideoId);
      setTitleInput(initialTitle || `${labTitle} - Practical Demonstration`);
      setExtractedId(extractYouTubeId(initialVideoId));
      setSuccess('');
      setError('');
    }
  }, [isOpen, initialVideoId, initialTitle, labTitle]);

  const handleInputChange = (val: string) => {
    setVideoInput(val);
    setError('');
    const id = extractYouTubeId(val);
    setExtractedId(id);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractedId) {
      setError('Please provide a valid YouTube URL or 11-character video ID.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await saveExperimentVideo(labId, {
        videoId: extractedId,
        title: titleInput.trim() || `${labTitle} - Video Demo`,
      });
      setSuccess('Experiment video updated successfully.');
      if (onSaved) onSaved();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to save video.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to remove the video for "${labTitle}"?`)) {
      return;
    }
    setLoading(true);
    try {
      await deleteExperimentVideo(labId);
      setSuccess('Video removed.');
      if (onSaved) onSaved();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Failed to remove video.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-xl rounded-2xl border border-sky-500/25 p-6 shadow-2xl relative"
        style={{ backgroundColor: '#0B1220' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-sky-500/15 mb-5">
          <div className="flex items-center gap-3">
            <span className="size-9 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 flex items-center justify-center">
              <Youtube size={20} />
            </span>
            <div>
              <h3 className="text-lg font-display font-medium text-paper">Admin Video Manager</h3>
              <p className="text-xs font-mono text-chalk">
                Lab ID: <span className="text-sky">{labId}</span> • {labTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-chalk hover:text-paper hover:bg-white/5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-chalk mb-1.5">
              YouTube URL or Video ID
            </label>
            <input
              type="text"
              value={videoInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ or dQw4w9WgXcQ"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#070D18] border border-sky-500/25 text-paper placeholder-chalk/40 text-sm focus:outline-none focus:border-sky"
            />
            <p className="text-[11px] text-chalk/70 mt-1">
              Supports full YouTube links, short links (youtu.be), or raw 11-character IDs.
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-chalk mb-1.5">
              Video Title (Optional)
            </label>
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="Experiment demonstration title"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#070D18] border border-sky-500/25 text-paper placeholder-chalk/40 text-sm focus:outline-none focus:border-sky"
            />
          </div>

          {/* Live Preview */}
          {extractedId ? (
            <div className="pt-2">
              <span className="block text-xs font-mono uppercase tracking-wider text-chalk mb-1.5">
                Live Video Preview
              </span>
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-sky-500/30 bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${extractedId}`}
                  title="Preview"
                  className="w-full h-full"
                  allowFullScreen
                />
              </div>
            </div>
          ) : (
            videoInput && (
              <p className="text-xs text-amber-400 font-mono">
                No valid YouTube video ID detected in the input above.
              </p>
            )
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-sky-500/15">
            <div>
              {initialVideoId && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-950/30 border border-red-500/20 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 size={14} />
                  <span>Remove Video</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-xs font-medium text-chalk hover:text-paper hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !extractedId}
                className="px-5 py-2 rounded-lg text-xs font-medium bg-[#87CEEB] hover:bg-[#5DADE2] text-[#070D18] flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
              >
                <Save size={14} />
                <span>{loading ? 'Saving...' : 'Save Video'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminVideoModal;
