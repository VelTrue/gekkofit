"""Собирает карту сценариев GekkoFit из одного описания экранов.

Запуск из корня репозитория:  python docs/design/build.py

Результат:
  docs/design/flow.html          доска со стрелками (формат доски LMS)
  docs/design/cabinet/*.html     макеты по группам в цветах приложения (формат MAKU cabinet)

Экраны описываются ниже вызовами zone(), row(), cell(). Код экрана (A1...) и data-to="<код>"
у кнопки задают переходы: на доске это стрелки, в кабинете ссылки и строка «Переходы».
"""
import html as html_lib
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
out_path = os.path.join(HERE, 'flow.html')
css = open(os.path.join(HERE, 'board', 'board.css'), encoding='utf-8').read()
script = '<script>' + chr(10) + open(os.path.join(HERE, 'board', 'board.js'), encoding='utf-8').read() + '</script>'
EM = chr(0x2014)


EXTRA_CSS = """
  /* GekkoFit: статусы экранов и шапка доски */
  .intro { padding: 36px 40px 8px; max-width: 1500px; }
  .intro h1 { font-size: 40px; margin: 0 0 8px; }
  .intro p { max-width: 980px; color: #444; }
  .legend { display: flex; flex-wrap: wrap; gap: 14px; margin: 18px 0 10px; font-size: 15px; align-items: center; }
  .legend .sw2 { display: inline-block; width: 34px; height: 22px; border-radius: 6px; vertical-align: -5px; margin-right: 6px; }
  .legend .sw2.ok { border: 1px solid #9c9c9c; background: #fff; }
  .legend .sw2.todo { border: 2px dashed #d2336b; background: #fff7fa; }
  .legend .sw2.sys { border: 1.5px solid #9db4dd; background: #f4f7fd; }
  .counts { display: flex; gap: 10px; flex-wrap: wrap; margin: 8px 0 14px; }
  .counts span { background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 6px 12px; font-size: 15px; }
  .counts b { font-size: 20px; margin-right: 4px; }
  .toc { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 10px; margin: 10px 0 26px; }
  .toc a { display: block; background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 10px 14px; color: inherit; text-decoration: none; }
  .toc a:hover { border-color: var(--strong); }
  .toc a small { display: block; color: #666; font-size: 13px; margin-top: 2px; }
  .toc a .todo-count { color: #8a1240; font-weight: 700; }
  .zone { scroll-margin-top: 20px; }
  .cap .st.ok { background: #e6f2e6; border-color: #9cc59c; color: #1e5a1e; }
  .cap .st.todo { background: #fde3ef; border-color: #d2336b; color: #8a1240; }
  .cap .st.sys { background: #e6eefb; border-color: #9db4dd; color: #23407a; }
  .phone.todo { border: 2px dashed #d2336b; background: #fff7fa; }
  .phone.todo .appbar, .phone.todo .sticky { background: transparent; }
  .todo-el { border: 1.5px dashed #d2336b !important; color: #8a1240 !important; background: #fff7fa !important; }
  .sysdlg { border: 1.5px solid #9db4dd; border-radius: 14px; background: #f4f7fd; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
  .set { display: grid; grid-template-columns: 26px 1fr 1fr 44px 44px; gap: 8px; align-items: center; }
  .set .n { font-weight: 700; color: var(--muted); text-align: center; }
  .set .input { min-height: 44px; padding: 0 10px; }
  .chk { width: 44px; height: 44px; border-radius: 12px; border: 1.5px solid var(--strong); display: grid; place-items: center; font-weight: 700; }
  .chk.on { background: var(--strong); color: #fff; }
  .set-label { display: grid; grid-template-columns: 26px 1fr 1fr 44px 44px; gap: 8px; font-size: 13px; color: var(--muted); }
  .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .tile { border: 1.5px solid var(--line); border-radius: 14px; aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-size: 12px; text-align: center; padding: 4px; }
  .tile .lv { width: 34px; height: 34px; border-radius: 50%; border: 2px solid var(--strong); display: grid; place-items: center; font-weight: 700; font-size: 15px; }
  .tile.locked { opacity: .45; border-style: dashed; }
  .cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; font-size: 14px; }
  .cal span { min-height: 38px; display: grid; place-items: center; border-radius: 8px; }
  .cal .wd { min-height: 22px; color: var(--muted); font-size: 12px; }
  .cal .has { background: var(--strong); color: #fff; font-weight: 700; }
  .cal .two { outline: 2px solid var(--strong); font-weight: 700; }
  .cal .sel { outline: 3px solid #d2336b; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chips span { border: 1.5px solid var(--line); border-radius: 18px; padding: 6px 12px; font-size: 14px; }
  .chips span.on { background: var(--strong); border-color: var(--strong); color: #fff; }
  .ring { width: 92px; height: 92px; border-radius: 50%; border: 8px solid var(--fill); border-top-color: var(--strong); border-right-color: var(--strong); display: grid; place-items: center; font-weight: 700; font-size: 20px; flex: none; }
  .medal { width: 96px; height: 96px; border-radius: 50%; border: 3px double var(--strong); display: grid; place-items: center; font-size: 13px; color: var(--muted); flex: none; text-align: center; }
  .rest { border: 2px solid var(--strong); border-radius: 14px; padding: 10px 14px; display: flex; align-items: center; gap: 10px; }
  .rest .t { font-size: 28px; font-weight: 700; flex: 1; }
  .kv { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .kv div { border: 1.5px solid var(--line); border-radius: 12px; padding: 8px 10px; }
  .kv b { display: block; font-size: 20px; }
  .kv span { font-size: 13px; color: var(--muted); }
  /* подписи поверх линий стрелок */
  #wires { z-index: 1; }
  .zone > span, .cap, .branches { position: relative; z-index: 2; }
  .zone > span { background: var(--board); padding: 2px 8px 2px 0; }
  .cap { background: var(--board); }
  .banner { border: 2px solid var(--strong); border-radius: 14px; padding: 12px; font-weight: 700; text-align: center; margin: 8px 12px 0; }
"""

STATUS = '<div class="status"><span>9:41</span><span>▮▮▮</span></div>'
TABS = ['Тренировка', 'Мастерство', 'История', 'Настройки']
TAB_TARGET = {'Мастерство': 'A5', 'История': 'A4', 'Настройки': 'A6'}


def bnav(active, links=False):
    parts = []
    for tab in TABS:
        cls = ' class="on"' if tab == active else ''
        to = f' data-to="{TAB_TARGET[tab]}"' if links and tab in TAB_TARGET else ''
        parts.append(f'<span{cls}{to}>{tab}</span>')
    return '<div class="bnav">' + ''.join(parts) + '</div>'


def appbar(title, back=True, right=''):
    left = '<span class="ic">‹</span>' if back else ''
    return f'<div class="appbar">{left}<span class="title">{title}</span>{right}</div>'


def set_row(n, w, r, done=False, err=False, done_to=''):
    to = f' data-to="{done_to}"' if done_to else ''
    errc = ' err' if err else ''
    return (f'<div class="set"><span class="n">{n}</span><div class="input{errc}">{w}</div><div class="input">{r}</div>'
            f'<span class="chk{" on" if done else ""}"{to}>✓</span><span class="ic">✕</span></div>')


SET_LABELS = '<div class="set-label"><span></span><span>Вес, кг</span><span>Повторы</span><span></span><span></span></div>'

screens = []  # (kind, payload)


def zone(zid, text):
    screens.append(('zone', zid, text))


def row(n):
    screens.append(('row', n))


def cell(code, title, meta, status, body, branches=(), top='', bottom='', todo=False):
    screens.append(('cell', code, title, meta, status, body, branches, top, bottom, todo))


ST = {
    'ok': '<span class="st ok">есть</span>',
    'state': '<span class="st ok">есть</span><span class="st">состояние</span>',
    'sys': '<span class="st ok">есть</span><span class="st sys">окно браузера</span>',
    'todo': '<span class="st todo">достроить</span>',
    'new': '<span class="st ok">есть · новое 08.11</span>',
    'part': '<span class="st ok">есть</span><span class="st todo">доработать</span>',
}

