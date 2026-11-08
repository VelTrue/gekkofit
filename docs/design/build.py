"""Сайт-карта экранов GekkoFit: все экраны приложения на одной странице и по группам, каждый можно «пощупать».

Как обновить после изменений в приложении (из корня репозитория, после git fetch):
  1. python docs/design/build_app.py [origin/main]  собирает живые экраны: приложение + шаги из states.py
  2. node docs/design/capture/capture.cjs           снимает скриншоты с живых экранов (тёмная и светлая тема)
  3. python docs/design/build.py                    собирает страницы docs/design/cabinet/

Каждый экран описан ниже одной записью shot(...): код (A1...), группа, вкладка, статус,
название, файл скриншота, переходы, заметки и найденные недочёты. Экраны группы
«Предложения» нарисованы макетами (их нет в приложении), остальные - скриншоты.
"""
import html as html_lib
import json
import os

import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from states import STATES  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'screens')            # PNG от capture.cjs (в git не хранятся)
SITE = os.path.join(HERE, 'cabinet')           # готовый сайт
EM = chr(0x2014)
CAPTURED = '8 ноября 2026'
SOURCE = 'версии с GitHub (origin/main, коммит 21cf456, как на gekkofit.vercel.app)'

GROUPS = []   # группы-сценарии
SHOTS = []    # экраны


def group(gid, number, title, desc, tab):
    GROUPS.append(dict(id=gid, number=number, title=title, desc=desc, tab=tab))


def shot(code, title, img=None, *, status='есть', meta='', to=(), notes=(), bugs=(), full=None, mock=None, wide=False):
    SHOTS.append(dict(code=code, group=GROUPS[-1]['id'], tab=GROUPS[-1]['tab'], title=title, img=img, status=status, meta=meta,
                      to=list(to), notes=list(notes), bugs=list(bugs), full=full, mock=mock, wide=wide))


# ------------------------------------------------------------------ макеты для экранов, которых нет в приложении
STATUS_BAR = '<div class="status"><span>9:41</span><span>▮▮▮</span></div>'


def bnav(active):
    items = ''.join(('<span class="on">' if tab == active else '<span>') + tab + '</span>'
                    for tab in ['Тренировка', 'Мастерство', 'История', 'Настройки'])
    return '<div class="bnav">' + items + '</div>'


def phone(body, top='', bottom=''):
    return f'{STATUS_BAR}{top}<div class="body">{body}</div>{bottom}'


def appbar(title):
    return f'<div class="appbar"><span class="ic">‹</span><span class="title">{title}</span></div>'


SYS_BG = '<div class="img" style="height:430px">экран настроек под затемнением</div>'

# ================================================================== экраны
group('start', 1, 'Старт', 'Главная, недавние тренировки, новая пустая тренировка', 'Тренировка')
shot('A1', 'Главная', 'home', meta='вкладка «Тренировка», активной тренировки нет', to=[('Начать тренировку', 'D1'), ('Недавние', 'C1')],
     notes=['декоративные дуги - картинка, в светлой теме своя'])
shot('B1', 'Недавние · пусто', 'recent-empty', status='состояние', meta='окно из A1 до первой тренировки', to=[('Назад', 'A1')])
shot('C1', 'Недавние', 'recent', meta='окно из A1 · 4 последние тренировки', to=[('Назад', 'A1')],
     bugs=['строки не нажимаются: открыть тренировку отсюда нельзя, только через «Историю» (B6)'])
shot('D1', 'Тренировка начата · пусто', 'workout-empty', meta='название по дате, упражнений нет',
     to=[('Добавить упражнение', 'A2'), ('Завершить тренировку', 'C5'), ('Удалить тренировку', 'D5'), ('✎', 'J3')],
     notes=['кнопки «Завершить» и «Удалить» закреплены внизу'])

