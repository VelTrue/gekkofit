// Живой экран для карты: настоящее приложение GekkoFit в нужном состоянии.
// Параметры адреса: ?state=<код экрана>&theme=dark|light
// Каждый экран получает свою базу IndexedDB и свои ключи localStorage, при каждом открытии
// база пересоздаётся с демо-данными, затем выполняются шаги до нужного состояния.
import states from './states.json'
import demo from './demo-backup.json'

type Step = [string, ...Array<string | number>]
interface StateDef { steps: Step[]; data?: 'demo' | 'empty' }

const params = new URLSearchParams(location.search)
const code = params.get('state') || 'A1'
const theme = params.get('theme') === 'light' ? 'light' : 'dark'
const scope = `gekko-map-${code}`

// отдельные ключи localStorage для каждого экрана
const storage = window.localStorage
const proto = Object.getPrototypeOf(storage) as Storage
const getItem = proto.getItem, setItem = proto.setItem, removeItem = proto.removeItem
proto.getItem = function (key: string) { return getItem.call(this, `${scope}:${key}`) }
proto.setItem = function (key: string, value: string) { setItem.call(this, `${scope}:${key}`, value) }
proto.removeItem = function (key: string) { removeItem.call(this, `${scope}:${key}`) }
for (const key of Object.keys(storage)) if (key.startsWith(`${scope}:`)) removeItem.call(storage, key)
storage.setItem('theme-mode', theme)
storage.setItem('lang', 'ru')
;(globalThis as unknown as { __GEKKO_DB__: string }).__GEKKO_DB__ = scope

// своя история переходов у каждого живого экрана: окна приложения закрываются через history.back(),
// а у iframe на странице карты история общая, и «назад» в одном экране закрыло бы окно в соседнем
{
  const stack: unknown[] = [null]
  let index = 0
  const fire = () => setTimeout(() => window.dispatchEvent(new PopStateEvent('popstate', { state: stack[index] })), 0)
  Object.defineProperty(history, 'state', { configurable: true, get: () => stack[index] })
  history.pushState = (state: unknown) => { stack.splice(index + 1); stack.push(state); index += 1 }
  history.replaceState = (state: unknown) => { stack[index] = state }
  history.go = (delta = 0) => {
    const next = Math.max(0, Math.min(stack.length - 1, index + delta))
    if (next === index) return
    index = next
    fire()
  }
  history.back = () => history.go(-1)
  history.forward = () => history.go(1)
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitFor<T>(find: () => T | null | undefined, timeout = 12000): Promise<T | null> {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    const found = find()
    if (found) return found
    await sleep(60)
  }
  return null
}

function visible(element: Element) {
  const box = element.getBoundingClientRect()
  return box.width > 0 && box.height > 0
}

function byText(text: string, selector = 'button, summary, a, [role=button]', dialogOnly = false): HTMLElement | null {
  const needle = text.toLowerCase()
  const scopeSel = dialogOnly ? selector.split(',').map((part) => `dialog[open] ${part.trim()}`).join(', ') : selector
  const items = [...document.querySelectorAll<HTMLElement>(scopeSel)].filter(visible)
  return items.find((el) => `${el.innerText} ${el.getAttribute('aria-label') ?? ''}`.toLowerCase().includes(needle)) ?? null
}

function setValue(input: HTMLInputElement | HTMLSelectElement, value: string) {
  const proto = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(input, value)
  input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
}

function closeTopDialog() {
  const dialog = [...document.querySelectorAll('dialog[open]')].at(-1)
  dialog?.querySelector<HTMLElement>('.workout-history-close, .workout-dialog-header button')?.click()
}

async function run(steps: Step[]) {
  for (const [action, ...args] of steps) {
    const [a, b] = args as string[]
    if (action === 'click') (await waitFor(() => byText(a, b || undefined)))?.click()
    else if (action === 'clickIn') (await waitFor(() => byText(a, b, true)))?.click()
    else if (action === 'clickSel') (await waitFor(() => document.querySelector<HTMLElement>(a)))?.click()
    else if (action === 'tab') (await waitFor(() => document.querySelector<HTMLElement>(`nav button:has(svg[data-icon="${a}"])`)))?.click()
    else if (action === 'type') { const input = await waitFor(() => document.querySelector<HTMLInputElement>(a)); if (input) { input.focus(); setValue(input, b) } }
    else if (action === 'select') { const select = await waitFor(() => document.querySelector<HTMLSelectElement>(a)); if (select) setValue(select, b) }
    else if (action === 'hover') (await waitFor(() => document.querySelector(a)))?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    else if (action === 'submit') (await waitFor(() => document.querySelector<HTMLInputElement>(a)))?.form?.requestSubmit()
    else if (action === 'close') closeTopDialog()
    else if (action === 'wait') await sleep(Number(a))
    else if (action === 'top') window.scrollTo(0, 0)
    await sleep(action === 'wait' ? 0 : 260)
  }
}

async function start() {
  await new Promise<void>((resolve) => { const request = indexedDB.deleteDatabase(scope); request.onsuccess = request.onerror = request.onblocked = () => resolve() })
  const def = ((states as Record<string, StateDef>)[code]) ?? { steps: [] }
  const [{ db }, { initExerciseCatalog }, backup] = await Promise.all([import('../src/db/schema'), import('../src/db/seedExercises'), import('../src/data-layer/backup')])
  await initExerciseCatalog(db)
  if (def.data !== 'empty') await backup.importData(db, backup.parseBackup(JSON.stringify(demo)))
  await import('./render')
  await waitFor(() => document.querySelector('nav button'), 8000)
  await sleep(300)
  await run(def.steps)
  document.documentElement.dataset.ready = 'true'
  window.parent.postMessage({ gekkoReady: code }, '*')
}

void start()