# ---------------------------------------------------------------- Сценарий 1
zone('s1', 'Сценарий 1 · Старт: главная → новая тренировка → выбор упражнения · вкладка «Тренировка» · #/workout')
row(1)
cell('A1', 'Главная · нет активной тренировки', '#/workout · HomeScreen.tsx', 'ok',
     '<p class="muted small">◆ Ваш тренировочный дневник</p>'
     '<h1>Сильнее <u>с каждым подходом.</u></h1>'
     '<p class="muted">Вес, повторы, прогресс. Все начинается с первого подхода.</p>'
     '<div class="btn primary" data-to="C1">+ Начать тренировку</div>'
     '<div class="btn" data-to="B1">Недавние ›</div>'
     '<div class="img" style="height:300px">декоративные дуги (WebP, светлая и тёмная тема)</div>',
     ['нижнее меню на всех экранах: Тренировка · Мастерство · История · Настройки; на компьютере - боковая панель',
      'есть незавершённая тренировка → сразу C1/A2'],
     bottom=bnav('Тренировка'))
cell('B1', 'Недавние', 'диалог поверх A1 · 4 последние тренировки', 'ok',
     '<div class="img" style="height:180px">A1 под затемнением</div>',
     ['истории нет → «Завершенные тренировки появятся здесь.»',
      'строки не нажимаются: открыть тренировку можно только из «Истории» (A4)'],
     bottom='<div class="sheet" style="position:relative"><div class="grabber"></div><div class="row"><h2 class="grow">Недавние</h2><span class="ic" data-to="A1">✕</span></div>'
            '<div class="list"><div class="item"><b class="grow">Грудь и трицепс</b><span class="muted">2 нояб.</span></div>'
            '<div class="item"><b class="grow">Ноги</b><span class="muted">31 окт.</span></div>'
            '<div class="item"><b class="grow">Спина</b><span class="muted">29 окт.</span></div>'
            '<div class="item"><b class="grow">Тренировка 27 окт.</b><span class="muted">27 окт.</span></div></div></div>')
cell('C1', 'Активная тренировка · пусто', 'тренировка создана, упражнений нет', 'state',
     '<p class="muted small">ТРЕНИРОВКА ИДЕТ</p><div class="row"><h1 class="grow">Тренировка 8 нояб.</h1><span class="ic">✎</span></div>'
     '<p class="small">Выполнено подходов <b>0</b> · Объем <b>0 кг</b></p>'
     '<div class="row"><h2 class="grow">Упражнения</h2><div class="seg" style="width:170px"><span class="on">Карточки</span><span>Список</span></div></div>'
     '<div class="img" style="height:140px">штанга (иллюстрация)</div>'
     '<h2>С чего начнем?</h2><p class="muted">Добавьте упражнение, затем запишите вес и повторы.</p>'
     '<div class="btn primary" data-to="D1">+ Добавить упражнение</div>',
     ['название тренировки можно изменить (1-80 символов)', 'таймер длительности тикает каждую секунду (на компьютере)'],
     bottom='<div class="sticky"><div class="btn primary" data-to="A3">✓ Завершить тренировку</div><div class="btn ghost" data-to="B3">Удалить тренировку</div></div>' + bnav('Тренировка'))
cell('D1', 'Выбор упражнения', 'полноэкранный диалог · ExercisePicker.tsx · 337 упражнений', 'ok',
     '<div class="input"><span class="ph">⌕ Название, мышца или оборудование</span></div>'
     '<p class="label">Недавние</p><div class="list">'
     '<div class="item" data-to="A2"><span class="img" style="width:44px;height:44px"></span><span class="grow"><b>Жим штанги лежа</b><br><span class="muted small">штанга · грудь</span></span><span class="ic" data-to="E1">i</span></div>'
     '<div class="item"><span class="img" style="width:44px;height:44px"></span><span class="grow"><b>Приседания со штангой</b><br><span class="muted small">штанга · ноги</span></span><span class="ic">i</span></div></div>'
     '<p class="label">Часто используемые</p><div class="list"><div class="item"><span class="img" style="width:44px;height:44px"></span><span class="grow"><b>Тяга верхнего блока</b></span><span class="ic">i</span></div></div>'
     '<p class="label">Группы мышц</p><div class="chips"><span class="on">Все группы</span><span>Грудь</span><span>Спина</span><span>Ноги</span><span>Плечи</span><span>Руки</span><span>Корпус</span><span>Кардио</span><span>Фулбоди</span></div>'
     '<div class="row"><p class="label grow">Все упражнения</p><span class="muted small">Найдено: 337</span></div>'
     '<div class="list"><div class="item"><span class="grow">Жим гантелей лежа</span><span class="ic">i</span></div><div class="item"><span class="grow">…</span></div></div>'
     '<div class="btn">Показать ещё</div><p class="hint">Показано 40 из 337</p>',
     ['ничего не найдено → «Ничего не найдено», «Сбросить группу»', 'каталог не загрузился → «Повторить»',
      'поиск по названию, синонимам, мышцам и оборудованию; ё = е'],
     top=appbar('Выберите упражнение'))
cell('E1', 'Об упражнении', 'лист из D1 (кнопка «i») · ExerciseDetailSheet.tsx', 'ok',
     '<h2>Жим штанги лежа</h2><div class="row"><div class="img grow" style="height:170px">тело спереди</div><div class="img grow" style="height:170px">тело сзади</div></div>'
     '<div class="list"><div class="item"><span class="grow muted">Оборудование</span><b>Штанга</b></div>'
     '<div class="item"><span class="grow muted">■ Основные мышцы</span><b>Грудь</b></div>'
     '<div class="item"><span class="grow muted">□ Вспомогательные</span><b>Передние дельты, трицепс</b></div></div>'
     '<div class="card"><span class="muted small">Последний записанный подход</span><b>60 кг × 5</b><span class="muted small">2 ноября 2026 г.</span></div>'
     '<div class="btn">Если оборудование занято <span class="badge">3</span></div>'
     '<div class="list"><div class="item"><span class="grow">Жим гантелей лежа</span><span class="muted small">гантели</span></div>'
     '<div class="item"><span class="grow">Жим в Смите</span><span class="muted small">Смит</span></div></div>',
     ['альтернативы только показываются: выбрать их отсюда нельзя (см. F3 «Заменить»)',
      'картинка есть у 9 упражнений из 337, у остальных - карта мышц'],
     top=appbar('‹ Назад к упражнениям', back=False, right='<span class="ic" data-to="D1">✕</span>'))
cell('F1', 'Приложение не запустилось', 'main.tsx · StartupError.tsx · вместо белого экрана', 'new',
     '<div style="height:220px"></div><h1>Приложение не запустилось</h1>'
     '<p class="muted">Не удалось открыть хранилище браузера. Проверьте, что сайту разрешено сохранять данные (в приватном режиме это может быть запрещено), и повторите попытку.</p>'
     '<div class="btn primary" data-to="A1">Повторить</div>',
     ['каталог упражнений не синхронизировался с IndexedDB при запуске', '«Повторить» перезагружает страницу'])
cell('G1', 'Доступно обновление', 'баннер поверх любого экрана · App.tsx', 'state',
     '<div class="img" style="height:420px">любой экран приложения</div>',
     ['новая версия сайта скачана сервис-воркером → нажатие перезагружает приложение'],
     top='<div class="banner">Доступно обновление - применить</div>', bottom=bnav('Тренировка'))