group('picker', 2, 'Каталог упражнений', 'Выбор упражнения: недавние, частые, группы мышц, поиск, альтернативы, карточка упражнения', 'Тренировка')
shot('A2', 'Выбор упражнения', 'picker', meta='полноэкранное окно · 337 упражнений',
     to=[('упражнение', 'A3'), ('?', 'E2'), ('i', 'F2'), ('группа', 'B2'), ('поиск', 'C2'), ('Назад к тренировке', 'D1')],
     notes=['сверху «Недавние» и «Часто используемые»; точки ‹ • › у упражнения листают картинку и карту мышц'])
shot('B2', 'Фильтр: группа «Грудь»', 'picker-group', status='состояние', meta='группы: все, грудь, спина, ноги, плечи, руки, корпус, всё тело, кардио',
     to=[('Все группы', 'A2')], notes=['при выбранной группе блоки «Недавние» и «Частые» скрываются'])
shot('C2', 'Поиск «жим»', 'picker-search', status='состояние', meta='поиск по названию, синонимам, мышцам и оборудованию', to=[('✕', 'A2')])
shot('D2', 'Поиск · ничего не найдено', 'picker-nothing', status='состояние', to=[('✕', 'A2')])
shot('E2', 'Альтернативы «?»', 'picker-alternatives', status='состояние', meta='подсказка «Если оборудование занято» у строки',
     bugs=['на телефоне касание «?» открывает и сразу закрывает подсказку: альтернатив не видно (открывается только наведением мыши или фокусом с клавиатуры)'])
shot('F2', 'Об упражнении', 'exercise-about', meta='лист из A2 (кнопка «i»)', to=[('✕', 'A2'), ('Если оборудование занято', 'G2')],
     bugs=['планка (упражнение на время) записывается как «0 кг × 45»'])
shot('G2', 'Об упражнении · если оборудование занято', 'exercise-about-alternatives', status='состояние', meta='блок альтернатив раскрыт',
     notes=['альтернативы только показываются, выбрать их отсюда нельзя'])

group('workout', 3, 'Тренировка идёт', 'Карточка упражнения, подходы, отдых, ошибки, кардио, режим «Список», название', 'Тренировка')
shot('A3', 'Карточка упражнения', 'card', full='card-full', meta='режим «Карточки» · упражнение 1 из 1',
     to=[('История', 'A4'), ('Заменить', 'C4'), ('Добавить подход', 'C3'), ('‹ • ›', 'B3'), ('Вид', 'H3'), ('✕ упражнение', 'B5')],
     bugs=['нижняя панель «Завершить / Удалить тренировку» закрывает начало списка подходов'])
shot('B3', 'Карточка · карта мышц', 'card-muscles', status='состояние', meta='точки ‹ • › под картинкой переключают иллюстрацию и мышцы', to=[('‹ • ›', 'A3')])
shot('C3', 'Новый подход', 'set-new', meta='вес и повторы подставлены из прошлого раза', to=[('✓', 'E3'), ('корзина', 'A5')],
     bugs=['в поле веса «62.5» с точкой, а в остальном приложении «62,5»'])
shot('D3', 'Ошибка в подходе', 'set-error', status='состояние', meta='вес меньше нуля, нажата «Сохранить»',
     bugs=['текст ошибки «Вес должен быть числом от 0.» уходит под нижнюю панель и не виден'])
shot('E3', 'Подход выполнен · отдых', 'set-done-rest', meta='после ✓ запускается таймер 1:30', to=[('Пропустить', 'A3')],
     notes=['длительность отдыха фиксирована, звука и вибрации нет'])
shot('F3', 'Кардио-подход', 'cardio', meta='бег на дорожке: расстояние, наклон, время, интенсивность',
     notes=['скорость и темп считаются сами: 9 км/ч, 6:40 мин/км'])
shot('G3', 'Добавленные упражнения', 'added', meta='окно из кнопки «Добавленные 2»', to=[('упражнение', 'A3')],
     notes=['порядок меняется стрелками в карточке, перетаскивания нет'])
