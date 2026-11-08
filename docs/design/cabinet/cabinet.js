// GekkoFit · макеты по группам: тема для всех экранов и переходы по нажатию на кнопки.
(function () {
  const KEY = 'gekko-cabinet-mode';
  function read() {
    if (new URLSearchParams(location.search).has('light')) return 'light';
    try { return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'; } catch { return 'dark'; }
  }
  function set(mode) {
    document.body.dataset.pageMode = mode;
    document.querySelectorAll('.screen').forEach((screen) => { screen.dataset.mode = mode; });
    document.querySelectorAll('.board-tools [data-mode]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    try { localStorage.setItem(KEY, mode); } catch { /* тема просто не запомнится */ }
  }
  document.querySelectorAll('.board-tools [data-mode]').forEach((button) => button.addEventListener('click', () => set(button.dataset.mode)));
  set(read());

  // кнопка внутри макета ведёт к экрану, указанному в data-href (тот же или другой сценарий)
  document.addEventListener('click', (event) => {
    const target = event.target.closest('.screen [data-href]');
    if (target) location.href = target.dataset.href;
  });
})();
