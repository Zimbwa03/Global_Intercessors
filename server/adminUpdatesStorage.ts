// In-memory storage for admin updates
interface AdminUpdate {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  schedule: string;
  expiry: string;
  send_notification: boolean;
  send_email: boolean;
  pin_to_top: boolean;
  is_active: boolean;
  date: string;
  created_at: string;
  updated_at: string;
}

class AdminUpdatesStorage {
  private updates: AdminUpdate[] = [];

  addUpdate(updateData: Omit<AdminUpdate, 'id' | 'date' | 'created_at' | 'updated_at'>): AdminUpdate {
    const now = new Date().toISOString();
    const id = `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newUpdate: AdminUpdate = {
      id,
      ...updateData,
      date: now,
      created_at: now,
      updated_at: now
    };

    this.updates.unshift(newUpdate);
    
    // Keep only last 100 updates
    if (this.updates.length > 100) {
      this.updates.splice(100);
    }

    return newUpdate;
  }

  getUpdates(): AdminUpdate[] {
    const now = new Date();
    
    // Filter out expired updates
    const activeUpdates = this.updates.filter(update => {
      if (update.expiry === 'never') return true;
      
      const createdAt = new Date(update.created_at);
      const diffInDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      
      switch (update.expiry) {
        case '1day': return diffInDays <= 1;
        case '3days': return diffInDays <= 3;
        case '1week': return diffInDays <= 7;
        case '1month': return diffInDays <= 30;
        default: return true;
      }
    });

    // Sort by priority and pin status
    return activeUpdates.sort((a, b) => {
      // Pinned items first
      if (a.pin_to_top && !b.pin_to_top) return -1;
      if (!a.pin_to_top && b.pin_to_top) return 1;
      
      // Then by priority
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2;
      
      if (aPriority !== bPriority) return bPriority - aPriority;
      
      // Finally by creation date
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  getUpdateCount(): number {
    return this.updates.length;
  }
}

export const adminUpdatesStorage = new AdminUpdatesStorage();