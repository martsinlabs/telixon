// Single source of truth for the package ecosystem shown across the docs UI.
// astro.config.mjs derives sidebar groups from it; PackageSidebar.astro derives the switcher.
// Adding a package here (plus its content folder) is the whole registration step.
//
// Versioning contract: the latest line lives at the package root; an earlier line is a frozen copy
// of its docs in a version subfolder, registered under `archivedLines`. Sidebar groups must not
// autogenerate from a package root, or they would swallow the version subfolders.

/** One sidebar entry: a page slug, or a labeled group of page slugs. */
export type SidebarEntry = string | { readonly label: string; readonly items: readonly string[] };

/** An earlier major line of a package, kept as a frozen copy of its docs. */
export interface DocsLine {
  /** The major version the line carries. */
  readonly major: number;
  /** URL base of the frozen tree, such as `angular/v21`. */
  readonly base: string;
  /** The line's sidebar, with slugs under its base. */
  readonly sidebar: readonly SidebarEntry[];
}

/** The major lines of a package, present once an earlier line is kept beside the latest. */
export interface DocsLines {
  /** The major version of the latest line, which lives at the package root. */
  readonly latest: number;
  /** Earlier lines, newest first, each with its own docs tree. */
  readonly archived: readonly DocsLine[];
}

export interface DocsPackage {
  /** npm package name; doubles as the sidebar group label, matched exactly by the switcher. */
  readonly name: string;
  /** Display name shown in the package switcher. */
  readonly label: string;
  /** URL base of the package's docs tree; absent while the package is planned and has no docs. */
  readonly base?: string;
  /** The package's sidebar: page slugs or labeled groups of slugs; a single root page when absent. */
  readonly sidebar?: readonly SidebarEntry[];
  /** Official framework mark shown in the switcher. The gem stands in where none is set. */
  readonly logo?: 'angular' | 'react' | 'vue' | 'stencil';
  /** The package's major lines, set once an earlier line is kept. */
  readonly lines?: DocsLines;
}

// A frozen Angular line keeps these pages under its base.
function angularLine(major: number): DocsLine {
  const base = `angular/v${major}`;
  return {
    major,
    base,
    sidebar: [
      base,
      {
        label: 'Guides',
        items: [`${base}/guides/phone-field`, `${base}/guides/region-picker`, `${base}/guides/material`],
      },
      {
        label: 'Reference',
        items: [`${base}/phone-input`, `${base}/region-picker`, `${base}/flag`, `${base}/provide-telixon`],
      },
    ],
  };
}

export const PACKAGES: readonly DocsPackage[] = [
  {
    base: 'core',
    name: '@telixon/core',
    label: 'Core',
    sidebar: [
      'core',
      'core/how-it-works',
      'core/load-the-engine',
      {
        label: 'Guides',
        items: [
          'core/guides/validate-a-phone-number',
          'core/guides/build-a-phone-input',
          'core/guides/build-a-region-selector',
        ],
      },
      {
        label: 'Reference',
        items: [
          'core/reference/parse-phone-number',
          'core/reference/phone-number',
          'core/reference/match-phone-numbers',
          'core/reference/validation-error',
          'core/reference/input-controller',
          'core/reference/region-data',
        ],
      },
      'verified',
    ],
  },
  {
    base: 'web-sdk',
    name: '@telixon/web-sdk',
    label: 'Web SDK',
    sidebar: [
      'web-sdk',
      {
        label: 'Guides',
        items: ['web-sdk/guides/phone-field', 'web-sdk/guides/region-picker', 'web-sdk/guides/complete-field'],
      },
      {
        label: 'Reference',
        items: ['web-sdk/phone-input', 'web-sdk/region-list', 'web-sdk/region-picker', 'web-sdk/flags'],
      },
    ],
  },
  { name: '@telixon/web-components', label: 'Web Components', logo: 'stencil' },
  {
    base: 'angular',
    name: '@telixon/angular',
    label: 'Angular',
    logo: 'angular',
    lines: { latest: 22, archived: [angularLine(21), angularLine(20)] },
    sidebar: [
      'angular',
      {
        label: 'Guides',
        items: [
          'angular/guides/phone-field',
          'angular/guides/region-picker',
          'angular/guides/signal-forms',
          'angular/guides/material',
        ],
      },
      {
        label: 'Reference',
        items: [
          'angular/phone-input',
          'angular/phone-field',
          'angular/region-picker',
          'angular/flag',
          'angular/provide-telixon',
        ],
      },
    ],
  },
  { name: '@telixon/react', label: 'React', logo: 'react' },
  { name: '@telixon/vue', label: 'Vue', logo: 'vue' },
];

export type AvailablePackage = DocsPackage & { readonly base: string };

export const AVAILABLE_PACKAGES: readonly AvailablePackage[] = PACKAGES.filter(
  (pkg): pkg is AvailablePackage => pkg.base !== undefined,
);

export const PLANNED_PACKAGES: readonly DocsPackage[] = PACKAGES.filter((pkg) => pkg.base === undefined);

function trimSlashes(path: string): string {
  return path.replace(/^\/+|\/+$/g, '');
}

function startsUnder(slug: string, base: string): boolean {
  return slug === base || slug.startsWith(base + '/');
}

// The package owning a docs URL path, matched on its first path segment, which covers the version
// subfolders as well.
export function packageForPath(path: string): AvailablePackage {
  const slug = trimSlashes(path);
  const owner = AVAILABLE_PACKAGES.find((pkg) => startsUnder(slug, pkg.base));
  return owner ?? AVAILABLE_PACKAGES[0]!;
}

/** The archived line a docs URL path sits in, or `null` on the latest line. */
export function archivedLineForPath(lines: DocsLines, path: string): DocsLine | null {
  const slug = trimSlashes(path);
  return lines.archived.find((line) => startsUnder(slug, line.base)) ?? null;
}

/** The sidebar group label of a line, which astro.config.mjs and PackageSidebar share. */
export function groupLabel(pkg: AvailablePackage, line: DocsLine | null): string {
  return line === null ? pkg.name : `${pkg.name}@${line.major}`;
}

/** Every page slug of a sidebar, in order. */
export function sidebarSlugs(sidebar: readonly SidebarEntry[]): readonly string[] {
  return sidebar.flatMap((entry) => (typeof entry === 'string' ? [entry] : entry.items));
}

/**
 * Where a page lives on another line: the same page when that line has it, otherwise the line's
 * root. `currentBase` is the base of the line the path sits in.
 */
export function pathOnLine(path: string, currentBase: string, target: Pick<DocsLine, 'base' | 'sidebar'>): string {
  const slug = trimSlashes(path);
  const tail = slug === currentBase ? '' : slug.slice(currentBase.length + 1);
  const candidate = tail === '' ? target.base : `${target.base}/${tail}`;
  return `/${sidebarSlugs(target.sidebar).includes(candidate) ? candidate : target.base}/`;
}
