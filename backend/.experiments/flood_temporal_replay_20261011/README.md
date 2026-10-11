# Flood temporal replay evaluator

This folder is reserved for a manifest and run outputs. No video inputs are currently available locally, so no real-model replay metrics have been generated. The evaluator refuses to overwrite an existing output directory.

## Manifest format

Create a UTF-8 CSV with this exact header:

```csv
clip_id,camera_id,recording_group,split,media_type,path,clip_label,input_fps,labels,events_json
```

- `clip_id`: unique clip or still identifier.
- `camera_id`: source camera identity; required for provenance. Temporal state is still reset between clips so separate clips never join a streak.
- `recording_group`: recording session/location grouping. The evaluator rejects any group assigned to more than one split.
- `split`: for example `train`, `validation`, or `test`; run one split with `--split`. Freeze assignment before evaluating.
- `media_type`: `video`, `frames`, or `still`.
- `path`: video/image file, or directory containing ordered image frames. Relative paths resolve from the manifest directory. Frame directories require `input_fps` so timestamps are defined.
- `clip_label`: `verified_negative`, `labeled_hazard`, or `unannotated`.
- `input_fps`: source FPS for timestamping a frame directory, or optional FPS override for video. Video metadata is used when omitted.
- `labels`: for a still image, pipe-separated class labels `Flood` and/or `Waterlogging`; empty for verified-negative stills. Do not use this field for video event labels.
- `events_json`: for a labeled video/frame sequence, a JSON array of annotated intervals, e.g. `[ {"event_id":"event-1","class":"Waterlogging","start_seconds":4.2,"end_seconds":9.6} ]`. Use an empty cell only when there are no event annotations. Event intervals are relative to clip start.

Use separate recording groups for train, validation, and test; do not put frames from the same source session/location into multiple splits. Verify ordinary negatives and annotate genuine Flood and Waterlogging event intervals before calculating recall or delay.

## Invocation

Run from `backend/`, choosing a new, nonexistent output directory for every run:

```powershell
.venv/Scripts/python.exe scripts/evaluate_flood_temporal_replay.py --manifest .experiments/flood_temporal_replay_20261011/manifest.csv --split test --sample-fps 2 --output-dir .experiments/flood_temporal_replay_20261011/run_001
```

Optional `--flood-threshold 0.70` is an experimental, in-process override for the Flood model and applies equally to Flood and Waterlogging. It is restored before the process exits and never edits production configuration. Default is the production threshold. Output is `frames.csv` plus `summary.json`; null rates mean the data has no valid denominator/annotations.

The script uses the configured production weights and existing inference, qualification, classifier, and temporal-confirmation implementations. It does not import or call the camera route, dispatch, database, WebSocket, or notification code. Simulated triggers are the endpoint of this evaluation path.