# ---------------------------------------------------------------- Сценарий 2
zone('s2', 'Сценарий 2 · Тренировка идёт: подходы, отдых, порядок упражнений, режим «Список» · #/workout')
row(2)
cell('A2', 'Карточка упражнения', 'режим «Карточки» · ExerciseCard.tsx + SetRow.tsx · обновлено 08.11', 'ok',
     '<div class="row"><div class="btn" data-to="C2">Добавленные <span class="badge">3</span></div><div class="grow" data-to="D2"><div class="input" style="justify-content:space-between"><span><span class="muted">Вид:</span> Карточки</span><span>▾</span></div></div></div>'
     '<div class="card"><div class="row"><div class="img" style="width:150px;height:150px">мышцы / фото</div><div class="grow"><p class="muted small">УПРАЖНЕНИЕ 1 ИЗ 3</p><h2>Жим штанги лежа</h2><p class="muted small">штанга · грудь</p></div></div>'
     '<p class="hint" style="text-align:center">‹ ● ○ ›  иллюстрация / карта мышц</p>'
     '<div class="row"><div class="btn grow" data-to="D3">◷ История</div><div class="btn grow" data-to="F3">⇄ Заменить</div></div></div>'
     + SET_LABELS + set_row(1, '60', '5', True) + set_row(2, '62,5', '5', done_to='B2') +
     '<div class="row"><div class="btn grow">+ Добавить подход</div><span class="ic">↑</span><span class="ic">↓</span><span class="ic" data-to="G2">✕</span></div>'
     '<div class="row"><div class="btn grow">‹ Предыдущее</div><div class="btn grow">Следующее ›</div></div>',
     ['новый подход подставляет вес и повторы прошлого подхода (или 20 кг × 8)',
      'блок «В прошлый раз» убран: прошлые результаты теперь в «Истории» (D3)',
      'нижняя панель с кнопками закрывает первую строку подхода, видно только после прокрутки'],
     top='<div class="appbar"><span class="title">Тренировка 8 ноября</span><span class="ic">✎</span></div>',
     bottom='<div class="sticky"><div class="row"><div class="btn primary grow" data-to="A3">✓ Завершить тренировку</div><div class="btn ghost danger grow" data-to="B3">Удалить тренировку</div></div></div>' + bnav('Тренировка'))
cell('B2', 'Отдых после подхода', 'A2 после отметки ✓ · 90 секунд, фиксировано', 'state',
     '<div class="rest"><span class="ic">◷</span><span class="t">Отдых 1:24</span><span class="lnk">Пропустить</span></div>'
     + SET_LABELS + set_row(1, '60', '5', True) + set_row(2, '62,5', '5', True) + set_row(3, '62,5', '5') +
     '<div class="img" style="height:200px">остальная карточка A2</div>',
     ['в 0:00 кнопка меняется на «Готово»; звука, вибрации и уведомления нет',
      'длительность не настраивается → G6'],
     top='<div class="appbar"><span class="title">Тренировка 8 нояб.</span></div>', bottom=bnav('Тренировка'))
cell('C2', 'Добавленные упражнения', 'диалог из A2 · переход между упражнениями', 'ok',
     '<div class="list"><div class="item" data-to="A2"><span class="badge">1</span><b class="grow">Жим штанги лежа</b></div>'
     '<div class="item"><span class="badge">2</span><span class="grow">Разводка гантелей лежа</span></div>'
     '<div class="item"><span class="badge">3</span><span class="grow">Беговая дорожка</span></div></div>',
     ['порядок меняется стрелками ↑ ↓ в карточке A2, перетаскивания нет'],
     top=appbar('Добавленные', right='<span class="ic">✕</span>'))
cell('D2', 'Тренировка · режим «Список»', 'WorkoutNoteView.tsx · выбор режима запоминается', 'ok',
     '<h2>Упражнения</h2><div data-to="A2"><div class="input" style="justify-content:space-between"><span><span class="muted">Вид:</span> Список</span><span>▾</span></div></div>'
     '<p class="muted small">Выберите упражнение или подход для редактирования</p>'
     '<div class="card"><div class="row"><span class="img" style="width:60px;height:60px"></span><b class="grow" data-to="E2">Жим штанги лежа ✎</b></div>'
     '<div class="chips"><span>✓ 60 кг × 5</span><span>✓ 62,5 кг × 5</span><span>62,5 кг × 5 · не выполнен</span></div></div>'
     '<div class="card"><div class="row"><span class="img" style="width:60px;height:60px"></span><b class="grow">Беговая дорожка ✎</b></div>'
     '<div class="chips"><span>✓ 3 км · 20 мин · 9 км/ч · 6:40 мин/км · 2% · 6/10</span></div></div>'
     '<div class="card"><div class="row"><span class="img" style="width:60px;height:60px"></span><b class="grow">Разводка гантелей ✎</b></div><div class="btn">+ Первый подход</div></div>',
     ['режим выбирается выпадающим меню «Вид» вместо переключателя'], top='<div class="appbar"><span class="title">Тренировка 8 ноября</span></div>', bottom=bnav('Тренировка'))
cell('E2', 'Редактирование упражнения', 'диалог из D2 · внутри та же карточка A2', 'ok',
     '<div class="row"><div class="img" style="width:90px;height:90px"></div><div class="grow"><h2>Жим штанги лежа</h2></div></div>'
     + SET_LABELS + set_row(1, '60', '5', True) + set_row(2, '62,5', '5', True) +
     '<div class="btn">+ Добавить подход</div>',
     ['фокус ставится на подход, по которому нажали в D2'],
     top=appbar('‹ Назад к списку', back=False, right='<span class="ic" data-to="D2">✕</span>'))
cell('F2', 'Кардио-подход', 'упражнения группы «Кардио» · CardioSetRow · обновлено 08.11', 'ok',
     '<div class="row"><div class="img" style="width:112px;height:112px">дорожка</div><div class="grow"><p class="muted small">УПРАЖНЕНИЕ 3 ИЗ 3</p><h2>Беговая дорожка</h2></div></div>'
     '<div class="kv"><div><span>Расстояние, км</span><b>3</b></div><div><span>Наклон, %</span><b>2</b></div><div><span>Время, мин</span><b>20</b></div><div><span>Интенсивность, 0-10</span><b>6</b></div>'
     '<div><span>Скорость, км/ч</span><b>9</b></div><div><span>Темп, мин/км</span><b>6:40</b></div></div>'
     '<div class="row"><div class="btn grow">Сохранить</div><span class="chk">✓</span><span class="ic">✕</span></div>',
     ['скорость и темп считаются из расстояния и времени', 'в заметке и истории единицы по-русски: км, мин, км/ч, мин/км'],
     top='<div class="appbar"><span class="title">Тренировка 8 ноября</span></div>', bottom=bnav('Тренировка'))
cell('G2', 'Удалить подход / упражнение', 'подтверждение · ConfirmAction', 'ok',
     '<div class="img" style="height:300px">A2 под затемнением</div>',
     ['то же окно для «Удалить упражнение?»: «Жим штанги лежа» и все его подходы будут удалены из тренировки'],
     bottom='<div class="sheet" style="position:relative"><div class="grabber"></div><h2>Удалить подход 2?</h2><p class="muted">Подход будет удален из этой тренировки.</p>'
            '<div class="row" style="margin-top:12px"><div class="btn grow" data-to="A2">Отмена</div><div class="btn primary grow">Удалить</div></div></div>')

# ---------------------------------------------------------------- Сценарий 3
zone('s3', 'Сценарий 3 · Завершение тренировки и работа с упражнением: итог, история упражнения, замена, быстрый ввод')
row(3)
cell('A3', 'Завершить тренировку?', 'подтверждение из C1 / A2', 'ok',
     '<div class="img" style="height:300px">тренировка под затемнением</div>',
     ['сейчас после «Завершить» сразу открывается главная A1 без итогов → предлагаем C3',
      'на сайте кнопка «Завершить» в этом окне красная, как опасное действие, хотя ничего не удаляет'],
     bottom='<div class="sheet" style="position:relative"><div class="grabber"></div><h2>Завершить тренировку?</h2><p class="muted">«Тренировка 8 нояб.» сохранится в истории. Ее можно будет отредактировать.</p>'
            '<div class="row" style="margin-top:12px"><div class="btn grow">Отмена</div><div class="btn primary grow" data-to="C3">Завершить</div></div></div>')
cell('B3', 'Удалить тренировку?', 'подтверждение из C1 · случайно начатая', 'ok',
     '<div class="img" style="height:300px">тренировка под затемнением</div>', [],
     bottom='<div class="sheet" style="position:relative"><div class="grabber"></div><h2>Удалить тренировку?</h2><p class="muted">«Тренировка 8 нояб.» и все ее подходы будут удалены.</p>'
            '<div class="row" style="margin-top:12px"><div class="btn grow">Отмена</div><div class="btn primary grow" data-to="A1">Удалить</div></div></div>')
