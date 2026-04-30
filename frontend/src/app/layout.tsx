import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LumiFund — Milestone Crowdfunding on Stellar',
  description: 'Transparent, milestone-based crowdfunding powered by Soroban smart contracts.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
