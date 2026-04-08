import './globals.css';

export const metadata = {
  title: 'LSF Smart Fridge — Recetas con lo que tienes',
  description:
    'Sube fotos de tu nevera y obtén recetas personalizadas con los ingredientes que ya tienes. Impulsado por inteligencia artificial.',
  keywords: ['recetas', 'nevera', 'ingredientes', 'IA', 'cocina', 'inteligencia artificial'],
  openGraph: {
    title: 'LSF Smart Fridge',
    description: 'Analiza tu nevera con IA y genera recetas al instante.',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0a0a1a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
