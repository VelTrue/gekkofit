// Снимает скриншоты всех экранов карты с живых экранов (docs/design/cabinet/app), тёмная и светлая тема.
// Сначала: python docs/design/build_app.py   (собирает приложение из origin/main с шагами из states.py)
// Запуск:   npm i --no-save puppeteer-core@23.11.1 && node docs/design/capture/capture.cjs [коды...]
// Результат: docs/design/screens/<dark|light>/<код>.png, для длинных экранов ещё <код>-full.png.
const fs = require('fs')
const path = require('path')
const { pathToFileURL } = require('url')
const puppeteer = require('puppeteer-core')

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const APP = path.join(__dirname, '..', 'cabinet', 'app')
const OUT = path.join(__dirname, '..', 'screens')
const states = JSON.parse(fs.readFileSync(path.join(APP, 'states.json'), 'utf8'))
const FULL = new Set(['A3', 'H3', 'B6', 'E6', 'B7'])
const DESKTOP = /^[A-Z]9$/
const only = process.argv.slice(2)

;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
  const problems = []
  let count = 0
  for (const theme of ['dark', 'light']) {
    fs.mkdirSync(path.join(OUT, theme), { recursive: true })
    for (const code of Object.keys(states)) {
      if (only.length && !only.includes(code)) continue
      if (theme === 'light' && DESKTOP.test(code)) continue
      const page = await browser.newPage()
      page.on('pageerror', (error) => problems.push(`${code}: ${error.message}`))
      await page.setViewport(DESKTOP.test(code) ? { width: 1440, height: 900 } : { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
      const url = `${pathToFileURL(path.join(APP, 'index.html')).href}?state=${code}&theme=${theme}`
      await page.goto(url, { waitUntil: 'load' })
      const ready = await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', { timeout: 30000 }).then(() => true, () => false)
      if (!ready) problems.push(`${code}: не дошёл до состояния`)
      await new Promise((resolve) => setTimeout(resolve, 700))
      await page.screenshot({ path: path.join(OUT, theme, `${code}.png`) })
      if (FULL.has(code)) await page.screenshot({ path: path.join(OUT, theme, `${code}-full.png`), fullPage: true })
      count += 1
      await page.close()
    }
  }
  await browser.close()
  console.log(problems.join('\n') || 'все состояния открылись')
  console.log(count, 'экранов снято')
})()
