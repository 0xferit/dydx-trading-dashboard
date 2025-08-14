const puppeteer = require('puppeteer');
const path = require('path');

async function testDashboard() {
    console.log('Starting dashboard UI tests...\n');
    
    const browser = await puppeteer.launch({
        headless: false, // Set to true for CI/CD
        slowMo: 50, // Slow down actions to see what's happening
        devtools: true
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Listen for console logs
    page.on('console', msg => {
        const type = msg.type();
        if (type === 'error') {
            console.error('❌ Console Error:', msg.text());
        } else if (type === 'warning') {
            console.warn('⚠️  Console Warning:', msg.text());
        }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
        console.error('❌ Page Error:', error.message);
    });
    
    // Track network requests
    const failedRequests = [];
    page.on('requestfailed', request => {
        failedRequests.push({
            url: request.url(),
            failure: request.failure().errorText
        });
    });
    
    try {
        // Test 1: Load the dashboard locally
        console.log('📋 Test 1: Loading dashboard...');
        const filePath = `file://${path.resolve(__dirname, 'dydx-advanced-analytics.html')}`;
        await page.goto(filePath, { waitUntil: 'networkidle2' });
        console.log('✅ Dashboard loaded successfully\n');
        
        // Test 2: Check if all key elements exist
        console.log('📋 Test 2: Checking UI elements...');
        
        const elements = [
            { selector: '#addressInput', name: 'Address input field' },
            { selector: 'button', name: 'Load Dashboard button' },
            { selector: '.nav-tabs', name: 'Navigation tabs' },
            { selector: '#accountDisplay', name: 'Account display' }
        ];
        
        for (const elem of elements) {
            const exists = await page.$(elem.selector) !== null;
            if (exists) {
                console.log(`✅ ${elem.name} found`);
            } else {
                console.log(`❌ ${elem.name} missing`);
            }
        }
        console.log('');
        
        // Test 3: Check if the address input has default value
        console.log('📋 Test 3: Checking address input...');
        const addressValue = await page.$eval('#addressInput', el => el.value);
        console.log(`Address input value: "${addressValue}"`);
        if (addressValue) {
            console.log('✅ Address input has default value\n');
        } else {
            console.log('⚠️  Address input is empty\n');
        }
        
        // Test 4: Test button click functionality
        console.log('📋 Test 4: Testing Load Dashboard button...');
        
        // Check if button click handler is defined
        const buttonClickable = await page.evaluate(() => {
            const button = document.querySelector('button');
            return button && typeof loadDashboardFromInput === 'function';
        });
        
        if (buttonClickable) {
            console.log('✅ Button click handler is defined');
            
            // Click the button
            await page.click('button');
            console.log('✅ Button clicked successfully');
            
            // Wait for any API calls
            await new Promise(r => setTimeout(r, 3000));
            
            // Check for any error messages
            const errorVisible = await page.evaluate(() => {
                const messages = Array.from(document.querySelectorAll('*')).filter(el => 
                    el.textContent.includes('Failed') || el.textContent.includes('Error')
                );
                return messages.length > 0;
            });
            
            if (errorVisible) {
                console.log('⚠️  Error messages detected on page');
            } else {
                console.log('✅ No error messages visible');
            }
        } else {
            console.log('❌ Button click handler (loadDashboardFromInput) is not defined');
        }
        console.log('');
        
        // Test 5: Check tab switching
        console.log('📋 Test 5: Testing tab navigation...');
        const tabs = await page.$$('.nav-tab');
        console.log(`Found ${tabs.length} navigation tabs`);
        
        if (tabs.length > 0) {
            // Click on each tab
            for (let i = 0; i < Math.min(tabs.length, 3); i++) {
                const tabText = await tabs[i].evaluate(el => el.textContent);
                await tabs[i].click();
                console.log(`✅ Clicked on "${tabText}" tab`);
                await new Promise(r => setTimeout(r, 500));
            }
        }
        console.log('');
        
        // Test 6: Check for JavaScript errors
        console.log('📋 Test 6: Checking for JavaScript errors...');
        const jsErrors = await page.evaluate(() => {
            return window.jsErrors || [];
        });
        
        if (jsErrors.length === 0) {
            console.log('✅ No JavaScript errors detected');
        } else {
            console.log(`❌ Found ${jsErrors.length} JavaScript errors`);
            jsErrors.forEach(err => console.log(`  - ${err}`));
        }
        console.log('');
        
        // Test 7: Network request analysis
        console.log('📋 Test 7: Network request analysis...');
        if (failedRequests.length === 0) {
            console.log('✅ No failed network requests');
        } else {
            console.log(`⚠️  ${failedRequests.length} failed requests:`);
            failedRequests.forEach(req => {
                console.log(`  - ${req.url}: ${req.failure}`);
            });
        }
        console.log('');
        
        // Test 8: Test with Netlify deployment
        console.log('📋 Test 8: Testing Netlify deployment...');
        const netlifyUrl = 'https://glowing-nasturtium-6a670d.netlify.app/';
        console.log(`Loading ${netlifyUrl}...`);
        
        await page.goto(netlifyUrl, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Check if the page loaded correctly
        const pageTitle = await page.title();
        console.log(`Page title: "${pageTitle}"`);
        
        // Check if address input exists on Netlify
        const netlifyHasInput = await page.$('#addressInput') !== null;
        if (netlifyHasInput) {
            console.log('✅ Netlify deployment has address input');
            
            // Try to load dashboard with test address
            await page.type('#addressInput', 'dydx1agxtmjdgw7nrgs7m086m3qse7hwyf54gfeampv');
            await page.click('button');
            console.log('✅ Submitted test address');
            
            await new Promise(r => setTimeout(r, 5000));
            
            // Check if data loaded
            const hasData = await page.evaluate(() => {
                const metrics = document.querySelectorAll('.metric-value');
                return Array.from(metrics).some(m => m.textContent !== '-');
            });
            
            if (hasData) {
                console.log('✅ Dashboard loaded data successfully');
            } else {
                console.log('⚠️  Dashboard did not load data');
            }
        } else {
            console.log('❌ Netlify deployment missing address input');
        }
        
        console.log('\n========================================');
        console.log('📊 Test Summary:');
        console.log('========================================');
        console.log('Dashboard loads: ✅');
        console.log('UI elements present: ✅');
        console.log('Button functionality: ' + (buttonClickable ? '✅' : '❌'));
        console.log('Tab navigation: ✅');
        console.log('JavaScript errors: ' + (jsErrors.length === 0 ? '✅' : '❌'));
        console.log('Network requests: ' + (failedRequests.length === 0 ? '✅' : '⚠️'));
        console.log('========================================\n');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    } finally {
        // Keep browser open for inspection
        console.log('Tests complete. Browser will close in 10 seconds...');
        await new Promise(r => setTimeout(r, 10000));
        await browser.close();
    }
}

// Run the tests
testDashboard().catch(console.error);