import { PrimeReactProvider } from 'primereact/api';
import { ToastProvider } from '@/hooks/useToast';
import 'primereact/resources/themes/lara-dark-indigo/theme.css';
import "@/styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <PrimeReactProvider ripple>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </PrimeReactProvider>
  )
}
