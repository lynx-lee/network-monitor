// Test script to send a test alert using ServerChan service
import serverChanService from './src/server/serverChanService';

async function testAlert() {
  try {
    console.log('Testing ServerChan alert sending...');
    
    // Send a test device status alert
    const result = await serverChanService.sendDeviceStatusAlert(
      'test-device-123',
      'router',
      'Test Device',
      '192.168.1.1',
      'down'
    );
    
    if (result) {
      console.log('✓ Alert sent successfully!');
    } else {
      console.log('✗ Alert sending failed!');
    }
    
  } catch (error) {
    console.error('✗ Error sending alert:', error);
  }
}

testAlert();
