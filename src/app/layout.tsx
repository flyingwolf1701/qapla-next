
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { WorkoutStateProvider } from '@/providers/WorkoutStateProvider';
import { ThemeProvider } from '@/components/ThemeProvider';

const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: "Qapla' Fitness",
  description: 'Adaptive bodyweight training focused on effort and consistency.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <WorkoutStateProvider>
            {children}
            <Toaster />
          </WorkoutStateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
