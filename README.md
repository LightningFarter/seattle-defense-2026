# Seattle Defense · 2026 Snap Explorer

A static explorer for Seattle's 2026 regular-season defense. Its field-position table compares opposing offensive scoring with the rest of the league, optionally limited to drives that followed an interception or fumble. The down-and-distance matrix compares offensive EPA across the same game weeks. Select a matrix cell to inspect representative Seattle plays.

Open `index.html` in a browser. The app has no service dependencies.

## Reproduce the data

Download the `play_by_play_2026.csv.gz` asset from the [nflverse play-by-play release](https://github.com/nflverse/nflverse-data/releases/tag/pbp) and run `python3 build_data.py play_by_play_2026.csv.gz`. `data.js` records the original snapshot's SHA-256 hash. Rebuilding against a newer release may update the values and game count.

The league reference excludes Seattle and uses the same NFL week selection. The first scrimmage play identifies drive starting field position. Drive points include offensive touchdowns, made field goals and associated conversions in the drive. Return scores and safeties are excluded. EPA reflects the offense's change in expected points, so lower offensive EPA is better for the defense. These are descriptive averages without opponent-strength adjustment.

The code is MIT-licensed. The underlying and derived play-by-play data is attributed to nflverse under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). This independent project was built with an AI assistant. It is unaffiliated with the Seattle Seahawks or the NFL.