shot('H3', 'Режим «Список»', 'list', full='list-full', meta='меню «Вид: Список»', to=[('✎', 'I3'), ('Вид: Карточки', 'A3')])
shot('I3', 'Список · правка упражнения', 'list-edit', meta='окно из H3, внутри та же карточка', to=[('Назад к списку', 'H3')])
shot('J3', 'Переименование тренировки', 'rename', meta='карандаш у названия · 1-80 символов', to=[('Сохранить название', 'A3'), ('Отмена', 'A3')])

group('exercise', 4, 'История и замена упражнения', 'Кнопки «История» и «Заменить» в карточке упражнения', 'Тренировка')
shot('A4', 'История упражнения', 'exercise-history', meta='лист из A3 · последняя тренировка с этим упражнением', to=[('Вся история', 'B4'), ('✕', 'A3')],
     notes=['под датой тег с названием тренировки'], bugs=['в заголовке нет названия упражнения'])
shot('B4', 'Вся история упражнения', 'exercise-history-all', status='состояние', meta='тот же лист, все тренировки', to=[('Последняя тренировка', 'A4')],
     notes=['графика прогресса нет (предложение D10)'])
shot('C4', 'Заменить упражнение', 'replace', meta='каталог только из похожих упражнений', to=[('упражнение', 'D4'), ('Назад к тренировке', 'A3')],
     notes=['уже добавленные в тренировку исключены'])
shot('D4', 'Заменить · подтверждение', 'replace-confirm', meta='подходы прежнего упражнения удаляются', to=[('Заменить', 'A3'), ('Назад', 'C4')],
     bugs=['кнопка «Заменить» красная, как удаление'])

group('confirm', 5, 'Подтверждения', 'Удаление подхода и упражнения, завершение и удаление тренировки', 'Тренировка')
shot('A5', 'Удалить подход?', 'delete-set', to=[('Удалить', 'A3'), ('Назад', 'A3')])
shot('B5', 'Удалить упражнение?', 'remove-exercise', to=[('Удалить', 'D1'), ('Назад', 'A3')])
shot('C5', 'Завершить тренировку?', 'finish-confirm', to=[('Завершить', 'A1'), ('Назад', 'A3')],
     bugs=['кнопка «Завершить» красная, как удаление', 'после завершения сразу главная, итогов тренировки нет (предложение A10)'])
shot('D5', 'Удалить тренировку?', 'discard-confirm', to=[('Удалить', 'A1'), ('Назад', 'A3')])

group('history', 6, 'История', 'Архив тренировок: список, календарь, день, завершённая тренировка', 'История')
shot('A6', 'История · пусто', 'history-empty', status='состояние', meta='завершённых тренировок нет',
     bugs=['только текст, нет кнопки «Начать тренировку» (предложение H10)'])
shot('B6', 'История · список', 'history', full='history-full', meta='вкладка «История»', to=[('карточка', 'E6'), ('Календарь', 'C6')],
     bugs=['кардио в карточке: «1 подход, 0 повторений»', 'планка: «2 подхода, 105 повторений» (секунды посчитаны как повторы)'])
shot('C6', 'История · календарь', 'history-calendar', meta='месяц последней тренировки, дни с тренировками выделены',
     to=[('день', 'E6'), ('день с двумя', 'D6'), ('Список', 'B6')])
shot('D6', 'Календарь · несколько за день', 'history-day', status='состояние', meta='6 ноября: две тренировки', to=[('карточка', 'E6')])
shot('E6', 'Завершённая тренировка', 'history-detail', full='history-detail-full', meta='всё редактируется: подходы, упражнения, название',
     to=[('Удалить тренировку', 'F6'), ('Добавить упражнение', 'A2'), ('Назад к истории', 'B6')])
shot('F6', 'Удалить тренировку?', 'history-delete', to=[('Удалить', 'B6'), ('Назад', 'E6')])

