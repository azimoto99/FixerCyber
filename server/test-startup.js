const { spawn } = require('child_process');

console.log('🚀 Starting Fixer server for testing...');

const server = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Test the server after a few seconds
setTimeout(async () => {
  try {
    const response = await fetch('http://localhost:5000/api/health');
    const data = await response.json();
    console.log('✅ Server health check:', data);
    
    // Try test login
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser',
        password: 'password123'
      })
    });
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Test login successful:', loginData.message);
    } else {
      const errorData = await loginResponse.json();
      console.log('❌ Test login failed:', errorData.error);
    }
    
  } catch (error) {
    console.error('❌ Server test failed:', error.message);
  } finally {
    // Kill the server
    server.kill();
  }
}, 3000);

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
});