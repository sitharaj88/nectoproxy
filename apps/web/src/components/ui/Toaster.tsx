import { Toaster as SonnerToaster } from 'sonner';
import { useTheme, getResolvedTheme } from '@/hooks/useTheme';

export function Toaster() {
  const { theme } = useTheme();
  const resolved = getResolvedTheme(theme);

  return (
    <SonnerToaster
      position="bottom-right"
      theme={resolved}
      closeButton
      richColors
    />
  );
}

export { toast } from 'sonner';