group('mastery', 7, 'Мастерство', 'Коллекция жетонов: фильтры, уровни, поиск, жетон, рекорды', 'Мастерство')
shot('A7', 'Мастерство · пусто', 'mastery-empty', status='состояние', meta='ни одного выполненного подхода')
shot('B7', 'Коллекция · открытые', 'mastery', full='mastery-full', meta='фильтр «Открытые» · жетоны уровней 1-5',
     to=[('жетон', 'F7'), ('Все упражнения', 'C7'), ('Уровень', 'D7')])
shot('C7', 'Фильтр: все упражнения', 'mastery-all', status='состояние', meta='включая неоткрытые (уровень 0)', to=[('Открытые', 'B7')])
shot('D7', 'Фильтр: уровень 5+', 'mastery-level', status='состояние', meta='меню «Уровень»: все, 0, 1, 2, 3, 4, 5+', to=[('Все уровни', 'B7')])
shot('E7', 'Поиск · ничего не найдено', 'mastery-nothing', status='состояние', to=[('✕', 'B7')])
shot('F7', 'Жетон упражнения', 'badge', meta='лист из B7 · уровень, прогресс, статистика',
     to=[('Подробнее и рекорды', 'G7'), ('Открыть упражнение', 'H7'), ('✕', 'B7')],
     bugs=['подпись «Осталось до следующего уровня» не помещается в узкую плитку'])
shot('G7', 'Подробнее и рекорды', 'badge-records', status='состояние', meta='раскрыт блок: максимум, тренировки, повторения, рекорды')
shot('H7', 'Упражнение из жетона', 'badge-exercise', meta='та же карточка, что F2', to=[('Назад к упражнениям', 'F7')])

group('settings', 8, 'Настройки', 'Тема, язык, резервная копия', 'Настройки')
shot('A8', 'Настройки', 'settings-empty', meta='тема: системная, тёмная, светлая · язык · экспорт и импорт', to=[('Импорт данных', 'C8')],
     notes=['кнопка «Установить приложение» появляется, только если браузер предлагает установку'])
shot('B8', 'Настройки · напоминание о копии', 'settings', status='состояние', meta='5+ тренировок без экспорта или 14 дней с последнего')
shot('C8', 'Импорт · подтверждение', status='окно браузера', meta='системное окно window.confirm', to=[('OK', 'A1')],
     mock=phone(SYS_BG + '<div class="sysdlg"><b>Это заменит текущие данные. Продолжить?</b><div class="row"><div class="btn grow">Отмена</div><div class="btn primary grow">OK</div></div></div>'),
     bugs=['системное окно браузера выбивается из дизайна приложения'])
shot('D8', 'Импорт · файл повреждён', status='окно браузера', meta='системное окно window.alert',
     mock=phone(SYS_BG + '<div class="sysdlg"><b>Файл резервной копии повреждён или несовместим.</b><div class="btn primary">OK</div></div>'))

group('desktop', 9, 'Компьютер', 'Те же вкладки на ширине 1440 px: боковое меню слева', 'Компьютер')
for code, title, img in [('A9', 'Главная', 'home'), ('B9', 'Тренировка · пусто', 'workout-empty'), ('C9', 'Карточка упражнения', 'card'),
                         ('D9', 'История', 'history'), ('E9', 'Мастерство', 'mastery'), ('F9', 'Настройки', 'settings')]:
    shot(code, title, 'desktop/' + img, meta='1440 × 900 · тёмная тема', wide=True)

group('ideas', 10, 'Предложения', 'Экранов нет в приложении: макеты для следующего этапа', 'Предложения')
shot('A10', 'Итог тренировки', status='предложение', meta='после «Завершить» (C5) вместо возврата на главную', to=[('Готово', 'A1'), ('Открыть в истории', 'E6')],
     mock=phone('<p class="label">ТРЕНИРОВКА ЗАВЕРШЕНА</p><h1>Грудь и трицепс</h1><p class="muted">8 ноября · 54 минуты</p>'
                '<div class="kv"><div><span>Подходы</span><b>14</b></div><div><span>Повторения</span><b>96</b></div><div><span>Объем</span><b>4 320 кг</b></div><div><span>Упражнения</span><b>4</b></div></div>'
                '<div class="card"><b>Личные рекорды · 2</b><span class="small">Жим штанги лежа - 62,5 кг × 6</span><span class="small">Французский жим - 32,5 кг × 10</span></div>'
                '<div class="card"><b>Мастерство +23 очка</b><span class="small">Жим штанги лежа: уровень 3 · Атлет</span><div class="progress"><i style="width:46%"></i></div></div>'
                '<div class="btn primary">Готово</div><div class="btn">Открыть в истории</div>'),
     notes=['цифры уже считаются в приложении: итоги, рекорды, мастерство'])
