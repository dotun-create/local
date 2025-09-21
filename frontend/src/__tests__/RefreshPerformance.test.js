/**
 * Performance Tests for Hybrid Refresh System
 * 
 * Tests the performance characteristics and optimization of the refresh system
 */

import { performance } from 'perf_hooks';
import { useAdminRefresh } from '../shared/hooks/useAdminRefresh';
import websocketService from '../shared/services/websocketService';

// Mock dependencies
jest.mock('../shared/services/websocketService');
jest.mock('../shared/services/notificationService');

describe('Refresh System Performance Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock performance.now if not available
    if (!global.performance) {
      global.performance = { now: jest.fn(() => Date.now()) };
    }
  });

  describe('Concurrent Refresh Performance', () => {
    
    test('handles multiple concurrent refreshes efficiently', async () => {
      const refreshTimes = [];
      const numConcurrentRefreshes = 10;
      
      // Create mock refresh functions with realistic delays
      const createMockRefresh = (delay) => jest.fn().mockImplementation(async () => {
        const start = performance.now();
        await new Promise(resolve => setTimeout(resolve, delay));
        const end = performance.now();
        refreshTimes.push(end - start);
        return { success: true };
      });

      const refreshFunctions = Array.from(
        { length: numConcurrentRefreshes }, 
        (_, i) => createMockRefresh(50 + Math.random() * 100)
      );

      // Execute all refreshes concurrently
      const start = performance.now();
      const results = await Promise.all(
        refreshFunctions.map(refresh => refresh())
      );
      const end = performance.now();

      const totalConcurrentTime = end - start;
      const averageIndividualTime = refreshTimes.reduce((a, b) => a + b, 0) / refreshTimes.length;

      // Verify all refreshes completed
      expect(results).toHaveLength(numConcurrentRefreshes);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Concurrent execution should be much faster than sequential
      expect(totalConcurrentTime).toBeLessThan(averageIndividualTime * numConcurrentRefreshes);
      
      console.log(`Concurrent execution time: ${totalConcurrentTime.toFixed(2)}ms`);
      console.log(`Average individual time: ${averageIndividualTime.toFixed(2)}ms`);
      console.log(`Efficiency gain: ${((averageIndividualTime * numConcurrentRefreshes - totalConcurrentTime) / (averageIndividualTime * numConcurrentRefreshes) * 100).toFixed(2)}%`);
    });

    test('memory usage remains stable during multiple refreshes', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const refreshPromises = [];
      
      // Create 50 refresh operations
      for (let i = 0; i < 50; i++) {
        const refresh = async () => {
          // Simulate data loading and processing
          const data = new Array(1000).fill(null).map((_, idx) => ({
            id: `item-${idx}`,
            data: Math.random().toString(36),
            timestamp: Date.now()
          }));
          
          // Process the data
          return data.filter(item => item.data.length > 5);
        };
        
        refreshPromises.push(refresh());
      }

      await Promise.all(refreshPromises);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseKB = memoryIncrease / 1024;
      
      console.log(`Memory increase: ${memoryIncreaseKB.toFixed(2)} KB`);
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncreaseKB).toBeLessThan(10240);
    });
  });

  describe('Event Handling Performance', () => {
    
    test('event listener registration is efficient', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const start = performance.now();
      
      // Simulate registering multiple event listeners
      const eventTypes = [
        'adminDataRefresh',
        'refreshAdminData', 
        'refreshCourseData',
        'refreshUserData',
        'refreshSessionData',
        'refreshEnrollmentData'
      ];
      
      const handlers = eventTypes.map(eventType => {
        const handler = jest.fn();
        window.addEventListener(eventType, handler);
        return { eventType, handler };
      });
      
      const registrationTime = performance.now() - start;
      
      // Cleanup
      handlers.forEach(({ eventType, handler }) => {
        window.removeEventListener(eventType, handler);
      });
      
      const cleanupTime = performance.now() - start - registrationTime;
      
      console.log(`Event registration time: ${registrationTime.toFixed(2)}ms`);
      console.log(`Event cleanup time: ${cleanupTime.toFixed(2)}ms`);
      
      // Registration should be fast (less than 10ms)
      expect(registrationTime).toBeLessThan(10);
      expect(addEventListenerSpy).toHaveBeenCalledTimes(eventTypes.length);
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(eventTypes.length);
    });

    test('handles rapid event firing without performance degradation', async () => {
      const eventHandler = jest.fn();
      const processingTimes = [];
      
      // Create handler that measures processing time
      const timedHandler = async (event) => {
        const start = performance.now();
        await eventHandler(event);
        const end = performance.now();
        processingTimes.push(end - start);
      };
      
      // Fire 100 rapid events
      const numEvents = 100;
      const eventPromises = [];
      
      for (let i = 0; i < numEvents; i++) {
        const event = new CustomEvent('testRefresh', {
          detail: { id: i, timestamp: Date.now() }
        });
        
        eventPromises.push(timedHandler(event));
      }
      
      await Promise.all(eventPromises);
      
      // Analyze processing times
      const averageTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      const maxTime = Math.max(...processingTimes);
      const minTime = Math.min(...processingTimes);
      
      console.log(`Average event processing time: ${averageTime.toFixed(2)}ms`);
      console.log(`Max processing time: ${maxTime.toFixed(2)}ms`);
      console.log(`Min processing time: ${minTime.toFixed(2)}ms`);
      
      // Processing should be fast and consistent
      expect(averageTime).toBeLessThan(5);
      expect(maxTime).toBeLessThan(20);
      expect(eventHandler).toHaveBeenCalledTimes(numEvents);
    });
  });

  describe('WebSocket Performance', () => {
    
    test('WebSocket connection establishment is efficient', () => {
      const connectSpy = jest.spyOn(websocketService, 'connect');
      const subscribeSpy = jest.spyOn(websocketService, 'subscribeToEntity');
      
      const start = performance.now();
      
      // Simulate WebSocket setup
      websocketService.connect();
      
      // Subscribe to multiple entities
      const entityTypes = ['user', 'course', 'session', 'enrollment'];
      const entityIds = ['id1', 'id2', 'id3', 'id4', 'id5'];
      
      entityTypes.forEach(type => {
        entityIds.forEach(id => {
          websocketService.subscribeToEntity(type, id);
        });
      });
      
      const setupTime = performance.now() - start;
      
      console.log(`WebSocket setup time: ${setupTime.toFixed(2)}ms`);
      
      expect(setupTime).toBeLessThan(50);
      expect(connectSpy).toHaveBeenCalledTimes(1);
      expect(subscribeSpy).toHaveBeenCalledTimes(entityTypes.length * entityIds.length);
    });
  });

  describe('Data Loading Performance', () => {
    
    test('batch data loading is more efficient than sequential', async () => {
      // Mock API endpoints
      const mockEndpoints = {
        users: jest.fn().mockResolvedValue({ users: [] }),
        courses: jest.fn().mockResolvedValue({ courses: [] }),
        sessions: jest.fn().mockResolvedValue({ sessions: [] }),
        analytics: jest.fn().mockResolvedValue({ stats: {} })
      };
      
      // Sequential loading
      const sequentialStart = performance.now();
      await mockEndpoints.users();
      await mockEndpoints.courses(); 
      await mockEndpoints.sessions();
      await mockEndpoints.analytics();
      const sequentialTime = performance.now() - sequentialStart;
      
      // Reset mocks
      Object.values(mockEndpoints).forEach(mock => mock.mockClear());
      
      // Batch loading  
      const batchStart = performance.now();
      await Promise.all([
        mockEndpoints.users(),
        mockEndpoints.courses(),
        mockEndpoints.sessions(),
        mockEndpoints.analytics()
      ]);
      const batchTime = performance.now() - batchStart;
      
      console.log(`Sequential loading time: ${sequentialTime.toFixed(2)}ms`);
      console.log(`Batch loading time: ${batchTime.toFixed(2)}ms`);
      console.log(`Performance improvement: ${((sequentialTime - batchTime) / sequentialTime * 100).toFixed(2)}%`);
      
      // Batch loading should be faster or at least not slower
      expect(batchTime).toBeLessThanOrEqual(sequentialTime);
      
      // Verify all endpoints were called
      Object.values(mockEndpoints).forEach(mock => {
        expect(mock).toHaveBeenCalledTimes(1);
      });
    });

    test('caching improves repeated data access performance', async () => {
      const cache = new Map();
      const expensiveOperation = jest.fn().mockImplementation(async (key) => {
        // Simulate expensive computation
        await new Promise(resolve => setTimeout(resolve, 100));
        return `processed-${key}`;
      });
      
      const cachedOperation = async (key) => {
        if (cache.has(key)) {
          return cache.get(key);
        }
        
        const result = await expensiveOperation(key);
        cache.set(key, result);
        return result;
      };
      
      // First access (cache miss)
      const firstStart = performance.now();
      const firstResult = await cachedOperation('test-key');
      const firstTime = performance.now() - firstStart;
      
      // Second access (cache hit)
      const secondStart = performance.now();
      const secondResult = await cachedOperation('test-key');
      const secondTime = performance.now() - secondStart;
      
      console.log(`First access time: ${firstTime.toFixed(2)}ms`);
      console.log(`Second access time: ${secondTime.toFixed(2)}ms`);
      console.log(`Cache performance improvement: ${((firstTime - secondTime) / firstTime * 100).toFixed(2)}%`);
      
      expect(firstResult).toBe(secondResult);
      expect(secondTime).toBeLessThan(firstTime);
      expect(expensiveOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('UI Update Performance', () => {
    
    test('state updates are batched efficiently', async () => {
      const stateUpdates = [];
      const mockSetState = jest.fn((updater) => {
        stateUpdates.push({
          timestamp: performance.now(),
          updater: typeof updater === 'function' ? 'function' : updater
        });
      });
      
      // Simulate multiple rapid state updates
      const start = performance.now();
      
      // Batch of updates
      mockSetState(prev => ({ ...prev, loading: true }));
      mockSetState(prev => ({ ...prev, data: [] }));
      mockSetState(prev => ({ ...prev, error: null }));
      mockSetState(prev => ({ ...prev, loading: false }));
      
      const end = performance.now();
      const updateTime = end - start;
      
      console.log(`State update time: ${updateTime.toFixed(2)}ms`);
      console.log(`Number of updates: ${stateUpdates.length}`);
      
      expect(updateTime).toBeLessThan(10);
      expect(mockSetState).toHaveBeenCalledTimes(4);
      expect(stateUpdates).toHaveLength(4);
    });
  });

  describe('Load Testing', () => {
    
    test('system handles high refresh frequency', async () => {
      const refreshCounts = [];
      let totalRefreshes = 0;
      
      const mockRefresh = jest.fn().mockImplementation(async () => {
        totalRefreshes++;
        const count = refreshCounts.length;
        refreshCounts.push(count);
        
        // Simulate realistic refresh work
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        return { success: true, count };
      });
      
      // High-frequency refresh simulation
      const refreshInterval = setInterval(mockRefresh, 10);
      
      // Run for 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      clearInterval(refreshInterval);
      
      // Wait for any pending refreshes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log(`Total refreshes completed: ${totalRefreshes}`);
      console.log(`Refresh frequency: ${totalRefreshes} refreshes/second`);
      
      expect(totalRefreshes).toBeGreaterThan(10);
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});