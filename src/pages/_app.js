import { PrimeReactProvider } from 'primereact/api';
import 'primereact/resources/themes/lara-dark-indigo/theme.css';
import "@/styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <PrimeReactProvider ripple>
      <Component {...pageProps} />
    </PrimeReactProvider>
  )
}
