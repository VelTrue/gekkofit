"""Шаги, которые приводят живое приложение в состояние каждого экрана карты.

Шаг - список: [действие, аргументы...]
  click <текст> [селектор]       нажать видимый элемент с текстом или aria-label
  clickIn <текст> <селектор>     то же внутри открытого окна (dialog[open])
  clickSel <селектор>            нажать элемент по селектору
  tab <иконка>                   вкладка нижнего меню: dumbbell, mastery, calendar, controls
  type <селектор> <текст>        ввести текст в поле
  select <селектор> <значение>   выбрать пункт в выпадающем списке
  hover <селектор>               навести мышь
  submit <селектор>              отправить форму поля (как Enter)
  wait <мс>                      подождать
Каждый экран открывается с чистой базой и демо-данными (data='empty' - без данных).
"""

START = [['click', 'Начать тренировку']]
PICKER = START + [['click', 'Добавить упражнение']]


def add(query, name):
    return [['click', 'Добавить упражнение'], ['type', 'dialog[open] input[type=search]', query], ['clickIn', name, '.exercise-select']]


BENCH = START + add('жим штанги лежа', 'Жим штанги лежа')
SET = BENCH + [['click', 'Добавить подход']]
WEIGHT = 'input[aria-label="Вес, подход 1"]'
CARDIO = add('беговой дорожке', 'Бег на беговой дорожке') + [['click', 'Добавить подход']] + [
    ['type', f'.workout-set-cardio label:nth-of-type({n}) input', v] for n, v in ((1, '3'), (2, '2'), (3, '20'), (4, '6'))
] + [['click', 'Сохранить', '.workout-set-cardio button']]
HISTORY = [['tab', 'calendar']]
MASTERY = [['tab', 'mastery']]
SETTINGS = [['tab', 'controls']]

STATES = {
    'A1': dict(steps=[]),
    'B1': dict(steps=[['click', 'Недавние']], data='empty'),
    'C1': dict(steps=[['click', 'Недавние']]),
    'D1': dict(steps=START),
    'A2': dict(steps=PICKER),
    'B2': dict(steps=PICKER + [['clickIn', 'Грудь', '.exercise-groups button']]),
    'C2': dict(steps=PICKER + [['type', 'dialog[open] input[type=search]', 'жим']]),
    'D2': dict(steps=PICKER + [['type', 'dialog[open] input[type=search]', 'йцукен']]),
    'E2': dict(steps=PICKER + [['hover', 'dialog[open] .exercise-alternatives']]),
    'F2': dict(steps=PICKER + [['clickSel', 'dialog[open] .exercise-info']]),
    'G2': dict(steps=PICKER + [['clickSel', 'dialog[open] .exercise-info'], ['clickIn', 'Если оборудование занято', 'button']]),
    'A3': dict(steps=BENCH),
    'B3': dict(steps=BENCH + [['click', 'Показать мышцы']]),
    'C3': dict(steps=SET),
    'D3': dict(steps=SET + [['type', WEIGHT, '-5'], ['submit', WEIGHT]]),
    'E3': dict(steps=SET + [['click', 'Завершить подход 1']]),
    'F3': dict(steps=START + CARDIO),
    'G3': dict(steps=BENCH + CARDIO + [['click', 'Добавленные']]),
    'H3': dict(steps=BENCH + [['select', 'select[aria-label="Вид тренировки"]', 'list']]),
    'I3': dict(steps=BENCH + [['select', 'select[aria-label="Вид тренировки"]', 'list'], ['click', 'Редактировать упражнение']]),
    'J3': dict(steps=BENCH + [['click', 'Изменить название тренировки']]),
    'A4': dict(steps=BENCH + [['click', 'История', '.workout-exercise-shortcuts button']]),
    'B4': dict(steps=BENCH + [['click', 'История', '.workout-exercise-shortcuts button'], ['clickIn', 'Вся история', 'button']]),
    'C4': dict(steps=BENCH + [['click', 'Заменить', '.workout-exercise-shortcuts button']]),
    'D4': dict(steps=BENCH + [['click', 'Заменить', '.workout-exercise-shortcuts button'], ['clickIn', 'Жим гантелей лежа', '.exercise-select']]),
    'A5': dict(steps=SET + [['click', 'Удалить подход 1']]),
    'B5': dict(steps=BENCH + [['click', 'Удалить упражнение']]),
    'C5': dict(steps=BENCH + [['click', 'Завершить тренировку']]),
    'D5': dict(steps=BENCH + [['click', 'Удалить тренировку']]),
    'A6': dict(steps=HISTORY, data='empty'),
    'B6': dict(steps=HISTORY),
    'C6': dict(steps=HISTORY + [['click', 'Календарь']]),
    'D6': dict(steps=HISTORY + [['click', 'Календарь'], ['click', '6 ноября', '.history-calendar button']]),
    'E6': dict(steps=HISTORY + [['click', 'Грудь и трицепс', '.history-card']]),
    'F6': dict(steps=HISTORY + [['click', 'Грудь и трицепс', '.history-card'], ['click', 'Удалить тренировку']]),
    'A7': dict(steps=MASTERY, data='empty'),
    'B7': dict(steps=MASTERY),
    'C7': dict(steps=MASTERY + [['click', 'Все упражнения', '.mastery-filters button']]),
    'D7': dict(steps=MASTERY + [['select', '.mastery-level-filter select', 'level-5']]),
    'E7': dict(steps=MASTERY + [['type', '.mastery-search input', 'йцукен']]),
    'F7': dict(steps=MASTERY + [['click', 'Жим штанги лежа', '.mastery-grid button']]),
    'G7': dict(steps=MASTERY + [['click', 'Жим штанги лежа', '.mastery-grid button'], ['click', 'Подробнее и рекорды', 'summary']]),
    'H7': dict(steps=MASTERY + [['click', 'Жим штанги лежа', '.mastery-grid button'], ['click', 'Открыть упражнение']]),
    'A8': dict(steps=SETTINGS, data='empty'),
    'B8': dict(steps=SETTINGS),
    'A9': dict(steps=[]),
    'B9': dict(steps=START),
    'C9': dict(steps=BENCH),
    'D9': dict(steps=HISTORY),
    'E9': dict(steps=MASTERY),
    'F9': dict(steps=SETTINGS),
}
