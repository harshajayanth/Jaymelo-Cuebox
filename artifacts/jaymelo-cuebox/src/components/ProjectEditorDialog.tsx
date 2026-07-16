// ProjectEditorDialog — opened with Ctrl+Shift+E
// Edit the current project: rename tracks, toggle permissions, delete, add new tracks.
// Changes are saved to localStorage immediately. Use "Download JSON" to get a
// projects.json you can commit and redeploy to make changes permanent.
import { useState, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Trash2, Plus, Download, Save, Music, AlertCircle, FolderOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Project, Track } from "@/types";

interface ProjectEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
  onSave: (updated: Project) => void;
}

// Editable track state (mirrors Track but keeps original file ref)
interface EditableTrack extends Track {
  _tempId: string; // stable key for React list
}

let trackCounter = 0;
function makeTempId() { return `t_${++trackCounter}`; }

export function ProjectEditorDialog({
  open,
  onOpenChange,
  project,
  onSave,
}: ProjectEditorDialogProps) {
  // Local editable state — initialised from project each time the dialog opens
  const [projectName, setProjectName] = useState(project.projectName);
  const [tracks, setTracks] = useState<EditableTrack[]>(() =>
    project.tracks.map((t) => ({ ...t, _tempId: makeTempId() }))
  );

  // New track form
  const [newTitle, setNewTitle] = useState("");
  const [newFile, setNewFile] = useState("");
  const [newDisabled, setNewDisabled] = useState(false);
  const [newDownloadable, setNewDownloadable] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // JSON preview
  const [showJson, setShowJson] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Re-sync local state when project changes (e.g. after external save)
  // But only when dialog opens fresh
  const handleOpenChange = (val: boolean) => {
    if (val) {
      setProjectName(project.projectName);
      setTracks(project.tracks.map((t) => ({ ...t, _tempId: makeTempId() })));
      setShowJson(false);
      setSaved(false);
      setNewTitle("");
      setNewFile("");
      setDeleteConfirm(null);
    }
    onOpenChange(val);
  };

  // Track field updaters
  const updateTrack = (tempId: string, patch: Partial<Track>) => {
    setTracks((prev) =>
      prev.map((t) => (t._tempId === tempId ? { ...t, ...patch } : t))
    );
  };

  const deleteTrack = (tempId: string) => {
    setTracks((prev) => prev.filter((t) => t._tempId !== tempId));
    setDeleteConfirm(null);
  };

  // Pick file from disk — read filename only (no upload)
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewFile(file.name);
    // Pre-fill title from filename if blank
    if (!newTitle.trim()) {
      setNewTitle(file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
    }
  };

  const addTrack = () => {
    if (!newTitle.trim() || !newFile.trim()) return;
    const track: EditableTrack = {
      title: newTitle.trim(),
      file: newFile.trim(),
      disabled: newDisabled,
      downloadable: newDownloadable,
      comments: [],
      _tempId: makeTempId(),
    };
    setTracks((prev) => [...prev, track]);
    setNewTitle("");
    setNewFile("");
    setNewDisabled(false);
    setNewDownloadable(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const buildUpdatedProject = (): Project => ({
    ...project,
    projectName: projectName.trim() || project.projectName,
    tracks: tracks.map(({ _tempId: _id, ...rest }) => rest),
  });

  const handleSave = () => {
    const updated = buildUpdatedProject();
    localStorage.setItem("cuebox_project", JSON.stringify(updated));
    onSave(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDownloadJson = () => {
    // Build a full projects.json array — since we only have the current project
    // we wrap it. Users managing multiple projects should update manually.
    const updated = buildUpdatedProject();
    const blob = new Blob([JSON.stringify([updated], null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "projects.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generatedJson = JSON.stringify(buildUpdatedProject(), null, 2);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="glass-panel border-white/20 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onContextMenu={(e) => e.stopPropagation()}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Edit Project
            <span className="text-xs font-normal text-muted-foreground bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded-md ml-1">
              Ctrl+Shift+E
            </span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Changes save to your session. Download the JSON and replace{" "}
            <code className="text-primary text-xs bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">
              public/data/projects.json
            </code>{" "}
            to make them permanent after redeploy.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-1 mt-4 space-y-6">
          {/* Project name */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
              Project Name
            </Label>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-primary text-lg font-semibold"
              placeholder="Project name..."
              data-testid="input-project-name"
            />
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
                  No tracks. Add one below.
                </motion.p>
              )}

              {tracks.map((track, idx) => (
                <motion.div
                  key={track._tempId}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-black/5 dark:bg-white/5 rounded-xl p-4 space-y-3 border border-white/5"
                >
                  {/* Row 1: index + title + delete */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground/60 w-5 shrink-0 text-right">
                      {idx + 1}
                    </span>
                    <Input
                      value={track.title}
                      onChange={(e) => updateTrack(track._tempId, { title: e.target.value })}
                      className="flex-1 bg-transparent border-transparent focus-visible:ring-primary h-9 font-medium"
                      placeholder="Track title"
                      data-testid={`input-track-title-${idx}`}
                    />
                    {deleteConfirm === track._tempId ? (
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteTrack(track._tempId)}
                          className="h-7 px-2 text-xs"
                        >
                          Delete
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
                        onClick={() => setDeleteConfirm(track._tempId)}
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                        data-testid={`button-delete-track-${idx}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Row 2: filename + toggles */}
                  <div className="flex items-center gap-4 pl-8 flex-wrap">
                    <span className="text-xs text-muted-foreground/60 font-mono truncate max-w-[140px]">
                      {track.file}
                    </span>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <Switch
                        id={`disabled-${track._tempId}`}
                        checked={track.disabled}
                        onCheckedChange={(v) => updateTrack(track._tempId, { disabled: v })}
                        data-testid={`switch-disabled-${idx}`}
                      />
                      <Label
                        htmlFor={`disabled-${track._tempId}`}
                        className="text-xs cursor-pointer text-muted-foreground"
                      >
                        Disabled
                      </Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Switch
                        id={`dl-${track._tempId}`}
                        checked={track.downloadable}
                        onCheckedChange={(v) => updateTrack(track._tempId, { downloadable: v })}
                        data-testid={`switch-downloadable-${idx}`}
                      />
                      <Label
                        htmlFor={`dl-${track._tempId}`}
                        className="text-xs cursor-pointer text-muted-foreground"
                      >
                        Downloadable
                      </Label>
                    </div>
                  </div>
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
                <Input
                  placeholder="Track title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="flex-1 bg-transparent border-transparent focus-visible:ring-primary"
                  data-testid="input-new-track-title"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 gap-1.5 text-xs bg-transparent"
                  data-testid="button-pick-file"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Pick MP3
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,audio/*"
                  className="hidden"
                  onChange={handleFilePick}
                />
              </div>

              {newFile && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Music className="w-3 h-3 text-primary" />
                  <span className="font-mono">{newFile}</span>
                  <span className="text-muted-foreground/50">
                    → place in{" "}
                    <code className="text-primary">public/tunes/{project.folder}/</code>
                  </span>
                </div>
              )}

              {!newFile && (
                <div className="flex gap-2">
                  <Input
                    placeholder="filename.mp3 (if not picking a file)"
                    value={newFile}
                    onChange={(e) => setNewFile(e.target.value)}
                    className="flex-1 bg-transparent border-transparent focus-visible:ring-primary font-mono text-xs"
                    data-testid="input-new-track-filename"
                  />
                </div>
              )}

              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Switch
                    id="new-disabled"
                    checked={newDisabled}
                    onCheckedChange={setNewDisabled}
                  />
                  <Label htmlFor="new-disabled" className="text-xs cursor-pointer text-muted-foreground">
                    Disabled
                  </Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch
                    id="new-downloadable"
                    checked={newDownloadable}
                    onCheckedChange={setNewDownloadable}
                  />
                  <Label htmlFor="new-downloadable" className="text-xs cursor-pointer text-muted-foreground">
                    Downloadable
                  </Label>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={addTrack}
                  disabled={!newTitle.trim() || !newFile.trim()}
                  className="ml-auto gap-1.5 bg-primary/90 hover:bg-primary text-primary-foreground"
                  data-testid="button-add-track"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Track
                </Button>
              </div>
            </div>
          </div>

          {/* JSON preview */}
          <div className="space-y-2">
            <button
              onClick={() => setShowJson((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <span>{showJson ? "Hide" : "Preview"} generated JSON</span>
            </button>
            <AnimatePresence>
              {showJson && (
                <motion.pre
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[10px] font-mono bg-black/10 dark:bg-black/30 rounded-lg p-4 overflow-x-auto text-muted-foreground border border-white/5 max-h-48 overflow-y-auto"
                >
                  {generatedJson}
                </motion.pre>
              )}
            </AnimatePresence>
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-black/5 dark:bg-white/5 rounded-lg p-3">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
            <span>
              New tracks need their MP3 files placed in{" "}
              <code className="text-primary">public/tunes/{project.folder}/</code> before they will play.
              Download the JSON and replace{" "}
              <code className="text-primary">public/data/projects.json</code> in your repo, then redeploy.
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 mt-5 pt-4 border-t border-border/30 shrink-0">
          <Button
            variant="outline"
            onClick={handleDownloadJson}
            className="gap-2 bg-transparent"
            data-testid="button-download-json"
          >
            <Download className="w-4 h-4" />
            Download JSON
          </Button>
          <Button
            onClick={handleSave}
            className="ml-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground min-w-[120px]"
            data-testid="button-save-project"
          >
            {saved ? (
              "Saved!"
            ) : (
              <><Save className="w-4 h-4" /> Save Changes</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
