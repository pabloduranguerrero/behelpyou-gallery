import Link from 'next/link';
import { LOGO_SRC } from '@/lib/assets';

export default function BrandHeader({ rightSlot = null }) {
  return (
    <header className="topbar">
      <Link href="/" className="logo" aria-label="BeHelpYou Gallery">
        <img src={LOGO_SRC} alt="BeHelpYou" />
      </Link>
      <div className="right">
        {rightSlot}
      </div>
    </header>
  );
}
