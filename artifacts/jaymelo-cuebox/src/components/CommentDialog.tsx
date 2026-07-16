// CommentDialog — backed by Firebase Firestore
// Comments are real-time: any device that has the dialog open will see new
// comments appear instantly without refreshing.
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MessageSquare, Loader2, WifiOff } from "lucide-react";
import { Track } from "@/types";
import { useFirestoreComments } from "@/hooks/useFirestoreComments";

interface CommentDialogProps {
  track: Track;
  projectFolder: string; // e.g. "Project-A"
}

export function CommentDialog({ track, projectFolder }: CommentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [author, setAuthor] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Hook subscribes to Firestore only when dialog is open (via the isOpen state
  // that triggers the parent mount, but we always mount the hook to keep it simple)
  const { comments, loading, error, addComment } = useFirestoreComments(
    projectFolder,
    track.file
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !text.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addComment(author.trim(), text.trim());
      setAuthor("");
      setText("");
    } catch (err) {
      console.error("Failed to save comment:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 relative"
          data-testid={`button-comments-${track.file}`}
        >
          <MessageSquare className="w-4 h-4" />
          {comments.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
              {comments.length > 9 ? "9+" : comments.length}
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="glass-panel border-white/20 sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {track.title}
            <span className="text-muted-foreground font-normal text-base ml-2">Notes</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-4">
          {/* Comment list */}
          <div className="max-h-[280px] overflow-y-auto pr-1 space-y-3">
            {loading && (
              <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading notes...</span>
              </div>
            )}

            {error && !loading && (
              <div className="flex items-center gap-2 py-6 text-destructive text-sm justify-center">
                <WifiOff className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {!loading && !error && comments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8 italic">
                No notes yet. Be the first.
              </p>
            )}

            {!loading && !error && comments.map((c) => (
              <div
                key={c.id}
                className="space-y-1 pb-3 border-b border-border/50 last:border-0 last:pb-0"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{c.author}</p>
                  {c.timestamp && (
                    <p className="text-[10px] text-muted-foreground/60">
                      {new Date(c.timestamp.seconds * 1000).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.text}</p>
              </div>
            ))}
          </div>

          {/* Add comment form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-3 mt-2 pt-4 border-t border-border/50"
          >
            <Input
              placeholder="Your Name"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-primary"
              data-testid="input-comment-author"
            />
            <Textarea
              placeholder="Add a note..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[80px] bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-primary resize-none"
              data-testid="textarea-comment-text"
            />
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={submitting || !author.trim() || !text.trim()}
              data-testid="button-submit-comment"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                "Add Note"
              )}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
