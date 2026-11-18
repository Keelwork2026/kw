/** Mirrors the database's _deployments_lifecycle trigger. */
export type DeployStatus = "queued" | "collecting" | "uploading" | "building" | "verifying" | "live" | "done" | "failed" | "superseded" | "rolled_back" | "cancelled";

const NEXT: Record<DeployStatus, DeployStatus[]> = {
  queued: ["collecting", "failed", "cancelled"],
  collecting: ["uploading", "failed", "cancelled"],
  uploading: ["building", "failed", "cancelled"],
  building: ["verifying", "failed", "cancelled"],
  verifying: ["live", "done", "failed"],
  live: ["superseded", "rolled_back"],
  done: [], failed: [], superseded: [], rolled_back: [], cancelled: [],
};

export function canMove(from: DeployStatus, to: DeployStatus): boolean {
  return from === to || NEXT[from].includes(to);
}

export const ACTIVE: DeployStatus[] = ["queued", "collecting", "uploading", "building", "verifying"];
