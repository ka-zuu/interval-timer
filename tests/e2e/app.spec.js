import { test, expect } from '@playwright/test';
import path from 'path';

// Use absolute path for file:// URL
const indexPath = path.resolve(process.cwd(), 'index.html');
const url = `file://${indexPath}`;

test.describe('Interval Timer App', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(url);
    });

    test('should display preset list on load', async ({ page }) => {
        await expect(page.locator('#settings-view')).toBeVisible();
        await expect(page.locator('.preset-card')).toHaveCount(2); // Defaults
    });

    test('should create a new preset', async ({ page }) => {
        await page.locator('#add-preset-btn').click();
        await expect(page.locator('#preset-editor-modal')).toBeVisible();

        await page.fill('#preset-name', 'My Custom Timer');
        await page.fill('#preset-repetitions', '5');

        // Save
        await page.locator('button[type="submit"]').click();

        // Check if added
        await expect(page.locator('.preset-card')).toHaveCount(3);
        await expect(page.locator('.preset-card').last()).toContainText('My Custom Timer');
    });

    test('should start a timer and run', async ({ page }) => {
        // Select first preset
        await page.locator('.preset-card').first().click();
        await expect(page.locator('#timer-view')).toBeVisible();

        // Initial state
        const initialTime = await page.locator('#time-display').innerText();
        expect(initialTime).toBe('0:20'); // HIIT 20/10 default

        // Start
        await page.locator('#toggle-btn').click();

        // Wait for 2 seconds
        await page.waitForTimeout(2000);

        // Check time decreased
        const newTime = await page.locator('#time-display').innerText();
        expect(newTime).not.toBe(initialTime);

        // Pause
        await page.locator('#toggle-btn').click();
        const pausedTime = await page.locator('#time-display').innerText();

        // Wait more
        await page.waitForTimeout(1000);
        const timeAfterWait = await page.locator('#time-display').innerText();

        // Should be same
        expect(timeAfterWait).toBe(pausedTime);
    });

    test('should reset timer', async ({ page }) => {
        await page.locator('.preset-card').first().click();
        await page.locator('#toggle-btn').click();
        await page.waitForTimeout(1000);

        await page.locator('#reset-btn').click();

        const time = await page.locator('#time-display').innerText();
        expect(time).toBe('0:20');

        // Button should be start icon
        await expect(page.locator('#toggle-btn')).toHaveAttribute('aria-label', 'Start');
    });

    test('should delete a preset', async ({ page }) => {
        // Delete the second preset
        page.on('dialog', dialog => dialog.accept());
        await page.locator('.preset-card').nth(1).locator('.delete-btn').click();

        await expect(page.locator('.preset-card')).toHaveCount(1);
    });
});
