import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IntervalTimer } from '../../script.js';

describe('IntervalTimer', () => {
    let timer;
    let onTick;
    let onComplete;

    beforeEach(() => {
        vi.useFakeTimers();
        onTick = vi.fn();
        onComplete = vi.fn();
        timer = new IntervalTimer(onTick, onComplete);
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

        // Should be in rest now (or transitioning)
        // Note: tick logic might need one more frame to switch, let's advance a bit more
        vi.advanceTimersByTime(100);

        expect(timer.currentIndex).toBeGreaterThan(0);
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
});
