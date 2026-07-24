import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AdminDialog } from "@/components/AdminDialog";
import { usePlayer } from "@/context/PlayerContext";
import { setCueboxSessionCookie } from "@/lib/audio";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeChecked, setNoticeChecked] = useState(false);
  const [noticeAccepted, setNoticeAccepted] = useState(false);
  const [, setLocation] = useLocation();
  const { resetPlayer } = usePlayer();

  useEffect(() => {
    resetPlayer();
    const session = localStorage.getItem("cuebox_session");
    if (session) {
      setLocation("/project");
    }
  }, [resetPlayer, setLocation]);

  useEffect(() => {
    const accepted = localStorage.getItem("cuebox_confidentiality_accepted") === "true";
    setNoticeAccepted(accepted);
    setNoticeOpen(!accepted);
  }, []);

  const handleAcceptNotice = () => {
    if (!noticeChecked) return;
    localStorage.setItem("cuebox_confidentiality_accepted", "true");
    setNoticeAccepted(true);
    setNoticeOpen(false);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) return;

    if (e.ctrlKey && e.shiftKey && e.code === "KeyQ") {
      e.preventDefault();
      setAdminOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeAccepted) {
      setError("You must agree to the confidentiality notice before logging in.");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      const q = query(collection(db, "projects"), where("username", "==", username.trim()), where("password", "==", password));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setError("Invalid credentials. Please try again.");
        return;
      }
      const projectId = snapshot.docs[0].id;
      const sessionPayload = { projectId };
      localStorage.setItem("cuebox_session", JSON.stringify(sessionPayload));
      setCueboxSessionCookie(projectId);
      setLocation("/project");
    } catch (err) {
      console.error("Login error:", err);
      setError("Unable to connect. Please check your network.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background">
      {/* Cinematic background glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 dark:bg-blue-900/20 blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px] p-8 z-10 glass-panel rounded-2xl mx-4"
      >
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-3xl font-bold tracking-tighter uppercase mb-1">
              Jaymelo <br />
              <span className="font-light opacity-60">Cuebox</span>
            </h1>
            <p className="text-sm text-muted-foreground">Private Screening Room</p>
          </div>
          <ThemeToggle />
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="text-xs uppercase tracking-widest text-muted-foreground font-semibold"
              >
                Previewer ID
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter previewer ID"
                autoComplete="username"
                className="bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-primary h-12 text-base"
                required
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-xs uppercase tracking-widest text-muted-foreground font-semibold"
              >
                Passcode
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter passcode"
                autoComplete="current-password"
                className="bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-primary h-12 text-base"
                required
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-sm text-destructive font-medium"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <Button
            type="submit"
            className="w-full h-12 text-base font-medium rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-all"
            disabled={isLoading || !noticeAccepted}
          >
            {isLoading ? "Authenticating..." : "Enter Vault"}
          </Button>
          {!noticeAccepted && (
            <p className="text-xs text-muted-foreground mt-2">
              Please agree to the confidentiality notice before logging in.
            </p>
          )}

        </form>
      </motion.div>

      <AdminDialog open={adminOpen} onOpenChange={setAdminOpen} />

      <Dialog open={noticeOpen} onOpenChange={setNoticeOpen}>
        <DialogContent className="glass-panel border-border/70 bg-card/95 text-card-foreground w-[calc(100%-1rem)] sm:max-w-3xl max-h-[92dvh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-4 sm:px-6 pt-5 pb-3">
            <DialogTitle className="text-xl sm:text-2xl font-bold">Confidentiality Notice</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Read and agree to continue into the preview portal.
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto px-4 sm:px-6 py-2 space-y-4 text-sm text-muted-foreground">
            <p className="font-semibold">Welcome to JAYMELO CUEBOX</p>
            <p>
              The music, audio recordings, compositions, arrangements, sound designs, and all related materials available on this portal are the exclusive intellectual property of <strong>Mr. Harsha Jayanth</strong> and are shared privately under <strong>JAYMELO Productions</strong> solely for review and evaluation purposes.
            </p>
            <p className="font-semibold">By accessing this portal, you acknowledge and agree to the following:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>This portal is intended only for the authorized recipient to whom access has been granted.</li>
              <li>All music and related content are confidential and unpublished works.</li>
              <li>Do not share your username or password with anyone.</li>
              <li>Do not forward, distribute, or allow any third party to access these materials.</li>
              <li>Do not record the audio using another device, screen recorder, software, or any other method.</li>
              <li>Do not download, copy, duplicate, extract, or reproduce the music unless explicit written permission has been provided by <strong>Mr. Harsha Jayanth</strong>.</li>
              <li>Do not upload, publish, stream, or share these recordings on any social media platform, messaging application, cloud storage service, or public/private website.</li>
              <li>Do not use any part of these recordings for commercial, personal, or promotional purposes without prior written authorization.</li>
              <li>Please provide feedback only through the comment section within your assigned project.</li>
              <li>If you believe your account has been accessed by someone else or any material has been compromised, please notify <strong>JAYMELO Productions</strong> immediately.</li>
              <li>All copyrights and intellectual property rights remain exclusively with <strong>Mr. Harsha Jayanth</strong> under <strong>JAYMELO Productions</strong> unless otherwise agreed in writing.</li>
            </ol>
            <p className="font-semibold">Respect for Creative Work</p>
            <p>
              These compositions may represent months of creative development and are shared with you in confidence. Your cooperation in protecting this work from unauthorized access, copying, recording, or distribution is sincerely appreciated.
            </p>
            <p className="font-semibold">© JAYMELO Productions — All Rights Reserved.</p>
            <p className="font-semibold">Music composed and produced by Harsha Jayanth.</p>
          </div>

          <div className="sticky bottom-0 border-t border-border/20 bg-background/90 backdrop-blur px-4 sm:px-6 py-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="confidentiality-accept"
                checked={noticeChecked}
                onCheckedChange={(checked) => setNoticeChecked(Boolean(checked))}
              />
              <label htmlFor="confidentiality-accept" className="text-sm text-foreground leading-6">
                I have read and agree to the Confidentiality Notice. I understand that these materials are confidential and will not be copied, recorded, downloaded, or shared with any unauthorized person.
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleAcceptNotice}
                disabled={!noticeChecked}
                className="w-full sm:w-auto bg-primary text-primary-foreground"
              >
                Agree and continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
