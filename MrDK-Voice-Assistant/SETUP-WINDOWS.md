# Mr.DK Windows setup — beginner-friendly

## A. Before you start

You need **Windows 10/11 x64**, 16 GB RAM recommended, 10+ GB free disk, working microphone/speakers and internet for **initial downloads only**. Integrated Intel/AMD graphics is supported via CPU inference, but model response and speech recognition may be slow. Models are not included in this source ZIP.

1. Install **Node.js LTS** from https://nodejs.org/en/download (includes npm).
2. Install **Ollama for Windows** from https://ollama.com/download/windows.
3. Extract `MrDK-Voice-Assistant.zip` into `C:\Projects\MrDK-Voice-Assistant` (or any directory).
4. Open the extracted folder in VS Code. Choose Terminal > New Terminal, then run the commands below.

## B. Download the local AI

```powershell
node --version
npm --version
ollama --version
ollama pull qwen3:4b
ollama list
```

**Tamil/Tanglish:** Idhu Qwen model-ai un PC-ku download pannum. Internet first download-ku mattum thevai. Ollama running irukkanum whenever AI chat use pannureenga.

If a 4B model feels slow, run `ollama pull qwen3:1.7b` and set **Settings > Ollama model name** to `qwen3:1.7b`.

## C. Install packages and run source code

```powershell
cd C:\Projects\MrDK-Voice-Assistant
npm install
npm run dev
```

A Windows app should open. On first run **Ollama model online** should be green after Qwen is downloaded. Go to **AI Conversation** and type `Hey Mr.DK, help me plan my day.`

`npm run dev` launches Vite dev server + Electron. Keep that terminal open. Close the window to minimize to tray; use its tray menu **Quit Mr.DK** when you want to end the process.

## D. Enable your offline voice input

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-whisper.ps1
```

Expected output gives two paths:
- `whisper-cli.exe`: e.g., `C:\Projects\MrDK-Voice-Assistant\tools\whisper\Release\whisper-cli.exe`
- `ggml-base.bin`: e.g., `C:\Projects\MrDK-Voice-Assistant\tools\whisper\ggml-base.bin`

In **Mr.DK > Settings > Offline Whisper**, click Browse for the executable and model. Do not assume the `.exe` is always inside `Release`: use the path actually printed by the script.

Check Windows **Settings > Privacy & security > Microphone**: allow microphone access to desktop applications. In Mr.DK, click **Talk to Mr.DK**, speak naturally, and stop speaking. The app uses voice activity to end the recording after silence, then Whisper transcribes it and Ollama answers. If recognition does not start, try Windows Sound settings to select a working input device.

**Tamil:** `ggml-base.bin` multilingual model-ai use pannunga, `.en` model-ai use panna Tamil recognize aagaadhu. Better accuracy-ku `-Model small` download pannalaam (CPU slow aagalam).

## E. Wake phrase "Hey Mr.DK"

After manual voice works:

1. Open **Settings > Voice & wake word**.
2. Turn on **Experimental "Hey Mr.DK"**.
3. Say clearly **"Hey Mister D K"** or **"Hey Mr.DK"**.
4. Mr.DK responds **"Yes Lafri! Sollunga"** / **"Yes Boss! I'm listening"** if the phrase is recognized.
5. Speak your task after the reply.

Wake mode keeps the mic active and uses repeated Whisper transcriptions. It is an **experimental, CPU-heavy** approach and can miss activations. For reliable control use the **Talk to Mr.DK** button or **Ctrl+Shift+Space**.

For privacy the mic is **off by default**. If enabled, wake mode can continue running when the window is hidden to the tray. Use Quit to stop it completely.

## F. Build the installer `.exe`

Run from Windows PowerShell in the project folder:

```powershell
npm run build
npm run dist
```

Find the installer inside `release/`. Building on Windows is recommended; Linux builds here cannot verify Windows SAPI, microphone, notifications, signing or tray.

Windows may warn that a personally compiled unsigned app is from an unknown publisher. For personal use, verify that the binary was generated from your own files; distributing to others normally requires code signing.

## G. Troubleshooting

- **`ollama` not recognized**: restart PowerShell after installing Ollama; check its installation and PATH.
- **`model not found`**: run `ollama pull qwen3:4b` and use the same model name in settings.
- **`npm` not recognized**: reinstall Node.js LTS and restart the terminal.
- **Electron blank window**: verify Vite started on `http://127.0.0.1:5173`; check terminal for an error; run `npm run build` to check React syntax.
- **Voice not configured**: choose both exact paths in Settings. `setup-whisper.ps1` should print them after downloading.
- **Whisper DLL missing**: keep the DLLs shipped in the whisper.cpp archive alongside the executable; don't move `whisper-cli.exe` alone.
- **Speech output in Tamil sounds wrong**: Windows built-in SAPI voice availability differs. Use typed responses until a compatible local Tamil TTS engine is installed/integrated.
- **Notifications fail**: Mr.DK must be running; check Windows notification permissions and Focus Assist. Don't Quit the app.
- **Slow on 16 GB CPU**: switch Qwen to `qwen3:1.7b`, turn off wake mode and use `ggml-base.bin` or a smaller multilingual model.
- **`PowerShell cannot run scripts`**: run provided setup as `powershell -ExecutionPolicy Bypass -File .\scripts\setup-whisper.ps1`. This bypass applies only to this invocation.

For a quick dependency check:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\doctor.ps1
```
