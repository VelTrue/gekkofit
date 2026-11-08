"""Demo backup (format v2) for capturing GekkoFit screens with realistic history."""
import json
import sys
from datetime import datetime, timedelta, timezone

out = sys.argv[1]
MSK = timezone(timedelta(hours=3))
workouts, links, sets = [], [], []

# (date, hour, title, [(exercise_id, [(weight, reps), ...])], cardio)
A = 'Грудь и трицепс'
B = 'Спина и ноги'
C = 'Кардио и пресс'
plan = []
start = datetime(2026, 10, 5, 19, 0, tzinfo=MSK)
step = 0
for week in range(5):
    for day, title in ((0, A), (2, B), (4, C)):
        date = start + timedelta(days=week * 7 + day)
        if date > datetime(2026, 11, 7, tzinfo=MSK):
            continue
        k = week
        if title == A:
            items = [(1, [(50 + 2.5 * k, 8), (52.5 + 2.5 * k, 6), (52.5 + 2.5 * k, 6)]),
                     (2, [(18 + 2 * k, 10), (18 + 2 * k, 10)]),
                     (7, [(10 + k, 12), (10 + k, 12)]),
                     (235, [(25 + 2.5 * k, 10), (25 + 2.5 * k, 9)])]
        elif title == B:
            items = [(71, [(70 + 5 * k, 6), (70 + 5 * k, 6), (75 + 5 * k, 5)]),
                     (48, [(45 + 2.5 * k, 10), (47.5 + 2.5 * k, 8)]),
                     (116, [(90 + 5 * k, 5), (95 + 5 * k, 3)]),
                     (93, [(120 + 10 * k, 12)])]
        else:
            items = [(321, [('cardio', 3 + 0.5 * k, 20 + k, 2, 6)]), (281, [(0, 60), (0, 45)])]
        plan.append((date, title if week != 3 or title != B else None, items))

# second workout on the same day, to show the calendar day list
plan.append((datetime(2026, 11, 6, 8, 0, tzinfo=MSK), 'Утро · плечи', [(180, [(20, 12), (22.5, 10)]), (200, [(8, 15), (8, 15)])]))

for index, (date, title, items) in enumerate(sorted(plan, key=lambda item: item[0])):
    wid = f'demo-workout-{index:02d}'
    started = date.astimezone(timezone.utc)
    finished = started + timedelta(minutes=48 + index % 3 * 7)
    iso = lambda moment: moment.strftime('%Y-%m-%dT%H:%M:%S.000Z')
    name = title or f'Тренировка {date.day} {["", "", "", "", "", "", "", "", "", "", "октября", "ноября"][date.month - 1]}'
    workouts.append({'id': wid, 'startedAt': iso(started), 'finishedAt': iso(finished), 'createdAt': iso(started), 'updatedAt': iso(finished), 'title': name})
    moment = started
    for order, (exercise_id, rows) in enumerate(items):
        links.append({'id': f'{wid}-ex-{exercise_id}', 'workoutId': wid, 'exerciseId': exercise_id, 'order': order, 'createdAt': iso(moment), 'updatedAt': iso(moment)})
        for set_order, row in enumerate(rows):
            moment += timedelta(minutes=3)
            record = {'id': f'{wid}-set-{exercise_id}-{set_order}', 'workoutId': wid, 'exerciseId': exercise_id, 'setOrder': set_order,
                      'completed': True, 'createdAt': iso(moment), 'updatedAt': iso(moment)}
            if row[0] == 'cardio':
                _, distance, duration, incline, intensity = row
                record.update({'weight': 0, 'reps': 1, 'distance': distance, 'duration': duration, 'incline': incline, 'intensity': intensity})
            else:
                record.update({'weight': row[0], 'reps': row[1]})
            sets.append(record)

# extra mastery points so every badge tier (0-5) appears in the collection
adjust = {9: 300, 180: 130, 10: 60, 45: 16}
progress = [{'exerciseId': exercise_id, 'masteryPointAdjustment': points, 'totalSets': 0, 'totalXp': 0, 'bestWeightEver': 0}
            for exercise_id, points in adjust.items()]
data = {'version': 2, 'exportedAt': '2026-11-08T12:00:00.000Z', 'workouts': workouts, 'workoutExercises': links, 'sets': sets, 'exerciseProgress': progress}
json.dump(data, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(workouts), 'workouts', len(sets), 'sets')
