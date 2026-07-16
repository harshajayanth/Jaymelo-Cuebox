import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Project, Track } from "@/types";

interface AdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminDialog({ open, onOpenChange }: AdminDialogProps) {
  const [projectName, setProjectName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  
  const [generatedJson, setGeneratedJson] = useState<string>("");

  const handleGenerate = () => {
    if (!projectName || !username || !password) return;
    
    const folderSlug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    const tracks: Track[] = [];
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        tracks.push({
          title: file.name.replace(/\.[^/.]+$/, ""), // remove extension
          file: file.name,
          disabled: false,
          downloadable: false,
          comments: []
        });
      }
    }

    const proj: Project = {
      projectName,
      username,
      password,
      folder: folderSlug,
      tracks
    };

    setGeneratedJson(JSON.stringify(proj, null, 2));
  };

  const downloadJson = () => {
    if (!generatedJson) return;
    const blob = new Blob([generatedJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] glass-panel border-white/20">
        <DialogHeader>
          <DialogTitle className="text-xl tracking-tight">Admin: Generate Project</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6 mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input value={projectName} onChange={e => setProjectName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={username} onChange={e => setUsername(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>MP3 Files</Label>
              <Input type="file" multiple accept=".mp3" onChange={e => setFiles(e.target.files)} />
              <p className="text-xs text-muted-foreground mt-1">
                Files are not uploaded. Used only to extract filenames.
              </p>
            </div>
            
            <Button onClick={handleGenerate} className="w-full">Generate JSON</Button>
          </div>

          <div className="space-y-4 flex flex-col">
            <Label>Output</Label>
            <div className="flex-1 bg-black/80 dark:bg-black/40 border border-border/50 rounded-md p-4 overflow-y-auto max-h-[300px]">
              <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                {generatedJson || "// Fill form and click Generate"}
              </pre>
            </div>
            {generatedJson && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Instruction: Place the audio files at: <br/>
                  <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-xs">
                    public/tunes/{projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/
                  </code>
                </p>
                <Button variant="secondary" onClick={downloadJson} className="w-full">
                  Download Project JSON
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
