/**
 * 專案計畫管理平台 v2.1
 * Vue.js 應用程式 - 特效與功能全整合版
 */

const { createApp } = Vue;

const DEFAULT_TEMPLATE = {
    id: 'tpl_2026_std',
    name: '2026 軟體專案標準範本',
    org: '範本客戶',
    contacts: [{ name: 'PM', info: '專案經理' }, { name: 'PG', info: '開發人員' }],
    risks: [{ level: 'high', desc: '需求變更頻繁', action: '建立管理流程' }],
    activities: [
        { id: 1, date: '2026-01-10', name: '專案啟動 (Kick-off)', status: 'pending', owner: 'PM', type: 'deadline', note: '', showNote: false, showStatusMenu: false },
        { id: 2, date: '2026-06-30', name: '期中報告', status: 'pending', owner: 'PM', type: 'deadline', note: '', showNote: false, showStatusMenu: false },
        { id: 3, date: '2026-12-20', name: '結案驗收', status: 'pending', owner: 'PM', type: 'deadline', note: '', showNote: false, showStatusMenu: false }
    ]
};

createApp({
    data() {
        return {
            theme: localStorage.getItem('pm-theme') || 'light',
            currentTab: 'project',
            viewMode: 'list',
            selectedPid: null,
            selectedTplId: null,
            searchQuery: '',
            showToast: false,
            toastMessage: '',
            toastHasUndo: false,
            deletedData: null,
            listFilter: 'active',
            showNewProjectModal: false,
            projects: JSON.parse(localStorage.getItem('pm-projects-v2')) || [],
            templates: JSON.parse(localStorage.getItem('pm-templates-v1')) || [JSON.parse(JSON.stringify(DEFAULT_TEMPLATE))],
            fontSize: parseInt(localStorage.getItem('pm-font-size')) || 16,
            statusChartInstance: null,
            riskChartInstance: null,
            tabs: [
                { id: 'time', n: '年度全覽', icon: 'fa-calendar-days' },
                { id: 'project', n: '專案管理', icon: 'fa-list-check' },
                { id: 'report', n: '報告 & 儀表板', icon: 'fa-chart-pie' },
                { id: 'template', n: '範本管理', icon: 'fa-copy' }
            ]
        }
    },

    computed: {
        activeProject() { return this.projects.find(p => p.id === this.selectedPid); },
        searchedProjects() {
            const query = this.searchQuery.toLowerCase();
            return this.projects.filter(p => p.name.toLowerCase().includes(query));
        },
        activeProjects() { return this.projects.filter(p => p.status !== 'completed'); },
        sortedActivities() { return this.activeProject?.activities || []; },
        activeTemplate() { return this.templates.find(t => t.id === this.selectedTplId); },
        isArchived() { return this.activeProject?.status === 'completed'; },
        today() { return dayjs().format('YYYY-MM-DD'); },
        isCurrentYear() { return dayjs().year() === 2026; },
        themeClasses() {
            const isF = this.theme === 'forest';
            const isS = this.theme === 'sakura';
            return {
                body: isF ? 'bg-[#1a472a] text-[#e2e8f0]' : (isS ? 'bg-[#fff5f7] text-[#5d4037]' : 'bg-slate-50'),
                card: isF ? 'bg-white/90 border-[#2d6a4f]' : (isS ? 'bg-white/90 border-[#fecfef]' : 'bg-white border-slate-200'),
                brand: isF ? 'text-[#2d6a4f]' : (isS ? 'text-[#d81b60]' : 'text-slate-800'),
                innerCard: isF ? 'bg-[#f0fdf4]' : (isS ? 'bg-[#fff0f3]' : 'bg-slate-50'),
                activeItem: isF ? 'bg-[#2d6a4f] text-white' : (isS ? 'bg-[#fff0f3] border-[#ff7eb3] text-[#d81b60]' : 'bg-white border-indigo-500 text-indigo-700 shadow-md'),
                inactiveItem: 'border-transparent opacity-60 hover:bg-white/50'
            };
        }
    },

    watch: {
        currentTab(val) { if (val === 'report') this.initCharts(); },
        projects: { handler(v) { localStorage.setItem('pm-projects-v2', JSON.stringify(v)); }, deep: true },
        theme(val) { document.documentElement.className = val; this.updateParticles(); }
    },

    methods: {
        dayjs,
        // --- 特效邏輯 ---
        setTheme(t) {
            this.theme = t;
            localStorage.setItem('pm-theme', t);
        },
        updateParticles() {
            const container = document.getElementById('particle-container');
            if (!container) return;
            container.innerHTML = '';
            if (this.theme === 'sakura' || this.theme === 'forest') {
                const type = this.theme === 'sakura' ? 'sakura-petal' : 'forest-leaf';
                for (let i = 0; i < 30; i++) {
                    const p = document.createElement('div');
                    p.className = `particle ${type}`;
                    p.style.left = Math.random() * 100 + '%';
                    p.style.animationDuration = (Math.random() * 5 + 7) + 's';
                    p.style.animationDelay = (Math.random() * 10) + 's';
                    p.addEventListener('animationiteration', () => { p.style.left = Math.random() * 100 + '%'; });
                    container.appendChild(p);
                }
            }
        },

        // --- 核心資料處理 (完全保留) ---
        calculateProgress(p) {
            if (!p || !p.activities.length) return 0;
            return Math.round((p.activities.filter(a => a.status === 'done').length / p.activities.length) * 100);
        },
        getYearPos(date) {
            const d = dayjs(date);
            return Math.max(0, Math.min(100, (d.diff(dayjs('2026-01-01'), 'day') / 365) * 100));
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

        // --- 專案與範本管理 (完全保留) ---
        addActivity() { if(this.activeProject) this.activeProject.activities.push({ id: Date.now(), name: '', date: '2026-01-01', status: 'pending' }); },
        removeActivity(idx) { this.activeProject.activities.splice(idx, 1); },
        addContact() { this.activeProject.contacts.push({ name: '', info: '' }); },
        addRisk() { this.activeProject.risks.push({ level: 'med', desc: '', action: '' }); },
        createFromTemplate(tpl) {
            const id = Date.now();
            const newP = tpl ? JSON.parse(JSON.stringify(tpl)) : { name: '新專案', activities: [], contacts: [], risks: [] };
            newP.id = id; newP.status = 'active';
            this.projects.unshift(newP); this.selectedPid = id; this.showNewProjectModal = false;
        },
        toggleProjectStatus() { if(this.activeProject) this.activeProject.status = this.isArchived ? 'active' : 'completed'; },
        deleteProject() { if(confirm('確定刪除？')){ this.projects.splice(this.projects.findIndex(p=>p.id===this.selectedPid),1); this.selectedPid = null; } },

        // --- 匯出與圖表 (完全保留) ---
        exportData() {
            const blob = new Blob([JSON.stringify({ projects: this.projects, templates: this.templates })], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `PM_Backup.json`; a.click();
        },
        importData(e) {
            const r = new FileReader();
            r.onload = (ev) => { const d = JSON.parse(ev.target.result); this.projects = d.projects; this.updateParticles(); };
            r.readAsText(e.target.files[0]);
        },
        exportToExcel() {
            const ws = XLSX.utils.json_to_sheet(this.activeProject.activities.map(a => ({ 日期: a.date, 名稱: a.name, 狀態: a.status })));
            const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Progress");
            XLSX.writeFile(wb, `${this.activeProject.name}_Report.xlsx`);
        },
        initCharts() {
            this.$nextTick(() => {
                const ctxS = document.getElementById('statusChart');
                if (ctxS) {
                    if (this.statusChartInstance) this.statusChartInstance.destroy();
                    this.statusChartInstance = new Chart(ctxS, {
                        type: 'doughnut',
                        data: {
                            labels: ['待辦', '完成'],
                            datasets: [{ data: [this.activeProject.activities.filter(a=>a.status!=='done').length, this.activeProject.activities.filter(a=>a.status==='done').length], backgroundColor: ['#cbd5e1', '#6366f1'] }]
                        }
                    });
                }
            });
        }
    },

    mounted() {
        if (this.projects.length) this.selectedPid = this.projects[0].id;
        document.documentElement.className = this.theme;
        document.documentElement.style.fontSize = this.fontSize + 'px';
        this.updateParticles();
    }
}).mount('#app');
