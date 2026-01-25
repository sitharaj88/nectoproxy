import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="dark"
      toastOptions={{
        className: 'bg-gray-800 border border-gray-700 text-gray-100',
        descriptionClassName: 'text-gray-400',
        style: {
          background: 'rgb(31 41 55)',
          border: '1px solid rgb(55 65 81)',
          color: 'rgb(243 244 246)',
        },
      }}
      closeButton
      richColors
    />
  );
}

export { toast } from 'sonner';