cell('C3', 'Итог тренировки', 'после «Завершить» · данные уже считаются (summary, mastery)', 'todo',
     '<p class="muted small">ТРЕНИРОВКА ЗАВЕРШЕНА</p><h1>Грудь и трицепс</h1><p class="muted">8 ноября · 54 минуты</p>'
     '<div class="kv"><div><span>Подходы</span><b>14</b></div><div><span>Повторения</span><b>96</b></div><div><span>Объем</span><b>4 320 кг</b></div><div><span>Упражнения</span><b>4</b></div></div>'
     '<div class="card"><b>Личные рекорды · 2</b><span class="small">Жим штанги лежа - 62,5 кг × 5</span><span class="small">Разводка гантелей - 16 кг × 12</span></div>'
     '<div class="card"><b>Мастерство +23 очка</b><span class="small">Жим штанги лежа: уровень 3 · Атлет</span><div class="progress"><i style="width:40%"></i></div></div>'
     '<div class="btn primary" data-to="A1">Готово</div><div class="btn" data-to="D4">Открыть в истории</div>',
     ['источник цифр: summarizeWorkout, recordCounts, calculateExerciseMastery', 'новый уровень → G5'])
cell('D3', 'История упражнения', 'лист из A2 «История» · ExerciseCard.tsx · сделано 08.11', 'ok',
     '<div class="grabber"></div><div class="row"><h2 class="grow" style="text-align:center">История</h2><span class="ic">✕</span></div><p class="label">8 ноября, вс</p><div class="list"><div class="item"><span class="badge">1</span><span class="grow">60 кг × 5 раз</span></div><div class="item"><span class="badge">2</span><span class="grow">60 кг × 5 раз</span></div><div class="item"><span class="badge">3</span><span class="grow">57,5 кг × 6 раз</span></div></div>'
     '<div style="height:200px"></div><div class="btn" data-to="E3">ВСЯ ИСТОРИЯ</div>',
     ['показывается последняя тренировка с этим упражнением; если название тренировки не дата, оно выводится тегом',
      'в заголовке нет названия упражнения', 'упражнение ещё не выполнялось → «Еще не выполнялось»'])
cell('E3', 'Вся история упражнения', 'тот же лист D3, развёрнутый · план: отдельный экран с графиком', 'part',
     '<div class="grabber"></div><div class="row"><h2 class="grow" style="text-align:center">История</h2><span class="ic">✕</span></div><p class="label">8 ноября, вс</p><div class="list"><div class="item"><span class="badge">1</span><span class="grow">60 кг × 5 раз</span></div><div class="item"><span class="badge">2</span><span class="grow">57,5 кг × 6 раз</span></div></div>'
     '<p class="label">2 ноября, пн</p><div class="list"><div class="item"><span class="badge">1</span><span class="grow">57,5 кг × 5 раз</span></div><div class="item"><span class="badge">2</span><span class="grow">55 кг × 8 раз</span></div></div><p class="label">29 октября, чт</p><div class="list"><div class="item"><span class="badge">1</span><span class="grow">55 кг × 6 раз</span></div></div>'
     '<div class="card todo-el" data-to="F5"><b>График лучшего веса</b><span class="small">доработать: тренд и итоги по датам</span></div>'
     '<div class="btn" data-to="D3">ПОСЛЕДНЯЯ ТРЕНИРОВКА</div>',
     ['сделано: все тренировки списком в той же панели', 'не сделано: график, итоги по датам, переход к тренировке в истории (D4)'])
cell('F3', 'Заменить упражнение', 'из A2 «Заменить» · ExercisePicker с replacementFor · сделано 08.11', 'ok',
     '<h1>Заменить</h1><div class="input"><span class="ph">⌕ Название, мышца или оборудование</span></div>'
     '<div class="row"><p class="label grow">Похожие упражнения</p><span class="muted small">Найдено: 5</span></div>'
     '<div class="list"><div class="item" data-to="A2"><span class="img" style="width:56px;height:56px"></span><span class="grow"><b>Жим гантелей лежа</b><br><span class="muted small">гантели · грудь</span></span><span class="ic">?</span><span class="ic">i</span></div>'
     '<div class="item"><span class="img" style="width:56px;height:56px"></span><span class="grow"><b>Жим на нижних блоках лежа</b><br><span class="muted small">нижний блок · грудь</span></span><span class="ic">?</span><span class="ic">i</span></div>'
     '<div class="item"><span class="img" style="width:56px;height:56px"></span><span class="grow"><b>Жим в тренажере Смита лежа</b><br><span class="muted small">тренажер Смита · грудь</span></span><span class="ic">?</span><span class="ic">i</span></div></div>'
     '<div class="sheet"><h2>Заменить упражнение?</h2><p class="muted">Подходы прежнего упражнения будут удалены.</p><div class="row"><div class="btn grow">Отмена</div><div class="btn primary grow" data-to="A2">Заменить</div></div></div>',
     ['поиск только среди похожих: те же основные мышцы и похожее движение', 'уже добавленные в тренировку исключены',
      'нет аналога → «Похожая замена не найдена»', 'в подсказке «?» у похожего упражнения показывается и само заменяемое'],
     top=appbar('‹ Назад к тренировке', back=False))
cell('G3', 'Быстрый ввод: степпер', 'Stepper.tsx уже есть, не подключён · research.md п.3', 'todo',
     '<h2>Жим штанги лежа</h2>' + SET_LABELS +
     '<div class="set"><span class="n">2</span><div class="input" style="justify-content:space-between"><b>−</b>62,5<b>+</b></div><div class="input" style="justify-content:space-between"><b>−</b>5<b>+</b></div><span class="chk">✓</span><span class="ic">✕</span></div>'
     '<p class="hint">шаг ±2,5 кг и ±1 повтор, по нажатию на число - клавиатура</p>',
     ['вариант: свайп влево по подходу вместо кнопки ✕'])

# ---------------------------------------------------------------- Сценарий 4
zone('s4', 'Сценарий 4 · История: список и календарь → завершённая тренировка → правка или удаление · #/history')
row(4)
cell('A4', 'История · список', '#/history · HistoryScreen.tsx', 'ok',
     '<p class="muted small">АРХИВ ТРЕНИРОВОК</p><div class="row"><h1 class="grow">История</h1><div class="seg" style="width:180px"><span class="on">Список</span><span data-to="B4">Календарь</span></div></div>'
     '<div class="card" data-to="D4"><span class="muted small">2 ноября 2026 г., 54 минуты</span><div class="row"><b class="grow">Грудь и трицепс</b><span class="chev"></span></div>'
     '<span class="small"><b>Жим штанги лежа</b> 3 подхода, 16 повторений</span><span class="small"><b>Французский жим</b> 3 подхода, 30 повторений</span>'
     '<div class="row small"><span class="grow">Объем <b>4 320 кг</b></span><span class="pill">Личные рекорды 2</span></div></div>'
     '<div class="card"><span class="muted small">31 октября 2026 г., 48 минут</span><b>Ноги</b><span class="small">Приседания 4 подхода, 32 повторения</span></div>'
     '<div class="card"><span class="muted small">29 октября 2026 г.</span><b>Спина</b></div>',
     ['пусто → F4', 'ошибка загрузки → D7'], bottom=bnav('История'))
cell('B4', 'История · календарь', 'режим «Календарь» · месяц последней тренировки', 'ok',
     '<p class="muted small">АРХИВ ТРЕНИРОВОК</p><div class="row"><h1 class="grow">История</h1><div class="seg" style="width:180px"><span data-to="A4">Список</span><span class="on">Календарь</span></div></div>'
     '<div class="row"><span class="ic">‹</span><b class="grow" style="text-align:center">ноябрь 2026 г.</b><span class="ic">›</span></div>'
     '<div class="cal"><span class="wd">Пн</span><span class="wd">Вт</span><span class="wd">Ср</span><span class="wd">Чт</span><span class="wd">Пт</span><span class="wd">Сб</span><span class="wd">Вс</span>'
     '<span></span><span></span><span></span><span></span><span></span><span>1</span><span class="has" data-to="D4">2</span>'
     '<span>3</span><span>4</span><span class="two" data-to="C4">5</span><span>6</span><span>7</span><span>8</span><span>9</span>'
     '<span>10</span><span>11</span><span>12</span><span>13</span><span>14</span><span>15</span><span>16</span></div>',
     ['день с одной тренировкой → сразу D4', 'день с несколькими → список под календарём (C4)'], bottom=bnav('История'))
