export type SandboxPage = 'index' | 'phone-input' | 'region-list' | 'variations' | 'sync-init' | 'async-init';

type NavLink = {
  page: SandboxPage;
  href: string;
  label: string;
};

const NAV_LINKS: readonly NavLink[] = [
  { page: 'index', href: '/', label: 'Index' },
  { page: 'phone-input', href: '/phone-input.html', label: 'PhoneInput' },
  { page: 'region-list', href: '/region-list.html', label: 'RegionList' },
  { page: 'variations', href: '/variations.html', label: 'Variations' },
  { page: 'sync-init', href: '/sync-init.html', label: 'SyncInit' },
  { page: 'async-init', href: '/async-init.html', label: 'AsyncInit' },
];

export function renderNav(active: SandboxPage): void {
  const mount: HTMLElement | null = document.querySelector('#nav-mount');
  if (mount === null) return;

  mount.classList.add('nav');
  mount.replaceChildren();

  for (const link of NAV_LINKS) {
    const anchor: HTMLAnchorElement = document.createElement('a');
    anchor.href = link.href;
    anchor.textContent = link.label;
    anchor.className = 'nav-link';
    if (link.page === active) anchor.classList.add('nav-link--active');
    mount.appendChild(anchor);
  }
}
