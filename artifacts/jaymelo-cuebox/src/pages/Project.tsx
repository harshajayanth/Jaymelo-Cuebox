import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Project, Track } from "@/types";
import { Header } from "@/components/Header";
import { MusicCard } from "@/components/MusicCard";
import { AdminDialog } from "@/components/AdminDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Clock, ArrowDownAZ, ArrowUpZA } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "@/context/PlayerContext";

type SortMode = "none" | "az" | "za" | "recent";

export function ProjectPage() {
  const [, setLocation] = useLocation();
  const [project, setProject] = useState<Project | null>(null);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("none");
  const [adminOpen, setAdminOpen] = useState(false);
  
  const { currentTrack } = usePlayer();

  // Load project from local storage
  useEffect(() => {
    const saved = localStorage.getItem("cuebox_project");
    if (!saved) {
      setLocation("/");
      return;
    }
    setProject(JSON.parse(saved));
  }, [setLocation]);

  // Global shortcut listener for Admin Dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+N (or Cmd+Shift+N on Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyN') {
        e.preventDefault();
        setAdminOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("cuebox_project");
    setLocation("/");
  };

  const handleAddComment = (trackFile: string, author: string, text: string) => {
    if (!project) return;
    const updatedTracks = project.tracks.map(t => {
      if (t.file === trackFile) {
        return {
          ...t,
          comments: [...t.comments, { author, text }]
        };
      }
      return t;
    });
    const newProject = { ...project, tracks: updatedTracks };
    setProject(newProject);
    // Update local storage so comments persist across reloads while logged in
    localStorage.setItem("cuebox_project", JSON.stringify(newProject));
  };

  if (!project) return null; // loading or redirecting

  // Filter and sort tracks
  let displayTracks = project.tracks.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  if (sortMode === "az") {
    displayTracks.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortMode === "za") {
    displayTracks.sort((a, b) => b.title.localeCompare(a.title));
  }
  // For 'recent', ideally we track recently played in context, 
  // but for simplicity we'll just put the current playing track at top if 'recent'
  if (sortMode === "recent" && currentTrack) {
    displayTracks.sort((a, b) => {
      if (a.file === currentTrack.file) return -1;
      if (b.file === currentTrack.file) return 1;
      return 0;
    });
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  return (
    <div className="min-h-screen bg-background relative pb-32">
      {/* Ambient background glows */}
      <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
      <div className="fixed inset-0 opacity-[0.02] dark:opacity-[0.04] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <Header 
        projectName={project.projectName} 
        trackCount={project.tracks.length} 
        onSignOut={handleSignOut} 
      />

      <main className="container mx-auto px-4 py-8 relative z-10">
        
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-10 bg-black/5 dark:bg-white/5 p-2 rounded-xl backdrop-blur-md border border-white/10">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search tracks..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none h-10 text-base"
            />
          </div>
          
          <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <Button 
              variant={sortMode === "az" ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setSortMode(sortMode === "az" ? "none" : "az")}
              className="text-xs shrink-0"
            >
              <ArrowDownAZ className="w-4 h-4 mr-2" />
              A-Z
            </Button>
            <Button 
              variant={sortMode === "za" ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setSortMode(sortMode === "za" ? "none" : "za")}
              className="text-xs shrink-0"
            >
              <ArrowUpZA className="w-4 h-4 mr-2" />
              Z-A
            </Button>
            <Button 
              variant={sortMode === "recent" ? "secondary" : "ghost"} 
              size="sm"
              onClick={() => setSortMode(sortMode === "recent" ? "none" : "recent")}
              className="text-xs shrink-0"
            >
              <Clock className="w-4 h-4 mr-2" />
              Recent
            </Button>
          </div>
        </div>

        {/* Track List */}
        <AnimatePresence mode="wait">
          {displayTracks.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <p className="text-xl font-medium text-muted-foreground">No tracks found.</p>
              <p className="text-sm text-muted-foreground/60 mt-2">Adjust your search or filters.</p>
            </motion.div>
          ) : (
            <motion.div 
              key="grid"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {displayTracks.map((track) => {
                // Find original index for consistent gradient
                const originalIndex = project.tracks.findIndex(t => t.file === track.file);
                return (
                  <MusicCard 
                    key={track.file}
                    track={track}
                    project={project}
                    index={originalIndex}
                    onAddComment={handleAddComment}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AdminDialog open={adminOpen} onOpenChange={setAdminOpen} />
    </div>
  );
}
