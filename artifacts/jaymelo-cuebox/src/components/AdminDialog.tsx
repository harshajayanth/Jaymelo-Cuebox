// AdminDialog — Ctrl+Shift+N
// Creates a brand-new project directly in Firebase Firestore.
// MP3 files are read for their filenames only — the actual files must be
// placed in public/tunes/{folder}/ before they will play.
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, CheckCircle2, AlertCircle, Music } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TrackEntry {
  title: string;
  file: string;
  disabled: boolean;
  downloadable: boolean;
}

export function AdminDialog({ open, onOpenChange }: AdminDialogProps) {
  const [projectName, setProjectName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [folder, setFolder] = useState("");
  const [trackEntries, setTrackEntries] = useState<TrackEntry[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [createdId, setCreatedId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleProjectNameChange = (name: string) => {
    setProjectName(name);
    // Auto-derive folder slug if not manually set
    if (!folder || folder === toSlug(projectName)) {
      setFolder(toSlug(name));
    }
  };

  function toSlug(s: string) {
    return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const entries: TrackEntry[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      entries.push({
        title: f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
        file: f.name,
        disabled: false,
        downloadable: false,
      });
    }
    setTrackEntries(entries);
  };

  const updateEntry = (i: number, patch: Partial<TrackEntry>) => {
    setTrackEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  };

  const handleCreate = async () => {
    if (!projectName || !username || !password || !folder) return;
    setStatus("saving");
    setErrorMsg("");

    try {
      // 1. Create the project doc
      const projectRef = await addDoc(collection(db, "projects"), {
        projectName: projectName.trim(),
        username: username.trim(),
        password: password,
        folder: folder.trim(),
        createdAt: serverTimestamp(),
      });

      // 2. Add each track as a subcollection doc
      const tracksCol = collection(db, "projects", projectRef.id, "tracks");
      for (let i = 0; i < trackEntries.length; i++) {
        const t = trackEntries[i];
        await addDoc(tracksCol, {
          title: t.title,
          file: t.file,
          disabled: t.disabled,
          downloadable: t.downloadable,
          order: i,
          createdAt: serverTimestamp(),
        });
      }

      setCreatedId(projectRef.id);
      setStatus("done");
    } catch (err: any) {
      console.error("Create project error:", err);
      setErrorMsg(err?.message ?? "Unknown error");
      setStatus("error");
    }
  };

  const handleReset = () => {
    setProjectName("");
    setUsername("");
    setPassword("");
    setFolder("");
    setTrackEntries([]);
    setStatus("idle");
    setCreatedId("");
    setErrorMsg("");
  };

  const canSubmit = projectName && username && password && folder && status === "idle";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-white/20 sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-xl tracking-tight flex items-center gap-2">
            Create New Project
            <span className="text-xs font-normal text-muted-foreground bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded-md">
              Ctrl+Shift+N
            </span>
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Project + tracks are written directly to Firebase Firestore.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 mt-4 space-y-5 pr-1">
          {status === "done" ? (
            <div className="space-y-4 py-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
              <p className="text-lg font-semibold">Project created!</p>
              <p className="text-sm text-muted-foreground">
                Project ID: <code className="text-primary bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded text-xs font-mono">{createdId}</code>
              </p>
              <p className="text-sm text-muted-foreground">
                Now place MP3 files at:{" "}
                <code className="text-primary bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded text-xs font-mono">
                  public/tunes/{folder}/
                </code>
              </p>
              <div className="flex gap-3 justify-center mt-4">
                <Button variant="outline" onClick={handleReset}>Create Another</Button>
                <Button onClick={() => onOpenChange(false)}>Done</Button>
              </div>
            </div>
          ) : (
            <>
              {/* Project details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Project Name</Label>
                  <Input
                    value={projectName}
                    onChange={(e) => handleProjectNameChange(e.target.value)}
                    placeholder="My Film Score"
                    className="bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Username</Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="director1"
                    className="bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-primary"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                    Audio Folder <span className="text-muted-foreground/60">(public/tunes/…)</span>
                  </Label>
                  <Input
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    placeholder="my-film-score"
                    className="bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-primary font-mono text-sm"
                  />
                </div>
              </div>

              {/* MP3 picker */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                  Pick MP3 Files <span className="text-muted-foreground/60">(filenames only — no upload)</span>
                </Label>
                <Input
                  type="file"
                  multiple
                  accept=".mp3,audio/*"
                  onChange={handleFilePick}
                  className="bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-primary file:text-primary file:font-medium"
                />
              </div>

              {/* Track list preview + per-track toggles */}
              {trackEntries.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest text-muted-foreground">
                    Tracks ({trackEntries.length})
                  </Label>
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {trackEntries.map((t, i) => (
                      <div
                        key={i}
                        className="bg-black/5 dark:bg-white/5 rounded-xl p-3 space-y-2 border border-white/5"
                      >
                        <div className="flex items-center gap-2">
                          <Music className="w-3.5 h-3.5 text-primary shrink-0" />
                          <Input
                            value={t.title}
                            onChange={(e) => updateEntry(i, { title: e.target.value })}
                            className="flex-1 bg-transparent border-transparent focus-visible:ring-primary h-8 font-medium text-sm"
                          />
                          <span className="text-[10px] font-mono text-muted-foreground/50 truncate max-w-[80px]">
                            {t.file}
                          </span>
                        </div>
                        <div className="flex gap-4 pl-5">
                          <div className="flex items-center gap-1.5">
                            <Switch
                              checked={t.disabled}
                              onCheckedChange={(v) => updateEntry(i, { disabled: v })}
                            />
                            <span className="text-xs text-muted-foreground">Disabled</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Switch
                              checked={t.downloadable}
                              onCheckedChange={(v) => updateEntry(i, { downloadable: v })}
                            />
                            <span className="text-xs text-muted-foreground">Downloadable</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {status === "error" && (
                <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{errorMsg || "Failed to create project."}</span>
                </div>
              )}
            </>
          )}
        </div>

        {status !== "done" && (
          <div className="mt-5 pt-4 border-t border-border/30 shrink-0">
            <Button
              onClick={handleCreate}
              disabled={!canSubmit || status === "saving"}
              className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {status === "saving" ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Creating in Firebase…</>
              ) : (
                "Create Project in Firebase"
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
