import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Track } from "@/types";
import { Header } from "@/components/Header";
import { MusicCard } from "@/components/MusicCard";
import { AdminDialog } from "@/components/AdminDialog";
import { ProjectEditorDialog } from "@/components/ProjectEditorDialog";
import { MiniPlayer } from "@/components/MiniPlayer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Clock, ArrowDownAZ, ArrowUpZA, Loader2, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "@/context/PlayerContext";
import { useFirestoreProject } from "@/hooks/useFirestoreProject";

type SortMode = "none" | "az" | "za" | "recent";

export function ProjectPage() {
  const [, setLocation] = useLocation();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("none");
  const [adminOpen, setAdminOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const { currentTrack, updateTracks } = usePlayer();

  // Keep the player's internal tracklist in sync with Firestore
  useEffect(() => {
    updateTracks(tracks);
  }, [tracks]); // eslint-disable-line react-hooks/exhaustive-deps
  const { project, tracks, loading, error } = useFirestoreProject(projectId);

  // Read session on mount
  useEffect(() => {
    const session = localStorage.getItem("cuebox_session");
    if (!session) {
      setLocation("/");
      return;
    }
    try {
      const { projectId: id } = JSON.parse(session);
      if (!id) throw new Error("No projectId");
      setProjectId(id);
    } catch {
      localStorage.removeItem("cuebox_session");
      setLocation("/");
    }
  }, [setLocation]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) return;

    const mod = e.ctrlKey || e.metaKey;

    if (mod && e.shiftKey && e.code === "KeyN") {
      e.preventDefault();
      setAdminOpen((v) => !v);
    }

    if (mod && e.shiftKey && e.code === "KeyE") {
      e.preventDefault();
      setEditorOpen((v) => !v);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSignOut = () => {
    localStorage.removeItem("cuebox_session");
    setLocation("/");
  };

  // ── Loading / error states ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading project…</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 text-center px-4">
        <WifiOff className="w-8 h-8 text-destructive" />
        <p className="text-lg font-medium">{error ?? "Project not found."}</p>
        <Button variant="outline" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>
    );
  }

  // ── Filter + sort ────────────────────────────────────────────────────────
  let displayTracks: Track[] = tracks.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  if (sortMode === "az") {
    displayTracks = [...displayTracks].sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortMode === "za") {
    displayTracks = [...displayTracks].sort((a, b) => b.title.localeCompare(a.title));
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
      <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

      <Header
        projectName={project.projectName}
        trackCount={tracks.length}
        onSignOut={handleSignOut}
      />

      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-10 bg-black/5 dark:bg-white/5 p-2 rounded-xl backdrop-blur-md border border-white/10">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tracks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none h-10 text-base"
            />
          </div>

          <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {(["az", "za", "recent"] as const).map((mode) => (
              <Button
                key={mode}
                variant={sortMode === mode ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSortMode(sortMode === mode ? "none" : mode)}
                className="text-xs shrink-0"
              >
                {mode === "az" && <><ArrowDownAZ className="w-4 h-4 mr-2" />A-Z</>}
                {mode === "za" && <><ArrowUpZA className="w-4 h-4 mr-2" />Z-A</>}
                {mode === "recent" && <><Clock className="w-4 h-4 mr-2" />Recent</>}
              </Button>
            ))}
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
                {tracks.length === 0 ? "No tracks yet." : "No tracks match your search."}
              </p>
              {tracks.length === 0 && (
                <p className="text-sm text-muted-foreground/60 mt-2">
                  Open the editor (Ctrl+Shift+E) to add tracks.
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            >
              {displayTracks.map((track, idx) => (
                <MusicCard
                  key={track.id}
                  track={track}
                  project={project}
                  index={idx}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <MiniPlayer />

      <AdminDialog open={adminOpen} onOpenChange={setAdminOpen} />
      {project && (
        <ProjectEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          project={project}
          tracks={tracks}
        />
      )}
    </div>
  );
}
