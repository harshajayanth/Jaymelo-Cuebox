import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MessageSquare } from "lucide-react";
import { Track } from "@/types";

interface CommentDialogProps {
  track: Track;
  onAddComment: (trackFile: string, author: string, text: string) => void;
}

export function CommentDialog({ track, onAddComment }: CommentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !text.trim()) return;
    onAddComment(track.file, author.trim(), text.trim());
    setAuthor("");
    setText("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
        >
          <MessageSquare className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel border-white/20 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">{track.title} Notes</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 mt-4">
          <div className="max-h-[300px] overflow-y-auto pr-2 space-y-4">
            {track.comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 italic">No notes yet.</p>
            ) : (
              track.comments.map((c, i) => (
                <div key={i} className="space-y-1 pb-4 border-b border-border last:border-0 last:pb-0">
                  <p className="text-sm font-semibold">{c.author}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.text}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 mt-4 pt-4 border-t border-border/50">
            <Input 
              placeholder="Your Name" 
              value={author} 
              onChange={(e) => setAuthor(e.target.value)} 
              className="bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-primary"
            />
            <Textarea 
              placeholder="Add a note..." 
              value={text} 
              onChange={(e) => setText(e.target.value)} 
              className="min-h-[80px] bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-primary resize-none"
            />
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              Add Note
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
