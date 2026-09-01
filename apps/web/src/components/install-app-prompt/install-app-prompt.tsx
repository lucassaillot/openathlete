import { Button } from '@/components/ui/button';
import { isCapacitor } from '@/utils/capacitor';
import { Download, Share, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'install-app-prompt-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

function isInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as NavigatorWithStandalone).standalone === true
  );
}

export function InstallAppPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [showIOSDetails, setShowIOSDetails] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (
      isCapacitor() ||
      isInstalled() ||
      localStorage.getItem(DISMISSED_KEY) === 'true'
    )
      return;

    setDismissed(false);
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      setShowIOSInstructions(true);
    }

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => setDismissed(true);
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setDismissed(true);
  };

  if (dismissed || (!installEvent && !showIOSInstructions)) return null;

  if (showIOSInstructions) {
    if (!showIOSDetails) {
      return (
        <div className="fixed bottom-20 right-4 z-50 md:bottom-6">
          <Button
            size="sm"
            variant="secondary"
            className="shadow-md"
            onClick={() => setShowIOSDetails(true)}
          >
            <Share className="h-4 w-4" />
            Installer l'app
          </Button>
        </div>
      );
    }

    return (
      <aside className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-xs items-center gap-2 rounded-lg border bg-background p-3 shadow-md md:bottom-6 md:left-auto md:right-4 md:mx-0">
        <Share className="h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="min-w-0 flex-1 text-sm">
          Appuyez sur Partager puis « Sur l'écran d'accueil ».
        </p>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Fermer"
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </aside>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 md:bottom-6">
      <Button
        size="sm"
        variant="secondary"
        className="shadow-md"
        onClick={() => void install()}
      >
        <Download className="h-4 w-4" />
        Installer l'app
      </Button>
    </div>
  );
}
