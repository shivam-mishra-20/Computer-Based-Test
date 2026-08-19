/**
 * Re-exported from `@platform/client-core`.
 *
 * The decision rules — including the one that matters most, that UNKNOWN
 * resolves to ALLOWED — now have a single definition shared with
 * client-platform-app. Two copies of a rule that important is two chances to
 * fix a bug in one place and not the other.
 *
 * The shared `Gated` additionally carries `roles`, which the mobile client uses
 * for genuinely role-shaped destinations. This client does not set it, and an
 * unset `roles` permits everything — so nothing here changes.
 */

export type { AccessDecision, Gated } from '@platform/client-core';
export {
  moduleDecision,
  permissionDecision,
  permissionsDecision,
  permits,
  gateDecision,
  visible,
  isWritable,
} from '@platform/client-core';
