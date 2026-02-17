/**
 * Logger Tests (Phase 4.2 - Test Plan 4.2)
 * 
 * Tests for centralized structured logger:
 * - createLogger() returns scoped logger with all methods
 * - Logger methods (debug, info, warn, error) exist
 * - timed() logs with duration
 * - configure() changes settings
 * - setContext()/clearContext() manage global context
 * - Log levels filter correctly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  logger,
  createLogger,
  configure,
  setContext,
  clearContext,
  type LogLevel,
} from '../logger';

// =============================================================================
// Setup
// =============================================================================

describe('logger', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    // Spy on console methods
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };

    // Reset logger config for each test
    configure({ level: 'debug', enableConsole: true, enableSentry: false, jsonOutput: false });
    clearContext();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =============================================================================
  // Logger API Tests
  // =============================================================================

  describe('logger API', () => {
    it('should have debug method', () => {
      expect(typeof logger.debug).toBe('function');
    });

    it('should have info method', () => {
      expect(typeof logger.info).toBe('function');
    });

    it('should have warn method', () => {
      expect(typeof logger.warn).toBe('function');
    });

    it('should have error method', () => {
      expect(typeof logger.error).toBe('function');
    });

    it('should have timed method', () => {
      expect(typeof logger.timed).toBe('function');
    });

    it('should have configure method', () => {
      expect(typeof logger.configure).toBe('function');
    });

    it('should have setContext method', () => {
      expect(typeof logger.setContext).toBe('function');
    });

    it('should have clearContext method', () => {
      expect(typeof logger.clearContext).toBe('function');
    });

    it('should have createLogger method', () => {
      expect(typeof logger.createLogger).toBe('function');
    });
  });

  // =============================================================================
  // Logging Methods Tests
  // =============================================================================

  describe('logging methods', () => {
    it('should call console.debug for debug level', () => {
      logger.debug('Test debug message');
      expect(consoleSpy.debug).toHaveBeenCalled();
    });

    it('should call console.info for info level', () => {
      logger.info('Test info message');
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it('should call console.warn for warn level', () => {
      logger.warn('Test warn message');
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it('should call console.error for error level', () => {
      logger.error('Test error message');
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should include message in log output', () => {
      logger.info('My specific message');
      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('My specific message'));
    });

    it('should include context in log output', () => {
      logger.info('Message', { userId: '123' });
      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('userId'));
    });

    it('should include module name when provided', () => {
      logger.info('Message', undefined, 'MyModule');
      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('MyModule'));
    });
  });

  // =============================================================================
  // timed() Tests
  // =============================================================================

  describe('timed()', () => {
    it('should log with duration', () => {
      logger.timed('Operation completed', 150);
      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('150ms'));
    });

    it('should include message', () => {
      logger.timed('My operation', 100);
      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('My operation'));
    });

    it('should include context when provided', () => {
      logger.timed('Operation', 50, { key: 'value' });
      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('key'));
    });

    it('should include module when provided', () => {
      logger.timed('Operation', 50, undefined, 'TimedModule');
      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('TimedModule'));
    });
  });

  // =============================================================================
  // configure() Tests
  // =============================================================================

  describe('configure()', () => {
    it('should disable console output when configured', () => {
      configure({ enableConsole: false });
      logger.info('This should not be logged');
      expect(consoleSpy.info).not.toHaveBeenCalled();
    });

    it('should filter by log level', () => {
      configure({ level: 'warn' });
      
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should enable JSON output when configured', () => {
      configure({ jsonOutput: true });
      logger.info('Test message');
      
      // JSON output should be parseable
      const call = consoleSpy.info.mock.calls[0][0];
      expect(() => JSON.parse(call)).not.toThrow();
    });
  });

  // =============================================================================
  // setContext() / clearContext() Tests
  // =============================================================================

  describe('context management', () => {
    it('should include global context in logs', () => {
      setContext({ environment: 'test', version: '1.0.0' });
      logger.info('Test message');
      
      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('environment'));
    });

    it('should merge context with log context', () => {
      setContext({ global: 'value' });
      logger.info('Test message', { local: 'context' });
      
      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).toContain('global');
      expect(call).toContain('local');
    });

    it('should clear context when clearContext() called', () => {
      setContext({ should: 'disappear' });
      clearContext();
      logger.info('Test message');
      
      const call = consoleSpy.info.mock.calls[0][0];
      expect(call).not.toContain('disappear');
    });
  });

  // =============================================================================
  // createLogger() Tests
  // =============================================================================

  describe('createLogger()', () => {
    it('should return scoped logger with all methods', () => {
      const scopedLogger = createLogger('MyModule');
      
      expect(typeof scopedLogger.debug).toBe('function');
      expect(typeof scopedLogger.info).toBe('function');
      expect(typeof scopedLogger.warn).toBe('function');
      expect(typeof scopedLogger.error).toBe('function');
      expect(typeof scopedLogger.timed).toBe('function');
      expect(typeof scopedLogger.time).toBe('function');
      expect(typeof scopedLogger.child).toBe('function');
    });

    it('should include module name in logs', () => {
      const scopedLogger = createLogger('ScopedModule');
      scopedLogger.info('Test message');
      
      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('ScopedModule'));
    });

    it('should pass context to parent logger', () => {
      const scopedLogger = createLogger('Module');
      scopedLogger.info('Message', { scoped: 'context' });
      
      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('scoped'));
    });

    it('should have child() method that adds context', () => {
      const parentLogger = createLogger('Parent');
      const childLogger = parentLogger.child({ requestId: '123' });
      
      childLogger.info('Child message');
      
      expect(consoleSpy.info).toHaveBeenCalledWith(expect.stringContaining('requestId'));
    });
  });

  // =============================================================================
  // Log Level Filtering Tests
  // =============================================================================

  describe('log level filtering', () => {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

    levels.forEach((minLevel, minIndex) => {
      it(`should only log ${minLevel} and above when level is ${minLevel}`, () => {
        configure({ level: minLevel });
        
        logger.debug('debug');
        logger.info('info');
        logger.warn('warn');
        logger.error('error');

        // Levels below minLevel should not be logged
        if (minIndex > 0) expect(consoleSpy.debug).not.toHaveBeenCalled();
        if (minIndex > 1) expect(consoleSpy.info).not.toHaveBeenCalled();
        if (minIndex > 2) expect(consoleSpy.warn).not.toHaveBeenCalled();

        // Level at and above minLevel should be logged
        if (minIndex <= 0) expect(consoleSpy.debug).toHaveBeenCalled();
        if (minIndex <= 1) expect(consoleSpy.info).toHaveBeenCalled();
        if (minIndex <= 2) expect(consoleSpy.warn).toHaveBeenCalled();
        expect(consoleSpy.error).toHaveBeenCalled(); // error always logged
      });
    });
  });

  // =============================================================================
  // Error Handling Tests
  // =============================================================================

  describe('error handling', () => {
    it('should accept Error object', () => {
      const testError = new Error('Test error');
      logger.error('Something went wrong', testError);
      
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it('should accept context object for error', () => {
      logger.error('Something went wrong', { errorCode: 'E001' });
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('E001'),
        undefined // No Error object
      );
    });

    it('should handle undefined error context', () => {
      expect(() => logger.error('Just a message')).not.toThrow();
    });
  });
});
