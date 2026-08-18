"use client";

/**
 * How a disabled module and an unauthorized action actually look.
 *
 * ── They are not the same thing, and must not look the same ─────────────────
 * Conflating them produces the two worst support tickets a platform can
 * generate. A teacher told "you don't have permission" for a module their
 * institute never bought will ask their admin for a permission that cannot be
 * granted; an admin told "this module isn't included" when they merely lack a
 * role will call sales about a plan they already have.
 *
 *   MODULE DISABLED     the organization does not have this. Nobody in it does.
 *                       The fix is commercial, and the message says so.
 *   NOT AUTHORIZED      the organization has it, this person does not. The fix
 *                       is a role change, by their own administrator.
 *   READ-ONLY           the organization has it and the person may use it, but
 *                       the subscription is suspended or past due, so nothing
 *                       can be written. Distinct again: the work is intact and
 *                       will be editable the moment billing is settled.
 *
 * ── Navigation hides, destinations explain ──────────────────────────────────
 * A denied entry is removed from the menu — leaving it visible to produce an
 * error on click is a worse experience than it never being there. But the ROUTE
 * still renders an explanation, because links are shared, bookmarked and typed,
 * and a blank page at a real URL reads as a broken product.
 *
 * ── Unknown permits ─────────────────────────────────────────────────────────
 * Every component here treats an unresolved context as permission granted. See
 * `access.ts`; the short version is that Abhigyan's own deployment reports no
 * context at all, and gating it closed would blank the application.
 */

import React from "react";
import { useTenant } from "./context";
import type { Gated } from "./access";

/** Render children only when the gate is not denied. */
export function Gate({
  gate,
  children,
  fallback = null,
}: {
  gate: Gated | undefined;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { allows } = useTenant();
  return <>{allows(gate) ? children : fallback}</>;
}

/** Render children only when the organization has the module. */
export function ModuleGate({
  module,
  children,
  fallback = null,
}: {
  module: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasModule } = useTenant();
  return <>{hasModule(module) ? children : fallback}</>;
}

/** Render children only when the user holds the permission. */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { can } = useTenant();
  return <>{can(permission) ? children : fallback}</>;
}

const panel: React.CSSProperties = {
  margin: "2rem auto",
  maxWidth: 560,
  padding: "1.75rem",
  borderRadius: 14,
  border: "1px solid var(--beige-sand, #DAD7CD)",
  background: "#fff",
  textAlign: "center",
};

const heading: React.CSSProperties = {
  margin: "0 0 .5rem",
  fontSize: "1.05rem",
  fontWeight: 600,
  color: "var(--brand-accent, #344E41)",
};

const body: React.CSSProperties = { margin: 0, fontSize: ".9rem", lineHeight: 1.6, color: "#5c5c5c" };

export function ModuleDisabled({ title, detail }: { title?: string; detail?: string }) {
  const { organizationName } = useTenant();
  return (
    <div style={panel} data-testid="module-disabled" role="status">
      <h2 style={heading}>{title ?? "Not part of your plan"}</h2>
      <p style={body}>
        {detail ??
          `This section is not included in ${organizationName ?? "your organization"}'s current plan.`}{" "}
        Your administrator can enable it by changing the subscription — no role change will make it
        appear.
      </p>
    </div>
  );
}

export function NotAuthorized({ title, detail }: { title?: string; detail?: string }) {
  const { context } = useTenant();
  const roles = context?.roleNames?.length ? context.roleNames.join(", ") : null;
  return (
    <div style={panel} data-testid="not-authorized" role="status">
      <h2 style={heading}>{title ?? "You do not have access to this"}</h2>
      <p style={body}>
        {detail ?? "This section exists in your organization, but your role does not include it."}
        {roles ? ` You are signed in as ${roles}.` : ""} An administrator in your organization can
        grant it.
      </p>
    </div>
  );
}

export function ReadOnlyNotice() {
  const { writable, context } = useTenant();
  if (writable) return null;
  return (
    <div
      data-testid="read-only-notice"
      role="status"
      style={{
        margin: "0 0 1rem",
        padding: ".7rem 1rem",
        borderRadius: 10,
        border: "1px solid #f0c36d",
        background: "#fff8e6",
        fontSize: ".85rem",
        color: "#7a5a00",
      }}
    >
      This organization is <strong>{context?.subscriptionStatus ?? "not active"}</strong>. Everything
      is readable, but changes cannot be saved until the subscription is settled.
    </div>
  );
}

/**
 * A whole screen behind a gate.
 *
 * Picks the right explanation by asking WHICH side denied — the module or the
 * permission — rather than showing one generic message for both.
 */
export function GatedScreen({
  gate,
  children,
}: {
  gate: Gated | undefined;
  children: React.ReactNode;
}) {
  const { gate: evaluate, moduleState } = useTenant();
  const decision = evaluate(gate);
  if (decision !== "denied") return <>{children}</>;
  if (gate?.module && moduleState(gate.module) === "denied") return <ModuleDisabled />;
  return <NotAuthorized />;
}

/**
 * A button that is present but inert when the user may not use it.
 *
 * Disabled rather than hidden, deliberately: for an ACTION inside a screen the
 * user can already see, removing the control makes the screen look broken or
 * incomplete, whereas a disabled control with a reason attached teaches what
 * the role does and does not cover. Navigation is the opposite case and hides.
 */
export function GatedButton({
  gate,
  children,
  disabled,
  title,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { gate: Gated | undefined }) {
  const { gate: evaluate, writable, moduleState } = useTenant();
  const decision = evaluate(gate);
  const denied = decision === "denied";
  const blockedByPlan = denied && gate?.module && moduleState(gate.module) === "denied";
  const reason = blockedByPlan
    ? "Not included in this organization's plan"
    : denied
      ? "Your role does not include this action"
      : !writable
        ? "This organization's subscription is not active"
        : title;

  return (
    <button
      {...rest}
      title={reason}
      disabled={disabled || denied || !writable}
      data-gate-denied={denied ? "true" : undefined}
    >
      {children}
    </button>
  );
}
