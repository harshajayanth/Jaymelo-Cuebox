import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface HeaderProps {
  projectName: string;
  trackCount: number;
  onSignOut: () => void;
}

export function Header({ projectName, trackCount, onSignOut }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-background/70 border-b border-border/40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold tracking-tighter uppercase">
            Jaymelo <span className="font-light opacity-60">Cuebox</span>
          </h1>
          <div className="h-4 w-px bg-border/50 hidden sm:block"></div>
          <div className="hidden sm:flex items-center gap-3">
            <span className="font-medium text-sm">{projectName}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-muted-foreground">
              {trackCount} tracks
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={onSignOut} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Exit Session</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
