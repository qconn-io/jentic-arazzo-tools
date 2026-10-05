import { test, expect } from '@playwright/test';

test.describe('API Contract Inspection', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the test application
    await page.goto('/');
  });

  test('loads local sources for digital-product example', async ({ page }) => {
    await page.goto('/?document=http://localhost:3000/examples/digital-product/arazzo.yaml');
    
    // wait for it to load
    const baseUri = await page.evaluate(() => document.baseURI);
    console.log('document.baseURI:', baseUri);
    
    // Switch to diagram view
    await page.getByRole('button', { name: 'Diagram' }).click();

    // Click on the purchase step
    await page.locator('.react-flow__node-step').filter({ hasText: 'purchase' }).first().click();
    
    // Assert contract panel is visible and status is located
    const contractPanel = page.locator('.arazzo-contract-panel');
    await expect(contractPanel).toBeVisible();
    await expect(contractPanel).toContainText('Status: located');
    await expect(contractPanel).toContainText('Operation Details');
  });

  test('loads local sources for digital-product-stress event example', async ({ page }) => {
    await page.goto('/?document=http://localhost:3000/examples/digital-product-stress/event-based.arazzo.yaml');
    
    await expect(page.locator('h1')).toContainText('Digital product stress pack — event-based purchase');
  });
});
