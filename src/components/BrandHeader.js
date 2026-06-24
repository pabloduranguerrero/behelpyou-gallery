import { LOGO_SRC } from '@/lib/assets';

export default function BrandHeader({ rightSlot = null }) {
  return (
    <header className="topbar">
      <a
        href="https://behelpyou.com"
        target="_blank"
        rel="noopener noreferrer"
        className="logo"
        aria-label="Ir a behelpyou.com"
      >
        <img src={LOGO_SRC} alt="BeHelpYou" />
      </a>
      <div className="right">
        {rightSlot}
      </div>
    </header>
  );
}
