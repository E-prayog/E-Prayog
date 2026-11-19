/**
 * Client-side seeding of Admin/Teacher accounts is disabled.
 * Hardcoded demo passwords were a credential leak and allowed anyone
 * who loaded the app to recreate those accounts.
 *
 * Create the first Admin in Firebase Console → Authentication, then set
 * role: "Admin" on that user's document in Firestore `users/{uid}`.
 */
export const ensureAdminExists = async (): Promise<void> => {
  return;
};
