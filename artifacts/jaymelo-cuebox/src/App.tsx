import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ThemeProvider } from 'next-themes';
import { PlayerProvider } from '@/context/PlayerContext';
import { Login } from '@/pages/Login';
import { ProjectPage } from '@/pages/Project';
import { MiniPlayer } from '@/components/MiniPlayer';
import { useEffect } from 'react';

const queryClient = new QueryClient();

function GlobalSecurity() {
  useEffect(() => {
    // Disable right click app-wide
    const handleContext = (e: MouseEvent) => {
      // Allow context menu on inputs/textareas
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      e.preventDefault();
    };
    
    // Disable text selection app-wide (except inputs)
    const handleSelect = (e: Event) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // We handle this primarily via CSS user-select: none, but good as backup
    };

    document.addEventListener('contextmenu', handleContext);
    document.addEventListener('selectstart', handleSelect);
    
    return () => {
      document.removeEventListener('contextmenu', handleContext);
      document.removeEventListener('selectstart', handleSelect);
    };
  }, []);
  
  return null;
}

function Router() {
  return (
    <>
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/project" component={ProjectPage} />
        <Route component={NotFound} />
      </Switch>
      <MiniPlayer />
    </>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <PlayerProvider>
          <TooltipProvider>
            <GlobalSecurity />
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </PlayerProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
