/**
 * The tenant decision layer, asserted directly.
 *
 * ── Why this suite is separate from the browser suite ───────────────────────
 * Everything here is a pure function, and pure functions are where the rules
 * that matter actually live: whether an empty module list means "none" or
 * "unknown", whether `classes.manage` implies `classes.read`, whether a class
 * level survives a round trip. Testing those through a browser would make a
 * five-millisecond assertion take thirty seconds and fail for reasons that have
 * nothing to do with the rule.
 *
 * The browser suite proves the wiring. This one proves the rules.
 *
 *   npm run verify:tenant
 */

import {
  gateDecision,
  isWritable,
  moduleDecision,
  permissionDecision,
  permissionsDecision,
  permits,
  visible,
} from '../src/lib/tenant/access';
import {
  ADMIN_NAV_GATES,
  APP_MANAGEMENT_GATES,
  FEATURE_GATES,
  STUDENT_NAV_GATES,
  TEACHER_NAV_GATES,
  gateForHref,
} from '../src/lib/tenant/registry';
import {
  DEFAULT_BRAND,
  brandTokens,
  luminance,
  normalizeHex,
  readableOn,
  shade,
} from '../src/lib/tenant/branding';

let failures = 0;
let checks = 0;

function check(label: string, ok: boolean, detail = '') {
  checks++;
  if (ok) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
  }
}

