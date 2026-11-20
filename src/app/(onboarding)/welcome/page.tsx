import { requireOrg } from "@/lib/org";
import { onboardingParams } from "@/lib/auth/redirect";
import { Onboarding } from "@/components/onboarding";
import { quickStart } from "@/app/(app)/new-project/actions";
import { completeOnboarding } from "@/app/(app)/settings/actions";

export const metadata = { title: "Welcome" };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase, user, org, can } = await requireOrg();
  const carry = onboardingParams(await searchParams);
  const { data: profile } = await supabase.from("profiles").select("display_name, experience").eq("id", user.id).maybeSingle();
  const experience = profile?.experience === "new" || profile?.experience === "some" || profile?.experience === "developer" ? profile.experience : null;
  return (
    <Onboarding
      initial={{ displayName: (profile?.display_name as string | null) ?? "", experience, orgName: org.name }}
      canRenameOrg={can("org.manage")}
      carry={carry}
      quickStart={quickStart}
      complete={completeOnboarding}
    />
  );
}
