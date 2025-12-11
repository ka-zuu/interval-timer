import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IntervalTimer } from '../../script.js';

describe('IntervalTimer', () => {
    let timer;
    let onTick;
    let onComplete;
    let onStepChange;

    beforeEach(() => {
        vi.useFakeTimers();
        onTick = vi.fn();
        onComplete = vi.fn();
        onStepChange = vi.fn();
        timer = new IntervalTimer(onTick, onComplete, onStepChange);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const mockPreset = {
        id: 'test',
        name: 'Test',
        repetitions: 2,
        break_duration: 0,
        sets: [
            { type: 'work', duration: 10 },
            { type: 'rest', duration: 5 }
        ]
    };

    it('should build schedule correctly', () => {
        timer.buildSchedule(mockPreset);
        // 2 reps * 2 sets = 4 steps
        expect(timer.schedule).toHaveLength(4);
        expect(timer.schedule[0].type).toBe('work');
        expect(timer.schedule[1].type).toBe('rest');
        expect(timer.schedule[2].type).toBe('work');
        expect(timer.schedule[3].type).toBe('rest');
    });

    it('should start timer and tick', () => {
        timer.start(mockPreset);
        expect(timer.timerState).toBe('running');
        expect(onTick).toHaveBeenCalled();
    });

    it('should advance steps when time passes', () => {
        timer.start(mockPreset);

        // Advance 10 seconds (work duration)
        vi.advanceTimersByTime(10000);

        // Wait for the next frame processing
        vi.advanceTimersByTime(100);

        expect(timer.currentIndex).toBeGreaterThan(0);
    });

    it('should trigger onStepChange when step changes', () => {
        timer.start(mockPreset);

        // Advance 10 seconds (work duration)
        vi.advanceTimersByTime(10000);
        vi.advanceTimersByTime(50); // Small buffer for frame

        // Should have moved to next step and called onStepChange
        expect(onStepChange).toHaveBeenCalledWith(expect.objectContaining({ type: 'rest' }));
    });

    it('should pause and resume', () => {
        timer.start(mockPreset);
        timer.pause();
        expect(timer.timerState).toBe('paused');

        timer.resume();
        expect(timer.timerState).toBe('running');
    });

    it('should reset', () => {
        timer.start(mockPreset);
        timer.reset();
        expect(timer.timerState).toBe('stopped');
        expect(timer.schedule).toHaveLength(0);
    });

    it('should complete when all steps finish', () => {
        timer.start(mockPreset);

        // Total duration: (10+5)*2 = 30s
        vi.advanceTimersByTime(30000 + 1000); // + buffer

        expect(onComplete).toHaveBeenCalled();
        expect(timer.timerState).toBe('stopped');
    });

    it('should return correct state via getState', () => {
        timer.start(mockPreset);

        const state = timer.getState();
        expect(state).not.toBeNull();
        expect(state.stepName).toBe('work');
        expect(state.timeRemaining).toBe(10);
        expect(state.repIndex).toBe(1);
        expect(state.totalReps).toBe(2);

        // Advance 5.1 seconds to be safe with frame boundaries and ensure we crossed the second boundary
        vi.advanceTimersByTime(5100);

        const nextState = timer.getState();
        // 10 - 5.1 = 4.9s remaining -> ceil(4.9) = 5
        expect(nextState.timeRemaining).toBe(5);

        // Total duration of rep 1 is 15s (10 work + 5 rest)
        // Remaining in rep 1 is 4.9s (current) + 5s (rest) = 9.9s
        // Progress = 1 - (9.9/15) = 1 - 0.66 = 0.34
        expect(nextState.progress).toBeCloseTo(1 - (9.9 / 15), 2);
    });
});
