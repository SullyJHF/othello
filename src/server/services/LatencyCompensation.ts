import { EventEmitter } from 'events';

export interface LatencyMeasurement {
  userId: string;
  gameId: string;
  latency: number; // Round-trip time in milliseconds
  timestamp: Date;
  serverTime: number; // Server timestamp when measurement was taken
  clientTime: number; // Client timestamp from ping
}

export interface LatencyStats {
  averageLatency: number;
  medianLatency: number;
  minLatency: number;
  maxLatency: number;
  standardDeviation: number;
  measurements: LatencyMeasurement[];
}

export class LatencyCompensation extends EventEmitter {
  private measurements: Map<string, LatencyMeasurement[]> = new Map(); // userId -> measurements
  private readonly maxMeasurements = 10; // Keep last 10 measurements for each user
  private readonly defaultLatency = 100; // Default assumed latency in ms

  constructor() {
    super();
  }

  // Record a new latency measurement
  recordLatency(
    userId: string,
    gameId: string,
    clientPingTime: number,
    serverReceiveTime: number,
    serverSendTime: number,
  ): LatencyMeasurement {
    const roundTripTime = serverSendTime - clientPingTime;
    const oneWayLatency = roundTripTime / 2;

    const measurement: LatencyMeasurement = {
      userId,
      gameId,
      latency: oneWayLatency,
      timestamp: new Date(),
      serverTime: serverReceiveTime,
      clientTime: clientPingTime,
    };

    // Store measurement
    const userMeasurements = this.measurements.get(userId) || [];
    userMeasurements.push(measurement);

    // Keep only the most recent measurements
    if (userMeasurements.length > this.maxMeasurements) {
      userMeasurements.shift();
    }

    this.measurements.set(userId, userMeasurements);

    // Emit latency update event
    this.emit('latencyUpdate', measurement);

    return measurement;
  }

  // Get current latency estimate for a user
  getLatencyEstimate(userId: string): number {
    const measurements = this.measurements.get(userId);

    if (!measurements || measurements.length === 0) {
      return this.defaultLatency;
    }

    // Use weighted average with more recent measurements having higher weight
    let weightedSum = 0;
    let totalWeight = 0;

    measurements.forEach((measurement, index) => {
      const weight = index + 1; // More recent measurements have higher weight
      weightedSum += measurement.latency * weight;
      totalWeight += weight;
    });

    return Math.round(weightedSum / totalWeight);
  }

  // Get detailed latency statistics for a user
  getLatencyStats(userId: string): LatencyStats | null {
    const measurements = this.measurements.get(userId);

    if (!measurements || measurements.length === 0) {
      return null;
    }

    const latencies = measurements.map((m) => m.latency);
    const sortedLatencies = [...latencies].sort((a, b) => a - b);

    const sum = latencies.reduce((acc, lat) => acc + lat, 0);
    const average = sum / latencies.length;

    const median =
      sortedLatencies.length % 2 === 0
        ? (sortedLatencies[sortedLatencies.length / 2 - 1] + sortedLatencies[sortedLatencies.length / 2]) / 2
        : sortedLatencies[Math.floor(sortedLatencies.length / 2)];

    const variance = latencies.reduce((acc, lat) => acc + Math.pow(lat - average, 2), 0) / latencies.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      averageLatency: Math.round(average),
      medianLatency: Math.round(median),
      minLatency: Math.round(sortedLatencies[0]),
      maxLatency: Math.round(sortedLatencies[sortedLatencies.length - 1]),
      standardDeviation: Math.round(standardDeviation),
      measurements: [...measurements],
    };
  }

  // Compensate timer value for network latency
  compensateTimerForLatency(userId: string, serverTime: number, clientRequestTime: number): number {
    const latency = this.getLatencyEstimate(userId);
    const networkDelay = Date.now() - clientRequestTime;

    // Adjust server time by estimated one-way latency
    const compensatedTime = serverTime + latency / 2;

    // Also account for processing delay
    const processingDelay = networkDelay - latency;

    return Math.max(0, compensatedTime - processingDelay);
  }

  // Calculate time adjustment for move timing
  calculateMoveTimeAdjustment(userId: string, moveStartTime: number, moveEndTime: number): number {
    const latency = this.getLatencyEstimate(userId);
    const moveTime = moveEndTime - moveStartTime;

    // Subtract estimated network latency from move time
    const adjustedMoveTime = moveTime - latency;

    return Math.max(0, adjustedMoveTime);
  }

  // Get time synchronization data for client
  getTimeSyncData(userId: string): { serverTime: number; latency: number; stats: LatencyStats | null } {
    return {
      serverTime: Date.now(),
      latency: this.getLatencyEstimate(userId),
      stats: this.getLatencyStats(userId),
    };
  }

  // Clear measurements for a user (e.g., when they disconnect)
  clearUserMeasurements(userId: string): void {
    this.measurements.delete(userId);
  }

  // Clear all measurements
  clearAllMeasurements(): void {
    this.measurements.clear();
  }

  // Get all users with measurements
  getTrackedUsers(): string[] {
    return Array.from(this.measurements.keys());
  }

  // Check if a user has stable latency (low variance)
  hasStableLatency(userId: string): boolean {
    const stats = this.getLatencyStats(userId);
    if (!stats || stats.measurements.length < 3) {
      return false;
    }

    // Consider latency stable if standard deviation is less than 30% of average
    return stats.standardDeviation < stats.averageLatency * 0.3;
  }

  // Get network quality assessment
  getNetworkQuality(userId: string): 'excellent' | 'good' | 'fair' | 'poor' | 'unknown' {
    const stats = this.getLatencyStats(userId);
    if (!stats) return 'unknown';

    const avgLatency = stats.averageLatency;
    const stability = this.hasStableLatency(userId);

    if (avgLatency <= 50 && stability) return 'excellent';
    if (avgLatency <= 100 && stability) return 'good';
    if (avgLatency <= 200) return 'fair';
    return 'poor';
  }
}

// Global instance
export const latencyCompensation = new LatencyCompensation();
