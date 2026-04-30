import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

function decorateSocialLinks(root) {
  const links = [...root.querySelectorAll('a[href]')];
  links.forEach((link) => {
    const href = (link.getAttribute('href') || '').toLowerCase();
    if (!href.includes('instagram') && !href.includes('facebook')) return;

    link.classList.add('social-link');
    const label = link.textContent.trim();
    const isInstagram = href.includes('instagram');
    const icon = isInstagram
      ? '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"></rect><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"></circle><circle cx="17.1" cy="6.9" r="1.2" fill="currentColor"></circle></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M14 8.5h2.2V6H14c-2.1 0-3.8 1.7-3.8 3.8V12H8v2.5h2.2V20h2.6v-5.5H15l.4-2.5h-2.6V10c0-.8.4-1.5 1.2-1.5Z" fill="currentColor"></path></svg>';

    link.innerHTML = `<span class="social-icon" aria-hidden="true">${icon}</span><span class="social-label">${label}</span>`;
  });
}

export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta
    ? new URL(footerMeta, window.location).pathname
    : '/footer';

  const fragment = await loadFragment(footerPath);
  block.textContent = '';

  const cols = fragment ? [...fragment.children] : [];
  const content = cols
    .map((col) => {
      const section = document.createElement('section');
      section.innerHTML = col.innerHTML;
      return section.outerHTML;
    })
    .join('');

  block.innerHTML = `
    <div class="site-footer">
      <div class="footer-inner">${content}</div>
    </div>
  `;

  decorateSocialLinks(block);
}