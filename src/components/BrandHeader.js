import Link from 'next/link';

export default function BrandHeader({ rightSlot = null }) {
  return (
    <header className="topbar">
      <Link href="/" className="logo" aria-label="BeHelpYou Gallery">
        <img src="/logo-behelpyou.png" alt="BeHelpYou" />
      </Link>
      <div className="right">
        {rightSlot}
      </div>
    </header>
  );
}
