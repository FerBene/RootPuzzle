import './globals.css';

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
      <body>{children}</body>
    </html>
  );
}
