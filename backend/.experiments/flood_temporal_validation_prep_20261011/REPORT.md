# Flood temporal validation preparation — 2026-10-11

## Scope

Read-only inspection of the current Flood evaluation artifacts, dataset labels/splits, candidate experiment and camera pipeline. No code, weights, thresholds, labels, datasets, or prior experiment outputs were changed. No video evaluation, incident dispatch, notification, or training was run.

## Existing assets

- Production model is configured in `backend/app/ai/model_manager.py`: `Models/flood/runs/yolo11n_flood_waterlogging-3/weights/best.pt`.
- Current production threshold is `MODEL_THRESHOLDS["flood"] = 0.65` in `backend/app/ai/inference.py`. Both Flood and Waterlogging classes are accepted by that same model threshold and classify to incident type Flood.
- Dataset YAML: `D:\Akshay\major project\Project\Models\flood\dataset\final\data.yaml`; class IDs 0=Flood, 1=Waterlogging.
- Dataset split counts recorded in the previous audit: train 1,857 (4 empty labels), validation 230 (0 empty), test 237 (2 empty). SHA-256 and basename checks found no exact overlaps between splits; they did not rule out near-duplicates or related scenes.
- Existing audit outputs remain at `backend/.experiments/flood_accuracy_audit_20261011/` (270-image predictions CSV and report). Candidate experiment remains at `backend/.experiments/flood_fp_candidate_20261010/`, with candidate checkpoint `runs/flood_fp_finetune_3ep/weights/best.pt`. Its manifest contains 26 ordinary images assigned to candidate training and 7 held out. Prior candidate comparison: ordinary held-out qualifying images 1/7 original vs 0/7 candidate; labeled hazard sample 18/20 original vs 15/20 candidate. The candidate was not re-evaluated here and is not recommended for production.
- The repository scan and recursive scan of `D:\evaluation` found no video files. Current negative input is 33 ordinary still photos; the Flood dataset is image/label splits, not ordered video.

## Replay and dispatch safety

There is **no existing safe video replay tool** that processes ordered clips through production inference plus temporal confirmation while omitting dispatch.

The real request path is `POST /api/v1/camera/frame` in `backend/app/api/routes/camera.py`. It runs `run_inference()`, `classify_visual_detection()`, then `temporal_confirmation.process(device.id, classification)`; once confirmed, it directly calls `dispatch_classification()`. A real camera client invocation therefore targets a backend that may create incidents and send notifications. It must not be used as an evaluation replay against the live backend.

The closest existing coverage is `backend/tests/test_camera_temporal_integration.py`. It sends the same known Accident JPEG through the actual route four times, uses real YOLO inference, creates one incident in an isolated in-memory SQLite test database on frame 3, and checks that no notification row exists because the database has no users. This is a route integration test, not a video replay or no-dispatch mode, and it covers Accident rather than Flood. It was inspected, not run for this task. Do not treat its test database dispatch as a reusable replay mechanism.

The lower-level temporal object is directly reusable without dispatch: instantiate `TemporalConfirmation()`, feed it ordered `Classification` values, and call `reset(camera_id)` for no-hazard frames. However, no current script connects video decoding, actual `run_inference()` and `classify_visual_detection()` to that object while intentionally stopping before `dispatch_classification()`.

## Existing evaluator and threshold support

Existing evaluator: `backend/scripts/evaluate_hazard_models.py`. Its inputs are still-image directories and YOLO dataset YAMLs. It calls production `run_inference()` and `is_qualified_hazard_detection()`, records per-box confidence and whether the production threshold qualifies it, and writes one row per model/image. It does not accept threshold overrides, does not report threshold sweeps, and has no sequence/video mode. Its production threshold is supplied from `MODEL_THRESHOLDS`.

