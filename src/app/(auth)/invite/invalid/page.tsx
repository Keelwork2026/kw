import Link from "next/link";

export default function InvalidInvitePage() {
  return (
    <>
      <h1 className="text-3xl">This invitation can&apos;t be used</h1>
      <p className="mt-2 text-muted">It may have expired, been revoked, or already been accepted. Ask the person who invited you to send a new one.</p>
      <Link href="/dashboard" className="btn btn-secondary mt-6 w-full">Go to your dashboard</Link>
    </>
  );
}
