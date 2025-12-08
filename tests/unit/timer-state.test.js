
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { UIController, StorageManager } from '../../script.js';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.performance = dom.window.performance;
global.CustomEvent = dom.window.CustomEvent;
global.requestAnimationFrame = (cb) => setTimeout(cb, 1);
global.cancelAnimationFrame = (id) => clearTimeout(id);

describe('UIController Timer State Bug', () => {
    let app;
    let backBtn, toggleBtn;
    let presetList, timerView;

    beforeEach(() => {
        vi.useFakeTimers();

        document.body.innerHTML = `
            <div id="settings-view" class="view active">
                <button id="add-preset-btn"></button>
                <div id="preset-list"></div>
                <dialog id="preset-editor-modal">
                    <form id="preset-form">
                        <div id="sets-container"></div>
                        <button id="add-set-btn"></button>
                        <button id="cancel-edit-btn"></button>
                    </form>
                </dialog>
            </div>
            <div id="timer-view" class="view hidden">
                <header>
                    <button id="back-btn"></button>
                    <h2 id="timer-preset-name"></h2>
                </header>
                <div id="time-display"></div>
                <div id="step-name"></div>
                <div id="rep-display"></div>
                <div class="progress-ring-container">
                    <svg class="progress-ring" width="300" height="300">
                        <circle class="progress-ring__circle-bg"/>
                        <circle class="progress-ring__circle" r="140"/>
                    </svg>
                </div>
                <div class="controls">
                    <button id="reset-btn"></button>
                    <button id="toggle-btn"></button>
                </div>
            </div>
        `;

        vi.spyOn(StorageManager, 'loadPresets').mockReturnValue([
            { id: 'preset-1', name: 'Timer A', sets: [{ type: 'work', duration: 10 }], repetitions: 1, break_duration: 0 },
            { id: 'preset-2', name: 'Timer B', sets: [{ type: 'work', duration: 25 }], repetitions: 1, break_duration: 0 }
        ]);

        const mockProgressCircle = {
            r: { baseVal: { value: 140 } },
            style: { strokeDasharray: '', strokeDashoffset: '' }
        };
        vi.spyOn(document, 'querySelector').mockImplementation(() => mockProgressCircle);

        app = new UIController();
        app.audio = { init: vi.fn(), playStepChange: vi.fn(), playComplete: vi.fn() };

        backBtn = document.getElementById('back-btn');
        toggleBtn = document.getElementById('toggle-btn');
        presetList = document.getElementById('preset-list');
        timerView = document.getElementById('timer-view');

        app.renderPresetList();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('should start a new timer from the beginning after pausing another', () => {
        const presetCard1 = presetList.querySelector('.preset-card');
        presetCard1.click();

        toggleBtn.click();

        vi.advanceTimersByTime(2000);

        toggleBtn.click();

        const pausedTime = app.timer.remainingInStep;
        expect(pausedTime).toBeLessThan(10000);

        backBtn.click();

        const presetCard2 = presetList.querySelectorAll('.preset-card')[1];
        presetCard2.click();

        expect(document.getElementById('time-display').textContent).toBe('0:25');

        toggleBtn.click();

        expect(app.timer.remainingInStep).toBeGreaterThan(24000);
    });
});
