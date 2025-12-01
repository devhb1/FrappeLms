/**
 * ===============================
 * FRAPPE LMS INTEGRATION TEST
 * ===============================
 * 
 * Test script to verify FrappeLMS API integration
 * Run with: npx tsx scripts/test-frappe-integration.ts
 */

import { enrollInFrappeLMS, getFrappeCourseInfo, testFrappeConnection, getFrappeConfig } from '../lib/services/frappeLMS';

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message: string, color: string = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
    log(`✅ ${message}`, colors.green);
}

function logError(message: string) {
    log(`❌ ${message}`, colors.red);
}

function logInfo(message: string) {
    log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message: string) {
    log(`⚠️  ${message}`, colors.yellow);
}

function logSection(title: string) {
    console.log('');
    log(`${'='.repeat(60)}`, colors.cyan);
    log(`  ${title}`, colors.bright);
    log(`${'='.repeat(60)}`, colors.cyan);
    console.log('');
}

async function testFrappeIntegration() {
    logSection('FRAPPE LMS INTEGRATION TEST SUITE');

    // Display configuration
    const config = getFrappeConfig();
    logInfo('Current Configuration:');
    console.log(`  Base URL: ${config.baseUrl}`);
    console.log(`  Has API Key: ${config.hasApiKey ? 'Yes' : 'No'}`);
    console.log(`  Timeout: ${config.timeout}ms`);
    console.log('');

    let passedTests = 0;
    let failedTests = 0;

    // TEST 1: Connection Test
    logSection('TEST 1: Connection Test');
    try {
        logInfo('Testing connection to FrappeLMS...');
        const connectionOk = await testFrappeConnection();

        if (connectionOk) {
            logSuccess('Connection successful!');
            passedTests++;
        } else {
            logError('Connection failed - FrappeLMS server not reachable');
            failedTests++;
        }
    } catch (error) {
        logError(`Connection test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failedTests++;
    }

    // TEST 2: Get Course Info
    logSection('TEST 2: Get Course Info');
    try {
        logInfo('Fetching course info for: block-chain-basics');
        const courseInfo = await getFrappeCourseInfo('block-chain-basics');

        if (courseInfo.success && courseInfo.course) {
            logSuccess('Course info retrieved successfully!');
            console.log('  Course Details:');
            console.log(`    ID: ${courseInfo.course.id}`);
            console.log(`    Title: ${courseInfo.course.title}`);
            console.log(`    Price: ${courseInfo.course.price} ${courseInfo.course.currency}`);
            console.log(`    Paid Course: ${courseInfo.course.paid_course ? 'Yes' : 'No'}`);
            passedTests++;
        } else {
            logError(`Failed to get course info: ${courseInfo.error}`);
            failedTests++;
        }
    } catch (error) {
        logError(`Course info test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failedTests++;
    }

    // TEST 3: Test Enrollment (Dry Run)
    logSection('TEST 3: Test Enrollment');
    logWarning('This will create a real enrollment in FrappeLMS!');
    logInfo('Creating test enrollment...');

    const testEmail = `test-${Date.now()}@maaledu.com`;

    try {
        const enrollment = await enrollInFrappeLMS({
            user_email: testEmail,
            course_id: 'block-chain-basics',
            paid_status: true,
            payment_id: `test_payment_${Date.now()}`,
            amount: 199.99,
            currency: 'USD'
        });

        if (enrollment.success) {
            logSuccess('Enrollment successful!');
            console.log('  Enrollment Details:');
            console.log(`    Enrollment ID: ${enrollment.enrollment_id}`);
            console.log(`    User Email: ${testEmail}`);
            console.log(`    Course ID: block-chain-basics`);
            passedTests++;
        } else {
            logError(`Enrollment failed: ${enrollment.error}`);
            failedTests++;
        }
    } catch (error) {
        logError(`Enrollment test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failedTests++;
    }

    // TEST 4: Test Enrollment with Referral Code
    logSection('TEST 4: Test Enrollment with Referral');
    logInfo('Creating test enrollment with referral code...');

    const testEmailWithReferral = `test-ref-${Date.now()}@maaledu.com`;

    try {
        const enrollmentWithRef = await enrollInFrappeLMS({
            user_email: testEmailWithReferral,
            course_id: 'block-chain-basics',
            paid_status: true,
            payment_id: `test_payment_ref_${Date.now()}`,
            amount: 199.99,
            currency: 'USD',
            referral_code: 'affiliate@example.com'
        });

        if (enrollmentWithRef.success) {
            logSuccess('Enrollment with referral successful!');
            console.log('  Enrollment Details:');
            console.log(`    Enrollment ID: ${enrollmentWithRef.enrollment_id}`);
            console.log(`    User Email: ${testEmailWithReferral}`);
            console.log(`    Course ID: block-chain-basics`);
            passedTests++;
        } else {
            logError(`Enrollment with referral failed: ${enrollmentWithRef.error}`);
            failedTests++;
        }
    } catch (error) {
        logError(`Enrollment with referral test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failedTests++;
    }

    // TEST 5: Test Free Enrollment
    logSection('TEST 5: Test Free Enrollment (0 amount)');
    logInfo('Creating test free enrollment...');

    const testEmailFree = `test-free-${Date.now()}@maaledu.com`;

    try {
        const freeEnrollment = await enrollInFrappeLMS({
            user_email: testEmailFree,
            course_id: 'block-chain-basics',
            paid_status: true,
            payment_id: `free_${Date.now()}`,
            amount: 0,
            currency: 'USD'
        });

        if (freeEnrollment.success) {
            logSuccess('Free enrollment successful!');
            console.log('  Enrollment Details:');
            console.log(`    Enrollment ID: ${freeEnrollment.enrollment_id}`);
            console.log(`    User Email: ${testEmailFree}`);
            console.log(`    Amount: $0.00 (Free)`);
            passedTests++;
        } else {
            logError(`Free enrollment failed: ${freeEnrollment.error}`);
            failedTests++;
        }
    } catch (error) {
        logError(`Free enrollment test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        failedTests++;
    }

    // TEST SUMMARY
    logSection('TEST SUMMARY');
    const totalTests = passedTests + failedTests;
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  Passed: ${passedTests} ${colors.green}✓${colors.reset}`);
    console.log(`  Failed: ${failedTests} ${colors.red}✗${colors.reset}`);
    console.log('');

    if (failedTests === 0) {
        logSuccess('ALL TESTS PASSED! 🎉');
        log('FrappeLMS integration is working correctly.', colors.green);
    } else {
        logError('SOME TESTS FAILED!');
        logWarning('Please review the errors above and check:');
        console.log('  1. FrappeLMS server is running and accessible');
        console.log('  2. Environment variables are correctly configured');
        console.log('  3. API endpoints are correct');
        console.log('  4. Network connectivity is stable');
    }

    console.log('');
    log('='.repeat(60), colors.cyan);
}

// Run the tests
testFrappeIntegration()
    .then(() => {
        logInfo('Test suite completed');
        process.exit(0);
    })
    .catch((error) => {
        logError(`Test suite error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
    });
