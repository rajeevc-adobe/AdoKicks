export default function decorate(block) {
  const rows = [...block.children];
  block.innerHTML = `
    <div class="benefits-grid">
      ${rows.map((row) => {
        const cells = [...row.children];
        const iconEl  = cells[0]?.querySelector('img');
        const iconSrc = iconEl?.src || cells[0]?.querySelector('a')?.href || cells[0]?.textContent?.trim() || '';
        const title = cells[1]?.textContent?.trim() || '';
        const desc  = cells[2]?.textContent?.trim() || '';
        return `
          <article class="benefit-card">
            <div class="benefit-icon" aria-hidden="true">
              ${iconSrc ? `<img src="${iconSrc}" alt="" width="44" height="44" loading="lazy">` : ''}
            </div>
            <div class="benefit-body">
              <h3>${title}</h3>
              <p>${desc}</p>
            </div>
          </article>`;
      }).join('')}
    </div>`;
}