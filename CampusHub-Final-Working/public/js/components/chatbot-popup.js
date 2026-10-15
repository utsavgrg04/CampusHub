const launcher = document.querySelector('.chatbot-launcher');
const popup = document.querySelector('#chatbot-popover');
const closeButton = popup?.querySelector('.chatbot-close');

if (launcher && popup && closeButton) {
  const close = () => {
    popup.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    if (!launcher.hidden) launcher.focus();
  };

  launcher.addEventListener('click', () => {
    popup.hidden = !popup.hidden;
    const isOpen = !popup.hidden;
    launcher.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) closeButton.focus();
  });

  closeButton.addEventListener('click', close);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !popup.hidden) close();
  });

  new MutationObserver(() => {
    if (launcher.hidden && !popup.hidden) {
      popup.hidden = true;
      launcher.setAttribute('aria-expanded', 'false');
    }
  }).observe(launcher, { attributes: true, attributeFilter: ['hidden'] });
}
