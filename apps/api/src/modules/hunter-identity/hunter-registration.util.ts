export type HunterProfileLean = {
  registrationCompleted?: boolean;
  email?: string | null;
};

export function isRegisteredHunterProfile(h: HunterProfileLean): boolean {
  if (h.registrationCompleted === true) {
    return true;
  }
  if (h.registrationCompleted === false) {
    return false;
  }
  return Boolean(h.email?.trim());
}
