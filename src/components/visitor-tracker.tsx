'use client';

import { useEffect } from 'react';

export function VisitorTracker() {
  useEffect(() => {
    async function trackVisit() {
      try {
        let visitorId = localStorage.getItem('ah_visitor_id');
        if (!visitorId) {
          visitorId = 'v_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
          localStorage.setItem('ah_visitor_id', visitorId);
        }

        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
          now.getDate()
        ).padStart(2, '0')}`;

        const lastVisitDate = localStorage.getItem('ah_last_visit_date');

        if (lastVisitDate !== todayStr) {
          // Record daily unique visit silently
          const res = await fetch('/api/analytics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ visitorId }),
          });
          const json = await res.json();
          if (json.status === 'success') {
            localStorage.setItem('ah_last_visit_date', todayStr);
          }
        }
      } catch {
        // Silent catch
      }
    }

    trackVisit();
  }, []);

  return null; // Renders 0 DOM elements
}
