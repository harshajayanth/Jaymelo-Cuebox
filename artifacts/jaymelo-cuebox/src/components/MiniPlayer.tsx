import { usePlayer } from "@/context/PlayerContext";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";

export function MiniPlayer() {
  const { 
    currentTrack, 
    currentProject, 
    isPlaying, 
    currentTime, 
    duration, 
    volume, 
    togglePlay, 
    setVolume, 
    seekTo,
    playNext,
    playPrev
  } = usePlayer();

  if (!currentTrack || !currentProject) return null;

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    seekTo(pos * duration);
  };

  // Find index to deterministically color the mini artwork
  const index = currentProject.tracks.findIndex(t => t.file === currentTrack.file);
  const gradients = [
    "from-blue-600/80 to-purple-600/80",
    "from-rose-500/80 to-orange-500/80",
    "from-emerald-500/80 to-teal-700/80",
    "from-amber-500/80 to-pink-600/80",
    "from-indigo-500/80 to-cyan-500/80",
    "from-violet-600/80 to-fuchsia-600/80",
    "from-slate-600/80 to-slate-800/80",
    "from-red-600/80 to-rose-800/80"
  ];
  const gradient = gradients[Math.max(0, index) % gradients.length];

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 right-0 z-50 glass-miniplayer pb-safe"
      >
        {/* Full width seek bar at very top of miniplayer */}
        <div 
          className="h-1.5 w-full bg-black/10 dark:bg-white/10 cursor-pointer relative group"
          onClick={handleSeekClick}
        >
          <div 
            className="absolute top-0 bottom-0 left-0 bg-primary transition-all duration-100 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
          {/* Hover state for seek bar */}
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-4">
          
          {/* Left: Track Info */}
          <div className="flex items-center gap-3 w-1/3 min-w-0">
            <div className={`w-12 h-12 rounded-md bg-gradient-to-br ${gradient} flex-shrink-0 shadow-md`}></div>
            <div className="truncate">
              <h4 className="font-bold text-sm tracking-tight truncate">{currentTrack.title}</h4>
              <p className="text-xs text-muted-foreground truncate">{currentProject.projectName}</p>
            </div>
          </div>

          {/* Center: Controls */}
          <div className="flex flex-col items-center justify-center flex-1 max-w-sm">
            <div className="flex items-center gap-6">
              <button 
                onClick={playPrev}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>
              
              <button 
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-foreground text-background flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>
              
              <button 
                onClick={playNext}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
            </div>
            
            <div className="flex items-center gap-2 mt-1 w-full max-w-[200px] text-[10px] font-medium text-muted-foreground">
              <span className="w-8 text-right">{formatTime(currentTime)}</span>
              <div className="flex-1" /> {/* Spacer, bar is at top */}
              <span className="w-8">{duration ? formatTime(duration) : '--:--'}</span>
            </div>
          </div>

          {/* Right: Volume & Extra */}
          <div className="w-1/3 flex items-center justify-end gap-3 hidden sm:flex">
            <button 
              onClick={() => setVolume(volume === 0 ? 1 : 0)}
              className="text-muted-foreground hover:text-foreground"
            >
              {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div className="w-24">
              <Slider
                value={[volume * 100]}
                min={0}
                max={100}
                step={1}
                onValueChange={(vals) => setVolume(vals[0] / 100)}
                className="cursor-pointer"
              />
            </div>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
