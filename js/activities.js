/**
 * Activities Module
 * Handles CRUD operations for activities
 */

const Activities = {
    MAX_MINUTES_PER_DAY: 1440,
    activities: [],
    currentDate: null,
    unsubscribe: null,

    /**
     * Category configuration with colors and icons
     */
    categories: {
        work: { icon: '💼', color: '#6366f1', label: 'Work' },
        study: { icon: '📚', color: '#8b5cf6', label: 'Study' },
        sleep: { icon: '😴', color: '#6366f1', label: 'Sleep' },
        exercise: { icon: '🏃', color: '#22c55e', label: 'Exercise' },
        entertainment: { icon: '🎮', color: '#f59e0b', label: 'Entertainment' },
        meals: { icon: '🍽️', color: '#ef4444', label: 'Meals' },
        commute: { icon: '🚗', color: '#14b8a6', label: 'Commute' },
        personal: { icon: '🧘', color: '#ec4899', label: 'Personal Care' },
        social: { icon: '👥', color: '#3b82f6', label: 'Social' },
        other: { icon: '📌', color: '#71717a', label: 'Other' }
    },

    /**
     * Initialize activities for a specific date
     */
    init(date) {
        this.currentDate = date;
        this.subscribeToActivities();
    },

    /**
     * Get formatted date string (YYYY-MM-DD)
     */
    formatDate(date) {
        return date.toISOString().split('T')[0];
    },

    /**
     * Subscribe to real-time activity updates
     */
    subscribeToActivities() {
        // Unsubscribe from previous listener
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        const userId = Auth.currentUser?.uid;
        if (!userId || !this.currentDate) return;

        const dateStr = this.formatDate(this.currentDate);
        
        this.unsubscribe = firebaseDB
            .collection('users')
            .doc(userId)
            .collection('days')
            .doc(dateStr)
            .collection('activities')
            .orderBy('createdAt', 'asc')
            .onSnapshot((snapshot) => {
                this.activities = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                this.render();
                this.updateTimeProgress();
            }, (error) => {
                console.error('Error fetching activities:', error);
                App.showToast('Error loading activities', 'error');
            });
    },

    /**
     * Add a new activity
     */
    async addActivity(name, category, duration) {
        const userId = Auth.currentUser?.uid;
        if (!userId) return { success: false, error: 'Not authenticated' };

        const dateStr = this.formatDate(this.currentDate);
        const totalMinutes = this.getTotalMinutes();
        
        // Validate duration
        if (totalMinutes + duration > this.MAX_MINUTES_PER_DAY) {
            const remaining = this.MAX_MINUTES_PER_DAY - totalMinutes;
            return { 
                success: false, 
                error: `Cannot add ${duration} minutes. Only ${remaining} minutes remaining for this day.` 
            };
        }

        try {
            await firebaseDB
                .collection('users')
                .doc(userId)
                .collection('days')
                .doc(dateStr)
                .collection('activities')
                .add({
                    name,
                    category,
                    duration: parseInt(duration),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            return { success: true };
        } catch (error) {
            console.error('Error adding activity:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Update an existing activity
     */
    async updateActivity(activityId, name, category, duration) {
        const userId = Auth.currentUser?.uid;
        if (!userId) return { success: false, error: 'Not authenticated' };

        const dateStr = this.formatDate(this.currentDate);
        
        // Calculate total minutes excluding the activity being edited
        const currentActivity = this.activities.find(a => a.id === activityId);
        const otherMinutes = this.getTotalMinutes() - (currentActivity?.duration || 0);
        
        if (otherMinutes + duration > this.MAX_MINUTES_PER_DAY) {
            const remaining = this.MAX_MINUTES_PER_DAY - otherMinutes;
            return { 
                success: false, 
                error: `Cannot set ${duration} minutes. Maximum allowed is ${remaining} minutes.` 
            };
        }

        try {
            await firebaseDB
                .collection('users')
                .doc(userId)
                .collection('days')
                .doc(dateStr)
                .collection('activities')
                .doc(activityId)
                .update({
                    name,
                    category,
                    duration: parseInt(duration),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            return { success: true };
        } catch (error) {
            console.error('Error updating activity:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Delete an activity
     */
    async deleteActivity(activityId) {
        const userId = Auth.currentUser?.uid;
        if (!userId) return { success: false, error: 'Not authenticated' };

        const dateStr = this.formatDate(this.currentDate);

        try {
            await firebaseDB
                .collection('users')
                .doc(userId)
                .collection('days')
                .doc(dateStr)
                .collection('activities')
                .doc(activityId)
                .delete();
            
            return { success: true };
        } catch (error) {
            console.error('Error deleting activity:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get total minutes logged for current day
     */
    getTotalMinutes() {
        return this.activities.reduce((sum, act) => sum + act.duration, 0);
    },

    /**
     * Get remaining minutes for current day
     */
    getRemainingMinutes() {
        return this.MAX_MINUTES_PER_DAY - this.getTotalMinutes();
    },

    /**
     * Format minutes to hours and minutes string
     */
    formatMinutesToTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours === 0) return `${mins}m`;
        if (mins === 0) return `${hours}h`;
        return `${hours}h ${mins}m`;
    },

    /**
     * Update time progress UI
     */
    updateTimeProgress() {
        const totalUsed = this.getTotalMinutes();
        const remaining = this.getRemainingMinutes();
        const percentage = (totalUsed / this.MAX_MINUTES_PER_DAY) * 100;

        // Update text displays
        document.getElementById('time-used').textContent = totalUsed;
        document.getElementById('remaining-minutes').textContent = remaining;
        document.getElementById('remaining-hours').textContent = this.formatMinutesToTime(remaining);

        // Update progress ring
        const progressCircle = document.getElementById('progress-circle');
        const circumference = 2 * Math.PI * 45; // radius = 45
        const offset = circumference - (percentage / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset;

        // Update analyse button state
        const analyseBtn = document.getElementById('analyse-btn');
        if (totalUsed > 0) {
            analyseBtn.disabled = false;
        } else {
            analyseBtn.disabled = true;
        }
    },

    /**
     * Render activities list
     */
    render() {
        const container = document.getElementById('activities-list');
        
        if (this.activities.length === 0) {
            container.innerHTML = `
                <div class="activity-empty">
                    <div class="activity-empty-icon">📝</div>
                    <p>No activities logged yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.activities.map(activity => {
            const category = this.categories[activity.category] || this.categories.other;
            return `
                <div class="activity-item" data-id="${activity.id}">
                    <div class="activity-icon">${category.icon}</div>
                    <div class="activity-details">
                        <div class="activity-name">${this.escapeHtml(activity.name)}</div>
                        <div class="activity-category">${category.label}</div>
                    </div>
                    <div class="activity-duration">${this.formatMinutesToTime(activity.duration)}</div>
                </div>
            `;
        }).join('');

        // Add click handlers for editing
        container.querySelectorAll('.activity-item').forEach(item => {
            item.addEventListener('click', () => {
                const activityId = item.dataset.id;
                const activity = this.activities.find(a => a.id === activityId);
                if (activity) {
                    App.openEditModal(activity);
                }
            });
        });
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Clean up subscriptions
     */
    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        this.activities = [];
    }
};