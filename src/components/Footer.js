export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div>BeHelpYou Gallery · {year}</div>
    </footer>
  );
}