shot('B10', 'Быстрый ввод: степпер', status='предложение', meta='Stepper.tsx уже есть в коде, не подключён',
     mock=phone('<h2>Жим штанги лежа</h2><div class="set-label"><span></span><span>Вес, кг</span><span>Повторы</span><span></span><span></span></div>'
                '<div class="set"><span class="n">2</span><div class="input" style="justify-content:space-between"><b>−</b>62,5<b>+</b></div>'
                '<div class="input" style="justify-content:space-between"><b>−</b>6<b>+</b></div><span class="chk">✓</span><span class="ic">✕</span></div>'
                '<p class="hint">шаг ±2,5 кг и ±1 повтор, нажатие на число открывает клавиатуру</p>', top=appbar('Тренировка 8 ноября'), bottom=bnav('Тренировка')))
shot('C10', 'Повторить тренировку / шаблоны', status='предложение', meta='из завершённой тренировки (E6) и с главной',
     mock=phone('<h1>Шаблоны</h1><p class="muted">Вес и повторы подставятся из прошлого раза.</p>'
                '<div class="card"><b>Грудь и трицепс</b><span class="muted small">4 упражнения · последний раз 2 ноября</span></div>'
                '<div class="card"><b>Спина и ноги</b><span class="muted small">4 упражнения · 4 ноября</span></div>'
                '<div class="btn">+ Сохранить текущую как шаблон</div>', top=appbar('Шаблоны'), bottom=bnav('Тренировка')))
shot('D10', 'График прогресса упражнения', status='предложение', meta='из «Всей истории» (B4) и жетона (F7)',
     mock=phone('<h1>Жим штанги лежа</h1><div class="seg"><span class="on">Вес</span><span>Максимум</span><span>Объем</span></div>'
                '<div class="spark" style="height:170px"><svg viewBox="0 0 100 40" preserveAspectRatio="none"><polyline fill="none" points="0,36 12,33 25,31 37,27 50,26 62,21 75,18 87,14 100,10"/></svg></div>'
                '<div class="seg"><span>Месяц</span><span class="on">3 месяца</span><span>Всё</span></div>'
                '<div class="kv"><div><span>Рост за 3 мес.</span><b>+12,5 кг</b></div><div><span>Рекордов</span><b>6</b></div></div>', top=appbar('Прогресс')))
shot('E10', 'Новый уровень', status='предложение', meta='после отметки подхода · LevelBar.tsx с «Новый уровень» не подключён',
     mock=phone('<div class="img" style="height:250px">карточка упражнения под затемнением</div>'
                '<div class="card" style="align-items:center;text-align:center"><div class="medal">уровень 4</div><b>Новый уровень</b><span>Жим штанги лежа · Эксперт</span>'
                '<div class="progress" style="width:100%"><i style="width:5%"></i></div></div><div class="btn primary">Продолжить</div>'))
shot('F10', 'Настройки тренировки', status='предложение', meta='новый раздел в настройках (A8)',
     mock=phone('<p class="label">Отдых между подходами</p><div class="seg"><span>60 с</span><span class="on">90 с</span><span>2 мин</span><span>3 мин</span><span>Выкл</span></div>'
                '<div class="row"><span class="grow">Звук и вибрация в конце отдыха</span><span class="toggle on"></span></div>'
                '<p class="label">Шаг веса</p><div class="seg"><span>1 кг</span><span class="on">2,5 кг</span><span>5 кг</span></div>'
                '<p class="label">Единицы</p><div class="seg"><span class="on">кг</span><span>фунты</span></div>', top=appbar('Тренировка'), bottom=bnav('Настройки')),
     notes=['сейчас отдых зашит в код: 90 секунд'])
