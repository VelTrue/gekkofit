// GekkoFit · все экраны: тема, размер, фильтры, крупный просмотр.
(function () {
  const store = {
    get(key) { try { return localStorage.getItem(key) } catch { return null } },
    set(key, value) { try { localStorage.setItem(key, value) } catch { /* настройка просто не запомнится */ } },
  }

  // тема: подложка страницы, макеты и скриншоты
  function setMode(mode) {
    document.body.dataset.pageMode = mode
    document.querySelectorAll('.screen').forEach((screen) => { screen.dataset.mode = mode })
    document.querySelectorAll('.shot-img img').forEach((img) => { img.src = img.dataset[mode] || img.dataset.dark })
    document.querySelectorAll('[data-mode]').forEach((button) => { if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', String(button.dataset.mode === mode)) })
    store.set('gekko-cabinet-mode', mode)
  }
  function setSize(size) {
    document.body.dataset.size = size
    document.querySelectorAll('[data-size]').forEach((button) => { if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', String(button.dataset.size === size)) })
    store.set('gekko-cabinet-size', size)
  }
  document.querySelectorAll('button[data-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)))
  document.querySelectorAll('button[data-size]').forEach((button) => button.addEventListener('click', () => setSize(button.dataset.size)))
  setMode(new URLSearchParams(location.search).has('light') ? 'light' : store.get('gekko-cabinet-mode') || 'dark')
  setSize(store.get('gekko-cabinet-size') || (document.getElementById('filters') ? 's' : 'm'))

  // фильтры: группа, вкладка, статус, поиск
  const filters = document.getElementById('filters')
  if (filters) {
    const state = { group: '', tab: '', status: '', query: '' }
    const shots = [...document.querySelectorAll('.shot')]
    const groups = [...document.querySelectorAll('.group')]
    const shown = filters.querySelector('.shown')
    function apply() {
      let visible = 0
      const query = state.query.trim().toLowerCase()
      shots.forEach((shot) => {
        const status = state.status === 'bug' ? Number(shot.dataset.bugs) > 0 : !state.status || shot.dataset.status === state.status
        const ok = (!state.group || shot.dataset.group === state.group) && (!state.tab || shot.dataset.tab === state.tab) && status
          && (!query || shot.dataset.search.includes(query) || shot.id.toLowerCase() === query)
        shot.hidden = !ok
        if (ok) visible += 1
      })
      groups.forEach((group) => { group.hidden = !group.querySelector('.shot:not([hidden])') })
      shown.textContent = visible === shots.length ? `Показаны все экраны: ${visible}` : `Показано экранов: ${visible} из ${shots.length}`
    }
    filters.querySelectorAll('.chips').forEach((chips) => chips.addEventListener('click', (event) => {
      const button = event.target.closest('button')
      if (!button) return
      state[chips.dataset.filter] = button.dataset.value
      chips.querySelectorAll('button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)))
      apply()
    }))
    filters.querySelector('input').addEventListener('input', (event) => { state.query = event.target.value; apply() })
    apply()
  }

  // крупный просмотр
  const box = document.querySelector('.lightbox')
  const boxImg = box && box.querySelector('img')
  function closeBox() { box.hidden = true; boxImg.src = '' }
  document.addEventListener('click', (event) => {
    const open = event.target.closest('.shot-img')
    if (open) {
      const mode = document.body.dataset.pageMode === 'light' ? 'fullLight' : 'fullDark'
      boxImg.src = open.dataset[mode] || open.dataset.fullDark
      boxImg.alt = open.getAttribute('aria-label')
      box.hidden = false
      return
    }
    if (box && !box.hidden && (event.target === box || event.target === boxImg || event.target.closest('.lightbox-close'))) closeBox()
  })
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && box && !box.hidden) closeBox() })
})()
