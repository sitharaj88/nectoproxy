import type { NetworkProfile } from '@proxyscope/shared';

export class ThrottleService {
  private activeProfile: NetworkProfile | null = null;

  setProfile(profile: NetworkProfile | null): void {
    this.activeProfile = profile;
  }

  getProfile(): NetworkProfile | null {
    return this.activeProfile;
  }

  isEnabled(): boolean {
    return this.activeProfile !== null && this.activeProfile.enabled;
  }

  /**
   * Calculate delay based on data size and bandwidth limit
   */
  calculateDelay(dataSize: number, isUpload: boolean): number {
    if (!this.activeProfile || !this.activeProfile.enabled) {
      return 0;
    }

    const bandwidth = isUpload
      ? this.activeProfile.uploadBandwidth
      : this.activeProfile.downloadBandwidth;

    if (bandwidth === 0) {
      return 0; // No bandwidth limit
    }

    // Calculate time to transfer the data at the given bandwidth
    // bandwidth is in bytes per second
    const transferTimeMs = (dataSize / bandwidth) * 1000;

    return Math.round(transferTimeMs);
  }

  /**
   * Get latency delay with jitter
   */
  getLatency(): number {
    if (!this.activeProfile || !this.activeProfile.enabled) {
      return 0;
    }

    const baseLatency = this.activeProfile.latency;
    const jitter = this.activeProfile.latencyJitter;

    if (jitter === 0) {
      return baseLatency;
    }

    // Add random jitter between -jitter and +jitter
    const randomJitter = (Math.random() * 2 - 1) * jitter;
    return Math.max(0, Math.round(baseLatency + randomJitter));
  }

  /**
   * Check if request/response should be dropped due to packet loss
   */
  shouldDrop(): boolean {
    if (!this.activeProfile || !this.activeProfile.enabled) {
      return false;
    }

    const packetLoss = this.activeProfile.packetLoss;
    if (packetLoss === 0) {
      return false;
    }

    // Random chance of dropping based on packet loss percentage
    return Math.random() * 100 < packetLoss;
  }

  /**
   * Get total delay for a request (latency only)
   */
  getRequestDelay(): number {
    return this.getLatency();
  }

  /**
   * Get total delay for a response (latency + transfer time)
   */
  getResponseDelay(dataSize: number): number {
    const latency = this.getLatency();
    const transferDelay = this.calculateDelay(dataSize, false);
    return latency + transferDelay;
  }

  /**
   * Apply delay asynchronously
   */
  async delay(ms: number): Promise<void> {
    if (ms <= 0) return;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Apply request throttling
   */
  async throttleRequest(dataSize: number): Promise<{ dropped: boolean }> {
    if (!this.isEnabled()) {
      return { dropped: false };
    }

    // Check packet loss
    if (this.shouldDrop()) {
      return { dropped: true };
    }

    // Apply latency
    const latency = this.getLatency();
    if (latency > 0) {
      await this.delay(latency);
    }

    // Apply upload bandwidth throttle
    const uploadDelay = this.calculateDelay(dataSize, true);
    if (uploadDelay > 0) {
      await this.delay(uploadDelay);
    }

    return { dropped: false };
  }

  /**
   * Apply response throttling
   */
  async throttleResponse(dataSize: number): Promise<{ dropped: boolean }> {
    if (!this.isEnabled()) {
      return { dropped: false };
    }

    // Check packet loss
    if (this.shouldDrop()) {
      return { dropped: true };
    }

    // Apply download bandwidth throttle
    const downloadDelay = this.calculateDelay(dataSize, false);
    if (downloadDelay > 0) {
      await this.delay(downloadDelay);
    }

    return { dropped: false };
  }
}
