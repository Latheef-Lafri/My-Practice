# Mr.DK — Personal AI Voice Assistant (Windows)

An **offline-first**, **no-paid-API** Windows desktop assistant built for **Lafri**.

## Features included

- React + Electron desktop dashboard with a custom **animated, sound-reactive voice orb**.
- Free local AI responses via **Ollama** (`qwen3:4b` initially).
- Offline speech-to-text via **whisper.cpp**, with microphone recording converted to 16 kHz WAV (after one-time setup).
- Windows built-in system speech output (SAPI via PowerShell); works best with installed English voices. Tamil TTS quality depends on Windows voices and is not guaranteed.
- Optional **experimental** transcript-based wake phrase: **"Hey Mr.DK"** / **"Mr.DK"**. Default activation reply alternates between **"Yes Lafri! Sollunga."** and **"Yes Boss! I'm listening."**
- Voice or text tool actions: add/list/complete/delete tasks, schedule/read/delete events, create/list/cancel reminders, log/read wellness habits including symptom severity, save/read personal memory.
- Manual to-do list, planner, reminders, wellness log, conversation, memory controls and backup export.
- Local SQLite database using the `sql.js` WebAssembly build, stored in Electron `userData`.
- Windows tray app, global shortcut `Ctrl + Shift + Space`, and opt-in run-at-login.
- Notifications while the application is running (even when its window is hidden in the tray).
- Privacy: data stored locally; Ollama API at `127.0.0.1:11434`. No telemetry, remote login, or cloud API in the application code.

**Important:** Source code is supplied. An installer (`.exe`) is **not precompiled**; build it on Windows using `npm run dist`. Voice inference, Windows tray, TTS and packaged `.exe` must be tested on a Windows PC. This ZIP was not verified end-to-end on Windows.

## Quick start (Windows PowerShell)

```powershell
# Requirements: Node.js LTS, Ollama, internet for initial npm/model downloads
ollama pull qwen3:4b
npm install
npm run dev
```

Open the UI and type **"Hi Mr.DK"** in AI Conversation. Without Ollama, tasks and other local forms still work.

### Enable offline microphone recognition

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-whisper.ps1
```

The optional setup script downloads official whisper.cpp Windows CPU binaries and a multilingual base model. In the app: **Settings > Offline Whisper**, select `whisper-cli.exe` and `ggml-base.bin`. Press **Talk to Mr.DK** (speech-to-text can take several seconds on an integrated-GPU/CPU machine).

For more accuracy (but slower CPU speed), run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-whisper.ps1 -Model small
```

### Wake word mode

Enable **Settings > Experimental "Hey Mr.DK"** after Whisper works. This repeatedly transcribes short speech clips to detect a phrase; it is not a dedicated low-power wake-word neural network and **is not guaranteed to be reliable or instantaneous**, especially on CPU. Microphone is off by default. Disable wake mode or use the manual mic button if you see lag.

### Windows installer

```powershell
npm run dist
```

Output: `release/` (the actual installer filename varies by build configuration). The installer does **not** bundle Ollama, Qwen, Whisper or Whisper models; install/configure those separately. This avoids distributing large third-party models.

See **SETUP-WINDOWS.md**, **ARCHITECTURE.md**, **TESTPLAN.md** for complete steps.

## Notes on health and privacy

The wellness module records user-reported water, sleep, exercise and self-described symptom severity. Progress bars use example targets only and are not clinical recommendations. There is no sensor or medical-record integration, and Mr.DK should not diagnose conditions. User information may appear in Ollama prompts but those requests are directed only to the **local** Ollama instance. Data is not encrypted at rest; secure your Windows profile and disk (e.g., BitLocker). Export backups via Settings.

A free local LLM cannot guarantee correct factual answers or action extraction. Inspect saved tasks and reminders after voice commands. Tamil/English/Tanglish transcription depends heavily on the Whisper model and microphone.

## Commands to try

- "Hey Mr.DK" → "Yes Lafri! Sollunga."
- "Remind me tomorrow at 9 AM to start class preparation."
- "Add a high priority task to finish my project on Friday."
- "What are my tasks today?"
- "Schedule a meeting tomorrow from 2 PM to 3 PM."
- "I drank 500 ml of water."
- "Remember that I prefer studying in the evening."
- "Plan today's tasks around my scheduled meetings." (proposes a plan, does not silently create events)

## File layout

```text
MrDK-Voice-Assistant/
├── electron/main.cjs       Windows app entry, tray, notifications and IPC
├── electron/preload.cjs    Safe renderer bridge
├── electron/speak.ps1      Windows system voice output
├── backend/store.cjs       Persisted SQLite tables and CRUD
├── backend/ai.cjs          Ollama API and tool handlers
├── src/App.jsx             Full desktop dashboard / forms
├── src/components/VoiceOrb.jsx   Realtime orb animation
├── src/components/useVoice.js    16k WAV, mic, wake phrase pipeline
├── src/style.css           Dashboard theme
├── scripts/               Windows setup checks
└── tests/                 Basic database/unit tests
```

### Useful references

- Ollama models: https://ollama.com/library/qwen3
- Ollama tool calling: https://docs.ollama.com/capabilities/tool-calling
- whisper.cpp: https://github.com/ggml-org/whisper.cpp/releases
- Whisper models: https://huggingface.co/ggerganov/whisper.cpp/tree/main
- Electron security: https://www.electronjs.org/docs/latest/tutorial/security
