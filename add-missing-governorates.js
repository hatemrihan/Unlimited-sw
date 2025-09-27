// Script to add missing Egyptian governorates
// Run with: node add-missing-governorates.js

const missingGovernorates = [
  // Major missing governorates
  { name: 'Luxor', shippingCost: 40, codFee: 12 },
  { name: 'Port Said', shippingCost: 30, codFee: 8 },
  { name: 'Suez', shippingCost: 35, codFee: 10 },
  { name: 'Red Sea', shippingCost: 50, codFee: 15 },
  { name: 'Matrouh', shippingCost: 45, codFee: 12 },
  { name: 'North Sinai', shippingCost: 55, codFee: 15 },
  { name: 'South Sinai', shippingCost: 55, codFee: 15 },
  { name: 'New Valley', shippingCost: 60, codFee: 18 },
  { name: 'Qena', shippingCost: 40, codFee: 12 },
  { name: 'Sohag', shippingCost: 40, codFee: 12 },
  { name: 'Minya', shippingCost: 35, codFee: 10 },
  { name: 'Beni Suef', shippingCost: 35, codFee: 10 },
  { name: 'Monufia', shippingCost: 30, codFee: 8 },
  { name: 'Sharqia', shippingCost: 30, codFee: 8 },
  { name: 'Qalyubia', shippingCost: 25, codFee: 8 },
  { name: 'Fayoum', shippingCost: 35, codFee: 10 },
  { name: 'Damietta', shippingCost: 30, codFee: 8 }
];

async function addGovernorates() {
  try {
    console.log('🏛️ Adding missing governorates...');
    
    // Replace with your actual domain
    const baseUrl = 'http://localhost:3000'; // or your production URL
    
    for (const gov of missingGovernorates) {
      try {
        const response = await fetch(`${baseUrl}/api/admin/cities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cityName: gov.name,
            governorate: gov.name,
            shippingCost: gov.shippingCost,
            codFee: gov.codFee,
            isActive: true
          }),
        });

        const data = await response.json();
        
        if (data.success) {
          console.log(`✅ Added: ${gov.name}`);
        } else {
          console.log(`⚠️ Skipped: ${gov.name} (${data.error || 'already exists'})`);
        }
      } catch (error) {
        console.log(`❌ Error adding ${gov.name}:`, error.message);
      }
    }
    
    console.log('🎉 Finished adding governorates!');
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the script
addGovernorates();












