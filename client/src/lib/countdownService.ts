interface CountdownTime {
  hours: number;
  minutes: number;
  seconds: number;
}

class CountdownService {
  private listeners: Set<(time: CountdownTime) => void> = new Set();
  private intervalId: NodeJS.Timeout | null = null;
  private currentTime: CountdownTime = { hours: 0, minutes: 0, seconds: 0 };

  start() {
    if (this.intervalId) return; // Already running

    this.intervalId = setInterval(() => {
      this.updateCountdown();
    }, 1000);

    // Initial calculation
    this.updateCountdown();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  subscribe(callback: (time: CountdownTime) => void) {
    this.listeners.add(callback);
    // Send current time immediately
    callback(this.currentTime);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  private updateCountdown() {
    const now = new Date();
    const nextHalfHour = new Date(now);
    
    // Calculate next 30-minute interval
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    
    if (minutes < 30) {
      nextHalfHour.setMinutes(30, 0, 0);
    } else {
      nextHalfHour.setHours(nextHalfHour.getHours() + 1, 0, 0, 0);
    }
    
    const timeDiff = nextHalfHour.getTime() - now.getTime();
    
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const mins = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((timeDiff % (1000 * 60)) / 1000);
    
    this.currentTime = { hours, minutes: mins, seconds: secs };
    
    // Notify all subscribers
    this.listeners.forEach(callback => callback(this.currentTime));
  }

  getCurrentTime(): CountdownTime {
    return this.currentTime;
  }
}

export const countdownService = new CountdownService();