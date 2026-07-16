import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Project, Track } from "@/types";
import { Header } from "@/components/Header";
import { MusicCard } from "@/components/MusicCard";
import { AdminDialog } from "@/components/AdminDialog";
import { ProjectEditorDialog } from "@/components/ProjectEditorDialog";
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

  // Dialog states
  const [adminOpen, setAdminOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const { currentTrack } = usePlayer();

  // Load project from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("cuebox_project");
    if (!saved) {
      setLocation("/");
      return;
    }
    setProject(JSON.parse(saved));
  }, [setLocation]);

  // Global keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't fire when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) return;

      const mod = e.ctrlKey || e.metaKey;

      // Ctrl+Shift+N — Admin JSON generator
      if (mod && e.shiftKey && e.code === "KeyN") {
        e.preventDefault();
        setAdminOpen((prev) => !prev);
      }

      // Ctrl+Shift+E — Project editor
      if (mod && e.shiftKey && e.code === "KeyE") {
        e.preventDefault();
        setEditorOpen((prev) => !prev);
      }
    },
    []
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSignOut = () => {
    localStorage.removeItem("cuebox_project");
    setLocation("/");
  };

  // Called by ProjectEditorDialog after saving
  const handleProjectSave = (updated: Project) => {
    setProject(updated);
    // localStorage already updated inside ProjectEditorDialog
  };

  if (!project) return null;

  // Filter + sort tracks
  let displayTracks: Track[] = project.tracks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  if (sortMode === "az") {
    displayTracks = [...displayTracks].sort((a, b) =>
      a.title.localeCompare(b.title)
    );
  } else if (sortMode === "za") {
    displayTracks = [...displayTracks].sort((a, b) =>
      b.title.localeCompare(a.title)
    );
  } else if (sortMode === "recent" && currentTrack) {
    displayTracks = [...displayTracks].sort((a, b) => {
      if (a.file === currentTrack.file) return -1;
      if (b.file === currentTrack.file) return 1;
      return 0;
    });
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  return (
    <div className="min-h-screen bg-background relative pb-32">
      {/* Ambient glows */}
      <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <Header
        projectName={project.projectName}
        trackCount={project.tracks.length}
        onSignOut={handleSignOut}
      />

      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* Controls bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-10 bg-black/5 dark:bg-white/5 p-2 rounded-xl backdrop-blur-md border border-white/10">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tracks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none h-10 text-base"
              data-testid="input-search"
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

        {/* Track grid */}
        <AnimatePresence mode="wait">
          {displayTracks.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <p className="text-xl font-medium text-muted-foreground">
                No tracks found.
              </p>
              <p className="text-sm text-muted-foreground/60 mt-2">
                Adjust your search or filters.
              </p>
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
                const originalIndex = project.tracks.findIndex(
                  (t) => t.file === track.file
                );
                return (
                  <MusicCard
                    key={track.file}
                    track={track}
                    project={project}
                    index={originalIndex}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AdminDialog open={adminOpen} onOpenChange={setAdminOpen} />
      <ProjectEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        project={project}
        onSave={handleProjectSave}
      />
    </div>
  );
}
