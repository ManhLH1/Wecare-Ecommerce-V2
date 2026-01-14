// Test script for fixed leadtime logic
const { computeDeliveryDate } = require('./src/utils/computeDeliveryDate.ts');

console.log('🧪 Testing Fixed Leadtime Logic...\n');

const testCases = [
    {
        name: 'District Leadtime - NO Weekend Reset (Saturday 2PM)',
        params: {
            districtLeadtime: 1,
            orderCreatedOn: new Date('2025-01-18T14:00:00'), // Saturday 2:00 PM
        },
        expected: '2025-01-20' // Saturday + 1 working day = Monday (NO weekend reset)
    },
    {
        name: 'Out of Stock HCM - Weekend Reset (Saturday 2PM)',
        params: {
            warehouseCode: 'KHOHCM',
            var_input_soluong: 10,
            var_selected_donvi_conversion: 1,
            var_selected_SP_tonkho: 5, // Out of stock
            orderCreatedOn: new Date('2025-01-18T14:00:00'), // Saturday 2:00 PM
        },
        expected: '2025-01-21' // Monday + 2 working days = Wednesday
    },
    {
        name: 'Out of Stock HCM - Weekend Reset (Sunday)',
        params: {
            warehouseCode: 'KHOHCM',
            var_input_soluong: 10,
            var_selected_donvi_conversion: 1,
            var_selected_SP_tonkho: 5, // Out of stock
            orderCreatedOn: new Date('2025-01-19T10:00:00'), // Sunday
        },
        expected: '2025-01-21' // Monday + 2 working days = Wednesday
    },
    {
        name: 'Sunday Adjustment HCM - Friday to Sunday',
        params: {
            warehouseCode: 'KHOHCM',
            districtLeadtime: 1,
            orderCreatedOn: new Date('2025-01-17T10:00:00'), // Friday -> result Sunday
        },
        expected: '2025-01-21' // Monday (Sunday adjusted)
    },
    {
        name: 'Default Case - Sunday Adjustment HCM',
        params: {
            warehouseCode: 'KHOHCM',
            now: new Date('2025-01-17T10:00:00'), // Friday
        },
        expected: '2025-01-20' // Saturday + 1 working day = Monday (Sunday adjustment if needed)
    }
];

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
    try {
        const result = computeDeliveryDate(testCase.params);
        const resultDate = result.toISOString().split('T')[0];

        if (resultDate === testCase.expected) {
            console.log(`✅ Test ${index + 1}: ${testCase.name} - PASSED`);
            passed++;
        } else {
            console.log(`❌ Test ${index + 1}: ${testCase.name} - FAILED`);
            console.log(`   Expected: ${testCase.expected}, Got: ${resultDate}`);
            failed++;
        }
    } catch (error) {
        console.log(`❌ Test ${index + 1}: ${testCase.name} - ERROR: ${error}`);
        failed++;
    }
});

console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
    console.log('🎉 All tests passed! Leadtime logic has been fixed.');
} else {
    console.log('⚠️  Some tests failed. Please check the logic.');
}
