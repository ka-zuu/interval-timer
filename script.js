/**
 * Interval Timer Application
 */

// --- Constants & Types ---
const STORAGE_KEY = 'TIMER_PRESETS';

// --- State Management ---
const state = {
    presets: [],
    currentPresetId: null,
    timer: {
        active: false,
        paused: false,
        startTime: 0,
        remainingTime: 0, // ms
        totalDuration: 0, // ms (of current step)
        currentStepIndex: 0,
        currentRepetition: 1,
        schedule: [], // Flattened list of steps to execute
        animationFrameId: null,
        lastTick: 0
    }
};

// --- Storage Manager ---
class StorageManager {
    static loadPresets() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            return JSON.parse(data);
        }
        return this.seedDefaults();
    }

    static savePresets(presets) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    }

    static seedDefaults() {
        const defaults = [
            {
                id: 'preset-1',
                name: 'HIIT 20/10',
                sets: [
                    { type: 'work', duration: 20 },
                    { type: 'rest', duration: 10 }
                ],
                repetitions: 8,
                break_duration: 0
            },
            {
                id: 'preset-2',
                name: 'Pomodoro 25/5',
                sets: [
                    { type: 'work', duration: 1500 }, // 25 min
                    { type: 'rest', duration: 300 }   // 5 min
                ],
                repetitions: 4,
                break_duration: 1800 // 30 min long break
            }
        ];
        this.savePresets(defaults);
        return defaults;
    }

    static addPreset(preset) {
        const presets = this.loadPresets();
        presets.push(preset);
        this.savePresets(presets);
        return presets;
    }

    static updatePreset(updatedPreset) {
        const presets = this.loadPresets();
        const index = presets.findIndex(p => p.id === updatedPreset.id);
        if (index !== -1) {
            presets[index] = updatedPreset;
            this.savePresets(presets);
        }
        return presets;
    }

    static deletePreset(id) {
        let presets = this.loadPresets();
        presets = presets.filter(p => p.id !== id);
        this.savePresets(presets);
        return presets;
    }
}

// --- Audio Controller ---
class AudioController {
    constructor() {
        this.audioContext = null;
        this.initialized = false;
    }

    init() {
        if (!this.initialized) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.initialized = true;
        } else if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    playTone(frequency, duration, type = 'sine') {
        if (!this.audioContext) return;

        const osc = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        osc.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        osc.start();
        osc.stop(this.audioContext.currentTime + duration);
    }

    playStepChange() {
        // Short high beep for step change
        this.playTone(880, 0.1, 'sine');
    }

    playComplete() {
        // Melodic sequence for completion
        if (!this.audioContext) return;

        const now = this.audioContext.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + i * 0.15);

            gainNode.gain.setValueAtTime(0.1, now + i * 0.15);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.3);

            osc.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            osc.start(now + i * 0.15);
            osc.stop(now + i * 0.15 + 0.3);
        });
    }
}


// --- Timer Engine ---
class IntervalTimer {
    constructor(onTick, onComplete, onStepChange) {
        this.onTick = onTick;
        this.onComplete = onComplete;
        this.onStepChange = onStepChange;
        this.schedule = [];
        this.currentIndex = 0;
        this.remainingInStep = 0; // ms
        this.timerState = 'stopped'; // stopped, running, paused
        this.animationFrameId = null;
        this.lastFrameTime = 0;
    }

    start(preset) {
        this.buildSchedule(preset);
        this.currentIndex = 0;
        this.timerState = 'running';
        this.startStep(this.schedule[0]);
        this.lastFrameTime = performance.now();
        this.tick();
    }

    buildSchedule(preset) {
        this.schedule = [];
        const repDuration = preset.sets.reduce((sum, s) => sum + s.duration, 0);

        for (let i = 0; i < preset.repetitions; i++) {
            preset.sets.forEach(set => {
                this.schedule.push({
                    ...set,
                    repIndex: i + 1,
                    totalRepDuration: repDuration,
                    totalReps: preset.repetitions
                });
            });
        }

        if (preset.break_duration > 0) {
            this.schedule.push({
                type: 'long_break',
                duration: preset.break_duration,
                repIndex: preset.repetitions, // Considered part of last rep or separate? Let's say separate.
                totalRepDuration: preset.break_duration,
                totalReps: preset.repetitions
            });
        }
    }

