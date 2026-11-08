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

// ===== живые экраны: настоящее приложение в состоянии экрана (app/index.html?state=КОД)
;(function () {
  const DESKTOP = /^[A-Z]9$/
  const mode = () => (document.body.dataset.pageMode === 'light' ? 'light' : 'dark')
  // не больше двух живых экранов загружаются одновременно, иначе шаги не успевают
  const queue = []
  let loading = 0
  function pump() {
    while (loading < 2 && queue.length) {
      const [iframe, src] = queue.shift()
      if (!iframe.isConnected) continue
      loading += 1
      let done = false
      const finish = () => { if (done) return; done = true; loading -= 1; pump() }
      iframe.addEventListener('load', () => setTimeout(finish, 6000), { once: true })
      window.addEventListener('message', function onReady(event) {
        if (event.source === iframe.contentWindow && event.data && event.data.gekkoReady) { window.removeEventListener('message', onReady); finish() }
      })
      iframe.src = src
    }
  }
  function enqueue(iframe, src) { queue.push([iframe, src]); setTimeout(pump, 0) }
  function fit(frame) {
    const iframe = frame.querySelector('iframe')
    const scale = frame.clientWidth / Number(iframe.width)
    iframe.style.transform = `scale(${scale})`
    const bars = frame.classList.contains('phone') ? 30 + 18 : 0  // строка статуса сверху и отступ снизу, как у телефона
    frame.style.height = `${Number(iframe.height) * scale + bars}px`
  }
  function goLive(shot) {
    const button = shot.querySelector('.live-on')
    if (!button || shot.classList.contains('is-live')) return
    const code = button.dataset.live
    const desktop = DESKTOP.test(code)
    const device = shot.querySelector('.device')
    const frame = document.createElement('div')
    frame.className = desktop ? 'live-frame' : 'live-frame phone'
    if (!desktop) frame.innerHTML = '<div class="live-status" aria-hidden="true"><span>9:41</span><span>▮▮▮</span></div>'
    const iframe = document.createElement('iframe')
    iframe.title = `Живой экран ${code}`
    iframe.width = desktop ? 1440 : 390
    iframe.height = desktop ? 900 : 844
    frame.append(iframe)
    enqueue(iframe, `app/index.html?state=${code}&theme=${mode()}`)
    device.querySelector('.shot-img').hidden = true
    device.append(frame)
    shot.classList.add('is-live')
    shot.querySelector('.live-on').hidden = true
    shot.querySelector('.live-reset').hidden = false
    shot.querySelector('.live-off').hidden = false
    requestAnimationFrame(() => fit(frame))
  }
  function goStatic(shot) {
    shot.querySelector('.live-frame')?.remove()
    shot.querySelector('.shot-img').hidden = false
    shot.classList.remove('is-live')
    shot.querySelector('.live-on').hidden = false
    shot.querySelector('.live-reset').hidden = true
    shot.querySelector('.live-off').hidden = true
  }
  function reload(shot) {
    const iframe = shot.querySelector('.live-frame iframe')
    if (iframe) iframe.src = iframe.src.replace(/theme=\w+/, `theme=${mode()}`).replace(/&r=\d+/, '') + `&r=${Date.now()}`
  }
  document.addEventListener('click', (event) => {
    const shot = event.target.closest('.shot')
    if (event.target.closest('.live-on')) goLive(shot)
    else if (event.target.closest('.live-off')) goStatic(shot)
    else if (event.target.closest('.live-reset')) reload(shot)
    else if (event.target.closest('.live-group')) event.target.closest('.group').querySelectorAll('.shot:not([hidden])').forEach(goLive)
    else if (event.target.closest('button[data-mode]')) setTimeout(() => document.querySelectorAll('.shot.is-live').forEach(reload), 0)
    else if (event.target.closest('button[data-size]')) setTimeout(() => document.querySelectorAll('.live-frame').forEach(fit), 50)
  })
  window.addEventListener('resize', () => document.querySelectorAll('.live-frame').forEach(fit))
  if (document.body.classList.contains('group-page')) document.querySelectorAll('.shot').forEach(goLive)
})()
