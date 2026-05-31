export type SandboxPage = 'index' | 'phone-input' | 'country-list' | 'variations';

type NavLink = {
  page: SandboxPage;
  href: string;
  label: string;
};

const NAV_LINKS: readonly NavLink[] = [
  { page: 'index', href: '/', label: 'Index' },
  { page: 'phone-input', href: '/phone-input.html', label: 'PhoneInput' },
  { page: 'country-list', href: '/country-list.html', label: 'CountryList' },
  { page: 'variations', href: '/variations.html', label: 'Variations' },
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
