# Kestrel Recall: one expedition

The playable campaign connects Earth departure, ISS preparation, the Kestrel rescue, and a lunar camera survey. Mars is an ending hook, not an implemented destination. The ISS prologue and all spaceflight are fictional story scenes; the time-restoration emergency remains on fictional Kestrel Station.

## Story and controls

1. **Earth:** meet the mission and begin a launch. The short countdown/ascent is skippable.
2. **ISS:** click the power, life-support, and Scout stations. Alex walks to the selected station. Inspect with its button or E after arriving. All three checks unlock departure.
3. **Kestrel:** the existing eight-minute rescue runs unchanged. All five crew must board, and the Core must be offline before evacuation. The rescue debrief now offers **Continue the expedition**. Returning to the campaign later restarts this chapter with retained rescue discoveries, not an in-flight physical-state save.
4. **Transfer:** the crew recovers and resupplies before lunar transfer. This deliberate time passage avoids placing the injured Eli straight into another emergency.
5. **Moon:** Scout-01 acquires two beacons, at −20° and +20°, in each of two passes. Use the slider or left/right keys to issue absolute camera angles. Hold within ±2° for one second; the operator receives confirmation only after downlink delay. Failed or interrupted attempts can be retried. Successful passes unlock the ending.
6. **Ending:** all crew contribute to the discovery. Actual observed timings are shown, with no guaranteed performance-gain claim. Survey results can be reviewed/exported. A new completed expedition alternates comparison order and target order.

The camera chapter also offers a PNG download of the returned SIM source frame, without the predictive shift. These are simulated images, not physical camera captures.

The three-minute rescue-only demo remains available from the title. It does not unlock campaign exploration. Expedition chapter progress and survey summaries persist locally and in the Python service. If saving fails, local progress remains and the UI offers retry. The browser is the game simulation authority; SQLite persistence is not independent physical hardware verification.

## Ghost Frame integration

Source: https://github.com/Vedant321/ghost-frame at main snapshot **3f38071** (November 8, 2026). The source project calls itself Light Delay. Adapted modules are under `src/ghost`, retaining their original comments:

- Fixed-tick simulated pan camera, seeded motor and noisy measurements.
- Separate uplink/downlink queues, each configured to 1,300 ms.
- Predictor and adaptive recursive least-squares servo learner.
- Independent target evaluator and delayed trial notifications.
- Original lunar panorama rendering, prediction view, observed-frame inset, unknown-image margins, display stabilizer, and recent prediction-error bands.

`src/expedition/roverEngine.ts` adapts these modules to the campaign. Private simulator truth feeds only the evaluator and captured-frame store. The predictor receives issued commands and observations only after release through the downlink. Predicted image motion shifts an old frame and marks unseen margins; it does not generate new pixels.

Each comparison pass resets the seeded motor, learner, and command history. The learner runs in both conditions. Modes are fixed during a pass. Hiding the tab or a rendering gap over 500 ms invalidates the active attempt, with no success time. This story integration is not a replacement for Ghost Frame's full research/evaluation tools or calibrated hardware work.

The campaign is **SIM only**. Ghost Frame's Arduino sketch, camera diagnostics, marker detection, and manual-camera path remain in the source repository. They are not presented as a connected rover here. Hardware integration still requires calibrated independent angle observations and a suitable tested camera/mount/power arrangement.

## Backend and AI

- `GET /api/expedition`: session-scoped campaign checkpoint.
- `POST /api/expedition`: bounded, validated checkpoint and survey summaries. Duplicate crew/checks, inconsistent endings, invalid target sequences, fake success timing, and stale same-campaign revisions are rejected.
- `POST /api/expedition/advice`: read-only ECHO guidance using saved chapter context and explicitly client-reported camera telemetry. Uses the configured Gemini model; otherwise returns labelled authored guidance. No hardware or rescue mutations are available through this route.

Existing guarded station-radio tools remain the way to request rescue actions. New chapter guidance never sits in the camera-control loop. Camera commands and prediction stay local and responsive. The existing optional ElevenLabs integration applies to station radio; new campaign scenes currently use text and synthesized effects.

## Verification limits

Automated campaign tests cover progression gates, rescue transition, independent delay boundaries, both views reaching the same targets, delayed confirmation, alternating order, interruption semantics, checkpoint persistence/isolation/staleness, and offline/mocked-live/fallback Gemini guidance. Account-backed Gemini generation and physical hardware remain unverified. Public deployment is unchanged.