cell('C4', 'Несколько тренировок за день', 'B4 после выбора дня', 'state',
     '<div class="cal"><span class="wd">Пн</span><span class="wd">Вт</span><span class="wd">Ср</span><span class="wd">Чт</span><span class="wd">Пт</span><span class="wd">Сб</span><span class="wd">Вс</span>'
     '<span>3</span><span>4</span><span class="two sel">5</span><span>6</span><span>7</span><span>8</span><span>9</span></div>'
     '<p class="label">Тренировки за выбранный день</p>'
     '<div class="card" data-to="D4"><span class="muted small">5 ноября, 30 минут</span><b>Утро · кардио</b></div>'
     '<div class="card"><span class="muted small">5 ноября, 45 минут</span><b>Вечер · плечи</b></div>',
     [], bottom=bnav('История'))
cell('D4', 'Завершённая тренировка', 'HistoryDetail.tsx · полное редактирование', 'ok',
     '<div class="btn ghost" data-to="A4" style="justify-content:start">‹ Назад к истории</div>'
     '<p class="muted small">ЗАВЕРШЕННАЯ ТРЕНИРОВКА</p><div class="row"><h1 class="grow">Грудь и трицепс</h1><span class="ic">✎</span></div>'
     '<p class="small">Подходы <b>14</b> · Повторы <b>96</b> · Объем <b>4 320 кг</b></p>'
     '<div class="row"><h2 class="grow">Упражнения</h2><div class="seg" style="width:170px"><span class="on">Карточки</span><span>Список</span></div></div>'
     '<div class="img" style="height:230px">та же карточка упражнения, что A2 (без «В прошлый раз»)</div>'
     '<div class="btn" data-to="D1">+ Добавить упражнение</div>'
     '<div class="btn todo-el" data-to="G4">Повторить тренировку</div>'
     '<div class="btn ghost" data-to="E4">Удалить тренировку</div>',
     ['кнопка «назад» браузера закрывает тренировку и возвращает фокус к карточке', 'мастерство пересчитывается после правок'],
     bottom=bnav('История'))
cell('E4', 'Удалить тренировку?', 'подтверждение из D4', 'ok',
     '<div class="img" style="height:300px">D4 под затемнением</div>', [],
     bottom='<div class="sheet" style="position:relative"><div class="grabber"></div><h2>Удалить тренировку?</h2><p class="muted">«Грудь и трицепс» и все ее подходы будут удалены.</p>'
            '<div class="row" style="margin-top:12px"><div class="btn grow">Отмена</div><div class="btn primary grow" data-to="A4">Удалить</div></div></div>')
cell('F4', 'История · пусто', 'ещё нет завершённых тренировок', 'state',
     '<p class="muted small">АРХИВ ТРЕНИРОВОК</p><h1>История</h1><div style="height:180px"></div>'
     '<p class="muted" style="text-align:center">Завершенные тренировки появятся здесь.</p>'
     '<div class="btn todo-el" data-to="A1">Начать тренировку</div>',
     ['сейчас только текст, без кнопки действия: research.md советует CTA в пустом состоянии'], bottom=bnav('История'))
cell('G4', 'Повторить тренировку / шаблоны', 'из D4 и с главной · новая функция', 'todo',
     '<h1>Шаблоны</h1><p class="muted">Начните с готового набора упражнений. Вес и повторы подставятся из прошлого раза.</p>'
     '<div class="card" data-to="C1"><b>Грудь и трицепс</b><span class="muted small">4 упражнения · последний раз 2 ноября</span></div>'
     '<div class="card"><b>Ноги</b><span class="muted small">5 упражнений · 31 октября</span></div>'
     '<div class="btn">+ Сохранить текущую как шаблон</div>',
     ['минимальный вариант: «Повторить» копирует упражнения прошлой тренировки в новую'], top=appbar('Шаблоны'), bottom=bnav('Тренировка'))

# ---------------------------------------------------------------- Сценарий 5
zone('s5', 'Сценарий 5 · Мастерство: коллекция жетонов → уровень и рекорды → упражнение · #/progress')
row(5)
cell('A5', 'Коллекция мастерства', '#/progress · ProgressScreen.tsx · по 36 жетонов', 'ok',
     '<p class="muted small">КОЛЛЕКЦИЯ</p><div class="row"><h1 class="grow">Мастерство</h1><span class="muted small">5 упражнений открыто</span></div>'
     '<div class="input"><span class="ph">⌕ Найти упражнение</span></div>'
     '<div class="row"><div class="seg grow"><span class="on">Открытые</span><span>Все упражнения</span></div><div class="input" style="width:110px">Уровень ▾</div></div>'
     '<div class="grid3"><div class="tile" data-to="C5"><span class="lv">3</span>Жим штанги лежа</div><div class="tile"><span class="lv">2</span>Приседания</div><div class="tile"><span class="lv">1</span>Тяга блока</div>'
     '<div class="tile"><span class="lv">1</span>Подъем на бицепс</div><div class="tile"><span class="lv">1</span>Беговая дорожка</div><div class="tile locked"><span class="lv">0</span>Не открыто</div></div>'
     '<div class="btn">Показать ещё</div>',
     ['уровни: 1 · 15 · 50 · 120 · 250 очков, дальше каждые +250', 'очки: подход +1, первая в тренировке +2, рекорд +3'],
     bottom=bnav('Мастерство'))
cell('B5', 'Мастерство · ничего не открыто', 'фильтр «Открытые», подходов ещё нет', 'state',
     '<p class="muted small">КОЛЛЕКЦИЯ</p><h1>Мастерство</h1><div style="height:160px"></div>'
     '<b style="text-align:center">Пока нет открытых упражнений</b><p class="muted" style="text-align:center">Завершите первый рабочий подход, чтобы открыть жетон.</p>',
     ['поиск без совпадений → «Ничего не найдено · Измените поиск или фильтр.»'], bottom=bnav('Мастерство'))
cell('C5', 'Жетон упражнения', 'лист из A5 · MasteryDetailSheet.tsx', 'ok',
     '<div class="row"><div class="medal">жетон<br>уровень 3</div><div class="grow"><h2>Жим штанги лежа</h2><p class="muted">Уровень 3 · Атлет</p></div></div>'
     '<div class="row"><div class="ring">40%</div><div class="grow"><span class="muted small">До уровня 4</span><br><b>72 / 120</b> <span class="muted small">очков</span></div></div>'
     '<div class="kv"><div><span>Лучший вес</span><b>62,5 кг</b></div><div><span>Подходы</span><b>41</b></div><div><span>Объем</span><b>12 400 кг</b></div><div><span>Осталось до уровня</span><b>48</b></div></div>'
     '<div class="btn" data-to="D5">Подробнее и рекорды ▾</div>'
     '<div class="btn primary" data-to="E5">Открыть упражнение ›</div>'
     '<div class="btn todo-el" data-to="F5">График прогресса</div>',
     [], top='<div class="grabber" style="margin-top:8px"></div>')
cell('D5', 'Подробнее и рекорды', 'C5 с раскрытым блоком', 'state',
     '<div class="btn">Подробнее и рекорды ▴</div><p class="muted">Наберите 120 очков мастерства.</p>'
     '<div class="kv"><div><span>Расчетный максимум</span><b>72,9 кг</b></div><div><span>Тренировки</span><b>11</b></div><div><span>Повторения</span><b>214</b></div></div>'
     '<p class="label">Последний результат</p><p>2 ноября 2026 г.</p>'
     '<p class="label">Личные рекорды</p><div class="list"><div class="item"><span class="grow">62,5 кг × 5</span><span class="muted small">2 нояб.</span></div><div class="item"><span class="grow">60 кг × 6</span><span class="muted small">25 окт.</span></div></div>',
     ['максимум по формуле Эпли: вес × (1 + повторы / 30)'])
