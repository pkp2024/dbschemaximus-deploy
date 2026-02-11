import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '@xyflow/react/dist/style.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DrawSQL Clone - Database Schema Designer',
  description: 'Design and visualize database schemas with an intuitive drag-and-drop interface',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
