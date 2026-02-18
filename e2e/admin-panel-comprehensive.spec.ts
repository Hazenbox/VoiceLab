import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive E2E Tests for Admin Panel
 * With proper wait conditions and robust selectors
 */

async function navigateToAdmin(page: Page): Promise<boolean> {
  // Navigate to admin panel
  await page.goto('/admin');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Check if admin panel loaded (sidebar visible)
  const dashboardText = await page.locator('text=dashboard').first();
  const loaded = await dashboardText.isVisible({ timeout: 5000 }).catch(() => false);
  console.log('Admin panel loaded:', loaded);
  return loaded;
}

test.describe('Admin Panel - Comprehensive Tests', () => {
  
  test('Full Admin Panel Test with Screenshots', async ({ page }) => {
    // Set viewport size
    await page.setViewportSize({ width: 1400, height: 900 });
    
    console.log('\n========================================');
    console.log('VOICE LAB ADMIN PANEL COMPREHENSIVE TEST');
    console.log('========================================\n');
    
    // Navigate to admin panel
    const loaded = await navigateToAdmin(page);
    
    if (!loaded) {
      console.log('ERROR: Admin panel did not load');
      await page.screenshot({ path: 'test-results/screenshots/error-load-failed.png', fullPage: true });
      return;
    }
    
    // Wait for content to fully load
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');
    
    // ===== 1. DASHBOARD SECTION =====
    console.log('\n=== 1. DASHBOARD SECTION ===\n');
    
    // Click dashboard in sidebar
    const dashboardBtn = page.locator('button', { hasText: 'dashboard' }).first();
    if (await dashboardBtn.isVisible()) {
      await dashboardBtn.click();
      await page.waitForTimeout(2000);
    }
    
    // Take full dashboard screenshot
    await page.screenshot({ path: 'test-results/screenshots/01-dashboard.png', fullPage: true });
    
    // Check page content
    const pageContent = await page.content();
    
    // Check Hero KPIs
    console.log('Checking Hero KPIs:');
    console.log('  - total generations:', pageContent.includes('total generations') ? 'FOUND' : 'NOT FOUND');
    console.log('  - avg trust score:', pageContent.includes('avg trust score') ? 'FOUND' : 'NOT FOUND');
    console.log('  - content copied:', pageContent.includes('content copied') ? 'FOUND' : 'NOT FOUND');
    console.log('  - learnings applied:', pageContent.includes('learnings applied') ? 'FOUND' : 'NOT FOUND');
    
    // Check widgets
    console.log('\nChecking Dashboard Widgets:');
    console.log('  - feedback sentiment:', pageContent.includes('feedback sentiment') ? 'FOUND' : 'NOT FOUND');
    console.log('  - content quality:', pageContent.includes('content quality') ? 'FOUND' : 'NOT FOUND');
    console.log('  - hourly activity:', pageContent.includes('hourly activity') ? 'FOUND' : 'NOT FOUND');
    console.log('  - recent sessions:', pageContent.includes('recent sessions') ? 'FOUND' : 'NOT FOUND');
    
    // ===== 2. LEARNING CENTER SECTION =====
    console.log('\n=== 2. LEARNING CENTER SECTION ===\n');
    
    const learningBtn = page.locator('button', { hasText: 'learning center' }).first();
    if (await learningBtn.isVisible()) {
      await learningBtn.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');
    }
    
    await page.screenshot({ path: 'test-results/screenshots/02-learning-center.png', fullPage: true });
    
    const learningContent = await page.content();
    
    console.log('Checking Learning Center KPIs:');
    console.log('  - learnings applied:', learningContent.includes('learnings applied') ? 'FOUND' : 'NOT FOUND');
    console.log('  - edit corrections:', learningContent.includes('edit corrections') ? 'FOUND' : 'NOT FOUND');
    console.log('  - avoid patterns:', learningContent.includes('avoid patterns') ? 'FOUND' : 'NOT FOUND');
    console.log('  - total feedback:', learningContent.includes('total feedback') ? 'FOUND' : 'NOT FOUND');
    
    console.log('\nChecking Learning Center Features:');
    console.log('  - feedback distribution:', learningContent.includes('feedback distribution') ? 'FOUND' : 'NOT FOUND');
    console.log('  - recent edit corrections:', learningContent.includes('recent edit corrections') ? 'FOUND' : 'NOT FOUND');
    console.log('  - top patterns to avoid:', learningContent.includes('top patterns to avoid') ? 'FOUND' : 'NOT FOUND');
    console.log('  - all feedback table:', learningContent.includes('all feedback') ? 'FOUND' : 'NOT FOUND');
    
    // ===== 3. KNOWLEDGE BASE SECTION =====
    console.log('\n=== 3. KNOWLEDGE BASE SECTION ===\n');
    
    const knowledgeBtn = page.locator('button', { hasText: 'knowledge base' }).first();
    if (await knowledgeBtn.isVisible()) {
      await knowledgeBtn.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');
    }
    
    await page.screenshot({ path: 'test-results/screenshots/03-knowledge-base.png', fullPage: true });
    
    const knowledgeContent = await page.content();
    
    console.log('Checking Knowledge Base Elements:');
    console.log('  - active rules:', knowledgeContent.includes('active rules') ? 'FOUND' : 'NOT FOUND');
    console.log('  - vector index:', knowledgeContent.includes('vector index') ? 'FOUND' : 'NOT FOUND');
    
    console.log('\nChecking Knowledge Types:');
    console.log('  - avoid words:', knowledgeContent.includes('avoid words') ? 'FOUND' : 'NOT FOUND');
    console.log('  - auto-fix rules:', knowledgeContent.includes('auto-fix rules') ? 'FOUND' : 'NOT FOUND');
    console.log('  - approved examples:', knowledgeContent.includes('approved examples') ? 'FOUND' : 'NOT FOUND');
    console.log('  - preferred vocab:', knowledgeContent.includes('preferred vocab') ? 'FOUND' : 'NOT FOUND');
    console.log('  - product defs:', knowledgeContent.includes('product defs') ? 'FOUND' : 'NOT FOUND');
    console.log('  - festivals:', knowledgeContent.includes('festivals') ? 'FOUND' : 'NOT FOUND');
    
    // ===== 4. USAGE ANALYTICS SECTION =====
    console.log('\n=== 4. USAGE ANALYTICS SECTION ===\n');
    
    const usageBtn = page.locator('button', { hasText: 'usage analytics' }).first();
    if (await usageBtn.isVisible()) {
      await usageBtn.click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState('networkidle');
    }
    
    await page.screenshot({ path: 'test-results/screenshots/04-usage-analytics.png', fullPage: true });
    
    const usageContent = await page.content();
    
    console.log('Checking Usage Analytics Elements:');
    console.log('  - registered users:', usageContent.includes('registered users') ? 'FOUND' : 'NOT FOUND');
    console.log('  - by ecosystem:', usageContent.includes('by ecosystem') ? 'FOUND' : 'NOT FOUND');
    console.log('  - by channel:', usageContent.includes('by channel') ? 'FOUND' : 'NOT FOUND');
    console.log('  - quality by context:', usageContent.includes('quality by context') ? 'FOUND' : 'NOT FOUND');
    
    // Check time range selector
    console.log('\nChecking Time Range Selector:');
    const sevenDays = page.locator('button', { hasText: '7 days' }).first();
    const thirtyDays = page.locator('button', { hasText: '30 days' }).first();
    const ninetyDays = page.locator('button', { hasText: '90 days' }).first();
    const allTime = page.locator('button', { hasText: 'all time' }).first();
    
    console.log('  - 7 days:', await sevenDays.isVisible() ? 'FOUND' : 'NOT FOUND');
    console.log('  - 30 days:', await thirtyDays.isVisible() ? 'FOUND' : 'NOT FOUND');
    console.log('  - 90 days:', await ninetyDays.isVisible() ? 'FOUND' : 'NOT FOUND');
    console.log('  - all time:', await allTime.isVisible() ? 'FOUND' : 'NOT FOUND');
    
    // Test time range change
    if (await thirtyDays.isVisible()) {
      await thirtyDays.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-results/screenshots/04b-usage-analytics-30days.png', fullPage: true });
      console.log('  - Time range switched to 30 days');
    }
    
    // ===== 5. ADVANCED SECTION =====
    console.log('\n=== 5. ADVANCED SECTION ===\n');
    
    // Look for "show advanced" toggle
    const showAdvanced = page.locator('button', { hasText: 'show advanced' }).first();
    if (await showAdvanced.isVisible()) {
      await showAdvanced.click();
      await page.waitForTimeout(500);
      console.log('Expanded advanced section');
    }
    
    // Check for Users section
    const usersBtn = page.locator('button', { hasText: 'users' }).first();
    if (await usersBtn.isVisible()) {
      await usersBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'test-results/screenshots/05a-users.png', fullPage: true });
      
      const usersContent = await page.content();
      console.log('Users Section:');
      console.log('  - search input:', usersContent.includes('search users') ? 'FOUND' : 'NOT FOUND');
      console.log('  - device id column:', usersContent.includes('device id') ? 'FOUND' : 'NOT FOUND');
      console.log('  - name column:', usersContent.includes('name') ? 'FOUND' : 'NOT FOUND');
    } else {
      console.log('Users nav button NOT FOUND');
    }
    
    // Check for System Config section
    const configBtn = page.locator('button', { hasText: 'system config' }).first();
    if (await configBtn.isVisible()) {
      await configBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'test-results/screenshots/05b-system-config.png', fullPage: true });
      
      const configContent = await page.content();
      console.log('\nSystem Config Section:');
      console.log('  - Feature Flags:', configContent.includes('Feature Flags') ? 'FOUND' : 'NOT FOUND');
      console.log('  - Environment:', configContent.includes('Environment') ? 'FOUND' : 'NOT FOUND');
      console.log('  - Convex Sync:', configContent.includes('Convex Sync') ? 'FOUND' : 'NOT FOUND');
      console.log('  - RAG flag:', configContent.includes('RAG') ? 'FOUND' : 'NOT FOUND');
    } else {
      console.log('System Config nav button NOT FOUND');
    }
    
    // ===== 6. SIDEBAR NAVIGATION =====
    console.log('\n=== 6. SIDEBAR NAVIGATION ===\n');
    
    const sidebarContent = await page.content();
    console.log('Sidebar Elements:');
    console.log('  - Logo (Jio Voice Lab):', sidebarContent.includes('Jio Voice Lab') || sidebarContent.includes('voice-lab') ? 'FOUND' : 'NOT FOUND');
    console.log('  - admin panel label:', sidebarContent.includes('admin panel') ? 'FOUND' : 'NOT FOUND');
    console.log('  - back to app:', sidebarContent.includes('back to app') ? 'FOUND' : 'NOT FOUND');
    
    console.log('\n========================================');
    console.log('TEST COMPLETE');
    console.log('========================================\n');
  });
});
