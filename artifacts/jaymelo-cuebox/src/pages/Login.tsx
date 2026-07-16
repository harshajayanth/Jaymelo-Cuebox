import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Project } from "@/types";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // If already logged in, redirect to project
    const saved = localStorage.getItem("cuebox_project");
    if (saved) {
      setLocation("/project");
    }
  }, [setLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
      const response = await fetch(`${baseUrl}/data/projects.json`);
      if (!response.ok) throw new Error("Failed to load projects");
      
      const projects: Project[] = await response.json();
      
      const project = projects.find(
        (p) => p.username === username && p.password === password
      );

      if (project) {
        localStorage.setItem("cuebox_project", JSON.stringify(project));
        setLocation("/project");
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      console.error(err);
      setError("Unable to authenticate at this time");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background">
      {/* Cinematic Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 dark:bg-blue-900/20 blur-[120px] pointer-events-none" />
      
      {/* Film grain noise via fixed pseudo-element effect can be done in CSS, here just minimal background */}
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
              Jaymelo <br/>
              <span className="font-light opacity-60">Cuebox</span>
            </h1>
            <p className="text-sm text-muted-foreground">Private Screening Room</p>
          </div>
          <ThemeToggle />
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Director ID</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter access ID"
                className="bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-primary h-12 text-base"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Passcode</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter passcode"
                className="bg-black/5 dark:bg-white/5 border-transparent focus-visible:ring-primary h-12 text-base"
                required
              />
            </div>
          </div>

          <AnimatePresence>
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
            disabled={isLoading}
          >
            {isLoading ? "Authenticating..." : "Enter Vault"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}

// Needed for AnimatePresence missing import above
import { AnimatePresence } from "framer-motion";
