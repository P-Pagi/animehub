import fs from 'fs';
import path from 'path';

interface DailyAnalyticsData {
  visitors: Record<string, string[]>; // "YYYY-MM-DD": ["visitor_id_1", "visitor_id_2"]
  totalUniqueVisitors: string[]; // ["visitor_id_1", "visitor_id_2", ...]
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'analytics.json');

class AnalyticsService {
  private data: DailyAnalyticsData = {
    visitors: {},
    totalUniqueVisitors: [],
  };

  constructor() {
    this.loadData();
  }

  private loadData() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
      }
    } catch {
      // Fallback to empty memory store
      this.data = { visitors: {}, totalUniqueVisitors: [] };
    }
  }

  private saveData() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch {
      // Ignore save error
    }
  }

  private getTodayString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  public recordVisit(visitorId: string): { todayCount: number; totalCount: number; isNewToday: boolean } {
    if (!visitorId || typeof visitorId !== 'string') {
      return this.getStats();
    }

    const today = this.getTodayString();

    if (!this.data.visitors[today]) {
      this.data.visitors[today] = [];
    }

    let isNewToday = false;

    // Check if visitor is already counted for today
    if (!this.data.visitors[today].includes(visitorId)) {
      this.data.visitors[today].push(visitorId);
      isNewToday = true;
    }

    // Check if visitor is ever seen before in total unique list
    if (!this.data.totalUniqueVisitors.includes(visitorId)) {
      this.data.totalUniqueVisitors.push(visitorId);
    }

    if (isNewToday) {
      this.saveData();
    }

    return {
      todayCount: this.data.visitors[today].length,
      totalCount: this.data.totalUniqueVisitors.length,
      isNewToday,
    };
  }

  public getStats(): { todayCount: number; totalCount: number; isNewToday: boolean } {
    const today = this.getTodayString();
    const todayList = this.data.visitors[today] || [];
    return {
      todayCount: todayList.length,
      totalCount: this.data.totalUniqueVisitors.length,
      isNewToday: false,
    };
  }

  public getDetailedStats(): {
    todayCount: number;
    totalCount: number;
    history: { date: string; count: number }[];
  } {
    const today = this.getTodayString();
    const todayList = this.data.visitors[today] || [];

    const history = Object.keys(this.data.visitors)
      .sort()
      .reverse()
      .slice(0, 30)
      .map((date) => ({
        date,
        count: this.data.visitors[date].length,
      }));

    return {
      todayCount: todayList.length,
      totalCount: this.data.totalUniqueVisitors.length,
      history,
    };
  }
}

export const analyticsService = new AnalyticsService();
