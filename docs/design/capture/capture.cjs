// Снимает все экраны живого сайта GekkoFit в тёмной и светлой теме.
// Запуск из корня репозитория:
//   npm i --no-save puppeteer-core@23.11.1
//   node docs/design/capture/capture.cjs [https://gekkofit.vercel.app/]
// Результат: docs/design/screens/<dark|light|desktop>/<имя>.png (build.py переводит их в WebP).
const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer-core')

const SITE = process.argv[2] || 'https://gekkofit.vercel.app/'
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const ROOT = path.join(__dirname, '..', 'screens')
const DEMO = path.join(__dirname, 'demo-backup.json')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const log = []

function makeShooter(page, folder) {
  fs.mkdirSync(folder, { recursive: true })
  return async (name, options = {}) => {
    await sleep(options.wait ?? 700)
    await page.screenshot({ path: path.join(folder, name + '.png'), fullPage: Boolean(options.full) })
    log.push(`shot ${path.basename(folder)}/${name}`)
  }
}

// нажать видимый элемент, в тексте или aria-label которого есть text (без учёта регистра)
async function click(page, text, selector = 'button, summary, a, [role=button]', options = {}) {
  const scope = options.dialog ? 'dialog[open] ' : ''
  const selectors = selector.split(',').map((part) => scope + part.trim()).join(', ')
  const handles = await page.$$(selectors)
  for (const handle of handles) {
    const label = await page.evaluate((el) => `${el.innerText || ''} ${el.getAttribute('aria-label') || ''}`.toLowerCase(), handle)
    if (!label.includes(text.toLowerCase())) continue
    if (options.exact && !label.trim().startsWith(text.toLowerCase())) continue
    const box = await handle.boundingBox()
    if (!box || box.width === 0) continue
    await handle.click()
    await sleep(options.wait ?? 500)
    return true
  }
  log.push(`MISS click "${text}"`)
  return false
}

async function tab(page, icon) {
  const handle = await page.$(`nav button:has(svg[data-icon="${icon}"])`)
  if (!handle) { log.push(`MISS tab ${icon}`); return }
  await handle.click()
  await sleep(900)
}

async function type(page, selector, text) {
  const handle = await page.$(selector)
  if (!handle) { log.push(`MISS input ${selector}`); return }
  await handle.click({ clickCount: 3 })
  await page.keyboard.press('Backspace')
  if (text) await handle.type(text, { delay: 15 })
  await sleep(600)
}

// закрыть только верхнее окно: Esc во вложенном окне закрывает и родительское
async function closeDialog(page) {
  const closed = await page.evaluate(() => {
    const dialog = [...document.querySelectorAll('dialog[open]')].at(-1)
    const button = dialog && dialog.querySelector('.workout-history-close, .workout-dialog-header button')
    if (button) button.click()
    return Boolean(button)
  })
  if (!closed) await page.keyboard.press('Escape')
  await sleep(700)
}

async function newPage(browser, theme, viewport) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  page.on('dialog', (dialog) => dialog.accept())
  page.on('pageerror', (error) => log.push('PAGE ERROR ' + error.message))
  await page.evaluateOnNewDocument((mode) => {
    try { localStorage.setItem('theme-mode', mode); localStorage.setItem('lang', 'ru') } catch { /* ignore */ }
  }, theme)
  await page.setViewport(viewport)
  await page.goto(SITE, { waitUntil: 'networkidle0' })
  await page.waitForSelector('nav button', { timeout: 20000 }).catch(() => log.push('MISS app start'))
  await sleep(1200)
  return { page, context }
}

async function importDemo(page) {
  await tab(page, 'controls')
  const input = await page.waitForSelector('input[type=file]', { timeout: 15000 }).catch(() => null)
  if (!input) { log.push('MISS import input'); return }
  await input.uploadFile(DEMO)
  await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 20000 }).catch(() => log.push('MISS reload after import'))
  await sleep(1500)
}