cell('E5', 'Упражнение', 'из C5 «Открыть упражнение» · тот же лист, что E1', 'ok',
     '<h2>Жим штанги лежа</h2><div class="row"><div class="img grow" style="height:200px">спереди</div><div class="img grow" style="height:200px">сзади</div></div>'
     '<div class="list"><div class="item"><span class="grow muted">Оборудование</span><b>Штанга</b></div><div class="item"><span class="grow muted">Основные мышцы</span><b>Грудь</b></div></div>'
     '<div class="card"><span class="muted small">Последний записанный подход</span><b>62,5 кг × 5</b></div>',
     ['здесь без блока альтернатив и без кнопки «Добавить в тренировку»'], top=appbar('‹ Назад к упражнениям', back=False))
cell('F5', 'Прогресс упражнения: график', 'из C5 / E3 · research.md «человечные графики»', 'todo',
     '<h1>Жим штанги лежа</h1><div class="seg"><span class="on">Вес</span><span>Максимум</span><span>Объем</span></div>'
     '<div class="spark" style="height:160px"><svg viewBox="0 0 100 40" preserveAspectRatio="none"><polyline fill="none" stroke="#555" stroke-width="1.5" points="0,36 10,34 20,33 30,30 40,30 50,26 60,24 70,20 80,18 90,14 100,12"/></svg></div>'
     '<div class="seg"><span>Месяц</span><span class="on">3 месяца</span><span>Всё</span></div>'
     '<div class="kv"><div><span>Рост за 3 мес.</span><b>+12,5 кг</b></div><div><span>Рекордов</span><b>6</b></div></div>',
     ['у графика нужен текстовый эквивалент (спецификация, п.13)'], top=appbar('Прогресс'))
cell('G5', 'Новый уровень', 'после отметки подхода · LevelBar.tsx с «Новый уровень» не подключён', 'todo',
     '<div class="img" style="height:260px">A2 под затемнением</div>'
     '<div class="card" style="align-items:center;text-align:center"><div class="medal">уровень 4</div><b>Новый уровень</b><span>Жим штанги лежа · Эксперт</span><div class="progress" style="width:100%"><i style="width:5%"></i></div><span class="muted small">до уровня 5 осталось 245 очков</span></div>'
     '<div class="btn primary" data-to="A2">Продолжить</div>',
     ['без звука; уважать prefers-reduced-motion'])

# ---------------------------------------------------------------- Сценарий 6
zone('s6', 'Сценарий 6 · Настройки и данные: тема, язык, резервная копия, установка · #/settings')
row(6)
cell('A6', 'Настройки', '#/settings · SettingsScreen.tsx', 'ok',
     '<p class="muted small">СИСТЕМА</p><h1>Настройки</h1>'
     '<div class="btn primary" data-to="F6">Установить приложение</div>'
     '<div class="alert"><b>Не потеряйте прогресс</b><span class="small">Сохраните свежую резервную копию.</span></div>'
     '<p class="label">Тема</p><div class="seg"><span class="on">Системная</span><span>Тёмная</span><span>Светлая</span></div>'
     '<p class="label">Язык</p><div class="seg"><span class="on">Русский</span><span>English</span></div>'
     '<div class="btn" data-to="B6" style="justify-content:space-between;display:flex;align-items:center">Экспорт данных <span>↓</span></div>'
     '<div class="btn" data-to="C6" style="justify-content:space-between;display:flex;align-items:center">Импорт данных <span>↑</span></div>'
     '<div class="btn todo-el" data-to="G6">Тренировка: отдых, шаг веса</div>'
     '<p class="hint">Все данные хранятся только на этом устройстве. Аккаунт и облако не используются.</p>'
     '<div class="btn ghost" data-to="E6">Админ-панель (локальная)</div>',
     ['«Установить» видно, только если браузер предлагает установку', 'напоминание: 5+ тренировок без экспорта или 14 дней с последнего',
      'админ-панель только в режиме разработки на localhost'], bottom=bnav('Настройки'))
cell('B6', 'Экспорт: «Поделиться»', 'системное окно телефона / скачивание файла на компьютере', 'sys',
     '<div class="img" style="height:330px">A6 под затемнением</div>'
     '<div class="sysdlg"><b>Поделиться</b><span class="mono">workout-backup-2026-11-08.json</span><div class="row"><span class="ic">Файлы</span><span class="ic">Почта</span><span class="ic">TG</span><span class="ic">Диск</span></div></div>',
     ['после экспорта напоминание о копии пропадает'])
cell('C6', 'Импорт: подтверждение', 'window.confirm · системное окно браузера', 'sys',
     '<div class="img" style="height:260px">выбор файла .json</div>'
     '<div class="sysdlg"><b>Это заменит текущие данные. Продолжить?</b><div class="row"><div class="btn grow">Отмена</div><div class="btn primary grow" data-to="A1">OK</div></div></div>',
     ['OK → данные заменяются, страница перезагружается', 'системные окна выбиваются из дизайна: заменить на ConfirmAction'])
cell('D6', 'Импорт: файл повреждён', 'window.alert', 'sys',
     '<div class="img" style="height:300px">A6</div><div class="sysdlg"><b>Файл резервной копии повреждён или несовместим.</b><div class="btn primary">OK</div></div>',
     ['проверяются связи: тренировки ↔ упражнения ↔ подходы ↔ каталог'])
cell('E6', 'Админ-панель мастерства', 'LocalAdminPanel.tsx · только npm run dev на localhost', 'ok',
     '<h2>Управление мастерством</h2><p class="muted small">Только для локальной разработки. Изменения сохраняются в этом браузере.</p>'
     '<div class="field"><span class="label">Поиск упражнения</span><div class="input"><span class="ph">жим</span></div></div>'
     '<div class="field"><span class="label">Упражнение</span><div class="input">Жим штанги лежа ▾</div></div>'
     '<div class="field"><span class="label">Уровень</span><div class="input">3 ▾</div></div>'
     '<div class="field"><span class="label">Очки мастерства</span><div class="input">50</div></div>'
     '<div class="btn primary">Сохранить мастерство</div><div class="btn">Вернуть автоматический расчёт</div><div class="btn ghost">Обнулить выбранное</div>',
     [], bottom=bnav('Настройки'))
cell('F6', 'Установка приложения', 'системное окно браузера (Chrome / Edge)', 'sys',
     '<div class="img" style="height:330px">A6 под затемнением</div>'
     '<div class="sysdlg"><b>Установить приложение?</b><span class="small">Workout · иконка на главный экран, работает без сети</span><div class="row"><div class="btn grow">Отмена</div><div class="btn primary grow">Установить</div></div></div>',
     ['в Safari на iPhone такого окна нет: нужна подсказка «Поделиться → На экран Домой»'])
cell('G6', 'Настройки тренировки', 'из A6 · новая страница', 'todo',
     '<p class="label">Отдых между подходами</p><div class="seg"><span>60 с</span><span class="on">90 с</span><span>2 мин</span><span>3 мин</span><span>Выкл</span></div>'
     '<div class="row"><span class="grow">Звук и вибрация в конце отдыха</span><span class="toggle on"></span></div>'
     '<p class="label">Шаг веса в степпере</p><div class="seg"><span>1 кг</span><span class="on">2,5 кг</span><span>5 кг</span></div>'
     '<p class="label">Единицы</p><div class="seg"><span class="on">кг</span><span>фунты</span></div>'
     '<div class="row"><span class="grow">Подставлять прошлый результат</span><span class="toggle on"></span></div>',
     ['сейчас отдых зашит в код: REST_SECONDS = 90'], top=appbar('Тренировка'), bottom=bnav('Настройки'))

# ---------------------------------------------------------------- Общие состояния
zone('s7', 'Общие состояния: загрузка и ошибки на всех вкладках')
row(7)
cell('A7', 'Загрузка', 'все вкладки · полоса и текст', 'state',
     '<div style="height:260px"></div><div class="progress" style="width:120px;margin:0 auto"><i style="width:60%"></i></div>'
     '<p class="muted" style="text-align:center">Загружаем тренировку…</p>',
     ['История: «Загружаем историю...» · Мастерство: «Собираем коллекцию…» · каталог: «Загружаем упражнения…»'],
     bottom=bnav('Тренировка'))
