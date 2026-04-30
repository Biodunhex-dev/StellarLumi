import Link from 'next/link';
import { WalletButton } from './WalletButton';

export function Navbar() {
  return (
    <nav className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
      <Link href="/" className="text-xl font-bold text-brand">
        LumiFund
      </Link>
      <div className="flex items-center gap-4">
        <Link href="/campaigns" className="text-sm text-gray-400 hover:text-white">
          Campaigns
        </Link>
        <Link href="/campaigns/new" className="text-sm text-gray-400 hover:text-white">
          Create
        </Link>
        <Link href="/backer" className="text-sm text-gray-400 hover:text-white">
          My Contributions
        </Link>
        <WalletButton />
      </div>
    </nav>
  );
}
