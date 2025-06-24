import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="pt-BR" className="dark">
      <Head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="color-scheme" content="dark light" />
        
        {/* Preload important fonts */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        
        {/* Favicon */}
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        
        {/* Manifest */}
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* Meta tags for SEO */}
        <meta name="robots" content="index,follow" />
        <meta name="author" content="ALL MVT" />
        <meta name="keywords" content="gestão de ativos digitais, DAM, real estate, imóveis, materiais de marketing" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="ALL MVT DAM" />
        <meta property="og:title" content="ALL MVT - Digital Asset Management" />
        <meta property="og:description" content="Sistema de Gerenciamento de Ativos Digitais para projetos imobiliários" />
        <meta property="og:image" content="/og-image.png" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="ALL MVT - Digital Asset Management" />
        <meta name="twitter:description" content="Sistema de Gerenciamento de Ativos Digitais para projetos imobiliários" />
        <meta name="twitter:image" content="/og-image.png" />
      </Head>
      <body className="bg-background text-foreground antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}