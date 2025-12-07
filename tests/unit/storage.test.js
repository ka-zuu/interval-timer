import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageManager } from '../../script.js';

describe('StorageManager', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('should seed defaults if no presets exist', () => {
        const presets = StorageManager.loadPresets();
        expect(presets).toHaveLength(2);
        expect(presets[0].name).toBe('HIIT 20/10');
    });

    it('should load existing presets', () => {
        const mockData = [{ id: 'p1', name: 'Test Preset', sets: [] }];
        localStorage.setItem('TIMER_PRESETS', JSON.stringify(mockData));

        const presets = StorageManager.loadPresets();
        expect(presets).toHaveLength(1);
        expect(presets[0].name).toBe('Test Preset');
    });

    it('should add a new preset', () => {
        StorageManager.seedDefaults();
        const newPreset = { id: 'p3', name: 'New Preset', sets: [] };
        const presets = StorageManager.addPreset(newPreset);

        expect(presets).toHaveLength(3);
        expect(presets[2].id).toBe('p3');
        expect(JSON.parse(localStorage.getItem('TIMER_PRESETS'))).toHaveLength(3);
    });

    it('should update an existing preset', () => {
        StorageManager.seedDefaults();
        const updatedPreset = { id: 'preset-1', name: 'Updated HIIT', sets: [] };
        const presets = StorageManager.updatePreset(updatedPreset);

        expect(presets.find(p => p.id === 'preset-1').name).toBe('Updated HIIT');
    });

    it('should delete a preset', () => {
        StorageManager.seedDefaults();
        const presets = StorageManager.deletePreset('preset-1');

        expect(presets).toHaveLength(1);
        expect(presets.find(p => p.id === 'preset-1')).toBeUndefined();
    });
});
