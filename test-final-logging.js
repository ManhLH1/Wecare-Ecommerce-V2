// Test script to demonstrate final logging with formula and reason
const { computeDeliveryDate } = require('./src/utils/computeDeliveryDate.ts');

console.log('🧪 TESTING FINAL LOGGING: Formula & Reason\n');

// Test different scenarios to show the logging
const testScenarios = [
    {
        name: 'District Leadtime - Priority 1',
        params: {
            warehouseCode: 'KHOHCM',
            districtLeadtime: 3,
            orderCreatedOn: '2025-01-15T10:00:00', // Wednesday
            var_input_soluong: 10,
            var_selected_donvi_conversion: 1,
            var_selected_SP_tonkho: 50 // In stock
        },
        expectedFormula: 'Ngày tạo đơn + 3 ca làm việc'
    },
    {
        name: 'Out of Stock - HCM Normal',
        params: {
            warehouseCode: 'KHOHCM',
            districtLeadtime: 0,
            orderCreatedOn: '2025-01-15T10:00:00', // Wednesday
            var_input_soluong: 10,
            var_selected_donvi_conversion: 1,
            var_selected_SP_tonkho: 5 // Out of stock
        },
        expectedFormula: 'Ngày tạo đơn + 2 ca làm việc'
    },
    {
        name: 'Out of Stock - HCM Apollo Promotion',
        params: {
            warehouseCode: 'KHOHCM',
            districtLeadtime: 0,
            orderCreatedOn: '2025-01-15T10:00:00', // Wednesday
            var_input_soluong: 10,
            var_selected_donvi_conversion: 1,
            var_selected_SP_tonkho: 5, // Out of stock
            promotion: { name: 'Apollo Special Promotion' }
        },
        expectedFormula: 'Ngày tạo đơn + 6 ca làm việc'
    },
    {
        name: 'Out of Stock - Weekend Reset Applied',
        params: {
            warehouseCode: 'KHOHCM',
            districtLeadtime: 0,
            orderCreatedOn: '2025-01-18T14:00:00', // Saturday afternoon
            var_input_soluong: 10,
            var_selected_donvi_conversion: 1,
            var_selected_SP_tonkho: 5, // Out of stock
        },
        expectedFormula: 'Ngày tạo đơn (đã reset weekend) + 2 ca làm việc'
    },
    {
        name: 'Default Case - In Stock',
        params: {
            warehouseCode: 'KHOHCM',
            districtLeadtime: 0,
            orderCreatedOn: '2025-01-15T10:00:00', // Wednesday
            var_input_soluong: 10,
            var_selected_donvi_conversion: 1,
            var_selected_SP_tonkho: 50 // In stock
        },
        expectedFormula: 'Ngày tạo đơn + 1 ca làm việc'
    }
];

console.log('🎯 Expected output format:\n');
console.log('================================================================================');
console.log('📊 CÔNG THỨC TÍNH NGÀY GIAO CUỐI CÙNG');
console.log('================================================================================');
console.log('🔍 LOGIC ÁP DỤNG: [Logic name]');
console.log('📐 CÔNG THỨC: [Formula]');
console.log('💡 LÝ DO: [Reason]');
console.log('\n📥 THAM SỐ ĐẦU VÀO:');
console.log('   - Kho: [warehouse]');
console.log('   - District Leadtime: [value] ca');
console.log('   ...');
console.log('\n⚙️  RULES ĐƯỢC ÁP DỤNG:');
console.log('   ✅ Weekend Reset: [applied/not]');
console.log('   ✅ Sunday Adjustment: [applied/not]');
console.log('\n🎯 KẾT QUẢ CUỐI CÙNG:');
console.log('   📅 Ngày giao: [formatted date]');
console.log('================================================================================\n');

console.log('🚀 Running actual tests...\n');

testScenarios.forEach((scenario, index) => {
    console.log(`${'='.repeat(60)}`);
    console.log(`TEST ${index + 1}: ${scenario.name}`);
    console.log(`Expected: ${scenario.expectedFormula}`);
    console.log(`${'='.repeat(60)}`);

    try {
        const result = computeDeliveryDate(scenario.params);
        const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
        console.log(`✅ Result: ${result.toLocaleDateString('vi-VN')} (${dayNames[result.getDay()]})`);
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }

    console.log('\n');
});

console.log('🎉 Check the detailed logging above for each test case!');
console.log('📋 The logging shows exactly which formula was used and why!');