cell('B7', 'Ошибка тренировки', 'HomeScreen · не удалось прочитать или записать', 'state',
     '<div class="alert"><span>Не удалось загрузить или сохранить тренировку. Повторите попытку.</span><div class="btn">Повторить</div></div>'
     '<div class="img" style="height:380px">экран тренировки</div>', [], bottom=bnav('Тренировка'))
cell('C7', 'Ошибка в подходе', 'SetRow · проверка до сохранения', 'state',
     SET_LABELS + set_row(2, '-5', '5', err=True) +
     '<p class="errtxt">Вес должен быть числом от 0.</p>'
     + set_row(3, '60', '0') + '<p class="errtxt">Повторы должны быть целым числом от 1.</p>'
     '<div class="alert"><span>Не удалось сохранить. Значения остались в строке.</span><span class="lnk">Повторить</span></div>',
     ['кардио: «Введите неотрицательные значения, интенсивность от 0 до 10.»'])
cell('D7', 'Ошибка истории', 'HistoryScreen', 'state',
     '<p class="muted small">АРХИВ ТРЕНИРОВОК</p><h1>История</h1><div style="height:150px"></div>'
     '<p style="text-align:center">Не удалось загрузить историю.</p><div class="btn">Повторить</div>', [], bottom=bnav('История'))
cell('E7', 'Ошибка мастерства', 'ProgressScreen', 'state',
     '<p class="muted small">КОЛЛЕКЦИЯ</p><h1>Мастерство</h1><div style="height:150px"></div>'
     '<b style="text-align:center">Не удалось загрузить мастерство</b><div class="btn">Повторить</div>', [], bottom=bnav('Мастерство'))


# ---------------------------------------------------------------- сборка
def render_cell(code, title, meta, status, body, branches, top, bottom, todo):
    branch_html = ''
    if branches:
        branch_html = '<div class="branches">' + ''.join(f'<span class="branch">{b}</span>' for b in branches) + '</div>'
    phone_cls = 'phone todo' if todo or status in ('todo', 'part') else 'phone'
    return (f'  <div class="cell"><div class="cap"><b>{code}</b>{title}{ST[status]}<br><span class="meta">{meta}</span></div>\n'
            f'    <div class="{phone_cls}" id="{code}">{STATUS}{top}<div class="body">{body}</div>{bottom}</div>\n'
            f'    {branch_html}\n  </div>\n')


parts, toc, zone_stats, current = [], [], {}, None
for item in screens:
    if item[0] == 'zone':
        current = item[1]
        zone_stats[current] = [item[2], 0, 0]
    elif item[0] == 'cell':
        zone_stats[current][1] += 1
        if item[4] in ('todo', 'part'):
            zone_stats[current][2] += 1

for item in screens:
    if item[0] == 'zone':
        parts.append(f'\n  <div class="zone" id="{item[1]}"><span>{item[2]}</span></div>\n')
    elif item[0] == 'row':
        parts.append(f'  <div class="rowhead">{item[1]}</div>\n')
    else:
        parts.append(render_cell(*item[1:]))

total = sum(s[1] for s in zone_stats.values())
todo_total = sum(s[2] for s in zone_stats.values())
for zid, (text, count, todo) in zone_stats.items():
    title, _, rest = text.partition(':')
    todo_html = f' · <span class="todo-count">достроить {todo}</span>' if todo else ''
    toc.append(f'<a href="#{zid}"><b>{title}</b><small>{rest.strip()}</small><small>{count} экранов{todo_html}</small></a>')

html = f'''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GekkoFit · карта сценариев</title>
<!--
  Доска сценариев GekkoFit в формате доски LMS (2026-10-LMS/docs/design/wireframes/flow.html).
  Экраны 375px в сетке «колонка-буква × строка-цифра», стрелки от элемента [data-to] к экрану рисуются скриптом.
  Статусы: «есть» - экран реализован в src, «достроить» - экрана нет (розовая пунктирная рамка),
  «окно браузера» - системный диалог. Розовые пунктирные кнопки на готовых экранах - точки входа в недостающие экраны.
  Цвета условные серые: дизайн задаётся src/theme.css, не этим файлом.
  При изменении экранов в src обновляйте этот файл: код экрана (A1...) и стрелки data-to.
-->
<style>{css}{EXTRA_CSS}</style>
</head>
<body>
<div class="toolbar" aria-label="Масштаб">
  <button type="button" data-zoom="0.35">35%</button>
  <button type="button" data-zoom="0.6">60%</button>
  <button type="button" data-zoom="1">100%</button>
</div>
<div class="wrap">
<header class="intro">
  <h1>GekkoFit · карта сценариев и экранов</h1>
  <p>Все экраны локального дневника тренировок по состоянию кода на 8 ноября 2026 (ветка main) и экраны, которых не хватает.
  Телефон 375 px, на компьютере то же содержимое с боковой навигацией. Стрелки идут от кнопки к экрану, куда она ведёт.
  Жёлтые заметки под экраном: ветки, ограничения и находки.</p>
  <div class="legend">
    <span><i class="sw2 ok"></i>экран есть в коде</span>
    <span><i class="sw2 todo"></i>достроить (этап 2)</span>
    <span><i class="sw2 sys"></i>системное окно браузера</span>
    <span class="branch">заметка, ветка или ограничение</span>
  </div>
  <div class="counts"><span><b>{total}</b>экранов и состояний</span><span><b>{total - todo_total}</b>есть</span><span><b>{todo_total}</b>достроить</span><span><b>{len(zone_stats)}</b>сценариев</span></div>
  <nav class="toc">{''.join(toc)}</nav>
</header>
<div class="board" id="board">
  <div></div>
  <div class="colhead">A</div><div class="colhead">B</div><div class="colhead">C</div><div class="colhead">D</div>
  <div class="colhead">E</div><div class="colhead">F</div><div class="colhead">G</div>
{''.join(parts)}
  <svg id="wires" aria-hidden="true">
    <defs>
      <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill="#3a3a3a"/>
      </marker>
    </defs>
  </svg>
</div>
</div>
{script}
</body>
</html>
'''
assert EM not in html, 'em dash found'
ids = set(re.findall(r'id="([A-G]\d+)"', html))
missing = sorted(set(re.findall(r'data-to="([A-G]\d+)"', html)) - ids)
assert not missing, f'arrows to missing screens: {missing}'
open(out_path, 'w', encoding='utf-8', newline='\n').write(html)
print(f'screens={total} todo={todo_total} zones={len(zone_stats)} bytes={len(html.encode())}')


# ================================================================ кабинет: макеты по группам
CAB = os.path.join(HERE, 'cabinet')
PAGES = {
    's1': ('S1-start.html', '1. Старт и выбор упражнения', 'Главная, недавние, пустая тренировка, каталог упражнений, карточка упражнения, ошибка запуска, обновление'),
    's2': ('S2-workout.html', '2. Тренировка идёт', 'Карточка упражнения и подходы, отдых, добавленные упражнения, режим «Список», кардио, удаление'),
    's3': ('S3-finish.html', '3. Завершение и работа с упражнением', 'Завершить и удалить, итог тренировки, история упражнения, замена, быстрый ввод'),
    's4': ('S4-history.html', '4. История', 'Список и календарь, несколько тренировок за день, завершённая тренировка, удаление, пусто, шаблоны'),
    's5': ('S5-mastery.html', '5. Мастерство', 'Коллекция жетонов, пусто, жетон с уровнем, рекорды, упражнение, график, новый уровень'),
    's6': ('S6-settings.html', '6. Настройки и данные', 'Тема и язык, экспорт и импорт копии, ошибка файла, установка, админ-панель, настройки тренировки'),
    's7': ('S7-states.html', 'Общие состояния', 'Загрузка, ошибка тренировки, ошибка в подходе, ошибки истории и мастерства'),
}
CAB_STATUS = {
    'ok': '<em class="st ok">есть</em>',
    'state': '<em class="st ok">есть</em><em class="st state">состояние</em>',
    'sys': '<em class="st ok">есть</em><em class="st sys">окно браузера</em>',
    'todo': '<em class="st todo">достроить</em>',
    'new': '<em class="st ok">есть · новое 08.11</em>',
    'part': '<em class="st ok">есть</em><em class="st todo">доработать</em>',
}
# заглушки, вместо которых в кабинете показываются настоящие картинки приложения
PUBLIC = '../../../public/'
PHOTOS = {
    'декоративные дуги (WebP, светлая и тёмная тема)': ('art', 'home-screen-artwork.webp'),
    'мышцы / фото': ('photo', 'exercises/barbell-bench-press.webp'),
    'дорожка': ('photo', 'exercises/treadmill.webp'),
}