A manual post-processing sweep can filter the confidences saved in its CSV for thresholds at or above the detector's inference-time confidence cutoff. The model invocation does not explicitly set that cutoff, so candidates suppressed before boxes are returned cannot be recovered by post-processing. This is not a supported evaluator option and should not be reported as a reproducible model rerun. The evaluator's CSV stores confidence to six decimals; use the production helper/threshold for official production-aligned results. Per-class threshold overrides would require an evaluator enhancement or a separate analysis; production currently defines thresholds per model, not per Flood class.

No frame-level or incident-level temporal metric is supported by the evaluator. The previous 10/35 negative still-image result is not a 10/35 false incident rate.

## Exact commands and what was tested

From `backend/`, this command displays the supported evaluator inputs and was run successfully during this preparation:

```powershell
.venv/Scripts/python.exe scripts\evaluate_hazard_models.py --help
```

Previously, the still-image audit was run with the following command and its output is preserved in the prior experiment folder. This command reruns all three models and must target a new CSV path if rerun:

```powershell
.venv/Scripts/python.exe scripts/evaluate_hazard_models.py --negative-dir 'D:\evaluation\ordinary_camera' --flood-data-yaml 'D:\Akshay\major project\Project\Models\flood\dataset\final\data.yaml' --output '.experiments\<new-run-name>\predictions.csv'
```

No video replay command exists. No model evaluation was run during this preparation.

## Recommended validation protocol

1. **Collect sequences, not isolated frames.** Record ordinary camera sessions and genuine Flood and Waterlogging events from representative locations, including indoor ceilings/fans, walls, reflective floors, ordinary wet surfaces, camera movement, lighting changes, rain/runoff, and standing water. Record camera/site ID, source session, FPS, event start/end, and hazard class. Annotate event intervals and object boxes/classes where visible.
2. **Split by source group before extracting frames.** Assign entire recording sessions and locations to train/validation/test; never put frames from one clip/session in more than one split. Keep a final test cohort untouched until thresholds and any model changes are frozen. Keep current dataset test split untouched as a separate benchmark.
3. **Still-image report.** At the frozen production threshold, report box-matched precision/recall per class and mAP only if labels and IoU matching are used. Also report negative-image false-positive images / verified-negative images, plus confusion counts and unreadable files. Report Flood and Waterlogging separately and jointly. Do not count any detection in a labeled-positive image as a true positive without class/box matching.
4. **Ordered-video report.** Replay at production submission cadence (currently camera client defaults to 2 FPS) through real `run_inference()`, `classify_visual_detection()`, and a fresh `TemporalConfirmation` instance, but omit the camera route, database, `dispatch_classification()`, WebSocket and FCM. Report confirmed false incident triggers per negative clip and per camera-hour; detected/missed labeled events by Flood and Waterlogging; event recall; and detection delay from annotated event onset to the first confirmed positive. Count one confirmed trigger per streak until reset, consistent with production. Include per-clip details and explain how clips with overlapping hazards are classified because the production classifier has priority ordering.
5. **Compare policy fairly.** First establish a baseline at production thresholds and three consecutive sampled positives. A threshold sweep and alternate consecutive-frame setting may be explored on validation clips only; choose one operating point using the false-alarm/miss trade-off, then evaluate it once on untouched test clips. Never use the test clips to select a threshold or claim improvement.

## Smallest next implementation step and missing inputs

The next useful change is a standalone, read-only **Flood clip replay evaluator** under `backend/scripts/` that decodes supplied video files, samples frames at a configurable rate (default 2 FPS), calls the existing inference/classification functions and `TemporalConfirmation`, and logs confirmed triggers without importing the camera route or dispatch/notification code. It should accept per-model/per-class threshold overrides only as explicit evaluation parameters, default to production thresholds, write a per-frame CSV plus per-event/clip summary into a new experiment directory, and fail if an output path already exists.

Before running it, supply ordered ordinary indoor clips and genuine Flood/Waterlogging clips with session/site-grouped splits and event intervals. No suitable clips are currently present in the repository or `D:\evaluation`, so the evaluation dataset is the immediate blocker. No accuracy gain can be claimed until this fair held-out comparison is run.

