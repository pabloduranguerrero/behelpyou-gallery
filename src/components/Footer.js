export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div>
        Una experiencia de{' '}
        <a
          href="https://behelpyou.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          BeHelpYou
        </a>
        {' · '}{year}
      </div>
    </footer>
  );
}