shot('G10', 'Приложение не запустилось', status='предложение', meta='уже готово в patches/gekkofit-fixes.diff · вместо белого экрана',
     mock=phone('<div style="height:230px"></div><h1>Приложение не запустилось</h1><p class="muted">Не удалось открыть хранилище браузера. '
                'Проверьте, что сайту разрешено сохранять данные, и повторите попытку.</p><div class="btn primary">Повторить</div>'))
shot('H10', 'История · пусто с кнопкой', status='предложение', meta='замена A6: пустое состояние с действием',
     mock=phone('<p class="label">АРХИВ ТРЕНИРОВОК</p><h1>История</h1><div style="height:170px"></div>'
                '<p class="muted" style="text-align:center">Завершенные тренировки появятся здесь.</p><div class="btn primary">Начать тренировку</div>', bottom=bnav('История')))

# ================================================================== сборка
STATUS_CLASS = {'есть': 'ok', 'состояние': 'state', 'окно браузера': 'sys', 'предложение': 'todo'}
TAB_ORDER = ['Тренировка', 'История', 'Мастерство', 'Настройки', 'Компьютер', 'Предложения']
by_code = {s['code']: s for s in SHOTS}
assert len(by_code) == len(SHOTS), 'повторяется код экрана'
for item in SHOTS:
    for _label, target in item['to']:
        assert target in by_code, f'{item["code"]}: переход на несуществующий {target}'