page_of, cells_by_zone, zone_title = {}, {}, {}
current = None
for item in screens:
    if item[0] == 'zone':
        current = item[1]
        zone_title[current] = item[2]
        cells_by_zone[current] = []
    elif item[0] == 'cell':
        page_of[item[1]] = PAGES[current][0]
        cells_by_zone[current].append(item)


def strip_tags(fragment):
    text = re.sub(r'<[^>]+>', ' ', fragment)
    return re.sub(r'\s+', ' ', html_lib.unescape(text)).strip()


def href_for(code, own_page):
    return f'#{code}' if page_of[code] == own_page else f'{page_of[code]}#{code}'


def transitions(markup, own_page):
    result, seen = [], set()
    for match in re.finditer(r'<(\w+)([^>]*?)\sdata-to="([A-G]\d+)"([^>]*)>(.*?)</\1>', markup, re.S):
        code, label = match.group(3), strip_tags(match.group(5)) or '•'
        if (label, code) in seen:
            continue
        seen.add((label, code))
        result.append(f'«{html_lib.escape(label)}» → <a class="code" href="{href_for(code, own_page)}">{code}</a>')
    return result


def link_targets(markup, own_page):
    return re.sub(r'data-to="([A-G]\d+)"', lambda m: f'data-to="{m.group(1)}" data-href="{href_for(m.group(1), own_page)}"', markup)


def photos(markup):
    markup = re.sub(r'class="btn ghost"([^>]*)>(Удалить|Обнулить)', r'class="btn ghost danger"\1>\2', markup)
    for text, (kind, src) in PHOTOS.items():
        markup = re.sub(r'<div class="img" style="([^"]*)">' + re.escape(text) + '</div>',
                        lambda m: f'<div class="img {kind}" role="img" aria-label="{text}" style="{m.group(1)};background-image:url({PUBLIC}{src})"></div>',
                        markup)
    return markup


def shot(item, own_page):
    _, code, title, meta, status, body, branches, top, bottom, _todo = item
    inner = photos(link_targets(f'{STATUS}{top}<div class="body">{body}</div>{bottom}', own_page))
    moves = transitions(top + body + bottom, own_page)
    to = f'<span class="to">Переходы: {" · ".join(moves)}</span>' if moves else ''
    notes = ''.join(f'<span class="note">{b}</span>' for b in branches)
    data_status = 'todo' if status in ('todo', 'part') else 'ok'
    return (f'  <section class="shot" id="{code}" data-status="{data_status}" aria-label="{code} {html_lib.escape(title)}">\n'
            f'    <div class="cap"><b><span>{code}</span>{title}{CAB_STATUS[status]}</b><small>{meta}</small>{to}{notes}</div>\n'
            f'    <div class="device"><div class="screen" data-mode="dark">{inner}</div></div>\n'
            f'  </section>\n')


def codes_range(items):
    rows = {}
    for item in items:
        rows.setdefault(item[1][1:], []).append(item[1])
    return ', '.join(f'{codes[0]}–{codes[-1]}' if len(codes) > 1 else codes[0] for codes in rows.values())


def plural_screens(n):
    if n % 10 == 1 and n % 100 != 11:
        return 'экран'
    if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14:
        return 'экрана'
    return 'экранов'


THEME_TOOLS = ('<div class="board-tools" role="group" aria-label="Тема экранов">'
               '<button type="button" data-mode="dark" aria-pressed="true">Тёмная</button>'
               '<button type="button" data-mode="light" aria-pressed="false">Светлая</button></div>')


def page_shell(title, body_class, content):
    return ('<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            f'<title>{title}</title>\n'
            '<!-- Собрано docs/design/build.py. Правьте описание экранов там и пересоберите. -->\n'
            '<link rel="stylesheet" href="cabinet.css">\n</head>\n'
            f'<body class="{body_class}">\n{content}\n'
            '<script src="cabinet.js"></script>\n</body>\n</html>\n')


os.makedirs(CAB, exist_ok=True)
zone_ids = list(PAGES)
for index, zid in enumerate(zone_ids):
    file, title, desc = PAGES[zid]
    items = cells_by_zone[zid]
    nav = ['<a href="index.html">Все сценарии</a>', f'<a href="../flow.html#{zid}">Эта группа на доске со стрелками</a>']
    if index > 0:
        prev_file, prev_title, _ = PAGES[zone_ids[index - 1]]
        nav.append(f'<a href="{prev_file}">← {prev_title}</a>')
    if index < len(zone_ids) - 1:
        next_file, next_title, _ = PAGES[zone_ids[index + 1]]
        nav.append(f'<a href="{next_file}">{next_title} →</a>')
    head = (f'<header class="board-head"><div><h1>GekkoFit · {title}</h1>'
            f'<p>{zone_title[zid]}. Нажатие на кнопку в макете переводит к экрану, куда она ведёт. '
            'Розовая пунктирная рамка: экрана нет в коде, его нужно достроить.</p>'
            f'<nav>{"".join(nav)}</nav></div>{THEME_TOOLS}</header>')
    flow_html = '<main class="flow">\n' + ''.join(shot(item, file) for item in items) + '</main>'
    page = page_shell(f'GekkoFit · {title}', 'board', head + '\n' + flow_html)
    assert EM not in page, f'em dash in {file}'
    open(os.path.join(CAB, file), 'w', encoding='utf-8', newline='\n').write(page)

cards = ['<a class="s cta" href="../flow.html"><b>Доска со стрелками →</b><span>Все экраны на одном полотне: сетка A–G по сценариям и стрелки от каждой кнопки к экрану, куда она ведёт</span></a>']
for zid in zone_ids:
    file, title, desc = PAGES[zid]
    items = cells_by_zone[zid]
    todo = sum(1 for item in items if item[4] in ('todo', 'part'))
    todo_html = f'<em>достроить: {todo}</em>' if todo else ''
    cards.append(f'<a class="s" href="{file}"><i>{codes_range(items)} · {len(items)} {plural_screens(len(items))}</i>'
                 f'<b>{title}</b><span>{desc}</span>{todo_html}</a>')
card_html = '\n    '.join(cards)
index_html = page_shell('GekkoFit · макеты всех экранов', 'index', f'''<main>
  <header class="board-head" style="margin:0;max-width:none"><div><h1>GekkoFit · макеты всех экранов</h1>
  <p>Все экраны дневника тренировок по группам: что есть в коде на 8 ноября 2026 и что нужно достроить на втором этапе.
  Экраны нарисованы в цветах приложения (<code>src/theme.css</code>), тёмная и светлая тема переключаются на каждой странице, <code>?light</code> открывает сразу светлую. Телефон 375 px.</p></div>{THEME_TOOLS}</header>
  <div class="counts"><span><b>{total}</b>экранов и состояний</span><span><b>{total - todo_total}</b>есть</span><span><b>{todo_total}</b>достроить</span><span><b>{len(zone_ids)}</b>групп</span></div>
  <div class="grid">
    {card_html}
  </div>
  <p class="note"><b>Как устроено:</b> все экраны описаны один раз в <code>docs/design/build.py</code>. Команда <code>python docs/design/build.py</code> собирает из них и доску со стрелками <code>flow.html</code>, и эти страницы.
  Общие файлы: <code>cabinet.css</code> (скин экранов и страниц), <code>cabinet.js</code> (тема и переходы), <code>../board/</code> (основа доски из LMS).</p>
</main>''')
assert EM not in index_html
open(os.path.join(CAB, 'index.html'), 'w', encoding='utf-8', newline='\n').write(index_html)
print(f'cabinet: {len(zone_ids)} pages + index')
