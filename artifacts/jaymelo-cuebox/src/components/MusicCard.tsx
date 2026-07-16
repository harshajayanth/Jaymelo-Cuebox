import { Track, Project } from "@/types";
import { Button } from "@/components/ui/button";
import { Play, Pause, Download } from "lucide-react";
import { motion } from "framer-motion";
import { CommentDialog } from "./CommentDialog";
import { usePlayer } from "@/context/PlayerContext";

interface MusicCardProps {
  track: Track;
  project: Project;
  index: number;
}

const GRADIENTS = [
  "from-blue-600/80 to-purple-600/80",
  "from-rose-500/80 to-orange-500/80",
  "from-emerald-500/80 to-teal-700/80",
  "from-amber-500/80 to-pink-600/80",
  "from-indigo-500/80 to-cyan-500/80",
  "from-violet-600/80 to-fuchsia-600/80",
  "from-slate-600/80 to-slate-800/80",
  "from-red-600/80 to-rose-800/80",
];

export function MusicCard({ track, project, index }: MusicCardProps) {
  const {
    currentTrack, isPlaying, play, togglePlay, currentTime, duration, seekTo,
  } = usePlayer();

  const isActive = currentTrack?.file === track.file;
  const isDisabled = track.disabled;
  const gradient = GRADIENTS[index % GRADIENTS.length];

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDisabled) return;
    if (isActive) togglePlay();
    else play(track, project);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDisabled || !track.downloadable) return;
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
    const url = `${baseUrl}/tunes/${project.folder}/${track.file}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = track.file;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  const progressPercent = isActive && duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isActive || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo(((e.clientX - rect.left) / rect.width) * duration);
  };

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
      className={`relative group overflow-hidden rounded-2xl glass-card transition-all duration-500
        ${isDisabled
          ? "opacity-40 grayscale cursor-not-allowed select-none"
          : "hover:shadow-xl hover:border-white/30 dark:hover:border-white/20 select-none"
        }
        ${isActive ? "ring-1 ring-primary border-primary/50" : ""}
      `}
      onClick={() => { if (!isDisabled && !isActive) play(track, project); }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Active glow */}
      {isActive && isPlaying && (
        <motion.div
          className="absolute inset-0 bg-primary/5 dark:bg-primary/10 pointer-events-none"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <div className="p-4 flex gap-4 h-full relative z-10">
        {/* Artwork */}
        <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-xl flex-shrink-0 bg-gradient-to-br ${gradient}
          flex items-center justify-center shadow-inner relative overflow-hidden
          group-hover:scale-[1.02] transition-transform duration-500`}
        >
          <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />

          {!isDisabled && (
            <button
              onClick={handlePlayClick}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all
                ${isActive
                  ? "bg-primary text-white shadow-lg shadow-primary/40 scale-110"
                  : "bg-black/30 text-white hover:bg-black/50 hover:scale-110 backdrop-blur-sm"
                }`}
            >
              {isActive && isPlaying
                ? <Pause className="w-5 h-5 fill-current" />
                : <Play className="w-5 h-5 fill-current ml-1" />
              }
            </button>
          )}

          {isActive && isPlaying && (
            <div className="absolute bottom-2 right-2 flex items-end gap-0.5 h-4 opacity-70">
              <motion.div animate={{ height: ["4px","12px","4px"] }} transition={{ duration: 0.5, repeat: Infinity }} className="w-1 bg-white rounded-t" />
              <motion.div animate={{ height: ["8px","16px","8px"] }} transition={{ duration: 0.7, repeat: Infinity }} className="w-1 bg-white rounded-t" />
              <motion.div animate={{ height: ["12px","6px","12px"] }} transition={{ duration: 0.6, repeat: Infinity }} className="w-1 bg-white rounded-t" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-between py-1 min-w-0">
          <div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight truncate pr-2 text-foreground/90 group-hover:text-foreground transition-colors">
              {track.title}
            </h3>
            {isDisabled && (
              <p className="text-xs font-medium text-destructive mt-1 uppercase tracking-wider">
                Work in Progress
              </p>
            )}
          </div>

          <div className="flex items-end justify-between mt-4">
            <div className="w-full mr-3">
              <div
                className={`h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden cursor-pointer
                  relative transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-0"}`}
                onClick={handleSeek}
              >
                <div className="h-full bg-primary relative" style={{ width: `${progressPercent}%` }}>
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 blur-[2px]" />
                </div>
              </div>
              <div className={`flex justify-between mt-1.5 text-[10px] sm:text-xs font-medium
                text-muted-foreground transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-0"}`}
              >
                <span>{formatTime(currentTime)}</span>
                <span>{duration ? formatTime(duration) : "—"}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              {!isDisabled && (
                <CommentDialog track={track} projectFolder={project.folder} />
              )}
              {!isDisabled && track.downloadable && (
                <Button
                  variant="ghost" size="icon"
                  onClick={handleDownload}
                  className="rounded-full w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