def webp(name, theme):
    """screens/<тема>/<имя>.png -> cabinet/screens/<тема>/<имя>.webp; путь для сайта или None."""
    src = os.path.join(RAW, theme, name + '.png')
    rel = f'screens/{theme}/{name}.webp'
    dst = os.path.join(SITE, rel)
    if not os.path.exists(src):
        return rel if os.path.exists(dst) else None
    if not os.path.exists(dst) or os.path.getmtime(dst) < os.path.getmtime(src):
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        im = Image.open(src).convert('RGB')
        if im.width < 1000:
            im = im.resize((im.width * 3 // 4, im.height * 3 // 4), Image.LANCZOS)
        im.save(dst, 'WEBP', quality=78, method=6)
    return rel


def group_file(gid):
    g = next(item for item in GROUPS if item['id'] == gid)
    return f'S{g["number"]}-{gid}.html'


def link(code, single):
    return f'#{code}' if single else f'{group_file(by_code[code]["group"])}#{code}'


def render_shot(s, single):
    e = html_lib.escape
    cls = STATUS_CLASS[s['status']]
    moves = ' · '.join(f'«{e(label)}» → <a class="code" href="{link(target, single)}">{target}</a>' for label, target in s['to'])
    to = f'<span class="to">Переходы: {moves}</span>' if moves else ''
    notes = ''.join(f'<span class="note">{n}</span>' for n in s['notes'])
    bugs = ''.join(f'<span class="note bug">{b}</span>' for b in s['bugs'])
    bug_chip = f'<em class="st bug">недочёты: {len(s["bugs"])}</em>' if s['bugs'] else ''
    if s['mock']:
        device = f'<div class="screen" data-mode="dark">{s["mock"]}</div>'
    else:
        code = s['code']
        dark = webp(code, 'dark')
        light = webp(code, 'light') or dark
        full_dark = (webp(code + '-full', 'dark') if s['full'] else None) or dark
        full_light = (webp(code + '-full', 'light') if s['full'] else None) or light
        device = (f'<button type="button" class="shot-img" aria-label="Открыть {code} крупно" data-full-dark="{full_dark}" data-full-light="{full_light}">'
                  f'<img loading="lazy" alt="{code} {e(s["title"])}" src="{dark}" data-dark="{dark}" data-light="{light}"></button>')
    live = ''
    if s['code'] in STATES:
        live = (f'<div class="live-tools"><button type="button" class="live-on" data-live="{s["code"]}">Пощупать</button>'
                f'<button type="button" class="live-reset" hidden>Сбросить</button><button type="button" class="live-off" hidden>Скриншот</button>'
                f'<a class="live-open" href="app/index.html?state={s["code"]}" target="_blank" rel="noopener">в новой вкладке ↗</a></div>')
    search = ' '.join([s['code'], s['title'], s['meta'], *s['notes'], *s['bugs']]).lower()
    return (f'  <section class="shot{" wide" if s["wide"] else ""}" id="{s["code"]}" data-status="{cls}" data-group="{s["group"]}" '
            f'data-tab="{e(s["tab"])}" data-bugs="{len(s["bugs"])}" data-search="{e(search)}">\n'
            f'    <div class="cap"><b><span>{s["code"]}</span>{e(s["title"])}<em class="st {cls}">{s["status"]}</em>{bug_chip}</b>'
            f'<small>{s["meta"]}</small>{to}{notes}{bugs}</div>\n'
            f'    <div class="device">{device}</div>{live}\n  </section>\n')


def chips(name, values):
    buttons = ''.join(f'<button type="button" aria-pressed="false" data-value="{html_lib.escape(v)}">{html_lib.escape(label)}</button>' for v, label in values)
    return f'<div class="chips" data-filter="{name}"><button type="button" aria-pressed="true" data-value="">Все</button>{buttons}</div>'


def page(title, body, body_class):
    out = ('<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
           '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
           f'<title>{title}</title>\n<!-- Собрано docs/design/build.py по скриншотам capture.cjs. -->\n'
           '<link rel="stylesheet" href="cabinet.css">\n</head>\n'
           f'<body class="{body_class}">\n{body}\n'
           '<div class="lightbox" hidden><button type="button" class="lightbox-close" aria-label="Закрыть">✕</button><img alt=""></div>\n'
           '<script src="cabinet.js"></script>\n</body>\n</html>\n')
    assert EM not in out, 'длинное тире в странице'
    return out


TOOLS = ('<div class="board-tools" role="group" aria-label="Тема экранов"><button type="button" data-mode="dark" aria-pressed="true">Тёмная</button>'
         '<button type="button" data-mode="light" aria-pressed="false">Светлая</button></div>'
         '<div class="board-tools" role="group" aria-label="Размер экранов"><button type="button" data-size="s" aria-pressed="false">Мелко</button>'
         '<button type="button" data-size="m" aria-pressed="true">Средне</button><button type="button" data-size="l" aria-pressed="false">Крупно</button></div>')

os.makedirs(SITE, exist_ok=True)
for old in os.listdir(SITE):
    if old.endswith('.html'):
        os.remove(os.path.join(SITE, old))

total = len(SHOTS)
real = sum(1 for s in SHOTS if s['status'] != 'предложение')
bug_total = sum(len(s['bugs']) for s in SHOTS)
counts = (f'<div class="counts"><span><b>{total}</b>экранов</span><span><b>{real}</b>из приложения</span>'
          f'<span><b>{total - real}</b>предложений</span><span class="bugcount"><b>{bug_total}</b>недочётов</span></div>')

cards = []
for g in GROUPS:
    items = [s for s in SHOTS if s['group'] == g['id']]
    bugs = sum(len(s['bugs']) for s in items)
    bug_html = f'<em>недочёты: {bugs}</em>' if bugs else ''
    cards.append(f'<a class="s" href="{group_file(g["id"])}" data-group-link="{g["id"]}"><i>{items[0]["code"]}–{items[-1]["code"]} · {len(items)} экр.</i>'
                 f'<b>{g["number"]}. {g["title"]}</b><span>{g["desc"]}</span>{bug_html}</a>')

tabs = sorted({s['tab'] for s in SHOTS}, key=TAB_ORDER.index)
filters = ('<div class="filters" id="filters">'
           '<label class="search"><span>Поиск</span><input type="search" placeholder="Код или слово: C3, история, кардио…"></label>'
           '<div class="frow"><span class="flabel">Группа</span>' + chips('group', [(g['id'], f'{g["number"]}. {g["title"]}') for g in GROUPS]) + '</div>'
           '<div class="frow"><span class="flabel">Вкладка</span>' + chips('tab', [(t, t) for t in tabs]) + '</div>'
           '<div class="frow"><span class="flabel">Статус</span>' + chips('status', [('ok', 'есть'), ('state', 'состояние'), ('sys', 'окно браузера'),
                                                                                     ('todo', 'предложение'), ('bug', 'с недочётами')]) + '</div>'
           '<p class="shown" role="status"></p></div>')

sections = []
for g in GROUPS:
    items = [s for s in SHOTS if s['group'] == g['id']]
    sections.append(f'<section class="group" id="g-{g["id"]}" data-group="{g["id"]}"><h2><span>{g["number"]}</span>{g["title"]}<small>{g["desc"]}</small>'
                    f'<button type="button" class="live-group">Пощупать всю группу</button><a href="{group_file(g["id"])}">отдельной страницей →</a></h2>'
                    '<div class="flow">\n' + ''.join(render_shot(s, True) for s in items) + '</div></section>')

index_body = ('<header class="board-head"><div><h1>GekkoFit · все экраны</h1>'
              f'<p>Все экраны и состояния приложения на одной странице. Экраны собраны из {SOURCE}, {CAPTURED}. '
              'Кнопка «Пощупать» под экраном включает живое приложение в этом состоянии: нажимайте, вводите, листайте. Назовите код экрана (например «C3») и что поменять. Красные заметки: найденные недочёты.</p></div>'
              f'<div class="tools">{TOOLS}</div></header>\n<main class="overview">{counts}<div class="grid">{"".join(cards)}</div>{filters}\n'
              + '\n'.join(sections) + '</main><a class="to-filters" href="#filters">↑ Фильтры</a>')
open(os.path.join(SITE, 'index.html'), 'w', encoding='utf-8', newline='\n').write(page('GekkoFit · все экраны', index_body, 'board index'))

for number, g in enumerate(GROUPS):
    items = [s for s in SHOTS if s['group'] == g['id']]
    nav = ['<a href="index.html">Все экраны</a>']
    if number > 0:
        prev = GROUPS[number - 1]
        nav.append(f'<a href="{group_file(prev["id"])}">← {prev["number"]}. {prev["title"]}</a>')
    if number < len(GROUPS) - 1:
        nxt = GROUPS[number + 1]
        nav.append(f'<a href="{group_file(nxt["id"])}">{nxt["number"]}. {nxt["title"]} →</a>')
    body = (f'<header class="board-head"><div><h1>GekkoFit · {g["number"]}. {g["title"]}</h1><p>{g["desc"]}. Экраны живые: нажимайте и вводите прямо в телефоне. Версия: {SOURCE}.</p>'
            f'<nav>{"".join(nav)}</nav></div><div class="tools">{TOOLS}</div></header>\n'
            '<main class="flow">\n' + ''.join(render_shot(s, False) for s in items) + '</main>')
    open(os.path.join(SITE, group_file(g['id'])), 'w', encoding='utf-8', newline='\n').write(page(f'GekkoFit · {g["title"]}', body, 'board group-page'))

with open(os.path.join(SITE, 'screens.json'), 'w', encoding='utf-8', newline='\n') as handle:
    json.dump([{k: v for k, v in s.items() if k != 'mock'} for s in SHOTS], handle, ensure_ascii=False, indent=1)
missing = [s['code'] for s in SHOTS if not s['mock'] and not webp(s['code'], 'dark')]
print(f'{total} экранов, {real} из приложения, {bug_total} недочётов, групп {len(GROUPS)}' + (f', нет скриншотов: {missing}' if missing else ''))
