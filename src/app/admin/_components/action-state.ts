/** What an admin server action answers a form with. */
export type ActionState = {
  ok?: boolean;
  message?: string;
  /** Problems by field name. */
  errors?: Record<string, string>;
  /** Changes on each submit, so a form can reset after success. */
  at?: number;
};
