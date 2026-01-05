/**
 * 專案計畫管理平台 v2.1
 * Vue.js 應用程式 - 已整合修復版 (含動物與混合粒子特效)
 */

const { createApp } = Vue;

// ============================================
// 預設範本資料
// ============================================
const DEFAULT_TEMPLATE = {
    id: 'tpl_2026_std',
    name: '2026 軟體專案標準範本',
    org: '範本客戶',
    contacts: [
        { name: 'PM', info: '專案經理' },
        { name: 'PG', info: '開發人員' }
    ],
    risks: [
        { level: 'high', desc: '需求變更頻繁', action: '建立變更管理流程' },
        { level: 'med', desc: '技術債累積', action: '每週安排 Refactor 時間' }
    ],
    activities: [
        { id: 1, date: '2026-01-10', name: '專案啟動 (Kick-off)', status: 'pending', owner: 'PM', type: 'deadline', note: '', showNote: false, showStatusMenu: false },
        { id: 2, date: '2026-03-31', name: '需求規格書確認', status: 'pending', owner: 'SA', type: 'deadline', note: '', showNote: false, showStatusMenu: false },
        { id: 3, date: '2026-06-30', name: '期中報告', status: 'pending', owner: 'PM', type: 'deadline', note: '', showNote: false, showStatusMenu: false },
        { id: 4, date: '2026-09-15', name: 'UAT 測試', status: 'pending', owner: 'QA', type: 'activity', note: '', showNote: false, showStatusMenu: false },
        { id: 5, date: '2026-12-20', name: '結案驗收', status: 'pending', owner: 'PM', type: 'deadline', note: '', showNote: false, showStatusMenu: false }
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
            dragIndex: null,
            statusChartInstance: null,
            riskChartInstance: null,
            draggedActivity: null,
            showToast: false,
            toastHasUndo: false,
            deletedData: null,
            toastMessage: '',
            listFilter: 'active',
            showNewProjectModal: false,
            projects: JSON.parse(localStorage.getItem('pm-projects-v2')) || [],
            templates: JSON.parse(localStorage.getItem('pm-templates-v1')) || [JSON.parse(JSON.stringify(DEFAULT_TEMPLATE))],
            searchQuery: '',
            fontSize: parseInt(localStorage.getItem('pm-font-size')) || 16,
            tabs: [
                { id: 'time', n: '年度全覽', icon: 'fa-calendar-days' },
                { id: 'project', n: '專案管理', icon: 'fa-list-check' },
                { id: 'report', n: '報告 & 儀表板', icon: 'fa-chart-pie' },
                { id: 'template', n: '範本管理', icon: 'fa-copy' }
            ]
        }
    },

    computed: {
        filteredProjects() {
            const status = this.listFilter === 'active' ? ['active', undefined] : ['completed'];
            return this.projects.filter(p => status.includes(p.status));
        },
        searchedProjects() {
            const query = this.searchQuery.toLowerCase().trim();
            if (!query) return this.filteredProjects;
            return this.filteredProjects.filter(p =>
                p.name.toLowerCase().includes(query) ||
                (p.org && p.org.toLowerCase().includes(query))
            );
        },
        activeProjects() {
            return this.projects.filter(p => p.status !== 'completed');
        },
        activeProject() {
            return this.projects.find(p => p.id === this.selectedPid);
        },
        sortedActivities() {
            return this.activeProject?.activities || [];
        },
        kanbanColumns() {
            if (!this.activeProject) return {};
            return {
                pending: { title: '待辦事項', icon: 'fa-regular fa-circle', color: 'slate', items: this.activeProject.activities.filter(a => a.status === 'pending') },
                ontrack: { title: '進行中', icon: 'fa-solid fa-play', color: 'emerald', items: this.activeProject.activities.filter(a => a.status === 'ontrack') },
                risk: { title: '風險 / 卡關', icon: 'fa-solid fa-triangle-exclamation', color: 'amber', items: this.activeProject.activities.filter(a => ['risk', 'blocked'].includes(a.status)) },
                done: { title: '已完成', icon: 'fa-solid fa-check', color: 'indigo', items: this.activeProject.activities.filter(a => a.status === 'done') }
            };
        },
        isArchived() {
            return this.activeProject?.status === 'completed';
        },
        activeTemplate() {
            return this.templates.find(t => t.id === this.selectedTplId);
        },
        today() {
            return dayjs().format('YYYY-MM-DD');
        },
        isCurrentYear() {
            return dayjs().year() === 2026;
        },
        themeClasses() {
            const isForest = this.theme === 'forest';
            const isSakura = this.theme === 'sakura';
            const isAnimal = this.theme === 'animal';
            return {
                body: isForest ? 'bg-[#1a472a] text-[#e2e8f0]' : (isSakura ? 'bg-[#fff5f7] text-[#5d4037]' : (isAnimal ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-700')),
                card: isForest ? 'bg-white/90 border-[#2d6a4f] text-[#1b4332] shadow-emerald-900/20' : (isSakura ? 'bg-white/90 border-[#fecfef] shadow-pink-100' : (isAnimal ? 'bg-white/90 border-amber-200' : 'bg-white border-slate-200')),
                brand: isForest ? 'text-[#2d6a4f]' : (isSakura ? 'text-[#d81b60]' : (isAnimal ? 'text-amber-700' : 'text-slate-800')),
                innerCard: isForest ? 'bg-[#f0fdf4] border-[#b7e4c7]' : (isSakura ? 'bg-[#fff0f3] border-[#fecfef]' : (isAnimal ? 'bg-amber-100/50 border-amber-200' : 'bg-slate-50 border-slate-100')),
                activeItem: isForest ? 'bg-[#2d6a4f] border-[#95d5b2] text-[#d8f3dc]' : (isSakura ? 'bg-[#fff0f3] border-[#ff7eb3] text-[#d81b60] shadow-md shadow-pink-100' : (isAnimal ? 'bg-amber-200 border-amber-400 text-amber-800' : 'bg-white border-indigo-500 text-indigo-700 shadow-md')),
                inactiveItem: isForest ? 'border-transparent opacity-60 hover:bg-[#2d6a4f]/50' : (isSakura ? 'border-transparent opacity-70 hover:bg-white/80' : 'border-transparent opacity-60 hover:bg-white hover:shadow-sm')
            };
        }
    },

    watch: {
        activeProject: {
            handler() { if (this.currentTab === 'report') this.initCharts(); },
            deep: true
        },
        currentTab(val) { if (val === 'report') this.initCharts(); },
        projects: {
            handler(val) { localStorage.setItem('pm-projects-v2', JSON.stringify(val)); },
            deep: true
        },
        templates: {
            handler(val) { localStorage.setItem('pm-templates-v1', JSON.stringify(val)); },
            deep: true
        }
    },

    methods: {
        dayjs,
        
        // --- 核心輔助工具 ---
        calculateProgress(project) {
            if (!project || !project.activities || project.activities.length === 0) return 0;
            const doneCount = project.activities.filter(a => a.status === 'done').length;
            return Math.round((doneCount / project.activities.length) * 100);
        },
        getYearPos(dateString) {
            const date = dayjs(dateString);
            const startOfYear = dayjs('2026-01-01');
            const endOfYear = dayjs('2026-12-31');
            const totalDays = endOfYear.diff(startOfYear, 'day') + 1;
            const currentDays = date.diff(startOfYear, 'day');
            return Math.min(100, Math.max(0, (currentDays / totalDays) * 100));
        },
        getRiskCount(project) {
            return {
                blocked: project.activities.filter(a => a.status === 'blocked').length,
                risk: project.activities.filter(a => a.status === 'risk').length
            };
        },
        getRiskScore(project) {
            if (!project.risks) return 0;
            const weights = { high: 10, med: 5, low: 2 };
            return project.risks.reduce((sum, r) => sum + (weights[r.level] || 0), 0);
        },
        getActivitiesByMonth(month) {
            if (!this.activeProject) return [];
            return this.activeProject.activities.filter(a => dayjs(a.date).month() === (month - 1));
        },

        // --- 狀態與樣式轉換 ---
        statusText(s) {
            const map = { pending: '待辦', ontrack: '正常', risk: '風險', blocked: '卡關', done: '完成' };
            return map[s] || s;
        },
        statusIcon(s) {
            const map = { pending: 'fa-regular fa-circle', ontrack: 'fa-solid fa-play', risk: 'fa-solid fa-triangle-exclamation', blocked: 'fa-solid fa-ban', done: 'fa-solid fa-check' };
            return map[s] || 'fa-solid fa-question';
        },
        getStatusColorClass(s) {
            const map = { pending: 'bg-slate-300', ontrack: 'bg-emerald-500', risk: 'bg-amber-500', blocked: 'bg-rose-500 status-blocked', done: 'bg-indigo-500' };
            return map[s] || 'bg-slate-200';
        },
        getStatusBtnClass(s) {
            const map = { 
                pending: 'bg-slate-50 text-slate-500 border-slate-200', 
                ontrack: 'bg-emerald-50 text-emerald-600 border-emerald-200', 
                risk: 'bg-amber-50 text-amber-600 border-amber-200', 
                blocked: 'bg-rose-50 text-rose-600 border-rose-200', 
                done: 'bg-indigo-50 text-indigo-600 border-indigo-200' 
            };
            return map[s] || 'bg-white';
        },
        getStatusDot(s) {
            const map = { pending: 'bg-slate-300', ontrack: 'bg-emerald-500', risk: 'bg-amber-500', blocked: 'bg-rose-500', done: 'bg-indigo-500' };
            return map[s] || 'bg-slate-400';
        },
        getStatusTextColor(s) {
            const map = { pending: 'text-slate-400', ontrack: 'text-emerald-500', risk: 'text-amber-500', blocked: 'text-rose-500', done: 'text-indigo-500' };
            return map[s] || 'text-slate-500';
        },
        getRiskLevelClass(l) {
            const map = { high: 'bg-rose-500 text-white', med: 'bg-amber-500 text-white', low: 'bg-emerald-500 text-white' };
            return map[l] || 'bg-slate-400';
        },
        getRiskLevelColor(score) {
            return score > 15 ? 'text-rose-500' : (score > 5 ? 'text-amber-500' : 'text-emerald-500');
        },
        getRiskLevelColorBg(score) {
            return score > 15 ? 'bg-rose-500' : (score > 5 ? 'bg-amber-500' : 'bg-emerald-500');
        },

        // --- 主題與系統功能 ---
        setTheme(t) {
            this.theme = t;
            localStorage.setItem('pm-theme', t);
            document.documentElement.className = t; // 設定 DOM class
            this.updateParticles(); // 觸發粒子更新
        },
        adjustFont(delta) {
            this.fontSize = Math.max(12, Math.min(24, this.fontSize + delta));
            localStorage.setItem('pm-font-size', this.fontSize);
            document.documentElement.style.fontSize = this.fontSize + 'px';
        },
        handleKeyboard(e) {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
            if (e.key === 'n' || e.key === 'N') { e.preventDefault(); this.showNewProjectModal = true; }
        },

        // --- 核心特效邏輯 (混合 CSS 圖案與 Emoji) ---
        updateParticles() {
            const container = document.getElementById('particle-container');
            if (!container) return;
            container.innerHTML = ''; // 清除舊粒子

            // 設定檔：包含要使用的 CSS class 與 Emojis 列表
            const themeConfigs = {
                sakura: { emojis: ['🌸'], cssClass: 'sakura-shape' },
                forest: { emojis: ['🍃', '🌲'], cssClass: 'forest-shape' },
                animal: { emojis: ['🐒', '🐷', '🐶', '🐱', '🐣', '🐦', '🐲', '🐍', '🐎', '🐑', '🦁', '🐔', '🐯', '🐮'], cssClass: '' }
            };

            const config = themeConfigs[this.theme];
            if (!config) return;

            // 生成 30 個粒子
            for (let i = 0; i < 30; i++) {
                const p = document.createElement('div');
                p.className = 'particle';

                // 決策邏輯：如果主題有 CSS 圖案，則 50% 機率顯示 CSS 圖案，50% 機率顯示 Emoji
                // 動物模式沒有 CSS 圖案，所以 100% 顯示 Emoji
                if (config.cssClass && Math.random() > 0.5) {
                    p.classList.add(config.cssClass);
                } else {
                    p.classList.add('emoji-particle');
                    p.innerText = config.emojis[Math.floor(Math.random() * config.emojis.length)];
                }

                // 隨機動態參數
                p.style.left = Math.random() * 100 + '%';
                p.style.animationDuration = (Math.random() * 5 + 7) + 's'; // 7-12秒
                p.style.animationDelay = (Math.random() * 10) + 's';
                p.style.fontSize = (Math.random() * 10 + 20) + 'px'; // 僅對 Emoji 有效
                
                // 動畫結束後重置位置
                p.addEventListener('animationiteration', () => {
                    p.style.left = Math.random() * 100 + '%';
                });

                container.appendChild(p);
            }
        },

        // --- 專案與範本邏輯 ---
        createFromTemplate(tpl) {
            const id = Date.now();
            let newProject = {
                id, name: tpl ? `${tpl.name} (Copy)` : '新專案',
                org: tpl ? tpl.org : '', status: 'active',
                contacts: tpl ? JSON.parse(JSON.stringify(tpl.contacts)) : [],
                risks: tpl ? JSON.parse(JSON.stringify(tpl.risks)) : [],
                activities: tpl ? tpl.activities.map(a => ({ ...a, id: id + Math.random(), status: 'pending' })) : []
            };
            this.projects.unshift(newProject);
            this.selectedPid = id;
            this.showNewProjectModal = false;
            this.showToastMsg('專案建立成功！');
        },
        saveAsTemplate() {
            if (!this.activeProject) return;
            const p = this.activeProject;
            this.templates.unshift({
                id: Date.now(), name: `[範本] ${p.name}`,
                contacts: JSON.parse(JSON.stringify(p.contacts)),
                risks: JSON.parse(JSON.stringify(p.risks)),
                activities: p.activities.map(a => ({ ...a, id: Date.now() + Math.random(), status: 'pending' }))
            });
            this.showToastMsg('已存為範本');
        },
        toggleProjectStatus() {
            if (!this.activeProject) return;
            const isComplete = this.activeProject.status === 'completed';
            this.activeProject.status = isComplete ? 'active' : 'completed';
            this.showToastMsg(isComplete ? '已重啟' : '已結案');
        },
        deleteProject() {
            if (confirm('確定刪除？')) {
                const idx = this.projects.findIndex(p => p.id === this.selectedPid);
                this.deletedData = { type: 'project', data: this.projects[idx], index: idx };
                this.projects.splice(idx, 1);
                this.selectedPid = null;
                this.showToastMsg('專案已刪除', true);
            }
        },

        // --- 任務/清單操作 ---
        addActivity() {
            this.activeProject.activities.push({ id: Date.now(), name: '', date: '2026-01-01', status: 'pending', owner: '', type: 'activity', note: '', showNote: false, showStatusMenu: false });
        },
        removeActivity(idx) {
            this.deletedData = { type: 'activity', data: this.activeProject.activities[idx], index: idx, parentId: this.selectedPid };
            this.activeProject.activities.splice(idx, 1);
            this.showToastMsg('任務已刪除', true);
        },
        removeActivityById(id) {
            const idx = this.activeProject.activities.findIndex(a => a.id === id);
            if(idx !== -1) this.removeActivity(idx);
        },
        addContact() { this.activeProject.contacts.push({ name: '', info: '' }); },
        removeContact(i) { this.activeProject.contacts.splice(i, 1); },
        addRisk() { this.activeProject.risks.push({ level: 'med', desc: '', action: '' }); },
        removeRisk(i) { this.activeProject.risks.splice(i, 1); },
        
        // 範本管理專用
        deleteTemplate() {
             const idx = this.templates.findIndex(t => t.id === this.selectedTplId);
             if(idx !== -1 && confirm('刪除範本？')) {
                 this.templates.splice(idx, 1);
                 this.selectedTplId = null;
             }
        },
        addTemplateActivity() {
            if(this.activeTemplate) {
                this.activeTemplate.activities.push({ id: Date.now(), name: '新節點', date: '', type: 'activity', owner: '' });
            }
        },
        createNewTemplate() {
             this.templates.push(JSON.parse(JSON.stringify(DEFAULT_TEMPLATE)));
        },

        // --- 匯出/備份 ---
        exportData() {
            const data = JSON.stringify({ projects: this.projects, templates: this.templates });
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = `PM_Backup_${dayjs().format('YYYYMMDD')}.json`;
            link.click();
        },
        importData(event) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = JSON.parse(e.target.result);
                if (data.projects) { this.projects = data.projects; this.templates = data.templates || []; }
                this.updateParticles(); // 匯入後重新整理特效
                this.showToastMsg('匯入完成');
            };
            reader.readAsText(event.target.files[0]);
        },
        exportToExcel() {
            if (!this.activeProject) return;
            const data = this.activeProject.activities.map(a => ({ 日期: a.date, 名稱: a.name, 狀態: this.statusText(a.status), 負責人: a.owner }));
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Progress");
            XLSX.writeFile(wb, `${this.activeProject.name}_Report.xlsx`);
        },

        // --- UI 回饋 ---
        showToastMsg(msg, canUndo = false) {
            this.toastMessage = msg; this.toastHasUndo = canUndo; this.showToast = true;
            setTimeout(() => { if (this.toastMessage === msg) this.showToast = false; }, canUndo ? 5000 : 2500);
        },
        handleUndo() {
            if (!this.deletedData) return;
            const { type, data, index, parentId } = this.deletedData;
            if (type === 'project') this.projects.splice(index, 0, data);
            else if (type === 'activity') this.projects.find(p => p.id === parentId).activities.splice(index, 0, data);
            this.deletedData = null; this.showToast = false;
        },

        // --- 拖曳排序 ---
        handleDragStart(index) { this.dragIndex = index; },
        handleDragEnter(index) {
            const item = this.activeProject.activities.splice(this.dragIndex, 1)[0];
            this.activeProject.activities.splice(index, 0, item);
            this.dragIndex = index;
        },
        handleDragEnd() { this.dragIndex = null; },
        handleKanbanDragStart(act) { this.draggedActivity = act; },
        handleKanbanDragEnd() { this.draggedActivity = null; },
        handleKanbanDrop(targetStatus) {
            if (!this.draggedActivity) return;
            this.draggedActivity.status = targetStatus === 'risk' ? 'risk' : targetStatus;
            this.draggedActivity = null;
        },

        // --- 報表與特效 ---
        initCharts() {
            this.$nextTick(() => { this.renderStatusChart(); this.renderRiskChart(); });
        },
        renderStatusChart() {
            const ctx = document.getElementById('statusChart');
            if (!ctx) return;
            if (this.statusChartInstance) this.statusChartInstance.destroy();
            const p = this.activeProject;
            this.statusChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['待辦', '正常', '風險', '卡關', '完成'],
                    datasets: [{
                        data: ['pending', 'ontrack', 'risk', 'blocked', 'done'].map(s => p.activities.filter(a => a.status === s).length),
                        backgroundColor: ['#cbd5e1', '#10b981', '#f59e0b', '#f43f5e', '#6366f1']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
            });
        },
        renderRiskChart() {
            const ctx = document.getElementById('riskChart');
            if (!ctx) return;
            if (this.riskChartInstance) this.riskChartInstance.destroy();
            const r = this.activeProject.risks || [];
            this.riskChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['高', '中', '低'],
                    datasets: [{
                        label: '數量',
                        data: ['high', 'med', 'low'].map(l => r.filter(x => x.level === l).length),
                        backgroundColor: ['#f43f5e', '#f59e0b', '#10b981']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    },
    mounted() {
        if (this.projects.length) this.selectedPid = this.projects[0].id;
        document.documentElement.classList.add(this.theme); // 修正：確保初始 class 正確
        document.addEventListener('keydown', this.handleKeyboard);
        this.updateParticles(); // 初始載入特效
        document.documentElement.style.fontSize = this.fontSize + 'px';
    }
}).mount('#app');
