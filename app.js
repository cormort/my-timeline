/**
 * 專案計畫管理平台 v2.0
 * Vue.js 應用程式
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

// ============================================
// Vue 應用程式
// ============================================
createApp({
    data() {
        return {
            theme: localStorage.getItem('pm-theme') || 'light',
            currentTab: 'project',
            viewMode: 'list', // list, board
            selectedPid: null,
            selectedTplId: null,
            dragIndex: null,
            statusChartInstance: null,
            riskChartInstance: null,
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

    // ============================================
    // 計算屬性
    // ============================================
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
            // 移除自動排序，改為依照陣列順序 (支援拖曳排序)
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
            return {
                body: isForest ? 'bg-[#1a472a] text-[#e2e8f0]' : (this.theme === 'sakura' ? 'bg-[#fff5f7] text-[#5d4037]' : 'bg-slate-50 text-slate-700'),
                card: isForest ? 'bg-white/90 border-[#2d6a4f] text-[#1b4332] shadow-emerald-900/20' : (this.theme === 'sakura' ? 'bg-white/90 border-[#fecfef] shadow-pink-100' : 'bg-white border-slate-200'),
                brand: isForest ? 'text-[#2d6a4f]' : (this.theme === 'sakura' ? 'text-[#d81b60]' : 'text-slate-800'),
                innerCard: isForest ? 'bg-[#f0fdf4] border-[#b7e4c7]' : (this.theme === 'sakura' ? 'bg-[#fff0f3] border-[#fecfef]' : 'bg-slate-50 border-slate-100'),
                activeItem: isForest ? 'bg-[#2d6a4f] border-[#95d5b2] text-[#d8f3dc]' : (this.theme === 'sakura' ? 'bg-[#fff0f3] border-[#ff7eb3] text-[#d81b60] shadow-md shadow-pink-100' : 'bg-white border-indigo-500 text-indigo-700 shadow-md'),
                inactiveItem: isForest ? 'border-transparent opacity-60 hover:bg-[#2d6a4f]/50' : (this.theme === 'sakura' ? 'border-transparent opacity-70 hover:bg-white/80' : 'border-transparent opacity-60 hover:bg-white hover:shadow-sm')
            };
        }
    },

    // ============================================
    // 監聽器 - 自動儲存
    // ============================================
    watch: {
        activeProject: {
            handler() {
                if (this.currentTab === 'report') {
                    this.initCharts();
                }
            },
            deep: true
        },
        currentTab(val) {
            if (val === 'report') {
                this.initCharts();
            }
        },
        projects: {
            handler(val) {
                localStorage.setItem('pm-projects-v2', JSON.stringify(val));
            },
            deep: true
        },
        templates: {
            handler(val) {
                localStorage.setItem('pm-templates-v1', JSON.stringify(val));
            },
            deep: true
        }
    },

    // ============================================
    // 方法
    // ============================================
    methods: {
        dayjs,

        // --- 主題設定 ---
        setTheme(t) {
            this.theme = t;
            localStorage.setItem('pm-theme', t);
            // 移除所有主題類別
            document.documentElement.classList.remove('dark', 'forest', 'sakura');
            // 加入當前主題類別
            if (t !== 'light') {
                document.documentElement.classList.add(t);
            }
            // 如果是櫻花模式，觸發飄花效果
            if (t === 'sakura') {
                this.$nextTick(() => {
                    this.createPetals();
                });
            } else {
                // 清除花瓣
                const container = document.getElementById('sakura-container');
                if (container) container.innerHTML = '';
            }
        },

        // --- 字體大小調整 ---
        adjustFont(delta) {
            this.fontSize = Math.max(12, Math.min(24, this.fontSize + delta));
            localStorage.setItem('pm-font-size', this.fontSize);
            document.documentElement.style.fontSize = this.fontSize + 'px';
        },

        // --- 鍵盤快捷鍵 ---
        handleKeyboard(e) {
            // 在輸入框中不觸發快捷鍵
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

            // N: 新增專案
            if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                this.showNewProjectModal = true;
            }
            // T: 新增任務 (需選中專案)
            if ((e.key === 't' || e.key === 'T') && this.activeProject && !this.isArchived) {
                e.preventDefault();
                this.addActivity();
                this.showToastMsg('已新增任務');
            }
            // Escape: 關閉 Modal
            if (e.key === 'Escape') {
                this.showNewProjectModal = false;
            }
            // Cmd/Ctrl + D: 切換深淺色主題 (依照順序循環)
            if ((e.metaKey || e.ctrlKey) && (e.key === 'd' || e.key === 'D')) {
                e.preventDefault();
                const themes = ['light', 'forest', 'sakura'];
                const nextIdx = (themes.indexOf(this.theme) + 1) % themes.length;
                this.setTheme(themes[nextIdx]);
            }
        },

        // --- 專案操作 ---
        createFromTemplate(tpl) {
            const id = Date.now();
            let newProject = {
                id,
                name: tpl ? `${tpl.name} (Copy)` : '新專案',
                org: tpl ? tpl.org : '',
                status: 'active',
                contacts: tpl ? JSON.parse(JSON.stringify(tpl.contacts)) : [],
                risks: tpl ? JSON.parse(JSON.stringify(tpl.risks)) : [],
                activities: []
            };
            if (tpl && tpl.activities) {
                newProject.activities = tpl.activities.map(a => ({ ...a, id: id + Math.random(), status: 'pending', showStatusMenu: false }));
            }
            this.projects.unshift(newProject);
            this.selectedPid = id;
            this.listFilter = 'active';
            this.showNewProjectModal = false;
            this.showToastMsg('專案建立成功！');
        },

        saveAsTemplate() {
            if (!this.activeProject) return;
            if (!confirm('確定要將目前的專案結構另存為新範本嗎？\n(將複製里程碑、風險與關係人結構，但會重置進度)')) return;
            const p = this.activeProject;
            const newTpl = {
                id: Date.now(),
                name: `[範本] ${p.name}`,
                org: p.org || '',
                contacts: JSON.parse(JSON.stringify(p.contacts)),
                risks: JSON.parse(JSON.stringify(p.risks)),
                activities: p.activities.map(a => ({ ...a, id: Date.now() + Math.random(), status: 'pending', note: '', showNote: false, showStatusMenu: false }))
            };
            this.templates.unshift(newTpl);
            this.showToastMsg('已成功建立範本！請至「範本管理」查看');
        },

        toggleProjectStatus() {
            if (!this.activeProject) return;
            const isComplete = this.activeProject.status === 'completed';
            if (confirm(isComplete ? '確定要重新啟動此專案？' : '確定要將此專案結案歸檔？')) {
                this.activeProject.status = isComplete ? 'active' : 'completed';
                this.listFilter = this.activeProject.status;
                this.showToastMsg(isComplete ? '專案已重啟' : '專案已歸檔');
            }
        },

        async deleteProject() {
            if (confirm('⚠️ 確定刪除專案？\n(刪除後可立即復原)')) {
                const p = this.projects.find(p => p.id === this.selectedPid);
                const idx = this.projects.findIndex(p => p.id === this.selectedPid);

                this.deletedData = { type: 'project', data: p, index: idx };
                this.projects = this.projects.filter(p => p.id !== this.selectedPid);
                this.selectedPid = null;

                this.showToastMsg('專案已刪除', true);
            }
        },

        // --- 範本操作 ---
        createNewTemplate() {
            const id = Date.now();
            this.templates.unshift({ id, name: '新範本', org: '', contacts: [], risks: [], activities: [] });
            this.selectedTplId = id;
        },

        addTemplateActivity() {
            if (!this.activeTemplate) return;
            this.activeTemplate.activities.push({
                id: Date.now(),
                date: '2026-01-01',
                name: '新節點',
                type: 'activity',
                owner: '',
                status: 'pending',
                showNote: false
            });
        },

        deleteTemplate() {
            if (confirm('確定刪除此範本？')) {
                const t = this.templates.find(t => t.id === this.selectedTplId);
                const idx = this.templates.findIndex(t => t.id === this.selectedTplId);

                this.deletedData = { type: 'template', data: t, index: idx };
                this.templates = this.templates.filter(t => t.id !== this.selectedTplId);
                this.selectedTplId = null;

                this.showToastMsg('範本已刪除', true);
            }
        },

        // --- 任務操作 ---
        addActivity() {
            this.activeProject.activities.push({
                id: Date.now(),
                name: '',
                date: dayjs().year(2026).format('YYYY-MM-DD'),
                status: 'pending',
                owner: '',
                type: 'activity',
                note: '',
                showNote: false,
                showStatusMenu: false
            });
        },

        removeActivity(idx) {
            // 不需 confirm，直接刪除並提供 Undo
            const act = this.activeProject.activities[idx];
            this.deletedData = { type: 'activity', data: act, index: idx, parentId: this.selectedPid };
            this.activeProject.activities.splice(idx, 1);
            this.showToastMsg('任務已刪除', true);
        },

        removeActivityById(id) {
            const idx = this.activeProject.activities.findIndex(a => a.id === id);
            if (idx !== -1) {
                this.removeActivity(idx);
            }
        },

        // --- 聯絡人操作 ---
        addContact() {
            this.activeProject.contacts.push({ name: '', info: '' });
        },

        removeContact(i) {
            this.activeProject.contacts.splice(i, 1);
        },

        // --- 風險操作 ---
        addRisk() {
            if (!this.activeProject.risks) this.activeProject.risks = [];
            this.activeProject.risks.push({ level: 'med', desc: '', action: '' });
        },

        removeRisk(i) {
            this.activeProject.risks.splice(i, 1);
        },

        // --- 復原機制 (Undo) ---
        handleUndo() {
            if (!this.deletedData) return;

            const { type, data, index, parentId } = this.deletedData;

            if (type === 'project') {
                this.projects.splice(index, 0, data);
            } else if (type === 'template') {
                this.templates.splice(index, 0, data);
            } else if (type === 'activity') {
                const p = this.projects.find(p => p.id === parentId);
                if (p) {
                    p.activities.splice(index, 0, data);
                }
            }

            this.deletedData = null;
            this.showToast = false; // 關閉 Toast
            this.showToastMsg('已復原動作');
        },

        // --- 資料匯入匯出 ---
        exportData() {
            const data = { projects: this.projects, templates: this.templates };
            const link = document.createElement('a');
            link.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
            link.download = `PM_System_Backup_${dayjs().format('YYYYMMDD')}.json`;
            link.click();
            this.showToastMsg('完整系統備份 (JSON) 已下載');
        },

        importData(event) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.projects) {
                        this.projects = data.projects;
                        this.templates = data.templates || this.templates;
                    } else if (Array.isArray(data)) {
                        this.projects = data;
                    }
                    this.showToastMsg('資料還原成功！');
                } catch (err) {
                    alert('檔案格式錯誤');
                }
                event.target.value = '';
            };
            reader.readAsText(event.target.files[0]);
        },

        // --- Toast 通知 ---
        showToastMsg(msg, canUndo = false) {
            this.toastMessage = msg;
            this.toastHasUndo = canUndo;
            this.showToast = true;

            // 如果有 Undo，顯示時間長一點 (5秒)，否則維持 2.5秒
            const duration = canUndo ? 5000 : 2500;
            setTimeout(() => {
                // 只有在還沒被手動關閉或操作的情況下自動關閉
                if (this.toastMessage === msg) this.showToast = false;
                // 注意：這裡的判斷比較簡單，如果快速觸發多次 Toast 可能會有 edge case，但在這個規模可接受
            }, duration);
        },

        // --- 拖曳排序 (Drag & Drop) ---
        handleDragStart(index) {
            this.dragIndex = index;
        },

        handleDragEnter(index) {
            if (this.dragIndex === null || this.dragIndex === index) return;

            // 執行陣列元素移動
            const item = this.activeProject.activities.splice(this.dragIndex, 1)[0];
            this.activeProject.activities.splice(index, 0, item);

            // 更新當前索引，確保連續拖曳正確
            this.dragIndex = index;
        },

        handleDragEnd() {
            this.dragIndex = null;
            // 短暫閃爍提示儲存 (雖然 watch 會自動存，但給個反饋)
            // this.showToastMsg('順序已更新'); 
        },

        // --- 看板拖曳邏輯 (Kanban Drag & Drop) ---
        handleKanbanDragStart(act) {
            this.draggedActivity = act;
        },

        handleKanbanDrop(targetStatus) {
            if (!this.draggedActivity) return;

            // 如果目標狀態是 risk，自動設為 risk (即使原本是 blocked)
            // 如果目標狀態是 blocked，但原本不是，則設為 blocked
            // 這裡直接將狀態更新為目標欄位的狀態

            // 特殊處理：Risk 欄位包含 risk 和 blocked，我們預設拖進去是 risk，除非它是 blocked 就不變？
            // 簡化邏輯：拖進 Risk 欄位 -> 設為 risk；拖進已完成 -> done 等等
            // 但因為 Risk 欄位顯示 risk/blocked，如果它是 blocked 拖到同一欄位應該不變
            // 如果從其他欄位拖到 Risk 欄位 -> 預設 risk

            let newStatus = targetStatus;

            // Risk 欄位對應的 key 是 'risk'，但狀態可能是 'risk' 或 'blocked'
            if (targetStatus === 'risk') {
                if (this.draggedActivity.status !== 'blocked') {
                    newStatus = 'risk';
                } else {
                    // 如果已經是 blocked，拖回 risk 欄位 (可能是調整順序?) -> 保持 blocked
                    newStatus = 'blocked';
                }
            }

            this.draggedActivity.status = newStatus;
            this.draggedActivity = null;
            this.showToastMsg(`狀態更新：${this.statusText(newStatus)}`);
        },

        handleKanbanDragEnd() {
            this.draggedActivity = null;
        },

        // --- 圖表邏輯 (Charts) ---
        initCharts() {
            if (!this.activeProject || this.currentTab !== 'report') return;

            // 延遲執行確保 DOM 存在
            this.$nextTick(() => {
                this.renderStatusChart();
                this.renderRiskChart();
            });
        },

        renderStatusChart() {
            const ctx = document.getElementById('statusChart');
            if (!ctx) return;

            // 銷毀舊圖表
            if (this.statusChartInstance) {
                this.statusChartInstance.destroy();
            }

            const stats = {
                pending: this.activeProject.activities.filter(a => a.status === 'pending').length,
                ontrack: this.activeProject.activities.filter(a => a.status === 'ontrack').length,
                menu_risk: this.activeProject.activities.filter(a => a.status === 'risk').length,
                blocked: this.activeProject.activities.filter(a => a.status === 'blocked').length,
                done: this.activeProject.activities.filter(a => a.status === 'done').length
            };

            // 根據主題調整配色 (Forest / Sakura / Default)
            let colors = ['#cbd5e1', '#10b981', '#f59e0b', '#f43f5e', '#64748b'];
            if (this.theme === 'forest') {
                colors = ['#d1fae5', '#34d399', '#fbbf24', '#f87171', '#065f46']; // Forest Palette
            } else if (this.theme === 'sakura') {
                colors = ['#fce7f3', '#f472b6', '#fbbf24', '#f43f5e', '#be185d']; // Sakura Palette
            }

            const data = {
                labels: ['待辦', '正常', '風險', '卡關', '完成'],
                datasets: [{
                    data: [stats.pending, stats.ontrack, stats.menu_risk, stats.blocked, stats.done],
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            };

            this.statusChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { font: { family: 'Inter' }, boxWidth: 12, padding: 15 } }
                    },
                    cutout: '75%',
                    elements: { arc: { borderRadius: 4 } } // 圓角效果
                }
            });
        },

        renderRiskChart() {
            const ctx = document.getElementById('riskChart');
            if (!ctx) return;

            if (this.riskChartInstance) {
                this.riskChartInstance.destroy();
            }

            const risks = this.activeProject.risks || [];
            const stats = {
                high: risks.filter(r => r.level === 'high').length,
                med: risks.filter(r => r.level === 'med').length,
                low: risks.filter(r => r.level === 'low').length
            };

            // 根據主題調整配色
            let colors = ['#f43f5e', '#f59e0b', '#10b981'];
            if (this.theme === 'forest') {
                colors = ['#ef4444', '#f59e0b', '#10b981'];
            } else if (this.theme === 'sakura') {
                colors = ['#f43f5e', '#f59e0b', '#ec4899'];
            }

            const data = {
                labels: ['高風險', '中風險', '低風險'],
                datasets: [{
                    label: '數量',
                    data: [stats.high, stats.med, stats.low],
                    backgroundColor: colors,
                    borderRadius: 6, // 圓角柱狀圖
                    barThickness: 25
                }]
            };

            this.riskChartInstance = new Chart(ctx, {
                type: 'bar',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1, font: { family: 'Inter' } },
                            grid: { display: true, borderDash: [5, 5], color: 'rgba(0,0,0,0.05)' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { font: { family: 'Inter' } }
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        },

        // --- 櫻花特效邏輯 ---
        createPetals() {
            const container = document.getElementById('sakura-container');
            if (!container) return;
            container.innerHTML = ''; // 清空預設內容

            const petalCount = 30; // 花瓣數量
            for (let i = 0; i < petalCount; i++) {
                const petal = document.createElement('div');
                petal.className = 'petal';

                // 隨機屬性
                const size = Math.random() * 15 + 10 + 'px';
                const left = Math.random() * 100 + '%';
                const delay = Math.random() * 10 + 's';
                const duration = Math.random() * 15 + 10 + 's';
                const rotate = Math.random() * 360 + 'deg';

                petal.style.width = size;
                petal.style.height = size;
                petal.style.left = left;
                petal.style.animationDelay = delay;
                petal.style.animationDuration = duration;
                petal.style.transform = `rotate(${rotate})`;

                container.appendChild(petal);
            }
        }
    },

    // ============================================
    // 生命週期
    // ============================================
    mounted() {
        // 預設選取第一個專案
        if (this.projects.length) {
            this.selectedPid = this.projects[0].id;
        }

        // 初始化森林模式
        if (this.theme === 'forest') {
            document.documentElement.classList.add('forest');
        }

        // 註冊鍵盤事件監聽器
        document.addEventListener('keydown', this.handleKeyboard);

        // 如果初始是櫻花模式，啟動花瓣
        if (this.theme === 'sakura') {
            this.createPetals();
        }

        // 初始化字體大小
        document.documentElement.style.fontSize = this.fontSize + 'px';
    },


    beforeUnmount() {
        document.removeEventListener('keydown', this.handleKeyboard);
    }
}).mount('#app');
