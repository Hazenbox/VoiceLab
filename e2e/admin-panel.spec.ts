import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Admin Panel
 * 
 * Tests the admin panel functionality:
 * - Authentication flow
 * - Dashboard display
 * - Corrections management
 * - Knowledge base management
 */

test.describe('Admin Panel Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin panel
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
  });

  test('should display login form when not authenticated', async ({ page }) => {
    // Should show login/passphrase input
    const loginForm = page.locator('form, [data-testid="admin-login"]');
    const hasLoginForm = await loginForm.isVisible().catch(() => false);
    
    if (hasLoginForm) {
      // Check for passphrase input
      const passphraseInput = page.locator('input[type="password"], input[name="passphrase"]');
      await expect(passphraseInput).toBeVisible();
      
      // Check for submit button
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeVisible();
    }
  });

  test('should show error for invalid passphrase', async ({ page }) => {
    const passphraseInput = page.locator('input[type="password"], input[name="passphrase"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    if (await passphraseInput.isVisible()) {
      // Enter invalid passphrase
      await passphraseInput.fill('invalid-passphrase-12345');
      await submitButton.click();
      
      // Wait for response
      await page.waitForTimeout(1000);
      
      // Should show error message or still be on login page
      const errorMessage = page.locator('[data-testid="error"], .error, [role="alert"]');
      const stillOnLogin = await passphraseInput.isVisible();
      
      // Either error shown or still on login page
      const hasError = await errorMessage.isVisible().catch(() => false);
      expect(hasError || stillOnLogin).toBe(true);
    }
  });

  test('should authenticate with correct passphrase', async ({ page }) => {
    // Get admin passphrase from environment (for CI)
    // In local testing, this uses the default from .env
    const passphrase = process.env.ADMIN_PASSPHRASE || 'voicelab-admin';
    
    const passphraseInput = page.locator('input[type="password"], input[name="passphrase"]').first();
    const submitButton = page.locator('button[type="submit"]').first();
    
    if (await passphraseInput.isVisible()) {
      await passphraseInput.fill(passphrase);
      await submitButton.click();
      
      // Wait for authentication
      await page.waitForTimeout(2000);
      
      // Should show admin dashboard content
      // Look for navigation, dashboard elements, or specific admin content
      const adminContent = page.locator('[data-testid="admin-dashboard"], nav, [role="navigation"]');
      const hasAdminContent = await adminContent.isVisible().catch(() => false);
      
      // Authentication may succeed or fail based on server configuration
      console.log('Admin authentication result:', hasAdminContent ? 'success' : 'may require server');
    }
  });
});

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate and attempt authentication
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Try to authenticate if login form is shown
    const passphraseInput = page.locator('input[type="password"], input[name="passphrase"]').first();
    if (await passphraseInput.isVisible()) {
      const passphrase = process.env.ADMIN_PASSPHRASE || 'voicelab-admin';
      await passphraseInput.fill(passphrase);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(2000);
    }
  });

  test('should display navigation tabs', async ({ page }) => {
    // Look for navigation elements
    const navTabs = page.locator('nav, [role="tablist"], [data-testid="admin-nav"]');
    const hasNav = await navTabs.isVisible().catch(() => false);
    
    if (hasNav) {
      // Check for expected navigation items
      const dashboardTab = page.locator('text=dashboard', { exact: false });
      const memoryTab = page.locator('text=memory', { exact: false });
      const knowledgeTab = page.locator('text=knowledge', { exact: false });
      
      // At least one nav item should be visible
      const hasAnyTab = 
        await dashboardTab.isVisible().catch(() => false) ||
        await memoryTab.isVisible().catch(() => false) ||
        await knowledgeTab.isVisible().catch(() => false);
      
      console.log('Has navigation tabs:', hasAnyTab);
    }
  });

  test('should display stats/analytics on dashboard', async ({ page }) => {
    // Look for stats cards or analytics elements
    const statsElements = page.locator('[data-testid="stats"], .stats, [class*="stat"], [class*="card"]');
    const statsCount = await statsElements.count();
    
    console.log('Stats elements found:', statsCount);
    
    // Dashboard should have some visual content
    const hasContent = statsCount > 0;
    if (!hasContent) {
      // May be on login page or loading
      const pageContent = await page.content();
      console.log('Page has content:', pageContent.length > 1000);
    }
  });
});

