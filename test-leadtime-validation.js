// Test script for leadtime validation API
const axios = require('axios');

async function testLeadtimeValidationAPI() {
    console.log('🧪 Testing Leadtime Validation API...\n');

    try {
        // Test with default parameters (last 7 days, limit 50)
        console.log('📡 Testing default parameters...');
        const response = await axios.get('http://localhost:3000/api/admin-app/leadtime-validation');

        console.log('✅ API Response Status:', response.status);
        console.log('📊 Summary:', response.data.summary);

        if (response.data.results && response.data.results.length > 0) {
            console.log(`📋 Found ${response.data.results.length} records with issues:`);

            response.data.results.forEach((result, index) => {
                console.log(`\n${index + 1}. ${result.type} ${result.soNumber}`);
                console.log(`   Customer: ${result.customerName} (${result.customerCode})`);
                console.log(`   Industry: ${result.industry}, Warehouse: ${result.warehouse}`);
                console.log(`   Created: ${new Date(result.createdOn).toLocaleDateString('vi-VN')}`);
                console.log(`   Issues: ${result.issueCount}`);

                result.details.forEach((detail, detailIndex) => {
                    console.log(`   ${detailIndex + 1}. ${detail.productName} (${detail.productCode})`);
                    console.log(`      Quantity: ${detail.quantity} ${detail.unit}`);

                    if (detail.priceIssues.length > 0) {
                        console.log(`      💰 Price Issues:`);
                        detail.priceIssues.forEach(issue => console.log(`         - ${issue}`));
                    }

                    if (detail.leadtimeIssues.length > 0) {
                        console.log(`      📅 Leadtime Issues:`);
                        detail.leadtimeIssues.forEach(issue => console.log(`         - ${issue}`));
                    }

                    console.log(`      Expected Delivery: ${detail.expectedDeliveryDate}`);
                    console.log(`      Actual Delivery: ${detail.calculatedDeliveryDate}`);
                    console.log(`      Match: ${detail.deliveryDateMatch ? '✅' : '❌'}`);
                });
            });
        } else {
            console.log('✅ No issues found in the checked period');
        }

        console.log('\n🎯 Test completed successfully!');

    } catch (error) {
        console.error('❌ API Test failed:', error.response?.data || error.message);

        if (error.response?.status === 404) {
            console.log('💡 Make sure the development server is running: npm run dev');
        }
    }
}

// Test with different parameters
async function testWithParameters() {
    console.log('\n🔄 Testing with custom parameters...');

    try {
        const response = await axios.get('http://localhost:3000/api/admin-app/leadtime-validation', {
            params: {
                days: 3,
                limit: 10,
                checkPrices: true,
                checkLeadtime: true
            }
        });

        console.log(`✅ Custom params test: Found ${response.data.results?.length || 0} issues in last 3 days`);

    } catch (error) {
        console.error('❌ Custom params test failed:', error.message);
    }
}

// Run tests
testLeadtimeValidationAPI()
    .then(() => testWithParameters())
    .then(() => {
        console.log('\n🏁 All tests completed!');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Test suite failed:', error);
        process.exit(1);
    });