    startStep(step) {
        if (!step) {
            this.complete();
            return;
        }
        this.remainingInStep = step.duration * 1000;
    }

    pause() {
        if (this.timerState === 'running') {
            this.timerState = 'paused';
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    resume() {
        if (this.timerState === 'paused') {
            this.timerState = 'running';
            this.lastFrameTime = performance.now();
            this.tick();
        }
    }

    reset() {
        this.timerState = 'stopped';
        cancelAnimationFrame(this.animationFrameId);
        this.schedule = [];
        this.currentIndex = 0;
        this.remainingInStep = 0;
    }

    complete() {
        this.timerState = 'stopped';
        cancelAnimationFrame(this.animationFrameId);
        if (this.onComplete) this.onComplete();
    }

    tick() {
        if (this.timerState !== 'running') return;

        const now = performance.now();
        const delta = now - this.lastFrameTime;
        this.lastFrameTime = now;

        this.remainingInStep -= delta;

        if (this.remainingInStep <= 0) {
            // Step finished
            // Handle overshoot? For now, just move to next step
            this.currentIndex++;
            if (this.currentIndex >= this.schedule.length) {
                this.complete();
                return;
            }
            this.startStep(this.schedule[this.currentIndex]);
            if (this.onStepChange) this.onStepChange(this.schedule[this.currentIndex]);
        }

        if (this.onTick) {
            this.onTick(this.getState());
        }

        this.animationFrameId = requestAnimationFrame(() => this.tick());
    }

    getState() {
        const currentStep = this.schedule[this.currentIndex];
        if (!currentStep) return null;

        // Calculate progress within the current repetition
        // We need to know how much time is remaining in the CURRENT REPETITION.
        // This includes the current step's remaining time + all subsequent steps in this rep.

        let remainingInRep = this.remainingInStep;
        for (let i = this.currentIndex + 1; i < this.schedule.length; i++) {
            const step = this.schedule[i];
            if (step.repIndex === currentStep.repIndex && step.type !== 'long_break') {
                remainingInRep += step.duration * 1000;
            } else {
                break;
            }
        }

        // If it's a long break, progress is just based on itself
        let totalRepDuration = currentStep.totalRepDuration * 1000;
        if (currentStep.type === 'long_break') {
            remainingInRep = this.remainingInStep;
            totalRepDuration = currentStep.duration * 1000;
        }

        return {
            stepName: currentStep.type,
            timeRemaining: Math.ceil(this.remainingInStep / 1000),
            repIndex: currentStep.repIndex,
            totalReps: currentStep.totalReps,
            progress: 1 - (remainingInRep / totalRepDuration) // 0 to 1
        };
    }
}

// --- UI Controller ---
class UIController {
    constructor() {
        this.presetListEl = document.getElementById('preset-list');
        this.modal = document.getElementById('preset-editor-modal');
        this.form = document.getElementById('preset-form');
        this.setsContainer = document.getElementById('sets-container');
        this.editingId = null;

        // Timer Elements
        this.timerDisplay = document.getElementById('time-display');
        this.stepNameDisplay = document.getElementById('step-name');
        this.repDisplay = document.getElementById('rep-display');
        this.progressCircle = document.querySelector('.progress-ring__circle');
        this.toggleBtn = document.getElementById('toggle-btn');
        this.resetBtn = document.getElementById('reset-btn');

        // Audio
        this.audio = new AudioController();

        this.timer = new IntervalTimer(
            (state) => this.updateTimerDisplay(state),
            () => this.onTimerComplete(),
            (step) => this.onStepChange(step)
        );

        this.init();
    }

    init() {
        // Load presets
        state.presets = StorageManager.loadPresets();
        this.renderPresetList();
        this.bindEvents();

        // Set initial circle
        const radius = this.progressCircle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        this.progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        this.progressCircle.style.strokeDashoffset = circumference;
    }

    bindEvents() {
        // Add Preset Button
        document.getElementById('add-preset-btn').addEventListener('click', () => {
            this.openEditor();
        });

        // Cancel Edit
        document.getElementById('cancel-edit-btn').addEventListener('click', () => {
            this.modal.close();
        });

        // Add Set Button in Form
        document.getElementById('add-set-btn').addEventListener('click', () => {
            this.addSetInput();
        });

        // Form Submit
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveForm();
        });

        // Back Button
        document.getElementById('back-btn').addEventListener('click', () => {
            this.timer.reset(); // Reset when leaving
            this.updateToggleBtn('start');
            this.switchView('settings-view');
        });

        // Timer Controls
        this.toggleBtn.addEventListener('click', () => {
            if (this.timer.timerState === 'running') {
                this.timer.pause();
                this.updateToggleBtn('start');
            } else if (this.timer.timerState === 'paused') {
                this.timer.resume();
                this.updateToggleBtn('pause');
            } else {
                // Start fresh
                // Ensure audio context is active on user gesture
                this.audio.init();

                const preset = state.presets.find(p => p.id === state.currentPresetId);
                this.timer.start(preset);
                this.updateToggleBtn('pause');
            }
        });

        this.resetBtn.addEventListener('click', () => {
            this.timer.reset();
            this.updateToggleBtn('start');
            // Reset display to initial state of current preset
            const preset = state.presets.find(p => p.id === state.currentPresetId);
            if (preset) {
                this.initTimerDisplay(preset);
            }
        });
    }