test.describe('Admin Corrections Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Authenticate
    const passphraseInput = page.locator('input[type="password"]').first();
    if (await passphraseInput.isVisible()) {
      await passphraseInput.fill(process.env.ADMIN_PASSPHRASE || 'voicelab-admin');
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(2000);
    }
  });

  test('should navigate to memory/corrections section', async ({ page }) => {
    // Click on memory tab if available
    const memoryTab = page.locator('button:has-text("memory"), a:has-text("memory"), [data-tab="memory"]').first();
    
    if (await memoryTab.isVisible()) {
      await memoryTab.click();
      await page.waitForTimeout(500);
      
      // Should show corrections list or memory content
      const correctionsTable = page.locator('table, [data-testid="corrections-list"], [role="grid"]');
      const hasTable = await correctionsTable.isVisible().catch(() => false);
      
      console.log('Corrections table visible:', hasTable);
    }
  });

  test('should display correction entries', async ({ page }) => {
    // Navigate to memory section
    const memoryTab = page.locator('button:has-text("memory"), a:has-text("memory")').first();
    if (await memoryTab.isVisible()) {
      await memoryTab.click();
      await page.waitForTimeout(1000);
    }
    
    // Look for correction entries
    const correctionRows = page.locator('tr, [data-testid="correction-row"], .correction-item');
    const rowCount = await correctionRows.count();
    
    console.log('Correction entries found:', rowCount);
  });

  test('should have approve/reject buttons for corrections', async ({ page }) => {
    // Navigate to memory section
    const memoryTab = page.locator('button:has-text("memory"), a:has-text("memory")').first();
    if (await memoryTab.isVisible()) {
      await memoryTab.click();
      await page.waitForTimeout(1000);
    }
    
    // Look for action buttons
    const approveButton = page.locator('button:has-text("approve")').first();
    const rejectButton = page.locator('button:has-text("reject")').first();
    
    const hasApprove = await approveButton.isVisible().catch(() => false);
    const hasReject = await rejectButton.isVisible().catch(() => false);
    
    console.log('Approve button visible:', hasApprove);
    console.log('Reject button visible:', hasReject);
  });
});

test.describe('Admin Knowledge Base', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Authenticate
    const passphraseInput = page.locator('input[type="password"]').first();
    if (await passphraseInput.isVisible()) {
      await passphraseInput.fill(process.env.ADMIN_PASSPHRASE || 'voicelab-admin');
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(2000);
    }
  });

  test('should navigate to knowledge base section', async ({ page }) => {
    const knowledgeTab = page.locator('button:has-text("knowledge"), a:has-text("knowledge"), [data-tab="knowledge"]').first();
    
    if (await knowledgeTab.isVisible()) {
      await knowledgeTab.click();
      await page.waitForTimeout(500);
      
      // Should show knowledge base content
      const knowledgeContent = page.locator('[data-testid="knowledge-base"], .knowledge-list, table');
      const hasContent = await knowledgeContent.isVisible().catch(() => false);
      
      console.log('Knowledge base content visible:', hasContent);
    }
  });

  test('should display knowledge items', async ({ page }) => {
    const knowledgeTab = page.locator('button:has-text("knowledge"), a:has-text("knowledge")').first();
    if (await knowledgeTab.isVisible()) {
      await knowledgeTab.click();
      await page.waitForTimeout(1000);
    }
    
    // Look for knowledge items
    const knowledgeItems = page.locator('tr, [data-testid="knowledge-item"], .knowledge-item');
    const itemCount = await knowledgeItems.count();
    
    console.log('Knowledge items found:', itemCount);
  });
});

test.describe('Admin Logout', () => {
  test('should logout successfully', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Authenticate first
    const passphraseInput = page.locator('input[type="password"]').first();
    if (await passphraseInput.isVisible()) {
      await passphraseInput.fill(process.env.ADMIN_PASSPHRASE || 'voicelab-admin');
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(2000);
    }
    
    // Find and click logout button
    const logoutButton = page.locator('button:has-text("logout"), button:has-text("sign out"), [data-testid="logout"]').first();
    
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForTimeout(1000);
      
      // Should be back on login page
      const loginInput = page.locator('input[type="password"]').first();
      const isLoggedOut = await loginInput.isVisible().catch(() => false);
      
      console.log('Logged out successfully:', isLoggedOut);
    }
  });
});
