import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LatencyCompensation } from './LatencyCompensation';

describe('LatencyCompensation', () => {
  let latencyCompensation: LatencyCompensation;
  const mockUserId = 'test-user-123';
  const mockGameId = 'test-game-456';

  beforeEach(() => {
    latencyCompensation = new LatencyCompensation();
    vi.clearAllMocks();
  });

  describe('recordLatency', () => {
    it('should record a new latency measurement', () => {
      const clientPingTime = 1000;
      const serverReceiveTime = 1050;
      const serverSendTime = 1100;

      const measurement = latencyCompensation.recordLatency(
        mockUserId,
        mockGameId,
        clientPingTime,
        serverReceiveTime,
        serverSendTime,
      );

      expect(measurement).toEqual({
        userId: mockUserId,
        gameId: mockGameId,
        latency: 50, // (1100 - 1000) / 2
        timestamp: expect.any(Date),
        serverTime: serverReceiveTime,
        clientTime: clientPingTime,
      });
    });

    it('should emit latencyUpdate event when recording measurement', () => {
      const mockEmit = vi.fn();
      latencyCompensation.emit = mockEmit;

      const measurement = latencyCompensation.recordLatency(mockUserId, mockGameId, 1000, 1050, 1100);

      expect(mockEmit).toHaveBeenCalledWith('latencyUpdate', measurement);
    });

    it('should keep only the most recent measurements', () => {
      // Record 12 measurements (more than the max of 10)
      for (let i = 0; i < 12; i++) {
        latencyCompensation.recordLatency(mockUserId, mockGameId, 1000 + i * 100, 1050 + i * 100, 1100 + i * 100);
      }

      const stats = latencyCompensation.getLatencyStats(mockUserId);
      expect(stats?.measurements.length).toBe(10);
    });
  });

  describe('getLatencyEstimate', () => {
    it('should return default latency when no measurements exist', () => {
      const latency = latencyCompensation.getLatencyEstimate(mockUserId);
      expect(latency).toBe(100); // Default latency
    });

    it('should return weighted average of measurements', () => {
      // Record measurements with different latencies
      latencyCompensation.recordLatency(mockUserId, mockGameId, 1000, 1050, 1200); // 100ms
      latencyCompensation.recordLatency(mockUserId, mockGameId, 2000, 2050, 2100); // 50ms
      latencyCompensation.recordLatency(mockUserId, mockGameId, 3000, 3050, 3150); // 75ms

      const estimate = latencyCompensation.getLatencyEstimate(mockUserId);
      // Weighted average: (100*1 + 50*2 + 75*3) / (1+2+3) = 425/6 ≈ 71
      expect(estimate).toBe(71);
    });
  });

  describe('getLatencyStats', () => {
    it('should return null when no measurements exist', () => {
      const stats = latencyCompensation.getLatencyStats(mockUserId);
      expect(stats).toBeNull();
    });

    it('should calculate accurate statistics', () => {
      // Record measurements: 50ms, 100ms, 150ms
      latencyCompensation.recordLatency(mockUserId, mockGameId, 1000, 1050, 1100);
      latencyCompensation.recordLatency(mockUserId, mockGameId, 2000, 2050, 2200);
      latencyCompensation.recordLatency(mockUserId, mockGameId, 3000, 3050, 3300);

      const stats = latencyCompensation.getLatencyStats(mockUserId);
      expect(stats).toEqual({
        averageLatency: 100, // (50 + 100 + 150) / 3
        medianLatency: 100, // Middle value
        minLatency: 50,
        maxLatency: 150,
        standardDeviation: 41, // √(((50-100)² + (100-100)² + (150-100)²) / 3)
        measurements: expect.arrayContaining([
          expect.objectContaining({ latency: 50 }),
          expect.objectContaining({ latency: 100 }),
          expect.objectContaining({ latency: 150 }),
        ]),
      });
    });
  });

  describe('compensateTimerForLatency', () => {
    it('should compensate timer based on latency estimate', () => {
      // Record a measurement to establish latency
      latencyCompensation.recordLatency(mockUserId, mockGameId, 1000, 1050, 1200);

      const now = Date.now();
      const serverTime = 5000;
      const clientRequestTime = now - 100; // 100ms ago
      const compensated = latencyCompensation.compensateTimerForLatency(mockUserId, serverTime, clientRequestTime);

      // Should apply some compensation
      expect(compensated).toBeGreaterThanOrEqual(0);
      expect(compensated).toBeLessThan(serverTime + 1000); // Reasonable upper bound
    });

    it('should not return negative values', () => {
      latencyCompensation.recordLatency(mockUserId, mockGameId, 1000, 1050, 1200);

      const compensated = latencyCompensation.compensateTimerForLatency(mockUserId, 100, 1000);

      expect(compensated).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateMoveTimeAdjustment', () => {
    it('should subtract latency from move time', () => {
      // Record 100ms latency
      latencyCompensation.recordLatency(mockUserId, mockGameId, 1000, 1050, 1200);

      const moveStartTime = 1000;
      const moveEndTime = 2000; // 1000ms move time
      const adjustedTime = latencyCompensation.calculateMoveTimeAdjustment(mockUserId, moveStartTime, moveEndTime);

      expect(adjustedTime).toBe(900); // 1000ms - 100ms latency
    });

    it('should not return negative adjusted time', () => {
      // Record high latency
      latencyCompensation.recordLatency(mockUserId, mockGameId, 1000, 1050, 1500);

      const adjustedTime = latencyCompensation.calculateMoveTimeAdjustment(
        mockUserId,
        1000,
        1100, // Only 100ms move time
      );

      expect(adjustedTime).toBe(0); // Should not go negative
    });
  });

  describe('getNetworkQuality', () => {
    it('should return excellent for low latency with stability', () => {
      // Record consistent low latency measurements
      for (let i = 0; i < 5; i++) {
        latencyCompensation.recordLatency(mockUserId, mockGameId, 1000 + i * 100, 1025 + i * 100, 1050 + i * 100);
      }

      const quality = latencyCompensation.getNetworkQuality(mockUserId);
      expect(quality).toBe('excellent');
    });

    it('should return good for moderate latency with stability', () => {
      // Record consistent moderate latency measurements
      for (let i = 0; i < 5; i++) {
        latencyCompensation.recordLatency(mockUserId, mockGameId, 1000 + i * 100, 1075 + i * 100, 1150 + i * 100);
      }

      const quality = latencyCompensation.getNetworkQuality(mockUserId);
      expect(quality).toBe('good');
    });

    it('should return fair for higher latency', () => {
      // Record higher latency measurements
      for (let i = 0; i < 5; i++) {
        latencyCompensation.recordLatency(mockUserId, mockGameId, 1000 + i * 100, 1150 + i * 100, 1300 + i * 100);
      }

      const quality = latencyCompensation.getNetworkQuality(mockUserId);
      expect(quality).toBe('fair');
    });

    it('should return poor for very high latency', () => {
      // Record very high latency measurements
      for (let i = 0; i < 5; i++) {
        latencyCompensation.recordLatency(mockUserId, mockGameId, 1000 + i * 100, 1300 + i * 100, 1600 + i * 100);
      }

      const quality = latencyCompensation.getNetworkQuality(mockUserId);
      expect(quality).toBe('poor');
    });

    it('should return unknown when no measurements exist', () => {
      const quality = latencyCompensation.getNetworkQuality(mockUserId);
      expect(quality).toBe('unknown');
    });
  });

  describe('hasStableLatency', () => {
    it('should return false with insufficient measurements', () => {
      latencyCompensation.recordLatency(mockUserId, mockGameId, 1000, 1050, 1100);
      latencyCompensation.recordLatency(mockUserId, mockGameId, 2000, 2050, 2100);

      const stable = latencyCompensation.hasStableLatency(mockUserId);
      expect(stable).toBe(false);
    });

    it('should return true for stable latency', () => {
      // Record consistent measurements
      for (let i = 0; i < 5; i++) {
        latencyCompensation.recordLatency(mockUserId, mockGameId, 1000 + i * 100, 1050 + i * 100, 1100 + i * 100);
      }

      const stable = latencyCompensation.hasStableLatency(mockUserId);
      expect(stable).toBe(true);
    });

    it('should return false for unstable latency', () => {
      // Record inconsistent measurements
      const latencies = [50, 200, 75, 300, 100];
      latencies.forEach((latency, i) => {
        latencyCompensation.recordLatency(
          mockUserId,
          mockGameId,
          1000 + i * 100,
          1050 + i * 100,
          1000 + i * 100 + latency * 2,
        );
      });

      const stable = latencyCompensation.hasStableLatency(mockUserId);
      expect(stable).toBe(false);
    });
  });

  describe('clearUserMeasurements', () => {
    it('should remove all measurements for a user', () => {
      latencyCompensation.recordLatency(mockUserId, mockGameId, 1000, 1050, 1100);

      expect(latencyCompensation.getLatencyStats(mockUserId)).not.toBeNull();

      latencyCompensation.clearUserMeasurements(mockUserId);

      expect(latencyCompensation.getLatencyStats(mockUserId)).toBeNull();
    });
  });

  describe('getTimeSyncData', () => {
    it('should return server time, latency, and stats', () => {
      latencyCompensation.recordLatency(mockUserId, mockGameId, 1000, 1050, 1100);

      const syncData = latencyCompensation.getTimeSyncData(mockUserId);

      expect(syncData).toEqual({
        serverTime: expect.any(Number),
        latency: 50,
        stats: expect.objectContaining({
          averageLatency: 50,
          measurements: expect.arrayContaining([expect.objectContaining({ latency: 50 })]),
        }),
      });
    });
  });

  describe('getTrackedUsers', () => {
    it('should return list of users with measurements', () => {
      const userId2 = 'user-2';

      latencyCompensation.recordLatency(mockUserId, mockGameId, 1000, 1050, 1100);
      latencyCompensation.recordLatency(userId2, mockGameId, 2000, 2050, 2100);

      const users = latencyCompensation.getTrackedUsers();
      expect(users).toContain(mockUserId);
      expect(users).toContain(userId2);
      expect(users).toHaveLength(2);
    });
  });

  describe('clearAllMeasurements', () => {
    it('should clear all measurements for all users', () => {
      latencyCompensation.recordLatency(mockUserId, mockGameId, 1000, 1050, 1100);
      latencyCompensation.recordLatency('user-2', mockGameId, 2000, 2050, 2100);

      expect(latencyCompensation.getTrackedUsers()).toHaveLength(2);

      latencyCompensation.clearAllMeasurements();

      expect(latencyCompensation.getTrackedUsers()).toHaveLength(0);
    });
  });
});
