#!/usr/bin/env node

/**
 * Test Runner for Hybrid Refresh System
 * 
 * This script runs all refresh system tests and provides detailed reporting
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Running Hybrid Refresh System Tests...\n');

// Test configuration
const testConfig = {
  testMatch: [
    '<rootDir>/src/__tests__/HybridRefreshSystem.test.js',
    '<rootDir>/src/__tests__/RefreshPerformance.test.js'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup.js'
  ],
  testEnvironment: 'jsdom',
  verbose: true,
  collectCoverage: true,
  coverageReporters: ['text', 'html'],
  coverageDirectory: 'coverage/refresh-system'
};

// Create temporary Jest config
const tempConfigPath = path.join(process.cwd(), 'jest.refresh.config.js');
const configContent = `
module.exports = ${JSON.stringify(testConfig, null, 2)};
`;

fs.writeFileSync(tempConfigPath, configContent);

try {
  console.log('📋 Test Configuration:');
  console.log('- Environment: jsdom');
  console.log('- Coverage: Enabled');
  console.log('- Verbose: Enabled');
  console.log('- Test Files:', testConfig.testMatch.length);
  console.log('');

  // Run the tests
  console.log('🧪 Executing Tests...\n');
  
  const result = execSync(`npx jest --config=${tempConfigPath}`, {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  console.log('\n✅ All tests completed successfully!');
  console.log('\n📊 Coverage Report Available:');
  console.log('   - Text: Console output above');
  console.log('   - HTML: coverage/refresh-system/index.html');

} catch (error) {
  console.error('\n❌ Test execution failed:');
  console.error(error.message);
  process.exit(1);
} finally {
  // Clean up temporary config
  if (fs.existsSync(tempConfigPath)) {
    fs.unlinkSync(tempConfigPath);
  }
}

console.log('\n🎉 Refresh System Testing Complete!');
console.log('\n📖 Next Steps:');
console.log('   1. Review coverage report for any gaps');
console.log('   2. Run performance benchmarks in production-like environment');
console.log('   3. Monitor real-world refresh system performance');
console.log('   4. Consider integration tests with backend services');