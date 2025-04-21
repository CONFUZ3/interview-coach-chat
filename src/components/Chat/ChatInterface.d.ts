
import { ProfileData } from "@/services/profileService";

export interface ChatInterfaceProps {
  mode: "resume" | "interview";
  userProfile?: ProfileData;
}