async function phonePass(browser, theme) {
  const viewport = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
  const { page, context } = await newPage(browser, theme, viewport)
  const shot = makeShooter(page, path.join(ROOT, theme))

  // пустое приложение
  await shot('home')
  await click(page, 'Недавние'); await shot('recent-empty'); await closeDialog(page)
  await tab(page, 'calendar'); await shot('history-empty')
  await tab(page, 'mastery'); await shot('mastery-empty')
  await tab(page, 'controls'); await shot('settings-empty')

  await importDemo(page)
  await tab(page, 'controls'); await shot('settings')
  await tab(page, 'dumbbell')
  await click(page, 'Недавние'); await shot('recent'); await closeDialog(page)

  // тренировка
  await click(page, 'Начать тренировку', 'button', { wait: 1000 }); await shot('workout-empty')
  await click(page, 'Добавить упражнение', 'button', { wait: 1000 }); await shot('picker')
  await click(page, 'Грудь', 'dialog[open] .exercise-groups button', { exact: true }); await shot('picker-group')
  await click(page, 'Все группы', 'dialog[open] .exercise-groups button')
  await type(page, 'dialog[open] input[type=search]', 'жим'); await shot('picker-search')
  await type(page, 'dialog[open] input[type=search]', 'йцукен'); await shot('picker-nothing')
  await type(page, 'dialog[open] input[type=search]', '')
  const help = await page.$('dialog[open] .exercise-help')
  if (help) {
    await help.tap(); await sleep(500)
    const openAfterTap = await page.$('dialog[open] .exercise-alternative-popover')
    log.push(`NOTE tap on "?" leaves alternatives ${openAfterTap ? 'open' : 'CLOSED'}`)
    const holder = await page.$('dialog[open] .exercise-alternatives')
    await holder.hover(); await shot('picker-alternatives')
    await page.mouse.move(2, 2)
    await page.evaluate(() => document.activeElement && document.activeElement.blur()); await sleep(300)
  } else log.push('MISS help')
  const info = await page.$('dialog[open] .exercise-info')
  if (info) {
    await info.click(); await shot('exercise-about')
    if (await click(page, 'Если оборудование занято', 'button', { dialog: true })) await shot('exercise-about-alternatives')
    await closeDialog(page)
  } else log.push('MISS info')
  await type(page, 'dialog[open] input[type=search]', 'жим штанги лежа')
  await click(page, 'Жим штанги лежа', 'dialog[open] .exercise-select', { wait: 1200 })
  await shot('card')
  await shot('card-full', { full: true })
  if (await click(page, 'Показать мышцы', 'button')) { await shot('card-muscles'); await click(page, 'Показать упражнение', 'button') }
  await click(page, 'Добавить подход', 'button', { wait: 900 }); await shot('set-new')
  await type(page, 'input[aria-label="Вес, подход 1"]', '-5')
  await page.keyboard.press('Enter'); await shot('set-error')
  await type(page, 'input[aria-label="Вес, подход 1"]', '62.5')
  await click(page, 'Завершить подход 1', 'button', { wait: 1200 }); await shot('set-done-rest')
  await click(page, 'История', '.workout-exercise-shortcuts button'); await shot('exercise-history')
  if (await click(page, 'Вся история', 'button', { dialog: true })) await shot('exercise-history-all')
  await closeDialog(page)
  await click(page, 'Заменить', '.workout-exercise-shortcuts button', { wait: 1000 }); await shot('replace')
  await click(page, 'Жим гантелей лежа', 'dialog[open] .exercise-select', { wait: 900 }); await shot('replace-confirm')
  await closeDialog(page)
  await closeDialog(page)

  // второе упражнение: кардио
  await click(page, 'Добавить упражнение', 'button', { wait: 1000 })
  await type(page, 'dialog[open] input[type=search]', 'беговой дорожке')
  await click(page, 'Бег на беговой дорожке', 'dialog[open] .exercise-select', { wait: 1200 })
  await click(page, 'Добавить подход', 'button', { wait: 900 })
  const cardioInputs = await page.$$('.workout-set-cardio input')
  const values = ['3', '2', '20', '6']
  for (let index = 0; index < Math.min(4, cardioInputs.length); index += 1) {
    await cardioInputs[index].click({ clickCount: 3 }); await page.keyboard.press('Backspace'); await cardioInputs[index].type(values[index])
  }
  await click(page, 'Сохранить', '.workout-set-cardio button', { wait: 900 })
  await shot('cardio')
  await click(page, 'Добавленные', 'button'); await shot('added'); await closeDialog(page)

  // режим «Список»
  await page.select('select[aria-label="Вид тренировки"]', 'list').catch(() => log.push('MISS view select'))
  await sleep(800); await shot('list'); await shot('list-full', { full: true })
  if (await click(page, 'Редактировать упражнение', 'button', { wait: 900 })) { await shot('list-edit'); await closeDialog(page) }
  await page.select('select[aria-label="Вид тренировки"]', 'cards').catch(() => {})
  await sleep(600)
  await page.evaluate(() => window.scrollTo(0, 0))

  // подтверждения и правка названия
  if (await click(page, 'Изменить название тренировки', 'button')) { await shot('rename'); await page.keyboard.press('Escape'); await sleep(400) }
  if (await click(page, 'Удалить подход 1', 'button')) { await shot('delete-set'); await closeDialog(page) }
  if (await click(page, 'Удалить упражнение', 'button')) { await shot('remove-exercise'); await closeDialog(page) }
  if (await click(page, 'Завершить тренировку', 'button')) { await shot('finish-confirm'); await closeDialog(page) }
  if (await click(page, 'Удалить тренировку', 'button')) { await shot('discard-confirm'); await click(page, 'Удалить', 'dialog[open] .workout-confirm button', { wait: 1500 }) }

  // история
  await tab(page, 'calendar'); await shot('history'); await shot('history-full', { full: true })
  await click(page, 'Календарь', 'button'); await shot('history-calendar')
  if (await click(page, '6 ноября', '.history-calendar button')) await shot('history-day')
  await click(page, 'Список', 'button')
  await click(page, 'Грудь и трицепс', '.history-card', { wait: 1000 }); await shot('history-detail'); await shot('history-detail-full', { full: true })
  if (await click(page, 'Удалить тренировку', 'button')) { await shot('history-delete'); await closeDialog(page) }
  await click(page, 'Назад к истории', 'button')

  // мастерство
  await tab(page, 'mastery'); await shot('mastery'); await shot('mastery-full', { full: true })
  await click(page, 'Все упражнения', '.mastery-filters button'); await shot('mastery-all')
  await page.select('.mastery-level-filter select', 'level-5').catch(() => log.push('MISS level select'))
  await shot('mastery-level')
  await page.select('.mastery-level-filter select', '').catch(() => {})
  await type(page, '.mastery-search input', 'йцукен'); await shot('mastery-nothing')
  await type(page, '.mastery-search input', '')
  await click(page, 'Открытые', '.mastery-filters button')
  await click(page, 'Жим штанги лежа', '.mastery-grid button', { wait: 1000 }); await shot('badge')
  if (await click(page, 'Подробнее и рекорды', 'summary')) await shot('badge-records')
  if (await click(page, 'Открыть упражнение', 'button', { wait: 900 })) await shot('badge-exercise')
  await closeDialog(page)
  await context.close()
}

async function desktopPass(browser) {
  const { page, context } = await newPage(browser, 'dark', { width: 1440, height: 900, deviceScaleFactor: 1 })
  const shot = makeShooter(page, path.join(ROOT, 'desktop'))
  await importDemo(page)
  await tab(page, 'dumbbell'); await shot('home')
  await click(page, 'Начать тренировку', 'button', { wait: 1000 }); await shot('workout-empty')
  await click(page, 'Добавить упражнение', 'button', { wait: 1000 })
  await type(page, 'dialog[open] input[type=search]', 'жим штанги лежа')
  await click(page, 'Жим штанги лежа', 'dialog[open] .exercise-select', { wait: 1200 }); await shot('card')
  await tab(page, 'calendar'); await shot('history')
  await tab(page, 'mastery'); await shot('mastery')
  await tab(page, 'controls'); await shot('settings')
  await context.close()
}

;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
  try {
    for (const theme of ['dark', 'light']) await phonePass(browser, theme)
    await desktopPass(browser)
  } finally {
    await browser.close()
    console.log(log.filter((line) => !line.startsWith('shot')).join('\n') || 'all steps ok')
    console.log(log.filter((line) => line.startsWith('shot')).length, 'screenshots')
  }
})()
