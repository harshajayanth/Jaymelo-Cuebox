// ProjectEditorDialog — Ctrl+Shift+E
// All metadata writes to Firebase Firestore in real-time.
// Audio files are served from public/tunes/{filename}.
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Loader2, CheckCircle2, FolderOpen, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Project, Track } from "@/types";
import {
  doc, collection, updateDoc, deleteDoc, addDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ProjectEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  tracks: Track[];
}

export function ProjectEditorDialog({
  open,
  onOpenChange,
  project,
  tracks,
}: ProjectEditorDialogProps) {
  // Project name (local until saved)
  const [projectName, setProjectName] = useState(project.projectName);
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  // Track-level saving state (keyed by track id)
  const [savingTrack, setSavingTrack] = useState<Record<string, boolean>>({});
  const [deletingTrack, setDeletingTrack] = useState<Record<string, boolean>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [trackError, setTrackError] = useState<Record<string, string>>({});

  // New track form
  const [newFile, setNewFile] = useState("");
  const [newFileObject, setNewFileObject] = useState<File | null>(null);
  const [newDisabled, setNewDisabled] = useState(false);
  const [newDownloadable, setNewDownloadable] = useState(false);
  const [addingTrack, setAddingTrack] = useState(false);
  const [addError, setAddError] = useState("");

  // Sync local name when project changes
  const handleOpenChange = (val: boolean) => {
    if (val) {
      setProjectName(project.projectName);
      setNameSaved(false);
      setDeleteConfirm(null);
      setAddError("");
    }
    onOpenChange(val);
  };

  // ── Project name ──────────────────────────────────────────────────────────
  const handleSaveName = async () => {
    if (!projectName.trim() || projectName === project.projectName) return;
    setSavingName(true);
    try {
      await updateDoc(doc(db, "projects", project.id), {
        projectName: projectName.trim(),
      });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } finally {
      setSavingName(false);
    }
  };

  // ── Track toggles (immediate write) ──────────────────────────────────────
  const handleToggle = async (
    track: Track,
    field: "disabled" | "downloadable",
    value: boolean
  ) => {
    setSavingTrack((p) => ({ ...p, [track.id]: true }));
    setTrackError((p) => ({ ...p, [track.id]: "" }));
    try {
      await updateDoc(
        doc(db, "projects", project.id, "tracks", track.id),
        { [field]: value }
      );
    } catch (err: any) {
      setTrackError((p) => ({ ...p, [track.id]: err?.message ?? "Save failed" }));
    } finally {
      setSavingTrack((p) => ({ ...p, [track.id]: false }));
    }
  };

  // ── Track title (save on blur) ────────────────────────────────────────────
  const handleTitleBlur = async (track: Track, newTitle: string) => {
    if (!newTitle.trim() || newTitle === track.title) return;
    setSavingTrack((p) => ({ ...p, [track.id]: true }));
    try {
      await updateDoc(
        doc(db, "projects", project.id, "tracks", track.id),
        { title: newTitle.trim() }
      );
    } finally {
      setSavingTrack((p) => ({ ...p, [track.id]: false }));
    }
  };

  // ── Delete track ──────────────────────────────────────────────────────────
  const handleDelete = async (track: Track) => {
    setDeletingTrack((p) => ({ ...p, [track.id]: true }));
    try {
      // Only Firestore metadata can be removed from the browser.
      // The actual MP3 file in public/tunes/ must be removed manually.
      await deleteDoc(doc(db, "projects", project.id, "tracks", track.id));
      setDeleteConfirm(null);
    } catch (err: any) {
      setTrackError((p) => ({ ...p, [track.id]: err?.message ?? "Delete failed" }));
    } finally {
      setDeletingTrack((p) => ({ ...p, [track.id]: false }));
    }
  };

  // ── Add new track ─────────────────────────────────────────────────────────
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewFileObject(file);
    setNewFile(file.name);
  };

  const handleAddTrack = async () => {
    const fileName = newFileObject?.name ?? newFile.trim();
    if (!fileName) return;
    const derivedTitle = fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
    setAddingTrack(true);
    setAddError("");
    try {
      const maxOrder = tracks.reduce((m, t) => Math.max(m, t.order), -1);
      await addDoc(collection(db, "projects", project.id, "tracks"), {
        title: derivedTitle,
        file: fileName,
        disabled: newDisabled,
        downloadable: newDownloadable,
        order: maxOrder + 1,
        createdAt: serverTimestamp(),
      });
      setNewFile("");
      setNewFileObject(null);
      setNewDisabled(false);
      setNewDownloadable(false);
    } catch (err: any) {
      setAddError(err?.message ?? "Failed to add track");
    } finally {
      setAddingTrack(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="glass-panel border-border/70 bg-card/95 text-card-foreground max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onContextMenu={(e) => e.stopPropagation()}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Edit Project
            <span className="text-xs font-normal text-muted-foreground bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded-md ml-1">
              Ctrl+Shift+E
            </span>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Project metadata is stored in Firestore. Put the MP3 file in public/tunes/.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-1 mt-4 space-y-6">
          {/* Project name */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Project Name
            </Label>
            <div className="flex gap-2">
              <Input
                value={projectName}
                onChange={(e) => { setProjectName(e.target.value); setNameSaved(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                className="flex-1 bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-primary text-lg font-semibold"
              />
              <Button
                size="sm"
                onClick={handleSaveName}
                disabled={savingName || projectName === project.projectName}
                className="shrink-0 gap-1.5 bg-primary/90 hover:bg-primary text-primary-foreground"
              >
                {savingName ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : nameSaved ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> Saved</>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>

          <Separator className="opacity-30" />

          {/* Tracks */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Tracks ({tracks.length})
            </Label>

            <AnimatePresence initial={false}>
              {tracks.length === 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm text-muted-foreground italic text-center py-4"
                >
                  No tracks yet. Add one below.
                </motion.p>
              )}

              {tracks.map((track, idx) => (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-black/5 dark:bg-white/5 rounded-xl p-4 space-y-3 border border-white/5"
                >
                  {/* Title row */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground/50 w-5 shrink-0 text-right">
                      {idx + 1}
                    </span>
                    <Input
                      defaultValue={track.title}
                      onBlur={(e) => handleTitleBlur(track, e.target.value)}
                      className="flex-1 bg-transparent border-transparent focus-visible:ring-primary h-9 font-medium"
                      placeholder="Track title"
                    />
                    {savingTrack[track.id] && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0" />
                    )}
                    {deleteConfirm === track.id ? (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(track)}
                          disabled={deletingTrack[track.id]}
                          className="h-7 px-2 text-xs"
                        >
                          {deletingTrack[track.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteConfirm(null)}
                          className="h-7 px-2 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteConfirm(track.id)}
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Filename + toggles */}
                  <div className="flex items-center gap-4 pl-8 flex-wrap">
                    <span className="text-[10px] text-muted-foreground/40 font-mono truncate max-w-[140px]">
                      {track.file}
                    </span>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <Switch
                        checked={track.disabled}
                        onCheckedChange={(v) => handleToggle(track, "disabled", v)}
                        disabled={!!savingTrack[track.id]}
                      />
                      <Label className="text-xs cursor-pointer text-muted-foreground">Disabled</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={track.downloadable}
                        onCheckedChange={(v) => handleToggle(track, "downloadable", v)}
                        disabled={!!savingTrack[track.id]}
                      />
                      <Label className="text-xs cursor-pointer text-muted-foreground">Downloadable</Label>
                    </div>
                  </div>

                  {trackError[track.id] && (
                    <p className="text-xs text-destructive pl-8">{trackError[track.id]}</p>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <Separator className="opacity-30" />

          {/* Add new track */}
          <div className="space-y-3">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold flex items-center gap-2">
              <Plus className="w-3 h-3" /> Add Track
            </Label>
            <div className="bg-black/5 dark:bg-white/5 rounded-xl p-4 space-y-3 border border-dashed border-white/10">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("new-track-file-input")?.click()}
                  className="shrink-0 gap-1.5 text-xs bg-transparent"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Pick MP3
                </Button>
                <input
                  id="new-track-file-input"
                  type="file"
                  accept=".mp3,audio/*"
                  className="hidden"
                  onChange={handleFilePick}
                />
              </div>

              {newFile ? (
                <p className="text-xs text-muted-foreground font-mono pl-1">
                  📁 {newFile}{" "}
                  <span className="text-muted-foreground/50">
                    → public/tunes/
                  </span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground pl-1">
                  Choose an MP3 file and then place it in public/tunes/.
                </p>
              )}

              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Switch checked={newDisabled} onCheckedChange={setNewDisabled} />
                  <Label className="text-xs cursor-pointer text-muted-foreground">Disabled</Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch checked={newDownloadable} onCheckedChange={setNewDownloadable} />
                  <Label className="text-xs cursor-pointer text-muted-foreground">Downloadable</Label>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddTrack}
                  disabled={(!newFile.trim() && !newFileObject) || addingTrack}
                  className="ml-auto gap-1.5 bg-primary/90 hover:bg-primary text-primary-foreground"
                >
                  {addingTrack ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Adding…</>
                  ) : (
                    <><Plus className="w-3.5 h-3.5" /> Add Track</>
                  )}
                </Button>
              </div>

              {addError && (
                <div className="flex items-center gap-2 text-destructive text-xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {addError}
                </div>
              )}
            </div>
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-black/5 dark:bg-white/5 rounded-lg p-3">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
            <span>
              Pick an MP3 here to select the filename. Then place the actual file in public/tunes/. If you delete a track, remove the corresponding audio file manually from the public folder.
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
