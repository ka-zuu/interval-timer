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

    test('should edit an existing preset', async ({ page }) => {
        // Edit first preset
        await page.locator('.preset-card').first().locator('.edit-btn').click();
        await expect(page.locator('#preset-editor-modal')).toBeVisible();

        // Change name and reps
        await page.fill('#preset-name', 'Edited HIIT');
        await page.fill('#preset-repetitions', '10');

        // Add a new set
        await page.locator('#add-set-btn').click();
        // Check new set row exists (3 sets total now)
        await expect(page.locator('.set-row')).toHaveCount(3);

        // Save
        await page.locator('button[type="submit"]').click();

        // Verify changes in list
        const card = page.locator('.preset-card').first();
        await expect(card).toContainText('Edited HIIT');
        await expect(card).toContainText('3 steps x 10 reps');
    });

    test('should remove a set in editor', async ({ page }) => {
         await page.locator('#add-preset-btn').click();

         // Starts with 2 default sets
         await expect(page.locator('.set-row')).toHaveCount(2);

         // Remove one
         await page.locator('.remove-set-btn').first().click();
         await expect(page.locator('.set-row')).toHaveCount(1);

         // Try to save with name
         await page.fill('#preset-name', 'One Set Timer');
         await page.locator('button[type="submit"]').click();

         // Should be visible
         await expect(page.locator('.preset-card').last()).toContainText('One Set Timer');
    });

    test('should validate empty sets', async ({ page }) => {
        await page.locator('#add-preset-btn').click();

        // Ensure name is filled (required field)
        await page.fill('#preset-name', 'Empty Sets Timer');

        // Remove all sets
        const removeButtons = page.locator('.remove-set-btn');
        const count = await removeButtons.count();
        for (let i = 0; i < count; i++) {
            await page.locator('.remove-set-btn').first().click();
        }

        // Setup listener and trigger click
        const [dialog] = await Promise.all([
            page.waitForEvent('dialog'),
            page.locator('button[type="submit"]').click()
        ]);

        expect(dialog.message()).toBe('Please add at least one set.');
        await dialog.dismiss();

        // Modal should still be open
        await expect(page.locator('#preset-editor-modal')).toBeVisible();
    });
});
