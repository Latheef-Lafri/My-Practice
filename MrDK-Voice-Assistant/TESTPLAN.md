# Functional smoke-test checklist — Windows

- [ ] Run `npm install`; `npm test`; `npm run build` without errors.
- [ ] Run `ollama pull qwen3:4b`; start Mr.DK; status shows local model installed.
- [ ] Text: "Hello Mr.DK" returns an appropriate AI answer.
- [ ] Add a task manually, change priority, mark done, edit, delete; restart app; data persists.
- [ ] Add an event manually, edit, delete; see it in Today's schedule if today.
- [ ] Add a reminder 2 minutes in the future; close the window (do not Quit); see Windows notification.
- [ ] Add water 250 ml; log 1 hour exercise; verify totals and entry deletion.
- [ ] Add a personal preference and ask AI to recall it; delete memory to forget it.
- [ ] Ask AI to add a task and check persisted dashboard entry; verify no false confirmation on failure.
- [ ] Configure Whisper; press Talk to Mr.DK, speak; observe orbit reacting and transcribed text.
- [ ] When listening stops, AI reply appears and speaks via Windows built-in voice.
- [ ] Enable experimental wake mode; say "Hey Mr.DK", wait for activation; follow with a command.
- [ ] Trigger global hotkey Ctrl+Shift+Space; verify activation with app visible and tray-hidden.
- [ ] Export SQLite data backup; verify `.sqlite` exists and is nonempty.
- [ ] Toggle run-at-login off/on; verify Windows startup behavior manually.
- [ ] Test `npm run dist` from Windows; install the generated NSIS `.exe`; open it.
- [ ] Offline network: after all models are installed, disconnect internet and test local chat/forms.
- [ ] Windows privacy: disabling wake mode stops microphone usage; quitting tray stops reminders.

**Not auto-verified in this ZIP:** Windows voice runtime, Tamil speech output, microphone access, release signing, packaged app behavior, and local Ollama inference quality. They need an actual Windows PC.
