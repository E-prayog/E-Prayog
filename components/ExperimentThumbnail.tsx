import React, { useState } from 'react';
import { Play, Camera } from 'lucide-react';
import { getRealisticExperimentImage, SUBJECT_REALISTIC_IMAGES } from '../data/labImages';

interface ExperimentThumbnailProps {
  labId: string;
  title: string;
  subjectId: string;
  category: string;
  videoId?: string;
  subjectHex?: string;
}

export const ExperimentThumbnail: React.FC<ExperimentThumbnailProps> = ({
  labId,
  title,
  subjectId,
  category,
  videoId,
  subjectHex = '#87CEEB',
}) => {
  const [imgError, setImgError] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);

  // If a YouTube videoId is present, we can use its video frame thumbnail
  const youtubeThumb = videoId && !imgError
    ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    : null;

  // Realistic laboratory equipment photograph
  const realisticPhoto = getRealisticExperimentImage(labId, subjectId);
  const subjectFallback = SUBJECT_REALISTIC_IMAGES[subjectId]?.url;

  const displayImage = youtubeThumb || (!fallbackFailed ? (imgError ? subjectFallback : realisticPhoto) : null);

  return (
    <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-[#070D18] border border-sky-500/15 mb-4 group/thumb flex items-center justify-center">
      {displayImage ? (
        <>
          <img
            src={displayImage}
            alt={`${title} laboratory apparatus`}
            onError={() => {
              if (!imgError) {
                setImgError(true);
              } else {
                setFallbackFailed(true);
              }
            }}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            loading="lazy"
          />

          {/* Realistic laboratory overlay for contrast & legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070D18] via-[#070D18]/30 to-black/20" />

          {/* Interactive hover play button if video is available */}
          {videoId && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
              <span className="size-10 rounded-full bg-[#87CEEB] text-[#070D18] flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                <Play size={18} fill="#070D18" className="ml-0.5" />
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full relative overflow-hidden flex items-center justify-center p-3 select-none bg-[#0B1220]">
          <div className="text-center text-chalk/60 flex flex-col items-center gap-1.5">
            <Camera size={24} className="text-sky/60" />
            <span className="text-[11px] font-mono">{title}</span>
          </div>
        </div>
      )}

      {/* Category / Apparatus Tag */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase bg-[#070D18]/90 backdrop-blur-md border border-sky-500/20 text-sky-200 shadow-sm">
        <Camera size={10} className="text-[#87CEEB]" />
        <span>{category.split(' ')[0] || 'Apparatus'}</span>
      </div>

      {videoId && (
        <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded text-[9px] font-mono tracking-wider uppercase bg-emerald-950/85 backdrop-blur-md border border-emerald-500/30 text-emerald-300 flex items-center gap-1 shadow-sm">
          <Play size={9} fill="currentColor" />
          <span>Video</span>
        </div>
      )}
    </div>
  );
};

export default ExperimentThumbnail;
