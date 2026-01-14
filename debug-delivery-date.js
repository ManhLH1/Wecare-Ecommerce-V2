// Debug script for delivery date calculation with detailed logging
const { computeDeliveryDate } = require('./src/utils/computeDeliveryDate.ts');

console.log('🔍 DEBUG: Delivery Date Calculation\n');

// Test scenarios that might reveal issues
const testScenarios = [
    {
        name: 'District Leadtime - Normal weekday',
        params: {
            warehouseCode: 'KHOHCM',
            districtLeadtime: 2,
            orderCreatedOn: new Date('2025-01-15T10:00:00'), // Wednesday
            var_input_soluong: 10,
            var_selected_donvi_conversion: 1,
            var_selected_SP_tonkho: 50, // In stock
        },
        expected: 'Friday (after 2 working days)'
    },
    {
        name: 'District Leadtime - Weekend reset should NOT apply',
        params: {
            warehouseCode: 'KHOHCM',
            districtLeadtime: 1,
            orderCreatedOn: new Date('2025-01-18T14:00:00'), // Saturday afternoon
            var_input_soluong: 10,
            var_selected_donvi_conversion: 1,
            var_selected_SP_tonkho: 50, // In stock
        },
        expected: 'Monday (NOT reset to Monday morning)'
    },
    {
        name: 'Out of Stock - HCM Normal',
        params: {
            warehouseCode: 'KHOHCM',
            districtLeadtime: 0, // No district leadtime
            orderCreatedOn: new Date('2025-01-15T10:00:00'), // Wednesday
            var_input_soluong: 10,
            var_selected_donvi_conversion: 1,
            var_selected_SP_tonkho: 5, // Out of stock
        },
        expected: 'Friday (+2 working days)'
    },
    {
        name: 'Out of Stock - HCM Apollo Promotion',
        params: {
            warehouseCode: 'KHOHCM',
            districtLeadtime: 0,
            orderCreatedOn: new Date('2025-01-15T10:00:00'), // Wednesday
            var_input_soluong: 10,
            var_selected_donvi_conversion: 1,
            var_selected_SP_tonkho: 5, // Out of stock
            promotion: { name: 'Apollo Special Promotion' }
        },
        expected: 'Tuesday next week (+6 working days)'
    },
    {
        name: 'Out of Stock - Weekend Reset Applied',
        params: {
            warehouseCode: 'KHOHCM',
            districtLeadtime: 0,
            orderCreatedOn: new Date('2025-01-18T14:00:00'), // Saturday afternoon
            var_input_soluong: 10,
            var_selected_donvi_conversion: 1,
            var_selected_SP_tonkho: 5, // Out of stock
        },
        expected: 'Wednesday (Monday + 2 working days)'
    },
    {
        name: 'Sunday Adjustment - HCM District Leadtime',
        params: {
            warehouseCode: 'KHOHCM',
            districtLeadtime: 1,
            orderCreatedOn: new Date('2025-01-17T10:00:00'), // Friday -> result Sunday
            var_input_soluong: 10,
            var_selected_donvi_conversion: 1,
            var_selected_SP_tonkho: 50, // In stock
        },
        expected: 'Monday (Sunday adjusted to Monday)'
    },
    {
        name: 'Default Case - In Stock',
        params: {
            warehouseCode: 'KHOHCM',
            districtLeadtime: 0,
            orderCreatedOn: new Date('2025-01-15T10:00:00'), // Wednesday
            var_input_soluong: 10,
            var_selected_donvi_conversion: 1,
            var_selected_SP_tonkho: 50, // In stock
        },
        expected: 'Thursday (+1 working day)'
    }
];

console.log('🧪 Running test scenarios...\n');

testScenarios.forEach((scenario, index) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Test ${index + 1}: ${scenario.name}`);
    console.log(`🎯 Expected: ${scenario.expected}`);
    console.log(`📊 Input params:`, JSON.stringify(scenario.params, null, 2));

    try {
        console.log(`\n🚀 Starting calculation...`);
        const result = computeDeliveryDate(scenario.params);
        const resultDate = result.toISOString().split('T')[0];
        const resultDayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][result.getDay()];

        console.log(`\n✅ RESULT: ${resultDate} (${resultDayOfWeek})`);
        console.log(`📅 Full datetime: ${result.toISOString()}`);

    } catch (error) {
        console.error(`❌ ERROR in test ${index + 1}:`, error);
    }

    console.log(`${'='.repeat(60)}\n`);
});

// Summary
console.log('🎯 DEBUG COMPLETE');
console.log('💡 Check the logs above to see:');
console.log('   - Which logic path is taken (District/Out-of-stock/Default)');
console.log('   - Weekend reset behavior');
console.log('   - Sunday adjustment behavior');
console.log('   - Working day calculations');
console.log('\n🔍 Look for discrepancies between expected and actual results!');
