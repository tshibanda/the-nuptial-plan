import { useUser } from '@clerk/expo';
import { getPreferredCurrency } from '@workspace/api-client-react';

/** Account-wide display currency, shared with the web app through Clerk metadata. */
export function usePreferredCurrency() {
  const { user } = useUser();
  return getPreferredCurrency(user?.unsafeMetadata);
}