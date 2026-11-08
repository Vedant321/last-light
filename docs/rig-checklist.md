# Scout hardware lab — adapted from Ghost Frame

The combined app serves the connection check at `/hardware.html` and printable cards at `/markers.html`. These diagnostics do not enable physical scoring or change campaign SIM results. The checklist below retains the upstream hardware checkpoint and limitations.

# Real hardware checkpoint

## Confirmed by teammate (2026-11-08)

- Board: Metro, powered by laptop USB.
- Grove rotary angle sensor: A0, separately tested.
- Grove button: D2, separately tested.
- LCD/RGB: I²C, separately tested. The first integration sketch did not initialize it; the revised sketch now shows the last accepted aim.
- SG-5010 servo: yellow signal to D9, brown to GND, red to Metro 5 V. **Only an unloaded swing was reported working.** No phone/dummy-load test or separate servo supply has been reported.
- ULN2003 stepper driver is not used by the SG-5010 servo.
- Teammate confirmed the revised sketch and browser diagnostic now work: LCD on, physical sign corrected, repeated command acknowledgement understood. This remains an unloaded check.
- Teammate confirmed the phone camera live/delayed check and the unloaded 1300 ms command-delay check. Exact phone device label/resolution and intrinsic camera latency were not reported.
- Teammate confirmed the marker-ID check worked with the phone held separately from the servo. Exact detection stability, mirroring and camera resolution were not reported.

## Browser + firmware check (no load)

