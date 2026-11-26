"""Build the static dashboard dataset from the attributed nflverse CSV release."""
import csv
import gzip
import hashlib
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

source = Path(sys.argv[1])
with gzip.open(source, 'rt', newline='') as stream:
    plays = []
    drive_rows = defaultdict(list)
    for row in csv.DictReader(stream):
        if row['season_type'] == 'REG' and row['fixed_drive'] and row['posteam']:
            drive_rows[row['game_id'], row['fixed_drive'], row['posteam']].append(row)
        if row['season_type'] != 'REG' or row['play_type'] not in {'pass', 'run'}:
            continue
        if not row['defteam'] or row['down'] not in {'1', '2', '3', '4'} or row['epa'] in {'', 'NA'}:
            continue
        epa = float(row['epa'])
        if not math.isfinite(epa):
            continue
        distance = int(row['ydstogo'])
        band = 0 if distance <= 3 else 1 if distance <= 7 else 2
        plays.append((row, epa, band))

seattle_weeks = {int(row['week']) for row, epa, band in plays if row['defteam'] == 'SEA'}
seattle = []
league = defaultdict(lambda: [0, 0.0])
for row, epa, band in plays:
    week, down = int(row['week']), int(row['down'])
    if week not in seattle_weeks:
        continue
    kind = row['play_type']
    if row['defteam'] == 'SEA':
        seattle.append([week, down, band, kind, round(epa, 4), row['posteam'], row['game_date'],
                        int(row['ydstogo']), row['desc'], str(row['play_id'])])
    else:
        bucket = league[week, down, band, kind]
        bucket[0] += 1
        bucket[1] += epa

drives = []
drive_comparison = defaultdict(lambda: [0, 0])
for rows in drive_rows.values():
    first = next((row for row in rows if row['play_type'] in {'pass', 'run'}
                  and row['yardline_100'] not in {'', 'NA'}), None)
    if first is None or int(first['week']) not in seattle_weeks or not first['defteam']:
        continue
    spot = 100 - int(first['yardline_100'])
    group = 0 if spot <= 25 else 1 if spot < 50 else 2
    points = 0
    offense_scored_td = False
    for row in rows:
        if row['touchdown'] == '1' and row['td_team'] == first['posteam'] and row['play_type'] in {'run', 'pass'}:
            points += 6
            offense_scored_td = True
        if row['field_goal_result'] == 'made' and row['play_type'] == 'field_goal':
            points += 3
        if offense_scored_td:
            points += int(row['extra_point_result'] == 'good') + 2 * int(row['two_point_conv_result'] == 'success')
    week = int(first['week'])
    turnover_start = first['drive_start_transition'] in {'INTERCEPTION', 'FUMBLE'}
    if first['defteam'] == 'SEA':
        drives.append([week, group, points, spot, first['posteam'], turnover_start])
    else:
        bucket = drive_comparison[week, group, turnover_start]
        bucket[0] += 1
        bucket[1] += points

payload = {'plays': seattle, 'weeks': sorted(seattle_weeks),
           'comparison': [[*key, count, round(total, 7)] for key, (count, total) in sorted(league.items())],
           'drives': drives,
           'drive_comparison': [[*key, *record] for key, record in sorted(drive_comparison.items())],
           'source_sha256': hashlib.file_digest(source.open('rb'), 'sha256').hexdigest(),
           'latest_seattle_game': max(play[6] for play in seattle)}
Path('data.js').write_text('globalThis.SEA_DEFENSE = ' + json.dumps(payload, separators=(',', ':')) + ';\n')
print(f'{len(seattle)} Seattle snaps, {len(seattle_weeks)} games, {sum(x[4] for x in payload["comparison"])} league snaps')
print(f'{len(drives)} Seattle defensive drives, {sum(x[3] for x in payload["drive_comparison"])} league drives')
