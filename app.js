const menu = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('#mobile-nav');
function closeMenu() { menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Open menu'); mobileNav.hidden = true; }
menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); mobileNav.hidden = !open; });
mobileNav.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
matchMedia('(min-width:601px)').addEventListener('change', e => { if(e.matches) closeMenu(); });
// Only the first answer starts expanded, on every screen size.
document.querySelectorAll('.faq details').forEach((item, index) => { item.open = index === 0; });
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }); }, { threshold: .08 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  document.documentElement.classList.add('js-motion');
}
const form = document.querySelector('#contact-form');
const dialog = document.querySelector('#brief-dialog');
const preview = document.querySelector('#brief-preview');
const status = document.querySelector('#form-status');
let brief = '';
form.addEventListener('submit', async e => {
  e.preventDefault();
  const data = new FormData(form);
  brief = `YARSY project enquiry\n\nFull name: ${data.get('name')}\nWork email: ${data.get('email')}\n\nYour Situation:\n${data.get('situation')}`;
  const config = window.YARSY_CONFIG || {};
  if (config.formEndpoint) {
    const button = form.querySelector('button[type=submit]'); button.disabled = true; status.textContent = 'Sending your enquiry…';
    try { const response = await fetch(config.formEndpoint, { method:'POST', body:data, headers:{Accept:'application/json'} }); if(!response.ok) throw new Error('Request failed'); status.textContent = 'Thank you. Your enquiry has been sent.'; form.reset(); }
    catch { status.textContent = 'Your enquiry could not be sent. Your brief is saved below so you can copy or download it.'; preview.value = brief; dialog.showModal(); }
    finally { button.disabled = false; }
  } else if (config.contactEmail) {
    window.location.href = `mailto:${encodeURIComponent(config.contactEmail)}?subject=${encodeURIComponent('Real estate project — execution support')}&body=${encodeURIComponent(brief)}`;
    status.textContent = 'Your email app will open with the prepared enquiry. Send it from there.';
  } else { preview.value = brief; document.querySelector('#brief-status').textContent = ''; dialog.showModal(); }
});
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => { if(e.target === dialog){ const r=dialog.getBoundingClientRect(); if(e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom) dialog.close(); } });
document.querySelector('#copy-brief').addEventListener('click', async () => { try { await navigator.clipboard.writeText(brief); document.querySelector('#brief-status').textContent = 'Brief copied. No enquiry has been sent yet.'; } catch { preview.focus(); preview.select(); document.querySelector('#brief-status').textContent = 'Select and copy the brief above.'; } });
document.querySelector('#download-brief').addEventListener('click', () => { const url = URL.createObjectURL(new Blob([brief], {type:'text/plain;charset=utf-8'})); const a = document.createElement('a'); a.href=url; a.download='yarsy-project-brief.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