    renderPresetList() {
        this.presetListEl.innerHTML = '';
        state.presets.forEach(preset => {
            const card = document.createElement('div');
            card.className = 'preset-card';

            const totalTime = this.calculateTotalTime(preset);
            const formattedTime = this.formatTime(totalTime);

            card.innerHTML = `
                <div class="preset-info">
                    <h3>${preset.name}</h3>
                    <p>${preset.sets.length} steps x ${preset.repetitions} reps • Total: ${formattedTime}</p>
                </div>
                <div class="preset-actions">
                    <button class="icon-btn edit-btn" data-id="${preset.id}">✎</button>
                    <button class="icon-btn delete-btn" data-id="${preset.id}">🗑</button>
                </div>
            `;

            // Click on card to select (excluding actions)
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.preset-actions')) {
                    this.selectPreset(preset.id);
                }
            });

            // Edit
            card.querySelector('.edit-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.openEditor(preset.id);
            });

            // Delete
            card.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this preset?')) {
                    state.presets = StorageManager.deletePreset(preset.id);
                    this.renderPresetList();
                }
            });

            this.presetListEl.appendChild(card);
        });
    }

    calculateTotalTime(preset) {
        const setsDuration = preset.sets.reduce((acc, set) => acc + set.duration, 0);
        return (setsDuration * preset.repetitions) + preset.break_duration;
    }

    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    openEditor(presetId = null) {
        this.editingId = presetId;
        this.setsContainer.innerHTML = '';

        document.getElementById('preset-form').reset();
        document.getElementById('preset-break-unit').value = 'sec';

        if (presetId) {
            const preset = state.presets.find(p => p.id === presetId);
            document.getElementById('preset-name').value = preset.name;
            document.getElementById('preset-repetitions').value = preset.repetitions;

            const breakDuration = preset.break_duration;
            if (breakDuration > 0 && breakDuration % 60 === 0) {
                document.getElementById('preset-break').value = breakDuration / 60;
                document.getElementById('preset-break-unit').value = 'min';
            } else {
                document.getElementById('preset-break').value = breakDuration;
                document.getElementById('preset-break-unit').value = 'sec';
            }

            preset.sets.forEach(set => this.addSetInput(set));
        } else {
            this.addSetInput({ type: 'work', duration: 20 });
            this.addSetInput({ type: 'rest', duration: 10 });
        }

        this.modal.showModal();
    }

    addSetInput(set = { type: 'work', duration: 30 }) {
        const div = document.createElement('div');
        div.className = 'set-row';

        let duration = set.duration;
        let unit = 'sec';
        if (duration > 0 && duration % 60 === 0) {
            duration = duration / 60;
            unit = 'min';
        }

        div.innerHTML = `
            <select class="set-type">
                <option value="work" ${set.type === 'work' ? 'selected' : ''}>Work</option>
                <option value="rest" ${set.type === 'rest' ? 'selected' : ''}>Rest</option>
            </select>
            <div class="duration-input-group">
                <input type="number" class="set-duration" value="${duration}" min="1" required>
                <select class="set-duration-unit">
                    <option value="sec" ${unit === 'sec' ? 'selected' : ''}>Sec</option>
                    <option value="min" ${unit === 'min' ? 'selected' : ''}>Min</option>
                </select>
            </div>
            <button type="button" class="remove-set-btn">×</button>
        `;

        div.querySelector('.remove-set-btn').addEventListener('click', () => {
            div.remove();
        });

        this.setsContainer.appendChild(div);
    }

    saveForm() {
        const name = document.getElementById('preset-name').value;
        const repetitions = parseInt(document.getElementById('preset-repetitions').value, 10);

        const breakDurationRaw = parseInt(document.getElementById('preset-break').value, 10);
        const breakUnit = document.getElementById('preset-break-unit').value;
        const breakDuration = breakUnit === 'min' ? breakDurationRaw * 60 : breakDurationRaw;

        const sets = [];
        this.setsContainer.querySelectorAll('.set-row').forEach(row => {
            const durationRaw = parseInt(row.querySelector('.set-duration').value, 10);
            const unit = row.querySelector('.set-duration-unit').value;
            const duration = unit === 'min' ? durationRaw * 60 : durationRaw;

            sets.push({
                type: row.querySelector('.set-type').value,
                duration: duration
            });
        });

        if (sets.length === 0) {
            alert('Please add at least one set.');
            return;
        }

        const newPreset = {
            id: this.editingId || 'preset-' + Date.now(),
            name,
            sets,
            repetitions,
            break_duration: breakDuration || 0
        };

        if (this.editingId) {
            state.presets = StorageManager.updatePreset(newPreset);
        } else {
            state.presets = StorageManager.addPreset(newPreset);
        }

        this.renderPresetList();
        this.modal.close();
    }

    selectPreset(id) {
        state.currentPresetId = id;
        const preset = state.presets.find(p => p.id === id);

        document.getElementById('timer-preset-name').textContent = preset.name;
        this.initTimerDisplay(preset);
        this.switchView('timer-view');
    }

    initTimerDisplay(preset) {
        // Initial state before start
        const firstSet = preset.sets[0];
        this.stepNameDisplay.textContent = firstSet.type;
        this.timerDisplay.textContent = this.formatTime(firstSet.duration);
        this.repDisplay.textContent = `Set 1/${preset.repetitions}`;

        // Reset progress ring
        const radius = this.progressCircle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        this.progressCircle.style.strokeDashoffset = circumference; // Empty

        // Set color
        this.updateColor(firstSet.type);
    }

    updateTimerDisplay(state) {
        if (!state) return;

        this.stepNameDisplay.textContent = state.stepName.replace('_', ' ');
        this.timerDisplay.textContent = this.formatTime(state.timeRemaining);

        if (state.stepName === 'long_break') {
            this.repDisplay.textContent = "Long Break";
        } else {
            this.repDisplay.textContent = `Set ${state.repIndex}/${state.totalReps}`;
        }

        // Progress Ring
        const radius = this.progressCircle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        const offset = circumference - (state.progress * circumference);
        this.progressCircle.style.strokeDashoffset = offset;

        this.updateColor(state.stepName);
    }

    updateColor(type) {
        let colorVar = '--primary-color';
        if (type === 'rest') colorVar = '--secondary-color';
        if (type === 'long_break') colorVar = '--accent-color';

        this.progressCircle.style.stroke = `var(${colorVar})`;
    }

    onTimerComplete() {
        this.audio.playComplete();
        this.updateToggleBtn('start');
        this.stepNameDisplay.textContent = "DONE";
        this.timerDisplay.textContent = "0:00";
        this.progressCircle.style.strokeDashoffset = 0; // Full
    }

    onStepChange(step) {
        this.audio.playStepChange();
    }

    updateToggleBtn(state) {
        if (state === 'start') {
            this.toggleBtn.innerHTML = '<span class="icon">▶</span>';
            this.toggleBtn.setAttribute('aria-label', 'Start');
        } else {
            this.toggleBtn.innerHTML = '<span class="icon">⏸</span>';
            this.toggleBtn.setAttribute('aria-label', 'Pause');
        }
    }

    switchView(viewId) {
        document.querySelectorAll('.view').forEach(el => {
            el.classList.remove('active');
            el.classList.add('hidden');
        });
        const target = document.getElementById(viewId);
        target.classList.remove('hidden');
        target.classList.add('active');
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    window.app = new UIController();
});

// --- Export for Testing ---
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { IntervalTimer, StorageManager, state };
}
