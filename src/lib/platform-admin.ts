import "server-only";

export function isPlatformAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const admins = (process.env.FONDO_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}
