import type { AppProps } from 'next/app';
import { PrimeReactProvider } from 'primereact/api';
import { ToastProvider } from '@/hooks/useToast';
import 'primereact/resources/themes/lara-dark-indigo/theme.css';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps): React.ReactElement {
  return (
    <PrimeReactProvider>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </PrimeReactProvider>
  );
}
