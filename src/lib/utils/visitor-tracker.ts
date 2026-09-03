// In-memory active visitor tracker (Active IP heartbeat in last 5 minutes)
class VisitorTracker {
  private activeSessions = new Map<string, number>();

  public ping(clientIp: string) {
    this.activeSessions.set(clientIp, Date.now());
  }

  public getLiveCount(): number {
    const now = Date.now();
    const windowMs = 5 * 60 * 1000; // 5 minutes inactivity timeout
    let count = 0;

    for (const [ip, lastSeen] of this.activeSessions.entries()) {
      if (now - lastSeen < windowMs) {
        count++;
      } else {
        this.activeSessions.delete(ip);
      }
    }

    return Math.max(1, count); // At least 1 (the current admin or active user)
  }
}

export const visitorTracker = new VisitorTracker();
