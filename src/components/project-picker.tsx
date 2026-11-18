import type { OrgSummary } from "@/lib/org";
import { switchOrganization } from "@/app/(app)/settings/actions";

/** Organization switcher. A plain form so it works without JavaScript. */
export function ProjectPicker({ orgs, current }: { orgs: OrgSummary[]; current: OrgSummary }) {
  return (
    <form action={switchOrganization} className="px-2">
      <label htmlFor="kw-org" className="sr-only">Organization</label>
      <div className="flex gap-1.5">
        <select id="kw-org" name="org" defaultValue={current.id} className="input min-h-10 flex-1 truncate py-0 text-sm">
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-secondary min-h-10 px-3 text-xs">Switch</button>
      </div>
    </form>
  );
}
