import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
// import Script from 'next/script';
import './globals.css';
import { ToastProvider } from '../components/base/toast';
import OneSignalScript from '@/components/OneSignalScript';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Hupuna chat Web',
  description: 'Developer Hupuna create a chat web app',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120x120.png" />
        <meta name="apple-mobile-web-app-title" content="Tên App" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning={true}>
        <ToastProvider>{children}</ToastProvider>
        <OneSignalScript />
        {/* <Script src="/chat-widget.js" strategy="afterInteractive" /> */}
      </body>
    </html>
  );
}
