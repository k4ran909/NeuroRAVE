class Strudel extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    setTimeout(() => {
      const code = this.getAttribute('code') || (this.innerHTML + '').replace('<!--', '').replace('-->', '').trim();
      const iframe = document.createElement('iframe');
      const base = this.getAttribute('base') || '';
      const src = `${base}/#${encodeURIComponent(btoa(code))}`;
      iframe.setAttribute('src', src);
      iframe.setAttribute('width', '600');
      iframe.setAttribute('height', '400');
      this.appendChild(iframe);
    });
  }
}
customElements.define('strudel-repl', Strudel);
