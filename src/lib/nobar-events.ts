// In-memory subscribers map for SSE: code -> Set of controller functions
const globalForNobarSse = globalThis as unknown as {
  nobarSubscribers: Map<string, Set<(data: string) => void>>;
};

if (!globalForNobarSse.nobarSubscribers) {
  globalForNobarSse.nobarSubscribers = new Map();
}

export const subscribers = globalForNobarSse.nobarSubscribers;

export function broadcastToRoom(code: string, data: any) {
  const roomSubs = subscribers.get(code.toUpperCase());
  if (roomSubs) {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    roomSubs.forEach((send) => send(payload));
  }
}
