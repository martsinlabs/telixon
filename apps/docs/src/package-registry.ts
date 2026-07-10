// Single source of truth for the package ecosystem shown across the docs UI.
// astro.config.mjs derives sidebar groups from it; PackageSidebar.astro derives the switcher.
// Adding a package here (plus its content folder) is the whole registration step.
//
// Versioning contract: latest docs live at the package root; an archived major is a frozen copy
// in a version subfolder, registered via a future `archivedMajors` field. Sidebar groups must not
// autogenerate from a package root, or they would swallow version subfolders.

export interface DocsPackage {
  /** npm package name; doubles as the sidebar group label, matched exactly by the switcher. */
  readonly name: string;
  /** Display name shown in the package switcher. */
  readonly label: string;
  /** URL base of the package's docs tree; absent while the package is planned and has no docs. */
  readonly base?: string;
  /** Official framework mark for planned rows; available rows use the gem. */
  readonly logo?: 'angular' | 'react' | 'vue' | 'stencil';
}

export const PACKAGES: readonly DocsPackage[] = [
  { base: 'core', name: '@telixon/core', label: 'Core' },
  { base: 'web-sdk', name: '@telixon/web-sdk', label: 'Web SDK' },
  { name: '@telixon/web-anatomy', label: 'Web Anatomy' },
  { name: '@telixon/web-theme', label: 'Web Theme' },
  { name: '@telixon/web-components', label: 'Web Components', logo: 'stencil' },
  { name: '@telixon/angular', label: 'Angular', logo: 'angular' },
  { name: '@telixon/react', label: 'React', logo: 'react' },
  { name: '@telixon/vue', label: 'Vue', logo: 'vue' },
];

export type AvailablePackage = DocsPackage & { readonly base: string };

export const AVAILABLE_PACKAGES: readonly AvailablePackage[] = PACKAGES.filter(
  (pkg): pkg is AvailablePackage => pkg.base !== undefined,
);

export const PLANNED_PACKAGES: readonly DocsPackage[] = PACKAGES.filter((pkg) => pkg.base === undefined);

// The package owning a docs URL path: longest match wins on the first path segment, so future
// versioned trees ("angular/v18/...") and new packages resolve without touching this logic.
export function packageForPath(path: string): AvailablePackage {
  const trimmed = path.replace(/^\/+|\/+$/g, '');
  const owner = AVAILABLE_PACKAGES.find((pkg) => trimmed === pkg.base || trimmed.startsWith(pkg.base + '/'));
  return owner ?? AVAILABLE_PACKAGES[0]!;
}
