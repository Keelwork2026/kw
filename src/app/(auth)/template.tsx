/** Re-mounts on every navigation, so each page enters with the shared motion (see .kw-page in globals.css). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="kw-page">{children}</div>;
}
