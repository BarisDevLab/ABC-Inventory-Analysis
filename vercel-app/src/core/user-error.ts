/** Validation errors whose messages contain no submitted inventory values. */
export class UserInputError extends Error {}

export function userErrorMessage(error: unknown, fallback: string): string {
  return error instanceof UserInputError ? error.message : fallback;
}
