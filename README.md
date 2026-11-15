# Gesture Meme Cam

React + Vite browser camera experiment based on the publicly served Gesture Meme Cam. Run `npm install`, `npm run dev`, then open the localhost URL. Camera access also works on HTTPS. Build with `npm run build`; `npm run preview` serves `dist/`. Deploy `dist/` to a static host such as Vercel or Cloudflare Pages. Hash routes work without server rewrites.

The camera starts only after a click. MediaPipe gesture and face models and WASM are bundled locally; video and landmarks stay in the browser. Hand and face inference runs on each new camera frame when the device can keep up. Two matching frames and a 100 ms cooldown stabilize reactions. The camera stops on navigation. Gestures are listed in the side panel. The deterministic tests (`npm test`) exercise a subset of geometry and stabilization; they do not establish real-world recognition accuracy.

## Reference and limitations

The reference's publicly served [Cat](https://gesturememecam.vercel.app/packs/cat.js) and [Monke](https://gesturememecam.vercel.app/packs/monke.js) packs document their gestures and asset filenames. `src/data/memes.ts` records each mapping and its source URL. These mappings are verified against source, not tested against the original camera or real poses. The original site uses `#/monke`.

The Cat and Monke media files are stored in `public/memes/`, downloaded from the reference site's publicly served asset URLs recorded in `src/data/memes.ts`. The original source and image rights have not been independently verified; public availability alone does not establish redistribution rights. The Cat repository has no license and the Monkey repository cautions that images may require separate permission.

Spin, downward head tilt, folded arms and lean-in detection are not implemented. Other rules are approximations of reference gestures and have not been calibrated on real webcam footage. The reference UI could be inspected through its served HTML/CSS/JS, but screenshots and visual comparison were unavailable. The supplied references are not verified copies of the target site. Models are from Google MediaPipe; see https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer and https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker.

## Cloudflare Pages

Connect a Git repository containing this project and choose the React (Vite) preset. Set the root directory to the repository root, build command to `npm run build`, and output directory to `dist`. The `.nvmrc` pins Node.js 24. No application secrets, environment variables, Workers, or database bindings are required. Cloudflare's HTTPS URL enables browser camera access after the visitor grants permission. Hash routes require no redirects. Verify rights to the included reaction media before public distribution.
