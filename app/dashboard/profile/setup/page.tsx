import { auth } from "@clerk/nextjs/server";
import { getOrCreateUser } from "@/lib/user";
import { ProfileSetupClient } from "./profile-setup-client";
import type { ExtendedProfileData } from "@/types";

export default async function ProfileSetupPage() {
  const { userId: clerkId } = await auth();
  
  let initialData: any = {};
  if (clerkId) {
    const user = await getOrCreateUser(clerkId);
    if (user && user.profileData) {
      initialData = {
        ...(user.profileData as unknown as ExtendedProfileData),
        selectedDomains: (user.domains as unknown as string[]) || [],
      };
    }
  }

  return <ProfileSetupClient initialData={initialData} />;
}
