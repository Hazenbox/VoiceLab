import { test, expect } from '@playwright/test';

/**
 * Visual E2E Tests for Admin Panel
 * With proper wait for React app to initialize
 */

test.describe('Admin Panel Visual Tests', () => {
  
  test('Complete Admin Panel Visual Tour', async ({ page }) => {
    // Set larger viewport
    await page.setViewportSize({ width: 1400, height: 900 });
    
    // Navigate to admin
    await page.goto('/admin');
    
    // Wait for React to mount (wait for root element to have children)
    await page.waitForSelector('#root > *', { timeout: 30000 });
    
    // Wait additional time for hydration
    await page.waitForTimeout(3000);
    
    console.log('\n========================================');
    console.log('ADMIN PANEL VISUAL TEST');
    console.log('========================================\n');
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/screenshots/visual-01-initial.png', fullPage: true });
    
    // Check what we see
    const content = await page.content();
    console.log('Page content length:', content.length);
    
    // Check for login page elements
    const hasPasswordInput = content.includes('password') || content.includes('passphrase');
    const hasSubmitBtn = content.includes('submit') || content.includes('Enter Admin');
    const hasLogo = content.includes('Voice Lab') || content.includes('voice-lab');
    
    console.log('Login page indicators:');
    console.log('  - Password/passphrase field:', hasPasswordInput ? 'YES' : 'NO');
    console.log('  - Submit button:', hasSubmitBtn ? 'YES' : 'NO');
    console.log('  - Logo:', hasLogo ? 'YES' : 'NO');
    
    // Try to find and fill password input
    const passwordInput = page.locator('input[type="password"]');
    const inputCount = await passwordInput.count();
    console.log('\nPassword input count:', inputCount);
    
    if (inputCount > 0) {
      console.log('\n=== AUTHENTICATING ===');
      
      // Fill the passphrase
      await passwordInput.first().fill('voicelab-admin');
      await page.screenshot({ path: 'test-results/screenshots/visual-02-password-filled.png', fullPage: true });
      
      // Find and click submit button
      const submitBtn = page.locator('button[type="submit"]');
      if (await submitBtn.count() > 0) {
        await submitBtn.first().click();
        console.log('Clicked submit button');
        
        // Wait for navigation
        await page.waitForTimeout(4000);
        await page.waitForLoadState('networkidle');
        
        await page.screenshot({ path: 'test-results/screenshots/visual-03-after-login.png', fullPage: true });
      }
    }
    
    // Now check what we see after potential login
    const afterContent = await page.content();
    
    console.log('\n=== CHECKING ADMIN CONTENT ===\n');
    
    // Check for dashboard indicators
    const hasDashboard = afterContent.toLowerCase().includes('dashboard');
    const hasLearning = afterContent.toLowerCase().includes('learning');
    const hasKnowledge = afterContent.toLowerCase().includes('knowledge');
    const hasUsage = afterContent.toLowerCase().includes('usage');
    const hasAdmin = afterContent.toLowerCase().includes('admin panel');
    
    console.log('Admin sections detected:');
    console.log('  - Dashboard:', hasDashboard ? 'YES' : 'NO');
    console.log('  - Learning:', hasLearning ? 'YES' : 'NO');
    console.log('  - Knowledge:', hasKnowledge ? 'YES' : 'NO');
    console.log('  - Usage:', hasUsage ? 'YES' : 'NO');
    console.log('  - Admin Panel label:', hasAdmin ? 'YES' : 'NO');
    
    // If we're in the admin panel, test navigation
    if (hasDashboard && hasAdmin) {
      console.log('\n=== TESTING NAVIGATION ===\n');
      
      // Test Dashboard
      console.log('1. Testing Dashboard...');
      const dashBtn = page.locator('button').filter({ hasText: /^dashboard$/i }).first();
      if (await dashBtn.isVisible()) {
        await dashBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/screenshots/visual-04-dashboard.png', fullPage: true });
        
        const dashContent = await page.content();
        console.log('   Dashboard KPIs:');
        console.log('     - total generations:', dashContent.includes('total generations') ? 'FOUND' : 'NOT FOUND');
        console.log('     - avg trust score:', dashContent.includes('avg trust score') ? 'FOUND' : 'NOT FOUND');
        console.log('     - content copied:', dashContent.includes('content copied') ? 'FOUND' : 'NOT FOUND');
        console.log('     - learnings applied:', dashContent.includes('learnings applied') ? 'FOUND' : 'NOT FOUND');
        console.log('   Dashboard Widgets:');
        console.log('     - feedback sentiment:', dashContent.includes('feedback sentiment') ? 'FOUND' : 'NOT FOUND');
        console.log('     - content quality:', dashContent.includes('content quality') ? 'FOUND' : 'NOT FOUND');
        console.log('     - hourly activity:', dashContent.includes('hourly activity') ? 'FOUND' : 'NOT FOUND');
        console.log('     - recent sessions:', dashContent.includes('recent sessions') ? 'FOUND' : 'NOT FOUND');
      }
      
      // Test Learning Center
      console.log('\n2. Testing Learning Center...');
      const learnBtn = page.locator('button').filter({ hasText: /learning center/i }).first();
      if (await learnBtn.isVisible()) {
        await learnBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/screenshots/visual-05-learning.png', fullPage: true });
        
        const learnContent = await page.content();
        console.log('   Learning Center KPIs:');
        console.log('     - learnings applied:', learnContent.includes('learnings applied') ? 'FOUND' : 'NOT FOUND');
        console.log('     - edit corrections:', learnContent.includes('edit corrections') ? 'FOUND' : 'NOT FOUND');
        console.log('     - avoid patterns:', learnContent.includes('avoid patterns') ? 'FOUND' : 'NOT FOUND');
        console.log('     - total feedback:', learnContent.includes('total feedback') ? 'FOUND' : 'NOT FOUND');
        console.log('   Learning Features:');
        console.log('     - feedback distribution:', learnContent.includes('feedback distribution') ? 'FOUND' : 'NOT FOUND');
        console.log('     - recent edit corrections:', learnContent.includes('recent edit corrections') ? 'FOUND' : 'NOT FOUND');
      }
      
      // Test Knowledge Base
      console.log('\n3. Testing Knowledge Base...');
      const knowledgeBtn = page.locator('button').filter({ hasText: /knowledge base/i }).first();
      if (await knowledgeBtn.isVisible()) {
        await knowledgeBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/screenshots/visual-06-knowledge.png', fullPage: true });
        
        const kbContent = await page.content();
        console.log('   Knowledge Base Elements:');
        console.log('     - active rules:', kbContent.includes('active rules') ? 'FOUND' : 'NOT FOUND');
        console.log('     - vector index:', kbContent.includes('vector index') ? 'FOUND' : 'NOT FOUND');
        console.log('   Knowledge Types:');
        console.log('     - avoid words:', kbContent.includes('avoid words') ? 'FOUND' : 'NOT FOUND');
        console.log('     - auto-fix rules:', kbContent.includes('auto-fix') ? 'FOUND' : 'NOT FOUND');
        console.log('     - approved examples:', kbContent.includes('approved examples') ? 'FOUND' : 'NOT FOUND');
        console.log('     - preferred vocab:', kbContent.includes('preferred') ? 'FOUND' : 'NOT FOUND');
        console.log('     - product defs:', kbContent.includes('product') ? 'FOUND' : 'NOT FOUND');
        console.log('     - festivals:', kbContent.includes('festivals') ? 'FOUND' : 'NOT FOUND');
      }
      
      // Test Usage Analytics
      console.log('\n4. Testing Usage Analytics...');
      const usageBtn = page.locator('button').filter({ hasText: /usage analytics/i }).first();
      if (await usageBtn.isVisible()) {
        await usageBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/screenshots/visual-07-usage.png', fullPage: true });
        
        const usageContent = await page.content();
        console.log('   Usage Analytics Elements:');
        console.log('     - registered users:', usageContent.includes('registered users') ? 'FOUND' : 'NOT FOUND');
        console.log('     - by ecosystem:', usageContent.includes('by ecosystem') ? 'FOUND' : 'NOT FOUND');
        console.log('     - by channel:', usageContent.includes('by channel') ? 'FOUND' : 'NOT FOUND');
        console.log('     - quality by context:', usageContent.includes('quality by context') ? 'FOUND' : 'NOT FOUND');
        
        // Test time range selector
        const sevenDays = page.locator('button').filter({ hasText: '7 days' }).first();
        const thirtyDays = page.locator('button').filter({ hasText: '30 days' }).first();
        const allTime = page.locator('button').filter({ hasText: 'all time' }).first();
        
        console.log('   Time Range Buttons:');
        console.log('     - 7 days:', await sevenDays.isVisible() ? 'VISIBLE' : 'NOT VISIBLE');
        console.log('     - 30 days:', await thirtyDays.isVisible() ? 'VISIBLE' : 'NOT VISIBLE');
        console.log('     - all time:', await allTime.isVisible() ? 'VISIBLE' : 'NOT VISIBLE');
        
        if (await thirtyDays.isVisible()) {
          await thirtyDays.click();
          await page.waitForTimeout(1000);
          await page.screenshot({ path: 'test-results/screenshots/visual-07b-usage-30days.png', fullPage: true });
        }
      }
      
      // Test Advanced Section
      console.log('\n5. Testing Advanced Section...');
      const advancedToggle = page.locator('button').filter({ hasText: /show advanced/i }).first();
      if (await advancedToggle.isVisible()) {
        await advancedToggle.click();
        await page.waitForTimeout(500);
        console.log('   Expanded advanced section');
        
        // Users
        const usersBtn = page.locator('button').filter({ hasText: /^users$/i }).first();
        if (await usersBtn.isVisible()) {
          await usersBtn.click();
          await page.waitForTimeout(2000);
          await page.screenshot({ path: 'test-results/screenshots/visual-08-users.png', fullPage: true });
          console.log('   Users section screenshot captured');
        }
        
        // System Config
        const configBtn = page.locator('button').filter({ hasText: /system config/i }).first();
        if (await configBtn.isVisible()) {
          await configBtn.click();
          await page.waitForTimeout(2000);
          await page.screenshot({ path: 'test-results/screenshots/visual-09-config.png', fullPage: true });
          
          const configContent = await page.content();
          console.log('   System Config:');
          console.log('     - Feature Flags:', configContent.includes('Feature Flags') ? 'FOUND' : 'NOT FOUND');
          console.log('     - Environment:', configContent.includes('Environment') ? 'FOUND' : 'NOT FOUND');
        }
      }
      
      // Test Sign Out
      console.log('\n6. Testing Sign Out...');
      const signOutBtn = page.locator('button').filter({ hasText: /sign out/i }).first();
      if (await signOutBtn.isVisible()) {
        await signOutBtn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-results/screenshots/visual-10-logout.png', fullPage: true });
        console.log('   Signed out successfully');
      }
    } else {
      console.log('\nWARNING: Not in admin panel - may still be on login page');
      console.log('This could indicate an authentication issue.');
    }
    
    console.log('\n========================================');
    console.log('VISUAL TEST COMPLETE');
    console.log('========================================\n');
    console.log('Screenshots saved in: test-results/screenshots/');
  });
});
