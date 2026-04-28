import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta
    ? new URL(footerMeta, window.location).pathname
    : '/footer';

  const fragment = await loadFragment(footerPath);

  block.textContent = '';

  // The /footer DA doc renders as sections — one section per column
  const cols = fragment ? [...fragment.children] : [];

  block.innerHTML = `
    <div class="footer-inner">
      <div class="footer-col footer-brand-col">
        <a href="/" class="footer-brand-link">
          <img src="/icons/adokicks.png" alt="Adokicks" width="32" height="32" loading="lazy">
          <span>Adokicks</span>
        </a>
        <p>Premium sneaker studio. Built for motion.</p>
      </div>
      ${cols.map((col) => `<div class="footer-col">${col.innerHTML}</div>`).join('')}
    </div>
    <div class="footer-bottom">
      <p>© ${new Date().getFullYear()} Adokicks. All rights reserved.</p>
    </div>`;
}