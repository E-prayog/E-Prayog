import React, { useState, useEffect, useMemo } from 'react';
import { SUBJECTS } from '../../constants';
import { experimentVideos } from '../../data/experimentVideos';
import { subscribeToCustomVideos, extractYouTubeId } from '../../services/videoService';
import AdminVideoModal from './AdminVideoModal';
import { Search, Youtube, Play, CheckCircle2, AlertCircle, Edit3, Plus, ExternalLink, Filter } from 'lucide-react';
import GlassCard from '../GlassCard';

export const AdminVideoManager: React.FC = () => {
  const [customVideos, setCustomVideos] = useState<Record<string, { videoId: string; title: string }>>({});
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'configured' | 'missing'>('all');

  // Modal target
  const [modalTarget, setModalTarget] = useState<{
    labId: string;
    labTitle: string;
    videoId?: string;
    title?: string;
  } | null>(null);

  useEffect(() => {
    const unsub = subscribeToCustomVideos((vids) => {
      setCustomVideos(vids);
    });
    return () => unsub();
  }, []);

  // Flatten all experiments across subjects
  const allLabs = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      subjectId: string;
      subjectName: string;
      category: string;
      difficulty: string;
      videoId?: string;
      videoTitle?: string;
    }> = [];

    SUBJECTS.forEach((subj) => {
      subj.labs.forEach((lab) => {
        const custom = customVideos[lab.id];
        const staticEntry = experimentVideos[lab.id];
        let videoId: string | undefined = custom?.videoId || lab.content?.videoId;
        let videoTitle: string | undefined = custom?.title;

        if (!videoId && staticEntry) {
          if ('videoId' in staticEntry) {
            videoId = staticEntry.videoId || undefined;
            videoTitle = staticEntry.title;
          } else {
            const langEntry = (staticEntry as any).en;
            if (langEntry?.videoId) {
              videoId = langEntry.videoId;
              videoTitle = langEntry.title;
            }
          }
        }

        list.push({
          id: lab.id,
          title: lab.title,
          subjectId: subj.id,
          subjectName: subj.name,
          category: lab.category,
          difficulty: lab.difficulty,
          videoId,
          videoTitle,
        });
      });
    });

    return list;
  }, [customVideos]);

  // Filtered list
  const filteredLabs = useMemo(() => {
    return allLabs.filter((lab) => {
      if (selectedSubject !== 'all' && lab.subjectId !== selectedSubject) return false;
      if (statusFilter === 'configured' && !lab.videoId) return false;
      if (statusFilter === 'missing' && lab.videoId) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          lab.id.toLowerCase().includes(q) ||
          lab.title.toLowerCase().includes(q) ||
          lab.category.toLowerCase().includes(q) ||
          lab.subjectName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allLabs, selectedSubject, statusFilter, search]);

  const totalCount = allLabs.length;
  const configuredCount = allLabs.filter((l) => Boolean(l.videoId)).length;
  const missingCount = totalCount - configuredCount;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header and Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <GlassCard className="p-4 flex items-center gap-4">
          <div className="size-11 rounded-xl bg-sky/10 border border-sky/20 flex items-center justify-center text-sky">
            <Youtube size={22} />
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-paper">{totalCount}</div>
            <div className="text-xs text-chalk uppercase tracking-wider font-mono">Total Experiments</div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-4">
          <div className="size-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-emerald-400">{configuredCount}</div>
            <div className="text-xs text-chalk uppercase tracking-wider font-mono">Videos Linked</div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 flex items-center gap-4">
          <div className="size-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertCircle size={22} />
          </div>
          <div>
            <div className="text-2xl font-mono font-bold text-amber-400">{missingCount}</div>
            <div className="text-xs text-chalk uppercase tracking-wider font-mono">Awaiting Videos</div>
          </div>
        </GlassCard>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-4 rounded-xl bg-[#0B1220] border border-sky-500/15">
        <div className="flex flex-wrap items-center gap-2">
          {/* Subject Pills */}
          <button
            onClick={() => setSelectedSubject('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
              selectedSubject === 'all'
                ? 'bg-sky text-ink font-semibold'
                : 'bg-white/5 text-chalk hover:text-paper hover:bg-white/10'
            }`}
          >
            All Subjects
          </button>
          {SUBJECTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSubject(s.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                selectedSubject === s.id
                  ? 'bg-sky text-ink font-semibold'
                  : 'bg-white/5 text-chalk hover:text-paper hover:bg-white/10'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-lg bg-[#070D18] border border-sky-500/20 text-xs font-mono text-paper focus:outline-none focus:border-sky"
          >
            <option value="all">All Status</option>
            <option value="configured">Configured Only</option>
            <option value="missing">Missing Only</option>
          </select>

          {/* Search box */}
          <div className="relative min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-chalk" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search experiments..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#070D18] border border-sky-500/20 text-paper placeholder-chalk/40 text-xs focus:outline-none focus:border-sky"
            />
          </div>
        </div>
      </div>

      {/* Experiments Table / Grid */}
      <div className="overflow-x-auto rounded-xl border border-sky-500/15 bg-[#0B1220]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-sky-500/15 bg-[#070D18] text-chalk font-mono uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Lab ID</th>
              <th className="py-3 px-4">Experiment Title</th>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Video Info</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-500/10">
            {filteredLabs.map((lab) => {
              const hasVideo = Boolean(lab.videoId);
              return (
                <tr key={lab.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-sky">{lab.id}</td>
                  <td className="py-3 px-4 font-medium text-paper">
                    <div>{lab.title}</div>
                    <div className="text-[11px] text-chalk/70 font-mono">{lab.category}</div>
                  </td>
                  <td className="py-3 px-4 text-chalk font-mono">{lab.subjectName}</td>
                  <td className="py-3 px-4">
                    {hasVideo ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 size={12} /> Configured
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                        <AlertCircle size={12} /> Missing
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-chalk">
                    {hasVideo ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://img.youtube.com/vi/${lab.videoId}/default.jpg`}
                          alt=""
                          className="w-12 h-8 rounded object-cover border border-sky-500/20"
                        />
                        <div className="max-w-[200px] truncate">
                          <div className="text-paper truncate font-mono text-[11px]">{lab.videoTitle || 'Demo Video'}</div>
                          <span className="text-[10px] font-mono text-sky">{lab.videoId}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-zinc-500 italic">No video assigned</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {hasVideo && (
                        <a
                          href={`https://www.youtube.com/watch?v=${lab.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-chalk hover:text-paper hover:bg-white/5 transition-colors"
                          title="Watch on YouTube"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <button
                        onClick={() =>
                          setModalTarget({
                            labId: lab.id,
                            labTitle: lab.title,
                            videoId: lab.videoId,
                            title: lab.videoTitle,
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all text-xs ${
                          hasVideo
                            ? 'bg-white/5 hover:bg-white/10 text-paper border border-sky-500/20'
                            : 'bg-sky hover:bg-sky-deep text-ink font-semibold'
                        }`}
                      >
                        {hasVideo ? (
                          <>
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </>
                        ) : (
                          <>
                            <Plus size={12} />
                            <span>Add Video</span>
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredLabs.length === 0 && (
          <div className="py-12 text-center text-chalk font-mono text-xs">
            No experiments match your filter criteria.
          </div>
        )}
      </div>

      {/* Admin Video Modal */}
      {modalTarget && (
        <AdminVideoModal
          isOpen={Boolean(modalTarget)}
          onClose={() => setModalTarget(null)}
          labId={modalTarget.labId}
          labTitle={modalTarget.labTitle}
          initialVideoId={modalTarget.videoId || ''}
          initialTitle={modalTarget.title || ''}
        />
      )}
    </div>
  );
};

export default AdminVideoManager;
