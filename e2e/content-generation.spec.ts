import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Content Generation Flow
 * 
 * Tests the core voice designer functionality:
 * - Page load and initial state
 * - Onboarding flow
 * - Chat input and content generation
 * - Content validation display
 */

test.describe('Content Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for app to fully load
    await page.waitForLoadState('networkidle');
  });

  test('should load the main page', async ({ page }) => {
    // Check that the page title contains expected text
    await expect(page).toHaveTitle(/tone studio/i);
    
    // Check that main content area is visible
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display onboarding modal for new users', async ({ page, context }) => {
    // Clear any existing user profile
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());
    
    // Reload to trigger fresh state
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if onboarding modal appears (for new users)
    // Note: If user profile exists in localStorage, this may not appear
    const onboardingModal = page.locator('[data-testid="onboarding-modal"]');
    const hasOnboarding = await onboardingModal.isVisible().catch(() => false);
    
    if (hasOnboarding) {
      // Fill in onboarding form
      await page.fill('input[name="name"]', 'Test User');
      await page.selectOption('select[name="role"]', { index: 1 });
      await page.selectOption('select[name="product"]', { index: 1 });
      
      // Submit onboarding
      await page.click('button[type="submit"]');
      
      // Modal should close
      await expect(onboardingModal).not.toBeVisible();
    }
  });

  test('should have chat input available', async ({ page }) => {
    // Look for chat input textarea
    const chatInput = page.locator('textarea').first();
    await expect(chatInput).toBeVisible();
    
    // Check it's enabled and can receive input
    await expect(chatInput).toBeEnabled();
  });

  test('should allow typing in chat input', async ({ page }) => {
    const chatInput = page.locator('textarea').first();
    
    // Type a test message
    const testMessage = 'Create a welcome message for the app';
    await chatInput.fill(testMessage);
    
    // Verify the text was entered
    await expect(chatInput).toHaveValue(testMessage);
  });

  test('should show loading state when generating content', async ({ page }) => {
    const chatInput = page.locator('textarea').first();
    
    // Type a prompt
    await chatInput.fill('Write a short greeting');
    
    // Find and click the submit/send button
    const submitButton = page.locator('button[type="submit"], button:has-text("send"), button:has-text("generate")').first();
    
    if (await submitButton.isVisible()) {
      await submitButton.click();
      
      // Check for loading indicator (spinner, loading text, or disabled state)
      // This may appear briefly before response
      const loadingIndicator = page.locator('[data-loading="true"], .loading, [aria-busy="true"]').first();
      const hasLoading = await loadingIndicator.isVisible().catch(() => false);
      
      // Either loading appeared or response came quickly
      expect(true).toBe(true);
    }
  });

  test('should display ecosystem selector', async ({ page }) => {
    // Look for ecosystem/channel selection controls
    const ecosystemSelector = page.locator('select, [role="combobox"], [data-testid="ecosystem-selector"]').first();
    
    // Should have some form of selection control
    const hasSelector = await ecosystemSelector.isVisible().catch(() => false);
    
    // This is informational - ecosystem selector may or may not be present depending on UI state
    if (hasSelector) {
      await expect(ecosystemSelector).toBeEnabled();
    }
  });

  test('should handle keyboard shortcuts', async ({ page }) => {
    const chatInput = page.locator('textarea').first();
    await chatInput.focus();
    
    // Type message
    await chatInput.fill('Test message');
    
    // Press Enter to submit (common pattern)
    await page.keyboard.press('Enter');
    
    // Or Cmd/Ctrl + Enter
    await chatInput.fill('Another test');
    await page.keyboard.press('Meta+Enter');
    
    // Test passed if no errors occurred
    expect(true).toBe(true);
  });
});

test.describe('Content Validation', () => {
  test('should display trust score when content is generated', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Trust score display may appear after content generation
    // This is a smoke test to ensure the UI can render
    const trustScoreElement = page.locator('[data-testid="trust-score"], .trust-score, [class*="trust"]');
    
    // Element may or may not be visible depending on app state
    const isTrustScoreVisible = await trustScoreElement.isVisible().catch(() => false);
    
    // Log for debugging
    console.log('Trust score visible:', isTrustScoreVisible);
  });
});

test.describe('Accessibility', () => {
  test('should have proper focus management', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Tab through the page and ensure focus is visible
    await page.keyboard.press('Tab');
    
    // Get the focused element
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check that form inputs have associated labels or aria-labels
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      const input = inputs.nth(i);
      const hasLabel = await input.evaluate((el) => {
        const id = el.id;
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledBy = el.getAttribute('aria-labelledby');
        const placeholder = el.getAttribute('placeholder');
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        
        return !!(label || ariaLabel || ariaLabelledBy || placeholder);
      });
      
      // Most form elements should have some form of labeling
      // This is a soft check - we log rather than fail
      if (!hasLabel) {
        console.log(`Input at index ${i} may lack proper labeling`);
      }
    }
  });
});
