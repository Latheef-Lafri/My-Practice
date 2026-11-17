# Architecture and safety notes

```text
                    WINDOWS DESKTOP (Electron)
   ┌───────────────────────────────────────────────────┐
   │ React dashboard + real microphone reactive orb  │
   │ React UI (no direct Node access)                 │
   └──────────────────────┬────────────────────────────┘
                          │ allowlisted IPC via preload
   ┌──────────────────────▼────────────────────────────┐
   │ Electron main process                             │
   │ UI IPC / tray / global hotkey / desktop alerts    │
   └─────┬─────────────────┬──────────────────┬─────────┘
         │                 │                  │
         ▼                 ▼                  ▼
  SQLite via sql.js     Voice services    Local AI engine
  tasks/events/logs     whisper-cli.exe   Ollama localhost
  preferences/memory    Windows SAPI TTS  qwen3:4b tools
```

## Offline model assumptions

Qwen runs in a separate **Ollama** process on `127.0.0.1:11434`; no model downloads inside the app. `whisper-cli.exe` and ggml model paths are configured manually. Text output is converted into spoken sound by **Windows SAPI**. No Python runtime or paid services are required.

## Local data tables

- `tasks`: title, date, time, priority, estimated duration, done flag.
- `events`: start/end and description.
- `reminders`: future alert date/time and notified flag.
- `wellness`: `water` (ml), `sleep` (hours), `exercise` (minutes), `symptom` (severity 1–10 plus note), date, note.
- `memories`: opt-in freeform preferences.
- `messages`: local chat history.
- `settings`: model, voice, wake, owner name, speech binary/model paths.

All data lives in a single `mrdk.sqlite` file in Electron's Windows `userData` directory, normally under `%APPDATA%\mrdk-voice-assistant\` (folder name depends on Electron packaging/product configuration). **Settings > Export SQLite backup** copies it to your chosen destination.

## Trust boundary

- Electron renderer has `nodeIntegration:false`, `contextIsolation:true`. IPC exposes only specific application functions.
- AI tools are **allowlisted**, have parameter validation and cannot access shell, arbitrary files or external websites.
- SQL queries use bound parameters for values. Dataset is stored locally but **not encrypted**. Use a private Windows user account and disk encryption for sensitive data.
- The application does not transmit wellness data to a third-party service; it is included in prompts sent to your local Ollama service.
- No camera, location, web-browsing, medical diagnosis or automatic file-system commands are implemented.
- Wake mode is a voice-to-text phrase matcher, not a dependable, low-latency custom neural wake-word engine. Whispers may be misrecognized. Long audio segments increase CPU load.

## Product boundaries / future work

1. Tamil speech *recognition* is via multilingual Whisper. Recognition depends on hardware, accent, environment and model; Tamil TTS needs a separately validated voice if not installed in Windows.
2. Scheduling currently uses the PC's local clock and system notifications; the PC must stay powered on with Mr.DK running.
3. There is no bidirectional synchronization with Google Calendar, phone alarms or smartwatches.
4. There are no automatic medical readings or diagnosis, and no 24/7 fully reliable hotword guarantee.
5. For higher wake reliability later: integrate a customized offline wake-word model, test recognition on recorded Sri Lankan Tamil/Tanglish speakers, avoid continuous full Whisper inference.
