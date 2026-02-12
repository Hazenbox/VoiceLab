import { test, expect } from '@playwright/test';

test.describe('Admin Panel Full Test', () => {
  const PASSPHRASE = 'voicelab-admin';
  
  test('Full admin panel test', async ({ page }) => {
    const results: Record<string, { status: string; details: string }> = {};
    
    // Listen for errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', error => {
      errors.push(`Page error: ${error.message}`);
    });

    // 1. Navigate and authenticate
    console.log('\n=== STEP 1: Navigate to /admin ===');
    await page.goto('/admin');
    await page.waitForTimeout(1000);
    
    // Check for password input
    const passwordInput = page.locator('input[type="password"]');
    if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Password input found, entering passphrase...');
      await passwordInput.fill(PASSPHRASE);
      
      // Click the submit button
      const submitBtn = page.locator('button:has-text("Enter Admin Panel")');
      await submitBtn.click();
      
      // Wait for dashboard to load
      await page.waitForTimeout(2000);
      
      // Check for specific error message from auth gate
      const errorMsg = page.locator('span:has-text("Invalid passphrase"), span:has-text("Authentication failed"), span:has-text("Network error")');
      if (await errorMsg.isVisible({ timeout: 1000 }).catch(() => false)) {
        const errorText = await errorMsg.textContent();
        results['authentication'] = { status: 'FAILED', details: `Error: ${errorText}` };
        console.log('Authentication FAILED:', errorText);
        return;
      }
    }
    
    // Verify dashboard loaded - with longer timeout and better debugging
    const dashboardHeader = page.locator('h2:has-text("dashboard")');
    
    // Wait a bit longer for dashboard to load
    await page.waitForTimeout(3000);
    
    // Check page state
    const pageText = await page.locator('body').textContent();
    console.log('Page content (first 200 chars):', pageText?.slice(0, 200));
    
    if (await dashboardHeader.isVisible({ timeout: 5000 }).catch(() => false)) {
      results['authentication'] = { status: 'PASSED', details: 'Successfully authenticated' };
      console.log('✅ Authentication: PASSED');
    } else {
      // Check if there's still a password input (auth might have failed)
      const stillHasPasswordInput = await page.locator('input[type="password"]').isVisible().catch(() => false);
      const verifyingSession = await page.locator('text=Verifying session').isVisible().catch(() => false);
      
      console.log('Still has password input:', stillHasPasswordInput);
      console.log('Verifying session visible:', verifyingSession);
      
      // If verifying session is shown, wait more
      if (verifyingSession) {
        console.log('Waiting for session verification...');
        await page.waitForTimeout(5000);
      }
      
      // Try again
      if (await dashboardHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
        results['authentication'] = { status: 'PASSED', details: 'Successfully authenticated (after retry)' };
        console.log('✅ Authentication: PASSED (after retry)');
      } else {
        results['authentication'] = { status: 'FAILED', details: 'Dashboard did not load' };
        console.log('❌ Authentication: FAILED - Dashboard did not load');
        await page.screenshot({ path: 'admin-auth-failed.png', fullPage: true });
        return;
      }
    }

    // 2. Test Dashboard
    console.log('\n=== STEP 2: Test Dashboard ===');
    try {
      // Check KPI cards
      const kpiLabels = ['total generations', 'avg trust score', 'content copied', 'learnings applied'];
      let kpisFound = 0;
      for (const label of kpiLabels) {
        if (await page.locator(`text=${label}`).isVisible({ timeout: 1000 }).catch(() => false)) {
          kpisFound++;
        }
      }
      
      const feedbackSentiment = await page.locator('text=feedback sentiment').isVisible().catch(() => false);
      const contentQuality = await page.locator('text=content quality').isVisible().catch(() => false);
      const hourlyActivity = await page.locator('text=hourly activity').isVisible().catch(() => false);
      
      results['dashboard'] = {
        status: kpisFound >= 3 ? 'PASSED' : 'PARTIAL',
        details: `KPIs found: ${kpisFound}/4, Sentiment: ${feedbackSentiment}, Quality: ${contentQuality}, Activity: ${hourlyActivity}`
      };
      console.log(`✅ Dashboard: ${results['dashboard'].status} - ${results['dashboard'].details}`);
      await page.screenshot({ path: 'admin-dashboard.png', fullPage: true });
    } catch (e) {
      results['dashboard'] = { status: 'FAILED', details: String(e) };
      console.log('❌ Dashboard:', e);
    }

    // 3. Test Learning Center
    console.log('\n=== STEP 3: Test Learning Center ===');
    try {
      await page.click('text=learning center');
      await page.waitForTimeout(1500);
      
      const header = await page.locator('h2:has-text("learning center")').isVisible().catch(() => false);
      const feedbackDist = await page.locator('text=feedback distribution').isVisible().catch(() => false);
      
      // Check for edit and comment types in the feedback distribution grid
      const editVisible = await page.locator('text=edit').first().isVisible().catch(() => false);
      const commentVisible = await page.locator('text=comment').first().isVisible().catch(() => false);
      const thumbsUpVisible = await page.locator('text=thumbs up').first().isVisible().catch(() => false);
      const thumbsDownVisible = await page.locator('text=thumbs down').first().isVisible().catch(() => false);
      
      results['learning_center'] = {
        status: header && feedbackDist ? 'PASSED' : 'PARTIAL',
        details: `Header: ${header}, Feedback dist: ${feedbackDist}, Edit: ${editVisible}, Comment: ${commentVisible}, ThumbsUp: ${thumbsUpVisible}, ThumbsDown: ${thumbsDownVisible}`
      };
      console.log(`✅ Learning Center: ${results['learning_center'].status} - ${results['learning_center'].details}`);
      await page.screenshot({ path: 'admin-learning-center.png', fullPage: true });
    } catch (e) {
      results['learning_center'] = { status: 'FAILED', details: String(e) };
      console.log('❌ Learning Center:', e);
    }

    // 4. Test Knowledge Base
    console.log('\n=== STEP 4: Test Knowledge Base ===');
    try {
      await page.click('text=knowledge base');
      await page.waitForTimeout(2000);
      
      const header = await page.locator('h2:has-text("knowledge base")').isVisible().catch(() => false);
      
      // Click on avoid words card - look for it with different selectors
      let avoidWordsClicked = false;
      
      // Try direct text match
      const avoidWordsButton = page.locator('button:has-text("avoid words"), [role="button"]:has-text("avoid words")').first();
      if (await avoidWordsButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await avoidWordsButton.click();
        avoidWordsClicked = true;
      } else {
        // Try clicking on the stat card
        const avoidWordsCard = page.locator('div:has-text("avoid words")').filter({ hasText: /\d+\/\d+/ }).first();
        if (await avoidWordsCard.isVisible({ timeout: 1000 }).catch(() => false)) {
          await avoidWordsCard.click();
          avoidWordsClicked = true;
        } else {
          // Last resort - click any avoid words element
          const anyAvoid = page.locator('text=avoid words').first();
          if (await anyAvoid.isVisible({ timeout: 1000 }).catch(() => false)) {
            await anyAvoid.click();
            avoidWordsClicked = true;
          }
        }
      }
      
      console.log('Clicked avoid words:', avoidWordsClicked);
      
      // Wait for detail panel to load with data
      await page.waitForTimeout(3000);
      
      // Look for "showing X of Y" pattern
      const showingText = page.locator('text=/showing \\d+ of \\d+/i');
      const hasShowingText = await showingText.isVisible({ timeout: 3000 }).catch(() => false);
      
      // Look for load more button
      const loadMoreBtn = page.locator('button:has-text("load more")');
      const hasLoadMore = await loadMoreBtn.isVisible({ timeout: 1000 }).catch(() => false);
      
      let showingTextContent = '';
      if (hasShowingText) {
        showingTextContent = await showingText.textContent() || '';
      }
      
      // Also check for alternative text like "avoid words (X total)"
      const totalText = page.locator('text=/avoid words \\(\\d+ total\\)/i');
      const hasTotalText = await totalText.isVisible({ timeout: 1000 }).catch(() => false);
      let totalTextContent = '';
      if (hasTotalText) {
        totalTextContent = await totalText.textContent() || '';
      }
      
      results['knowledge_base'] = {
        status: header ? 'PASSED' : 'FAILED',
        details: `Header: ${header}, Clicked: ${avoidWordsClicked}, Showing text: "${showingTextContent}", Total text: "${totalTextContent}", Load more: ${hasLoadMore}`
      };
      
      await page.screenshot({ path: 'admin-knowledge-avoid-words.png', fullPage: true });
      console.log(`✅ Knowledge Base: ${results['knowledge_base'].status} - ${results['knowledge_base'].details}`);
    } catch (e) {
      results['knowledge_base'] = { status: 'FAILED', details: String(e) };
      console.log('❌ Knowledge Base:', e);
    }

    // 5. Test Usage Analytics
    console.log('\n=== STEP 5: Test Usage Analytics ===');
    try {
      await page.click('text=usage analytics');
      await page.waitForTimeout(1500);
      
      const header = await page.locator('h2:has-text("usage analytics")').isVisible().catch(() => false);
      const timeSelector = await page.locator('text=week').isVisible().catch(() => false);
      const byEcosystem = await page.locator('text=by ecosystem').isVisible().catch(() => false);
      const byChannel = await page.locator('text=by channel').isVisible().catch(() => false);
      
      results['usage_analytics'] = {
        status: header ? 'PASSED' : 'FAILED',
        details: `Header: ${header}, Time selector: ${timeSelector}, By ecosystem: ${byEcosystem}, By channel: ${byChannel}`
      };
      console.log(`✅ Usage Analytics: ${results['usage_analytics'].status} - ${results['usage_analytics'].details}`);
      await page.screenshot({ path: 'admin-usage-analytics.png', fullPage: true });
    } catch (e) {
      results['usage_analytics'] = { status: 'FAILED', details: String(e) };
      console.log('❌ Usage Analytics:', e);
    }

    // 6. Test Users (under Advanced)
    console.log('\n=== STEP 6: Test Users page ===');
    try {
      // Users is under Advanced section - need to expand it first
      // Look for the "show advanced" toggle button
      const advancedToggle = page.locator('button:has-text("show advanced")');
      if (await advancedToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Clicking "show advanced" toggle...');
        await advancedToggle.click();
        await page.waitForTimeout(500);
      }
      
      // Now click on "users" in the sidebar
      const usersButton = page.locator('button:has-text("users")').first();
      if (await usersButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await usersButton.click();
        await page.waitForTimeout(2000);
      } else {
        // Fallback - try clicking any element with users text
        await page.click('text=users');
        await page.waitForTimeout(2000);
      }
      
      const header = await page.locator('h2:has-text("Users")').isVisible({ timeout: 3000 }).catch(() => false);
      const searchInput = await page.locator('input[placeholder="search users..."]').isVisible().catch(() => false);
      
      // Check if page has a table or empty message
      const hasTable = await page.locator('table').isVisible().catch(() => false);
      const hasEmptyMsg = await page.locator('text=/no users/i').isVisible().catch(() => false);
      
      results['users'] = {
        status: header ? 'PASSED' : 'FAILED',
        details: `Header: ${header}, Search: ${searchInput}, Table: ${hasTable}, Empty msg: ${hasEmptyMsg}`
      };
      console.log(`✅ Users: ${results['users'].status} - ${results['users'].details}`);
      await page.screenshot({ path: 'admin-users.png', fullPage: true });
    } catch (e) {
      results['users'] = { status: 'FAILED', details: String(e) };
      console.log('❌ Users:', e);
    }

    // 7. Test KPI Tooltips
    console.log('\n=== STEP 7: Test KPI Tooltips ===');
    try {
      // Go back to dashboard
      await page.click('text=dashboard');
      await page.waitForTimeout(1000);
      
      // Find info icons (cursor-help class elements with SVG)
      const infoIcon = page.locator('.cursor-help').first();
      const iconVisible = await infoIcon.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (iconVisible) {
        // Hover over the icon
        await infoIcon.hover();
        await page.waitForTimeout(500);
        
        // Look for tooltip that appears
        const tooltip = page.locator('.absolute.z-10, [style*="box-shadow"]');
        const tooltipVisible = await tooltip.isVisible({ timeout: 1000 }).catch(() => false);
        
        let tooltipContent = '';
        if (tooltipVisible) {
          tooltipContent = await tooltip.textContent() || '';
        }
        
        results['tooltips'] = {
          status: tooltipVisible ? 'PASSED' : 'PARTIAL',
          details: `Icon found: ${iconVisible}, Tooltip visible: ${tooltipVisible}, Content: "${tooltipContent.slice(0, 50)}..."`
        };
        await page.screenshot({ path: 'admin-tooltip-hover.png' });
      } else {
        results['tooltips'] = {
          status: 'PARTIAL',
          details: 'No info icon found on dashboard'
        };
      }
      console.log(`✅ Tooltips: ${results['tooltips'].status} - ${results['tooltips'].details}`);
    } catch (e) {
      results['tooltips'] = { status: 'FAILED', details: String(e) };
      console.log('❌ Tooltips:', e);
    }

    // Print Summary
    console.log('\n' + '='.repeat(60));
    console.log('ADMIN PANEL TEST SUMMARY');
    console.log('='.repeat(60));
    
    for (const [section, result] of Object.entries(results)) {
      const icon = result.status === 'PASSED' ? '✅' : result.status === 'PARTIAL' ? '⚠️' : '❌';
      console.log(`${icon} ${section.toUpperCase()}: ${result.status}`);
      console.log(`   Details: ${result.details}`);
    }
    
    if (errors.length > 0) {
      console.log('\n🔴 CONSOLE ERRORS DETECTED:');
      errors.forEach(e => console.log(`   - ${e}`));
    } else {
      console.log('\n✅ No console errors detected');
    }
    
    console.log('='.repeat(60));
  });
});
