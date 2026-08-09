import './globals.css';
import ServiceWorkerRegistrar from '@/components/ServiceWorkerRegistrar';

export const metadata = {
  title: 'Raíces — Árbol Genealógico',
  description: 'Aplicación web privada para investigar y documentar tu árbol genealógico.',
  icons: {
    icon: '/raices-icon.png',
    apple: '/raices-icon.png'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#245b4d" />
        <link rel="apple-touch-icon" href="/raices-icon.png" />
      </head>
      <body>
        {/* SW registrar runs on client */}
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
