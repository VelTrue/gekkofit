# Research: трекер тренировок - простота, дизайн, разработка

> Собрано на основе реальных примеров (GitHub, действующие сервисы, UX-разборы). Дата: 2026-09-04.

---

## 1. Простота и удобство

Цель: человек должен разобраться без инструкции и залогировать первый подход за считаные секунды, часто одной рукой между подходами.

### 1.1 Ввод данных (вес / повторения / подход)

**Автоподстановка предыдущего подхода (pre-fill last performance)**
Приложение само подставляет вес/повторения из прошлой тренировки по этому же упражнению - пользователь подтверждает или чуть корректирует, а не вводит с нуля.
Источники: [Hevy - Track Workouts](https://www.hevyapp.com/features/track-workouts/), [Trainerize forum thread](https://ideas.trainerize.com/forums/940789-client-gym-members-abc-trainerize/suggestions/42328240-auto-fill-reps-and-weight-based-on-last-workout)

**Минимум полей на экране**
FitNotes и Strong сводят ввод подхода к 2 полям (вес, повторения) без обязательных промежуточных экранов.
Источники: [FitNotes review, WhistleOut](https://www.whistleout.com/CellPhones/Apps/fitnotes-app-review), [fitnotesapp.com](http://www.fitnotesapp.com/), [Strong app review vs SetGraph](https://setgraph.app/articles/strong-app-review-is-it-worth-it-honest-comparison-vs-setgraph)

**Логирование подхода за 2–3 тапа (~10 сек)**
В Strong полный цикл «открыть приложение → начать тренировку → залогировать подход» занимает 3 тапа внутри сессии.
Источник: [The Strong App Review - HotelGyms](https://www.hotelgyms.com/blog/the-strong-app-review-think-less-lift-more)

**Крупная кнопка «подход выполнен» + автостарт таймера отдыха**
Один тап отмечает подход и сразу запускает таймер отдыха - без отдельного действия. Крупная цель попадания важна для тапа одной рукой.
Источник: [Hevy - Track Workouts](https://www.hevyapp.com/features/track-workouts/)

**Свайп для удаления вместо режима редактирования**
Ошибочный подход удаляется свайпом влево (появляется Delete), а не через отдельный экран правки.
Источник: [Hevy - Track Workouts](https://www.hevyapp.com/features/track-workouts/)

**Степперы (+/-) с предсказуемым шагом вместо клавиатуры**
Для числовых полей с понятным дефолтом степпер эффективнее клавиатуры (шаг ±2.5 кг и т.п.), с возможностью тапнуть по числу для точного ручного ввода - гибридный подход.
Источник: [NN/g - Input Steppers](https://www.nngroup.com/articles/input-steppers/)

### 1.2 Первый запуск, онбординг, пустые состояния

**Без регистрации до первого реального действия**
Разбор Hevy отмечает как недостаток обязательную регистрацию до того, как пользователь увидел ценность. FitNotes и openGym работают без облачного аккаунта на старте.
Источники: [Hevy onboarding teardown, Medium](https://himanshuprodesign.medium.com/new-user-onboarding-ux-hevys-activity-tracker-teardown-7b796b912636), [openGym, GitHub](https://github.com/mixrecords/opengym)

**Старт тренировки в 1–2 тапа без выбора программы**
Кнопка «+ Start Empty Workout» в Hevy сразу открывает пустой сеанс с таймером - без обязательного выбора шаблона или цели.
Источник: [Hevy - Start Empty Workout](https://www.hevyapp.com/features/start-empty-workout/)

**Пустое состояние = призыв к действию, не «данных нет»**
Пустой экран должен содержать крупную кнопку конкретного первого действия, а не текст-заглушку.
Источники: [LogRocket - Empty states UX examples](https://blog.logrocket.com/ux-design/empty-states-ux-examples/), [Mobbin - Empty state glossary](https://mobbin.com/glossary/empty-state)

**Онбординг встроен в сам пустой экран, а не вынесен в слайды**
По разбору паттернов Basecamp - обучение происходит прямо во время первого реального действия, а не через «свайпни, чтобы узнать».
Источник: [UserOnboard - Onboarding UX Patterns: Empty States](https://www.useronboard.com/onboarding-ux-patterns/empty-states/)

**Запрос разрешений - только в моменте, с объяснением**
Strava запрашивает геолокацию не при старте, а прямо перед действием, для которого она нужна (permission primer). Применимо к PWA: не спрашивать про уведомления/установку на главный экран при первом визите.
Источник: [Onboarding on Strava - Page Flows](https://pageflows.com/post/ios/onboarding/strava/)

**«Голая простота» - никаких welcome-туров и списков фич**
FitNotes открывается сразу в рабочий экран, без тура и модалок - общий вывод из пользовательских отзывов.

### Что берём в проект (приоритет)

1. Сразу рабочий экран, без регистрации и welcome-тура - кнопка «Начать тренировку» на главном.
2. Автоподстановка последнего веса/повторов при выборе знакомого упражнения - главный убиратель трения, нужна только история в БД.
3. Ввод подхода = вес + повторения + одна крупная кнопка подтверждения (со степпером ±2.5 кг/±1 повтор), без промежуточных экранов.
4. Автостарт таймера отдыха по той же кнопке «подход выполнен».
5. Пустой экран = CTA («Первый подход займёт 10 секунд»), а не пустой список.
6. Разрешения (уведомления, установка PWA) запрашивать только в моменте, когда они нужны.

---

## 2. Дизайн

Цель: современный, приятный вид - без «колхозности» и типового bootstrap-стиля.

### Приёмы

**Тёмная база + один акцентный цвет**
Strong использует тёмный интерфейс с зелёно-синими акцентами поверх плотного «логбук»-стиля - данные читаются в условиях зала, ничего не отвлекает от цифр. Тренд 2026: почти чёрный фон (`#0B0B0F`) + один яркий акцент (лайм/коралл/циан), зарезервированный под прогресс и CTA.
Источники: [strong.app](https://www.strong.app/), [Canvas Builder - Fitness Design Trends 2026](https://canvasbuilder.co/blog/fitness-website-design-trends-2026)

**Крупная «числовая» типографика для ключевых метрик**
Сверхжирный дисплейный заголовок (900 weight, Inter/Barlow Condensed) для веса/повторов/PR + обычный текст тела для остального - иерархия через контраст веса шрифта, без лишних рамок и цветов.
Источник: [Canvas Builder - Fitness Design Trends 2026](https://canvasbuilder.co/blog/fitness-website-design-trends-2026)

**Микроанимации вместо статичных состояний**
Плавная анимация галочки при завершении подхода, брендированный лоадер вместо generic-спиннера, зелёные чек-марки при валидации - дёшево в реализации, но сразу снимает ощущение шаблонности.
Источник: [ScreensDesign - Hevy](https://screensdesign.com/showcase/hevy-workout-tracker-gym-log)

**Эффект глубины на карточках (glow), а не плоские bootstrap-тени**
Лёгкое свечение вокруг карточек создаёт ощущение пространства - современнее классического `box-shadow: 0 1px 3px rgba(0,0,0,.1)`.
Источник: [ScreensDesign - Hevy](https://screensdesign.com/showcase/hevy-workout-tracker-gym-log)

**«Человечные» графики прогресса с цветовой кодировкой смысла**
Copilot Money строит графики (Swift Charts) с чёткой цветовой семантикой (красный/зелёный/синий по смыслу показателя) и анимированными круговыми индикаторами. MyFitnessPal подаёт КБЖУ через круговые диаграммы. Для нас: дуговой индикатор выполнения плана на день + линейный график «прогресс vs. цель» с явным цветом.
Источники: [Apple Developer - Copilot Money case study](https://developer.apple.com/articles/copilot-money), [ScreensDesign - Copilot Money](https://screensdesign.com/showcase/copilot-track-budget-money), [DesignRush - Fitness App Design Examples](https://www.designrush.com/best-designs/apps/trends/fitness-app-design-examples)

**Точечные dismissible-подсказки вместо длинных туториалов**
Hevy и Copilot Money используют контекстные всплывающие подсказки над нужным элементом вместо мастера настройки.
Источники: [ScreensDesign - Hevy](https://screensdesign.com/showcase/hevy-workout-tracker-gym-log), [ScreensDesign - Copilot](https://screensdesign.com/showcase/copilot-track-budget-money)

**Минимализм через дисциплину - не показывать всё сразу**
Habit-трекер Streaks намеренно ограничивает пользователя 12 привычками, что называют «блестящим дизайн-решением», заставляющим расставлять приоритеты. Аналог для нас: на главном экране 3-4 ключевые метрики (рабочий вес, PR, объём тренировки, серия дней), а не все возможные сразу.
Источник: [Singularity - Best Habit Tracker Apps 2026](https://singularity-app.com/blog/best-habit-tracker-apps-for-your-phone/)

### 2-3 примера-ориентира

1. **Strong** - [strong.app](https://www.strong.app/). Ориентир по core-механике логирования: плотный «логбук»-интерфейс, тёмная тема с зелёно-синими акцентами, максимально убраны трения из цикла ввода. Нужная нам функциональная плотность данных без ощущения перегруженности.

2. **Hevy** - [hevyapp.com](https://www.hevyapp.com/) ([разбор UI](https://screensdesign.com/showcase/hevy-workout-tracker-gym-log)). Современный слой поверх той же задачи: карточки с glow-эффектом, брендированные лоадеры, плавные микроанимации завершения подхода. То, что превращает «функциональное» в «приятное».

3. **Copilot Money** - [copilot.money](https://www.copilot.money/) ([Apple Developer кейс](https://developer.apple.com/articles/copilot-money)). Не fitness-продукт, но лучший пример премиального ощущения от небольшой команды через кастомные графики с чёткой цветовой семантикой - прямой шаблон для экрана «Прогресс».

Доп. библиотека для насмотренности: [Mobbin - Health & Fitness Logging/Tracking flows](https://mobbin.com/explore/mobile/flows/logging-tracking).

### Что берём в проект

1. Тёмная тема по умолчанию, один акцентный цвет (не мультиколор).
2. Крупная жирная типографика для цифр (вес/повторы/PR), обычный вес для второстепенного текста.
3. Карточки с лёгким glow/depth вместо плоских теней; микроанимации на ключевых действиях (завершение подхода).
4. Графики прогресса с цветовой семантикой (цель/факт), не сухие таблицы.
5. Главный экран - 3-4 ключевые метрики, не перегружать.

---

## 3. Разработка

Цель: быстрый MVP для соло-разработки с AI-ассистентом, с разумной архитектурой под будущие аккаунты и десктоп.

### Что используют реальные проекты

- **[wger](https://github.com/wger-project/wger)** (~6.8k★) - Django REST backend + отдельные клиенты (веб, Flutter). API-first монолит, избыточен для соло-MVP.
- **[OpenGym](https://github.com/alexpcosta/opengym)** - React 19 + Vite (Zustand), Node.js backend, данные в плоских JSON-файлах, авторизация через WebAuthn/Passkeys, PWA, Docker Compose.
- **[ChrGrb/workout-tracker](https://github.com/ChrGrb/workout-tracker)** - SvelteKit + Tailwind, PostgreSQL + Redis, Auth.js (GitHub OAuth), PWA через `pwa-assets.config.ts`.
- **[FitnessTracker](https://github.com/kautilyadevaraj/FitnessTracker)** - Next.js + Supabase + Prisma + NextAuth.
- **[FitTrackr](https://github.com/shamar-morrison/fitness-tracker)** - Next 14 + Supabase + TypeScript + Tailwind.
- **[workout-log](https://github.com/nielmontesa/workout-log)** - React + TypeScript + Supabase.
- **[gym-tracker](https://github.com/jessedelira/gym-tracker)** - PWA-трекер.
- Офлайн-слой: [Dexie.js](https://dexie.org/) (обёртка над IndexedDB со встроенной облачной синхронизацией), паттерн Service Worker + IndexedDB + Background Sync - см. [LogRocket: Offline-first frontend apps 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/).

### Сравнение вариантов

**(а) Next.js/React + Supabase (Postgres + Auth + RLS)** - самый распространённый паттерн среди похожих живых проектов → много референсов для AI-ассистента; аккаунты и БД закрываются одним сервисом; Row-Level-Security сразу даёт правильную модель под будущий мультипользовательский режим. Минус: облачная зависимость, офлайн нужно строить отдельно.

**(б) SvelteKit + SQLite/Turso** - один фреймворк для фронта и API-роутов, меньше кода; дёшево и просто для одного разработчика. Минус: экосистема меньше React, AI-ассистенты хуже её «знают» - медленнее разработка с Claude Code.

**(в) Local-first (IndexedDB/Dexie) + отложенный backend** - максимальная скорость старта, офлайн с первого дня. Минус: аккаунты/синхронизация между устройствами потребуют серьёзного рефакторинга позже - противоречит требованию «расти под аккаунты».

### Рекомендация

**React (Vite/Next.js) на фронте + Supabase (Postgres + Auth + Storage) как backend, офлайн-слой через Dexie.js (IndexedDB) поверх Supabase-таблиц с фоновой синхронизацией.**

Почему:
- Доминирующий паттерн среди живых open-source проектов ниши (FitnessTracker, FitTrackr, workout-log) → лучше покрыт документацией и обучающими данными, быстрее разработка с AI-ассистентом.
- Supabase закрывает главный риск ТЗ - «в будущем аккаунты»: Postgres + встроенный Auth + RLS включаются без смены БД и без переписывания модели данных.
- PWA/офлайн строится по общепринятому паттерну (Service Worker + Dexie как кэш-и-очередь) поверх Supabase - работает в зале при плохом интернете, без потери серверной модели данных.
- React переиспользуется при будущем переносе на десктоп (Tauri/Electron) без смены фреймворка.
- Postgres - прямой путь к будущему self-hosted/десктоп-варианту, в отличие от плоских JSON (OpenGym) или монолитного Django (wger), избыточных для соло-MVP.

### Что берём в проект

1. Фронтенд: React + Vite (или Next.js), TypeScript, Tailwind.
2. Backend/БД/Auth: Supabase (Postgres, Auth, Row-Level-Security на будущее).
3. PWA + офлайн: Service Worker + Dexie.js (IndexedDB) как локальный кэш/очередь, синхронизация с Supabase.
4. Держать модель данных в Postgres с первого дня (даже без реальной авторизации в MVP) - чтобы включение аккаунтов позже не требовало миграции схемы.