function eq<T>(label: string, actual: T, expected: T) {
  check(label, JSON.stringify(actual) === JSON.stringify(expected), `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

/**
 * The permission vocabulary and module registry the server actually issues.
 *
 * Transcribed rather than imported — this repository does not depend on
 * platform-core — and re-derived by the end-to-end suite from a live
 * `/api/me/context`, so a drift between the two is caught there rather than
 * being assumed away here.
 */
const SERVER_MODULES = [
  'auth', 'organizations', 'users', 'rbac', 'notifications', 'files', 'audit', 'settings',
  'students', 'teachers', 'classes', 'subjects', 'scheduling', 'homework', 'materials',
  'attendance', 'courses', 'doubts', 'exams', 'cbt', 'results', 'evaluation', 'rankings',
  'questionBank', 'questionImport', 'offlineTests', 'analytics', 'ai', 'aiAnalysis',
  'advancedAnalytics', 'whiteLabel', 'customDomain', 'apiAccess', 'integrations',
];

const SERVER_PERMISSIONS = [
  'users.read', 'users.create', 'users.update', 'users.delete', 'users.invite',
  'roles.read', 'roles.create', 'roles.update', 'roles.delete',
  'students.read', 'students.create', 'students.update', 'students.delete', 'students.import',
  'teachers.read', 'teachers.create', 'teachers.update', 'teachers.delete',
  'classes.read', 'classes.manage', 'subjects.read', 'subjects.manage',
  'batches.read', 'batches.manage', 'rooms.read', 'rooms.manage',
  'schedule.read', 'schedule.manage', 'syllabus.read', 'syllabus.manage',
  'exams.read', 'exams.create', 'exams.update', 'exams.delete', 'exams.publish',
  'attempts.read', 'attempts.grade',
  'results.read', 'results.publish', 'results.export', 'results.override',
  'questions.read', 'questions.create', 'questions.update', 'questions.delete', 'questions.import',
  'attendance.read', 'attendance.mark', 'attendance.manage',
  'homework.read', 'homework.manage', 'materials.read', 'materials.manage',
  'doubts.read', 'doubts.respond', 'courses.read', 'courses.manage',
  'leaves.read', 'leaves.approve', 'announcements.read', 'announcements.manage',
  'analytics.read', 'reports.read', 'reports.export',
  'org.read', 'org.settings', 'org.branding', 'org.integrations',
  'audit.read', 'ai.generate', 'ai.read',
];

/** The student legacy role, verbatim from core/rbac/permissions.ts. */
const STUDENT_PERMISSIONS = [
  'exams.read', 'attempts.read', 'results.read', 'schedule.read', 'attendance.read',
  'homework.read', 'materials.read', 'doubts.read', 'courses.read', 'announcements.read',
  'leaves.read', 'syllabus.read',
];

function main() {
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\nunknown is not denied — the rule the whole layer rests on');
  // ══════════════════════════════════════════════════════════════════════════

  eq('no modules at all -> unknown, not denied', moduleDecision([], 'exams'), 'unknown');
  eq('undefined modules -> unknown', moduleDecision(undefined, 'exams'), 'unknown');
  eq('no permissions at all -> unknown', permissionDecision([], 'users.read'), 'unknown');
  check('unknown permits', permits('unknown'));
  check('allowed permits', permits('allowed'));
  check('denied does not permit', !permits('denied'));

  // This is the exact shape api-legacy answers with. Every gate must survive it.
  const LEGACY_CONTEXT = { modules: [] as string[], permissions: [] as string[] };
  const allGates = [
    ...ADMIN_NAV_GATES,
    ...TEACHER_NAV_GATES,
    ...STUDENT_NAV_GATES,
    ...APP_MANAGEMENT_GATES,
  ];
  const survivors = visible(LEGACY_CONTEXT, allGates);
  eq(
    `all ${allGates.length} navigation entries survive an api-legacy context`,
    survivors.length,
    allGates.length,
  );

  const featureSurvivors = Object.entries(FEATURE_GATES).filter(
    ([, gate]) => permits(gateDecision(LEGACY_CONTEXT, gate)),
  );
  eq(
    'every feature gate permits under api-legacy',
    featureSurvivors.length,
    Object.keys(FEATURE_GATES).length,
  );

  // ══════════════════════════════════════════════════════════════════════════
  console.log('\nresolved context actually denies');
  // ══════════════════════════════════════════════════════════════════════════

  eq('module present -> allowed', moduleDecision(['exams', 'cbt'], 'exams'), 'allowed');
  eq('module absent -> denied', moduleDecision(['exams', 'cbt'], 'ai'), 'denied');
  eq('permission held -> allowed', permissionDecision(['users.read'], 'users.read'), 'allowed');
  eq('permission not held -> denied', permissionDecision(['users.read'], 'users.delete'), 'denied');

  eq(
    'a gate with a denied module is denied even when the permission is held',
    gateDecision({ modules: ['exams'], permissions: ['ai.generate'] }, {
      module: 'ai',
      anyPermission: ['ai.generate'],
    }),
    'denied',
  );
  eq(
    'a gate with a held module but no permission is denied',
    gateDecision({ modules: ['ai'], permissions: ['exams.read'] }, {
      module: 'ai',
      anyPermission: ['ai.generate'],
    }),
    'denied',
  );

  // ══════════════════════════════════════════════════════════════════════════
  console.log('\ncapability implication mirrors the server');
  // ══════════════════════════════════════════════════════════════════════════

  eq('manage implies read', permissionDecision(['classes.manage'], 'classes.read'), 'allowed');
  eq('create implies read', permissionDecision(['exams.create'], 'exams.read'), 'allowed');
  eq('publish implies read', permissionDecision(['results.publish'], 'results.read'), 'allowed');
  eq('grade implies read', permissionDecision(['attempts.grade'], 'attempts.read'), 'allowed');
  eq(
    'read does NOT imply manage — implication runs one way only',
    permissionDecision(['classes.read'], 'classes.manage'),
    'denied',
  );
  eq(
    'implication does not cross resources',
    permissionDecision(['classes.manage'], 'subjects.read'),
    'denied',
  );

  // ══════════════════════════════════════════════════════════════════════════
  console.log('\nanyPermission, not allPermissions');
  // ══════════════════════════════════════════════════════════════════════════

  eq(
    'one of several is enough for a nav section',
    gateDecision({ modules: ['users'], permissions: ['students.read'] }, {
      module: 'users',
      anyPermission: ['users.read', 'students.read', 'teachers.read'],
    }),
    'allowed',
  );
  eq(
    'permissionsDecision requires ALL of them — the other helper, for actions',
    permissionsDecision(['users.read'], ['users.read', 'users.delete']),
    'denied',
  );

  // ══════════════════════════════════════════════════════════════════════════
  console.log('\nthe registry names only things the server can issue');
  // ══════════════════════════════════════════════════════════════════════════

  const badModules = allGates
    .map((g) => g.module)
    .filter((m): m is string => Boolean(m))
    .filter((m) => !SERVER_MODULES.includes(m));
  eq('every nav gate module exists in the server registry', badModules, []);

  const badPermissions = allGates
    .flatMap((g) => g.anyPermission ?? [])
    .filter((p) => !SERVER_PERMISSIONS.includes(p));
  eq('every nav gate permission exists in the server vocabulary', badPermissions, []);

  const badFeatureModules = (Object.values(FEATURE_GATES) as { module?: string }[])
    .map((g) => g.module)
    .filter((m): m is string => Boolean(m))
    .filter((m) => !SERVER_MODULES.includes(m));
  eq('every feature gate module exists', badFeatureModules, []);

  const badFeaturePermissions = (Object.values(FEATURE_GATES) as { anyPermission?: readonly string[] }[])
    .flatMap((g) => [...(g.anyPermission ?? [])])
    .filter((p) => !SERVER_PERMISSIONS.includes(p));
  eq('every feature gate permission exists', badFeaturePermissions, []);

  const hrefs = allGates.map((g) => g.href);
  eq('no duplicate hrefs in the registry', hrefs.length, new Set(hrefs).size);
  check('gateForHref finds a known entry', gateForHref('/dashboard/admin?tab=users') !== undefined);
  check('gateForHref returns undefined for an ungoverned route', gateForHref('/nope') === undefined);

  // ══════════════════════════════════════════════════════════════════════════
  console.log('\na real student sees their own tabs');
  // ══════════════════════════════════════════════════════════════════════════

  const studentCtx = {
    modules: ['cbt', 'exams', 'results', 'attendance', 'materials'],
    permissions: STUDENT_PERMISSIONS,
  };
  const studentNav = visible(studentCtx, STUDENT_NAV_GATES);
  eq('all four student tabs survive the real student role', studentNav.length, 4);

  // ── What keeps a student out of app-management ───────────────────────────
  // The ROLE does, not these gates: every page under /dashboard/admin is
  // wrapped in `<Protected requiredRole="admin">`, which redirects a student
  // before any of this is composed. Duplicating that as a role check in the
  // registry would put the same rule in two places and let them disagree.
  //
  // What IS asserted here is that the permission gates still narrow correctly
  // on their own terms — a student's twelve read permissions leave the four
  // sections those permissions actually cover, and remove the eight they do
  // not. That is the property the gates are responsible for.
  const studentAdminHrefs = visible(studentCtx, APP_MANAGEMENT_GATES).map((g) => g.href);
  const studentKeeps = ['resources', 'public-tests', 'attendance', 'leaves'];
  const studentLoses = ['users', 'registrations', 'courses', 'batches', 'schedule', 'holidays', 'eod', 'sync'];
  for (const slug of studentKeeps) {
    check(
      `student permissions reach ${slug}`,
      studentAdminHrefs.includes(`/dashboard/admin/app-management/${slug}`),
      studentAdminHrefs.join(', '),
    );
  }
  for (const slug of studentLoses) {
    check(
      `student permissions do NOT reach ${slug}`,
      !studentAdminHrefs.includes(`/dashboard/admin/app-management/${slug}`),
      studentAdminHrefs.join(', '),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  console.log('\na narrow custom role hides what it cannot do');
  // ══════════════════════════════════════════════════════════════════════════

  // Front Desk, verbatim from SYSTEM_ROLE_TEMPLATES.
  const frontDesk = {
    modules: SERVER_MODULES,
    permissions: [
      'students.read', 'students.create', 'students.update',
      'attendance.read', 'attendance.mark',
      'schedule.read', 'announcements.read',
    ],
  };
  const deskNav = visible(frontDesk, APP_MANAGEMENT_GATES).map((g) => g.href);
  check(
    'front desk keeps Users (students.read)',
    deskNav.includes('/dashboard/admin/app-management/users'),
    deskNav.join(', '),
  );
  check(
    'front desk keeps Attendance',
    deskNav.includes('/dashboard/admin/app-management/attendance'),
  );
  check(
    'front desk loses Courses — no courses.read',
    !deskNav.includes('/dashboard/admin/app-management/courses'),
  );
  check(
    'front desk loses Firebase Sync — no org.integrations',
    !deskNav.includes('/dashboard/admin/app-management/sync'),
  );
  check(
    'front desk loses EOD reports — no reports.read',
    !deskNav.includes('/dashboard/admin/app-management/eod'),
  );

  // ══════════════════════════════════════════════════════════════════════════
  console.log('\na restricted PLAN hides what was not bought');
  // ══════════════════════════════════════════════════════════════════════════

  // An admin — every permission — on a plan without AI or question import.
  const noAiPlan = {
    modules: SERVER_MODULES.filter((m) => m !== 'ai' && m !== 'questionImport'),
    permissions: SERVER_PERMISSIONS,
  };
  const teacherNav = visible(noAiPlan, TEACHER_NAV_GATES).map((g) => g.href);
  check(
    'the AI tab is gone despite the user holding ai.generate',
    !teacherNav.includes('/dashboard/teacher?tab=ai'),
    teacherNav.join(', '),
  );
  check(
    'Smart Import is gone despite questions.import',
    !teacherNav.includes('/dashboard/teacher?tab=import'),
  );
  check(
    'Exams survives — a different module entirely',
    teacherNav.includes('/dashboard/teacher?tab=exams'),
  );
  eq(
    'the module is what denied it, so the screen can say "plan", not "role"',
    moduleDecision(noAiPlan.modules, 'ai'),
    'denied',
  );
  eq(
    'and the permission side is NOT what denied it',
    permissionDecision(noAiPlan.permissions, 'ai.generate'),
    'allowed',
  );

  // ══════════════════════════════════════════════════════════════════════════
  console.log('\nsubscription state is a third thing again');
  // ══════════════════════════════════════════════════════════════════════════

  check('absent writable -> writable, like everything else unknown', isWritable(null));
  check('writable true -> writable', isWritable({ writable: true }));
  check('writable false -> read only', !isWritable({ writable: false }));

  // ══════════════════════════════════════════════════════════════════════════
  console.log('\nbranding: defaults are exactly what shipped');
  // ══════════════════════════════════════════════════════════════════════════

  const defaults = brandTokens(null);
  eq('no branding -> the existing sage green', defaults['--brand-primary'], DEFAULT_BRAND.primary);
  eq('no branding -> the existing moss green', defaults['--brand-secondary'], DEFAULT_BRAND.cta);
  eq('no branding -> the existing dark olive', defaults['--brand-accent'], DEFAULT_BRAND.accent);
  eq(
    'the legacy variable names are repointed, so untouched components follow',
    defaults['--sage-green'],
    DEFAULT_BRAND.primary,
  );

  const abc = brandTokens({ primaryColor: '#E8590C', accentColor: '#1B3A5C', secondaryColor: '#FFB020' });
  eq('a configured primary is used', abc['--brand-primary'], '#e8590c');
  eq('a configured accent is used', abc['--brand-accent'], '#1b3a5c');
  eq('legacy names follow the tenant too', abc['--sage-green'], '#e8590c');

  eq('#abc expands', normalizeHex('#abc'), '#aabbcc');
  eq('a bare hex is accepted', normalizeHex('E8590C'), '#e8590c');
  eq('garbage is rejected rather than guessed', normalizeHex('rebeccapurple'), null);
  eq('a partial hex is rejected', normalizeHex('#ab'), null);
  eq('empty is rejected', normalizeHex(''), null);
  eq('an invalid colour falls back rather than breaking the page', brandTokens({ primaryColor: 'nope' })['--brand-primary'], DEFAULT_BRAND.primary);

  check('white on a dark accent', readableOn('#1b3a5c') === '#ffffff');
  check('black on a light primary', readableOn('#ffb020') === '#111111');
  check(
    'a mid-saturation blue still gets white — the case a brightness guess fails',
    readableOn('#2563eb') === '#ffffff',
    readableOn('#2563eb'),
  );
  check('luminance is ordered', luminance('#ffffff') > luminance('#808080'));
  check('luminance floor', Math.abs(luminance('#000000')) < 1e-9);
  eq('shade toward black', shade('#ffffff', -1), '#000000');
  eq('shade toward white', shade('#000000', 1), '#ffffff');
  eq('rgb triplet for alpha compositing', brandTokens({ primaryColor: '#e8590c' })['--brand-primary-rgb'], '232 89 12');

  // ══════════════════════════════════════════════════════════════════════════
  console.log('\nno colour is left undefined');
  // ══════════════════════════════════════════════════════════════════════════
  const partial = brandTokens({ primaryColor: '#e8590c' });
  const undefinedTokens = Object.entries(partial).filter(
    ([, v]) => !v || v === 'undefined' || v.includes('NaN'),
  );
  eq('partial branding still produces a complete token set', undefinedTokens, []);
  eq(
    'the same token names are produced with and without branding',
    Object.keys(partial).sort(),
    Object.keys(defaults).sort(),
  );

  console.log('');
  if (failures) {
    console.error(`TENANT ACCESS CHECKS FAILED — ${failures} of ${checks}.`);
    process.exit(1);
  }
  console.log(`All ${checks} tenant access checks passed.`);
}

main();
