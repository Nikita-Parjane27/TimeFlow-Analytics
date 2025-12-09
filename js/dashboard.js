/**
 * Dashboard Module
 * Handles analytics visualization
 */

const Dashboard = {
    activities: [],
    currentDate: null,
    pieChart: null,
    barChart: null,
    unsubscribe: null,

    /**
     * Initialize dashboard for a specific date
     */
    init(date) {
        this.currentDate = date;
        this.subscribeToActivities();
    },

    /**
     * Subscribe to activities for the selected date
     */
    subscribeToActivities() {
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
            }, (error) => {
                console.error('Error fetching dashboard activities:', error);
            });
    },

    /**
     * Format date to YYYY-MM-DD
     */
    formatDate(date) {
        return date.toISOString().split('T')[0];
    },

    /**
     * Render the dashboard
     */
    render() {
        const noDataView = document.getElementById('no-data-view');
        const analyticsView = document.getElementById('analytics-view');

        if (this.activities.length === 0) {
            noDataView.classList.remove('hidden');
            analyticsView.classList.add('hidden');
            return;
        }

        noDataView.classList.add('hidden');
        analyticsView.classList.remove('hidden');

        this.renderSummaryCards();
        this.renderPieChart();
        this.renderBarChart();
        this.renderTimeline();
        this.renderCategoryBreakdown();
    },

    /**
     * Get aggregated data by category
     */
    getCategoryData() {
        const categoryTotals = {};
        
        this.activities.forEach(activity => {
            const cat = activity.category || 'other';
            categoryTotals[cat] = (categoryTotals[cat] || 0) + activity.duration;
        });

        return categoryTotals;
    },

    /**
     * Render summary cards
     */
    renderSummaryCards() {
        const totalMinutes = this.activities.reduce((sum, a) => sum + a.duration, 0);
        const totalActivities = this.activities.length;
        const avgDuration = totalActivities > 0 ? Math.round(totalMinutes / totalActivities) : 0;
        
        // Find top category
        const categoryData = this.getCategoryData();
        let topCategory = '-';
        let maxMinutes = 0;
        
        Object.entries(categoryData).forEach(([cat, minutes]) => {
            if (minutes > maxMinutes) {
                maxMinutes = minutes;
                topCategory = Activities.categories[cat]?.icon + ' ' + Activities.categories[cat]?.label || cat;
            }
        });

        document.getElementById('total-hours').textContent = Activities.formatMinutesToTime(totalMinutes);
        document.getElementById('total-activities').textContent = totalActivities;
        document.getElementById('top-category').textContent = topCategory;
        document.getElementById('avg-duration').textContent = Activities.formatMinutesToTime(avgDuration);
    },

    /**
     * Render pie chart
     */
    renderPieChart() {
        const ctx = document.getElementById('category-pie-chart').getContext('2d');
        const categoryData = this.getCategoryData();

        const labels = [];
        const data = [];
        const colors = [];

        Object.entries(categoryData).forEach(([cat, minutes]) => {
            const category = Activities.categories[cat] || Activities.categories.other;
            labels.push(category.label);
            data.push(minutes);
            colors.push(category.color);
        });

        if (this.pieChart) {
            this.pieChart.destroy();
        }

        this.pieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderColor: '#1e1e35',
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: '#a1a1aa',
                            padding: 15,
                            usePointStyle: true,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const minutes = context.raw;
                                return ` ${Activities.formatMinutesToTime(minutes)}`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    },

    /**
     * Render bar chart
     */
    renderBarChart() {
        const ctx = document.getElementById('duration-bar-chart').getContext('2d');

        const labels = this.activities.map(a => 
            a.name.length > 15 ? a.name.substring(0, 15) + '...' : a.name
        );
        const data = this.activities.map(a => a.duration);
        const colors = this.activities.map(a => {
            const category = Activities.categories[a.category] || Activities.categories.other;
            return category.color;
        });

        if (this.barChart) {
            this.barChart.destroy();
        }

        this.barChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Duration (minutes)',
                    data,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 0,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return ` ${Activities.formatMinutesToTime(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#a1a1aa',
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        ticks: {
                            color: '#a1a1aa'
                        },
                        grid: {
                            color: '#252542'
                        }
                    }
                }
            }
        });
    },

    /**
     * Render timeline visualization
     */
    renderTimeline() {
        const timeline = document.getElementById('day-timeline');
        const legend = document.getElementById('timeline-legend');
        const totalMinutes = 1440;

        let timelineHTML = '';
        let legendItems = new Set();

        this.activities.forEach(activity => {
            const category = Activities.categories[activity.category] || Activities.categories.other;
            const widthPercent = (activity.duration / totalMinutes) * 100;
            
            timelineHTML += `
                <div class="timeline-segment" 
                     style="width: ${widthPercent}%; background-color: ${category.color};"
                     title="${activity.name}: ${Activities.formatMinutesToTime(activity.duration)}">
                    ${widthPercent > 5 ? activity.name.substring(0, 8) : ''}
                </div>
            `;
            
            legendItems.add(activity.category);
        });

        timeline.innerHTML = timelineHTML;

        // Render legend
        legend.innerHTML = Array.from(legendItems).map(cat => {
            const category = Activities.categories[cat] || Activities.categories.other;
            return `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: ${category.color}"></div>
                    <span>${category.icon} ${category.label}</span>
                </div>
            `;
        }).join('');
    },

    /**
     * Render category breakdown bars
     */
    renderCategoryBreakdown() {
        const container = document.getElementById('category-bars');
        const categoryData = this.getCategoryData();
        const totalMinutes = this.activities.reduce((sum, a) => sum + a.duration, 0);

        // Sort by duration descending
        const sortedCategories = Object.entries(categoryData)
            .sort((a, b) => b[1] - a[1]);

        container.innerHTML = sortedCategories.map(([cat, minutes]) => {
            const category = Activities.categories[cat] || Activities.categories.other;
            const percentage = totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0;
            
            return `
                <div class="category-bar-item">
                    <div class="category-bar-header">
                        <span class="category-bar-label">
                            ${category.icon} ${category.label}
                        </span>
                        <span class="category-bar-value">
                            ${Activities.formatMinutesToTime(minutes)} (${percentage.toFixed(1)}%)
                        </span>
                    </div>
                    <div class="category-bar-track">
                        <div class="category-bar-fill" 
                             style="width: ${percentage}%; background-color: ${category.color}">
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Clean up subscriptions and charts
     */
    cleanup() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
        if (this.pieChart) {
            this.pieChart.destroy();
            this.pieChart = null;
        }
        if (this.barChart) {
            this.barChart.destroy();
            this.barChart = null;
        }
        this.activities = [];
    }
};