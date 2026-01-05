/**
 * 專案計畫管理平台 v2.1
 * Vue.js 應用程式 - 特效整合版
 */

const { createApp } = Vue;

createApp({
    data() {
        return {
            theme: localStorage.getItem('pm-theme') || 'light',
            currentTab: 'project',
            selectedPid: null,
            searchQuery: '',
            showToast: false,
            toastMessage: '',
            toastHasUndo: false,
            showNewProjectModal: false,
            projects: JSON.parse(localStorage.getItem('pm-projects-v2')) || [],
            templates: JSON.parse(localStorage.getItem('pm-templates-v1')) || [],
            fontSize: parseInt(localStorage.getItem('pm-font-size')) || 16,
            tabs: [
                { id: 'time', n: '年度全覽', icon: 'fa-calendar-days' },
                { id: 'project', n: '專案管理', icon: 'fa-list-check' },
                { id: 'report', n: '報表', icon: 'fa-chart-pie' }
            ]
        }
    },

    computed: {
        activeProject() { return this.projects.find(p => p.id === this.selectedPid); },
        activeProjects() { return this.projects.filter(p => p.status !== 'completed'); },
        searchedProjects() {
            const query = this.searchQuery.toLowerCase();
            return this.projects.filter(p => p.name.toLowerCase().includes(query));
        },
        sortedActivities() { return this.activeProject?.activities || []; },
        isArchived() { return this.activeProject?.status === 'completed'; },
        today() { return dayjs().format('YYYY-MM-DD'); },
        isCurrentYear() { return dayjs().year() === 2026; },
        themeClasses() {
            const isForest = this.theme === 'forest';
            const isSakura = this.theme === 'sakura';
            return {
                body: isForest ? 'bg-[#1a472a] text-[#e2e8f0]' : (isSakura ? 'bg-[#fff5f7] text-[#5d4037]' : 'bg-slate-50'),
                card: isForest ? 'bg-white/90 border-[#2d6a4f]' : (isSakura ? 'bg-white/90 border-[#fecfef]' : 'bg-white border-slate-200'),
                brand: isForest ? 'text-[#2d6a4f]' : (isSakura ? 'text-[#d81b60]' : 'text-slate-800'),
                innerCard: isForest ? 'bg-[#f0fdf4]' : (isSakura ? 'bg-[#fff0f3]' : 'bg-slate-50'),
                activeItem: isForest ? 'bg-[#2d6a4f] text-white border-white' : (isSakura ? 'bg-[#fff0f3] border-[#ff7eb3] text-[#d81b60]' : 'bg-white border-indigo-500 text-indigo-700 shadow-md'),
                inactiveItem: 'border-transparent opacity-60 hover:bg-white/50'
            };
        }
    },

    watch: {
        currentTab(val) { if (val === 'report') this.initCharts(); },
        projects: { handler(val) { localStorage.setItem('pm-projects-v2', JSON.stringify(val)); }, deep: true }
    },

    methods: {
        // --- 核心特效邏輯 ---
        setTheme(t) {
            this.theme = t;
            localStorage.setItem('pm-theme', t);
            document.documentElement.className = t; // 更新 HTML class 用於 CSS 定位
            this.updateParticles(); // 切換主題即時更新特效
        },

        updateParticles() {
            const container = document.getElementById('particle-container');
            if (!container) return;
            
            container.innerHTML = ''; // 清除舊特效
            
            if (this.theme === 'sakura' || this.theme === 'forest') {
                const typeClass = this.theme === 'sakura' ? 'sakura-petal' : 'forest-leaf';
                const count = 30; // 控制同時出現的粒子數量

                for (let i = 0; i < count; i++) {
                    const p = document.createElement('div');
                    p.className = `particle ${typeClass}`;
                    
                    // 隨機初始參數
                    p.style.left = Math.random() * 100 + '%';
                    p.style.animationDuration = (Math.random() * 5 + 7) + 's';
                    p.style.animationDelay = (Math.random() * 10) + 's';
                    
                    // 動畫循環重置
                    p.addEventListener('animationiteration', () => {
                        p.style.left = Math.random() * 100 + '%';
                    });
                    
                    container.appendChild(p);
                }
            }
        },

        // --- 輔助與專案邏輯 ---
        calculateProgress(p) {
            if (!p || !p.activities.length) return 0;
            return Math.round((p.activities.filter(a => a.status === 'done').length / p.activities.length) * 100);
        },
        getYearPos(date) {
            const d = dayjs(date);
            const start = dayjs('2026-01-01');
            return Math.max(0, Math.min(100, (d.diff(start, 'day') / 365) * 100));
        },
        getStatusColorClass(s) {
            const map = { pending: 'bg-slate-300', ontrack: 'bg-emerald-500', risk: 'bg-amber-500', done: 'bg-indigo-500' };
            return map[s] || 'bg-slate-200';
        },
        getStatusTextColor(s) {
            const map = { pending: 'text-slate-400', ontrack: 'text-emerald-500', risk: 'text-amber-500', done: 'text-indigo-500' };
            return map[s] || 'text-slate-500';
        },
        adjustFont(delta) {
            this.fontSize = Math.max(12, Math.min(24, this.fontSize + delta));
            localStorage.setItem('pm-font-size', this.fontSize);
            document.documentElement.style.fontSize = this.fontSize + 'px';
        },

        // --- 專案操作 ---
        addActivity() {
            if (!this.activeProject) return;
            this.activeProject.activities.push({ id: Date.now(), name: '', date: '2026-01-01', status: 'pending' });
        },
        removeActivity(idx) { this.activeProject.activities.splice(idx, 1); },
        toggleProjectStatus() {
            if (!this.activeProject) return;
            this.activeProject.status = this.isArchived ? 'active' : 'completed';
        },
        deleteProject() {
            if (confirm('確定刪除？')) {
                const idx = this.projects.findIndex(p => p.id === this.selectedPid);
                this.projects.splice(idx, 1);
                this.selectedPid = null;
            }
        },
        createFromTemplate(tpl) {
            const id = Date.now();
            const newP = tpl ? JSON.parse(JSON.stringify(tpl)) : { name: '新專案', activities: [] };
            newP.id = id;
            newP.status = 'active';
            this.projects.unshift(newP);
            this.selectedPid = id;
            this.showNewProjectModal = false;
        },

        // --- 匯出與圖表 ---
        exportData() {
            const data = JSON.stringify({ projects: this.projects, templates: this.templates });
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = `PM_Backup_${dayjs().format('YYYYMMDD')}.json`;
            link.click();
        },
        importData(e) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const data = JSON.parse(ev.target.result);
                if (data.projects) this.projects = data.projects;
                this.updateParticles(); // 重新讀取後檢查主題
            };
            reader.readAsText(e.target.files[0]);
        },
        exportToExcel() {
            if (!this.activeProject) return;
            const data = this.activeProject.activities.map(a => ({ 日期: a.date, 名稱: a.name, 狀態: a.status }));
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Progress");
            XLSX.writeFile(wb, `${this.activeProject.name}_Report.xlsx`);
        },
        initCharts() {
            this.$nextTick(() => {
                const ctx = document.getElementById('statusChart');
                if (!ctx) return;
                new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['待辦', '完成'],
                        datasets: [{
                            data: [
                                this.activeProject.activities.filter(a => a.status !== 'done').length,
                                this.activeProject.activities.filter(a => a.status === 'done').length
                            ],
                            backgroundColor: ['#cbd5e1', '#6366f1']
                        }]
                    }
                });
            });
        }
    },

    mounted() {
        if (this.projects.length && !this.selectedPid) this.selectedPid = this.projects[0].id;
        document.documentElement.className = this.theme;
        document.documentElement.style.fontSize = this.fontSize + 'px';
        this.updateParticles(); // 初始載入啟動特效
    }
}).mount('#app');
