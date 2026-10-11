# Flood detection evaluation audit — 2026-10-11

## Scope and reproducibility

Read-only evaluation of the existing production Flood weights. No source, model, dataset, YAML, threshold, or label files were changed. Predictions are in `predictions.csv` (one row per image/model).

Run from `backend/`:

```powershell
.venv/Scripts/python.exe scripts/evaluate_hazard_models.py --negative-dir 'D:\evaluation\ordinary_camera' --flood-data-yaml 'D:\Akshay\major project\Project\Models\flood\dataset\final\data.yaml' --output '.experiments\flood_accuracy_audit_20261011\predictions.csv'
```

This used the installed Ultralytics/PyTorch environment and CUDA GTX 1050; no packages were installed. Evaluator output: 270 images evaluated, 0 skipped. Models evaluated by the shared evaluator: Fire, Flood, Accident. Flood model: `D:\Akshay\major project\Project\Models\flood\runs\yolo11n_flood_waterlogging-3\weights\best.pt`; threshold 0.65; class IDs 0=Flood, 1=Waterlogging. Candidate weights were not evaluated in this run. Earlier candidate results are documented below as prior, separate evidence.

## Data and split checks

Flood YAML: `D:\Akshay\major project\Project\Models\flood\dataset\final\data.yaml` (train/images, valid/images, test/images). Counts from the current folders:

| Split | Images | Label files | Empty labels |
|---|---:|---:|---:|
| Train | 1,857 | 1,857 | 4 |
| Validation | 230 | 230 | 0 |
| Test | 237 | 237 | 2 |

SHA-256 content-hash and basename comparison across train/validation/test found 0 exact-image overlaps for each pair. This rules out byte-identical duplicate images and same-name overlap; it cannot rule out near-duplicate frames, transformed copies, or related scenes with different files.

The evaluation contains the 33 images in `D:\evaluation\ordinary_camera` plus all 237 Flood test images. The 2 empty-label test images and all 33 manually verified ordinary images were treated as verified negatives (35 total). The remaining 235 test images have Flood dataset labels and were treated as known hazard images. Empty Flood labels verify absence of the dataset's Flood/Waterlogging annotations only; the ordinary photos were separately manually verified as non-hazard scenes.

## Image-level results at production threshold

For the binary question “does this image contain at least one qualifying Flood-family prediction?” (not bounding-box matching):

| Count | Value |
|---|---:|
| Verified-negative images | 35 |
| Negative images with a qualifying prediction (FP images) | 10 |
| Negative images without one (TN images) | 25 |
| Labeled Flood/Waterlogging images | 235 |
| Labeled images with a qualifying Flood-family prediction | 206 |
| Labeled images without one (FN images) | 29 |

Derived image-level metrics: precision 95.37% (206/216), recall 87.66% (206/235), false-positive rate 28.57% (10/35), and false-negative rate 12.34% (29/235). Here, a “true positive” means only that a labeled-positive image had any qualifying Flood or Waterlogging box; there is no IoU/object matching. These are image-level proxy metrics for this sample, not detector mAP, object precision/recall, frame-level live performance, or incident-level rates.

Class-presence view (each class is independently counted as present/absent per image; an image may contain both classes):

| Class | GT-present images | Predicted-present images | TP | FN | FP | TN | Precision | Recall | FPR | FNR |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Flood | 230 | 206 | 195 | 35 | 11 | 29 | 94.66% | 84.78% | 27.50% | 15.22% |
| Waterlogging | 110 | 33 | 30 | 80 | 3 | 157 | 90.91% | 27.27% | 1.88% | 72.73% |

Class-presence metrics are also image-level and do not verify box location or class correctness for individual objects. The strongest class-specific gap here is Waterlogging recall (30/110); independently labeled class presence is a stricter question than the combined Flood-family detection result.

## Negative errors and scene review

The Flood model had 10 false-positive images among the 33 ordinary photos; the other 2 negatives are empty-label Flood test images. There were 12 qualifying Flood boxes across those 10 error images (box count is not the image FP count). The qualifying class for all 10 was Flood; none was Waterlogging. Full scores and paths are recorded in `predictions.csv`. Ordinary-image examples include `IMG_8619.JPG` Flood 0.919919, `IMG_8633.JPG` Flood 0.876850, and ceiling/fan image `IMG_8621.JPG` Flood 0.806043. Visual review of the 10 FP images found varied ordinary indoor content: ceilings/fans, blank walls and doors, tiled/reflection-heavy floors, and furnished rooms. Thus the observed errors are not isolated to one scene subtype; this small set does not support reliable per-scene rates.

Replaying the evaluator's shared model thresholds and classifier priority over the 33 ordinary images gives 10 Flood classifications and 23 no-hazard classifications; no Fire or Accident model qualification displaced these Flood results. This is still image-level only. It does not apply temporal state.

## Production alignment and limitations

The evaluator uses the backend's shared hazard qualification helper and production class mapping/threshold (Flood 0.65; Waterlogging maps to Flood), using unrounded confidence for qualification. It evaluates still images independently and does **not** run the camera endpoint's three-consecutive-positive temporal confirmation, frame cadence, camera-state resets, or incident dispatch. Consequently, 10/35 negative stills cannot be interpreted as a 28.57% incident/notification false-dispatch rate. Three consecutive consistent classifications are required in production; temporal performance needs representative ordered video clips, including sustained ordinary scenes and real incidents.

The run summarizes all three models per image, but Flood-specific labels are only available for the Flood dataset and manually verified ordinary photos. Fire/Accident outputs on Flood-positive photos are descriptive only. The evaluation does not measure visual severity or incident outcomes.

## Prior candidate evidence (separate existing experiment)

The prior experiment at `backend/.experiments/flood_fp_candidate_20261010/` used the same 0.65 qualification threshold on 7 held-out ordinary photos and 20 labeled Flood/Waterlogging photos. Original/candidate qualifying images were 1/7 vs 0/7 ordinary and 18/20 vs 15/20 hazard. This is a small descriptive sample, not an independent broad validation or proof of improvement. Its manifest lists 26 ordinary images for candidate training and 7 held out; the 7 reported held-out images were not listed in candidate training. Original test split was retained.

## Recommendation

Keep the production weights and threshold for now. Prioritize collecting diverse, verified ordinary negatives from actual camera viewpoints (ceilings/fans, reflective floors, blank walls, changing light, camera motion) and additional genuine Flood/Waterlogging scenes. Freeze a new split by source location/recording session before training: keep all frames from a scene/session in only one split, reserve a final untouched test set, and do not tune on it. First compare threshold-only operating points and temporal behavior on an ordered validation video set; changing threshold trades missed hazards for fewer false alarms and needs explicit operating-point review. If retraining is later tested, train only on training scenes, tune on validation scenes, then report both per-class box-matched metrics and frame/incident-level false dispatches on untouched test clips. Do not replace production weights unless that held-out comparison supports it.

