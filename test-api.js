const axios = require('axios');

async function testAPI() {
  try {
    console.log('🧪 Testing Leadtime Validation API...');

    // Test with small dataset
    const response = await axios.get('http://localhost:3000/api/admin-app/leadtime-validation', {
      params: {
        days: 1, // Last 1 day
        limit: 5, // Max 5 records
        checkPrices: true,
        checkLeadtime: true
      }
    });

    console.log('✅ API Response Status:', response.status);
    console.log('📊 Summary:', response.data.summary);

    if (response.data.results && response.data.results.length > 0) {
      console.log(`📋 Found ${response.data.results.length} records with issues:`);

      response.data.results.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.type} ${result.soNumber}`);
        console.log(`   Customer: ${result.customerName}`);
        console.log(`   Warehouse: ${result.warehouse}`);
        console.log(`   Issues: ${result.issueCount}`);
      });
    } else {
      console.log('✅ No issues found in the checked period');
    }

  } catch (error) {
    console.log('❌ API Test failed:');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data?.error || error.message);

    if (error.response?.status === 404) {
      console.log('💡 Make sure the development server is running: npm run dev');
    }
  }
}

testAPI();