1. Keep the servo horn clear and remove any load. In Arduino IDE, install the **Seeed Studio Grove LCD RGB Backlight** library if it is not already installed (`rgb_lcd.h`; [official library](https://github.com/Seeed-Studio/Grove_LCD_RGB_Backlight)). Select the actual Metro board/port and upload `firmware/light_delay/light_delay.ino`. The standard Servo library is also required.
2. Close Arduino Serial Monitor and any other app using that serial port.
3. Run `npm run dev` with Node 22.12+ and open `http://localhost:5174/hardware.html` in desktop Chrome.
4. Check that the LCD backlight turns on and shows `LIGHT DELAY` / `AIM +0 DEG`. Click **Connect Arduino**, choose the Metro port, and check that the page reports `READY,1` or live knob telemetry. The board may reset when the serial port opens; this firmware centres the servo on boot.
5. Rotate the knob: the raw value should change from 0 to 1023. Press and release the button: the page should show pressed/released.
6. Click `0°`, `−20°`, `+20°`, then `0°` one at a time. Teammate observed the old sketch's sign was reversed, so the revised sketch sets `SERVO_SIGN = -1`: `−20°` should pan left and `+20°` right from the operator's viewpoint. Check this physically. The LCD should update its aim. Each command should get an acknowledgement; that only means the target was accepted.
7. Click `−20°` twice. The accepted-command count should increase twice, while the servo only moves on the first click because both commands request the same absolute position.
8. Disconnect/reconnect and unplug/replug once. The page should stop accepting motor commands when disconnected. Record unexpected resets, LCD flicker, noise or stalled motion.

**Do not attach a phone yet.** The USB → Metro 5 V wiring passed only an unloaded test. For a dummy weight and phone, use a regulated servo supply suitable for the SG-5010, join its ground to Metro GND, and keep the supply's positive lead off the Metro 5 V pin. Verify the mount, cable slack, centre, sign and range before loading. Arduino's [servo troubleshooting guide](https://support.arduino.cc/hc/en-us/articles/360017053760-Troubleshoot-servo-motors) explains the separate supply/shared ground arrangement.

## Camera-only check (phone off the servo)

1. Make the phone appear as a webcam on the **same Windows laptop** running Chrome. If it does not appear as a camera device, use a phone webcam app/driver and test that first. **"Off the servo" means hold the phone or place it on its own stand; do not attach it to the servo horn or rotating platform. The servo carries no phone weight during these camera-only checks.**
2. Pull the latest branch, keep the local dev server running, refresh `http://127.0.0.1:5174/hardware.html`, and scroll to **4 · Check the phone camera**.
3. Click **Start camera** and allow Chrome's camera permission. The camera list may reveal names only after permission. If it starts the laptop webcam, select the phone camera and click **Switch camera**.
4. Point the camera at a moving hand or a running stopwatch. The right-hand view should follow the left-hand view about **1.3 s later**. The displayed age is measured from when the page copied a browser video frame; it **does not include unknown phone/driver capture latency**.
5. Note the selected camera's label, resolution, whether the image is mirrored, and any freezing. Do not change zoom, orientation, resolution or lens after later calibration.
6. Click **Stop camera** when done. Hiding the tab also stops capture so stale frames are not shown as fresh.

If camera permission is denied, enable it for `localhost` in Chrome and retry. `getUserMedia` needs a secure context such as localhost or HTTPS. The camera-only check has no marker measurements and is not a RIG trial.

## Delayed command check (servo unloaded)

1. Pull the latest branch and refresh `http://127.0.0.1:5174/hardware.html` on the laptop connected to the Metro. Keep the servo unloaded and click **Connect Arduino**.
2. Scroll to **5 · Check the command delay**. Click **Delay −20°** once. The page should count down from about 1.30 s. The servo/LCD should change only after the countdown, and the page should report a Metro acknowledgement.
3. Click **Delay +20°** and repeat. Watch for the correct physical direction. The command buttons are locked while one delayed command is waiting or awaiting acknowledgement, so this check does not pile up a command backlog.
4. While a delayed command is counting down, disconnect the Metro or hide the tab. The waiting command should be cancelled before send. If it has already been sent, the page says it may still move; browser cancellation cannot pull a command back from the Metro.

These buttons test the 1300 ms **uplink** only. The camera section above separately tests 1300 ms of software **downlink**. The phone remains off the servo; no camera-angle measurement or RIG scoring occurs here.

## Marker detection check (phone off the servo)

1. Pull the latest branch and run `npm install` once to get the pinned `js-aruco2@2.0.0` detector. Open `http://127.0.0.1:5174/markers.html` and print the three cards at normal scale, or show them on a second screen. They use the **ARUCO** dictionary: CENTRE = ID 17, A = ID 386, B = ID 925. Keep the full square and white border visible.
2. Open the hardware page, scroll to step 4, and start the phone camera. Then scroll to **6 · Check the square markers**. Point the phone at one card at a time. The preview should outline it and show the matching label/ID. Try each card in the middle and near both sides of the image.
3. Record which IDs are detected, whether the outline jumps or drops out, the video resolution, mirroring, zoom and camera label. Avoid glare and motion blur. Keep the phone **off** the servo during this check.
4. Do not use a displayed or commanded servo angle as measured camera angle. The tracker currently reports marker IDs and pixel centres only. Camera angle requires measured marker bearings, calibrated focal length/principal point, and a fixed camera lens/resolution/orientation. If no known marker is visible, the later rig observation must be invalid, never a fresh copy of the previous angle.

For a calibrated physical-angle experiment, measure each marker's forward distance `D` and sideways offset `X` from the camera pivot; its bearing is `atan2(X, D)`. Check angle sign, zero, scale, repeatability and agreement across markers. Manual rotation needs the lens to stay near the same pivot. Physical scoring stays disabled until static error is around 1° across the working range or the tolerance is widened and disclosed.

## Manual camera fallback (no phone on servo)

The team cannot make a supported phone-on-servo rig. A teammate can **act as the motor** instead. This is a human-assisted physical demo, not automatic camera actuation.

1. Keep the phone in a person's hand or a simple swivel stand. Mark one spot on the table for its camera/lens and rotate it around that spot as closely as possible; avoid walking the phone sideways. Keep the fixed marker cards in view.
2. Keep the Metro and LCD connected. The servo may remain **unloaded** as a separate actuator check, or be unplugged with power off. The sketch still accepts a delayed command and displays `AIM ±N DEG` on the LCD even if no servo is attached.
3. Person A clicks a delayed target on the hardware page without seeing the phone directly. After 1.3 s, the LCD shows the target. Person B reads the LCD and turns the phone by hand. The browser's delayed camera view follows about 1.3 s after the camera image reaches the laptop, **plus Person B's reaction/movement time**.
4. Use a simple protractor or marked left/centre/right positions to make the movement repeatable. The camera marker detector can show which card is visible. The current diagnostic does **not** compute a calibrated physical angle or run scored trials.

Label this setup **"manual camera"** when demonstrating it. Keep predictive-performance claims and scored A/B results in SIM until the manual motion has independent angle calibration and a fair protocol. The servo ACK means a target was accepted by the Metro; it does not mean Person B has moved the phone. Hand translation and wobble can make marker-angle estimates wrong even when marker IDs are detected.

## What remains for M6

- Use the verified diagnostic uplink behavior in the real game only after independent camera-angle measurement is ready; never mix SIM and RIG scores.
- Record the teammate's phone camera label, resolution, mirroring, frame dropouts and actual camera/driver latency. The page currently adds the 1300 ms downlink to browser video frames only.
- Run the two-person manual camera sequence above, then measure physical marker bearings and calibrate camera geometry/accuracy across the range if moving toward physical scoring. The fixed marker IDs were confirmed, but no physical angle calibration values exist yet.
- Gate RIG scoring on valid calibrated observations. Until then the hardware page is a diagnostic, and the game remains SIM.
