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
        { id: 1, date: '2026-01-10', name: '專案啟動 (Kick-off)', status: 'pending', owner: 'PM', type: 'deadline', note: '', showNote: false },
        { id: 2, date: '2026-03-31', name: '需求規格書確認', status: 'pending', owner: 'SA', type: 'deadline', note: '', showNote: false },
        { id: 3, date: '2026-06-30', name: '期中報告', status: 'pending', owner: 'PM', type: 'deadline', note: '', showNote: false },
        { id: 4, date: '2026-09-15', name: 'UAT 測試', status: 'pending', owner: 'QA', type: 'activity', note: '', showNote: false },
        { id: 5, date: '2026-12-20', name: '結案驗收', status: 'pending', owner: 'PM', type: 'deadline', note: '', showNote: false }
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
            selectedPid: null,
            selectedTplId: null,
            showToast: false,
            toastMessage: '',
            listFilter: 'active',
            showNewProjectModal: false,
            projects: JSON.parse(localStorage.getItem('pm-projects-v2')) || [],
            templates: JSON.parse(localStorage.getItem('pm-templates-v1')) || [JSON.parse(JSON.stringify(DEFAULT_TEMPLATE))],
            searchQuery: '',
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
            return this.activeProject?.activities.sort((a, b) => dayjs(a.date).diff(dayjs(b.date))) || [];
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
            const isDark = this.theme === 'dark';
            return {
                body: isDark ? 'bg-[#0f172a] text-slate-300' : 'bg-slate-50 text-slate-700',
                card: isDark ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200',
                brand: isDark ? 'text-white' : 'text-slate-800',
                innerCard: isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-slate-50 border-slate-100',
                activeItem: isDark ? 'bg-indigo-900/30 border-indigo-500 text-indigo-200' : 'bg-white border-indigo-500 text-indigo-700 shadow-md',
                inactiveItem: isDark ? 'border-transparent opacity-60 hover:bg-slate-800' : 'border-transparent opacity-60 hover:bg-white hover:shadow-sm'
            };
        }
    },

    // ============================================
    // 監聽器 - 自動儲存
    // ============================================
    watch: {
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
            if (t === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
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
            // Cmd/Ctrl + D: 切換深淺色主題
            if ((e.metaKey || e.ctrlKey) && (e.key === 'd' || e.key === 'D')) {
                e.preventDefault();
                this.setTheme(this.theme === 'dark' ? 'light' : 'dark');
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
                newProject.activities = tpl.activities.map(a => ({ ...a, id: id + Math.random(), status: 'pending' }));
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
                activities: p.activities.map(a => ({ ...a, id: Date.now() + Math.random(), status: 'pending', note: '', showNote: false }))
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

        deleteProject() {
            if (confirm('⚠️ 確定刪除？')) {
                this.projects = this.projects.filter(p => p.id !== this.selectedPid);
                this.selectedPid = null;
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
                this.templates = this.templates.filter(t => t.id !== this.selectedTplId);
                this.selectedTplId = null;
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
                showNote: false
            });
        },

        removeActivity(idx) {
            this.activeProject.activities.splice(idx, 1);
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

        // --- 計算輔助函數 ---
        getYearPos(date) {
            return Math.max(0, Math.min(100, (dayjs(date).diff(dayjs('2026-01-01'), 'day') / 365) * 100));
        },

        calculateProgress(p) {
            if (!p || !p.activities.length) return 0;
            return Math.round((p.activities.filter(a => a.status === 'done').length / p.activities.length) * 100);
        },

        getRiskCount(p) {
            return { blocked: p.activities.filter(a => a.status === 'blocked').length };
        },

        getRiskScore(p) {
            return p.activities.filter(a => a.status === 'blocked').length > 0 ? 'HIGH' : 'LOW';
        },

        // --- 狀態顯示輔助函數 ---
        statusText(s) {
            const map = { pending: '待辦', ontrack: '正常', risk: '風險', blocked: '卡關', done: '完成' };
            return map[s] || '待辦';
        },

        statusIcon(s) {
            const map = {
                pending: 'fa-regular fa-circle',
                ontrack: 'fa-solid fa-play',
                risk: 'fa-solid fa-triangle-exclamation',
                blocked: 'fa-solid fa-ban',
                done: 'fa-solid fa-check'
            };
            return map[s];
        },

        getStatusBtnClass(s) {
            const map = {
                pending: 'border-slate-300 text-slate-500 bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-400',
                ontrack: 'border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400',
                risk: 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',
                blocked: 'border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400 status-blocked',
                done: 'border-slate-500 text-slate-600 bg-slate-100 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300'
            };
            return map[s];
        },

        getStatusColorClass(s) {
            const map = {
                pending: 'bg-slate-300 border-slate-400',
                ontrack: 'bg-emerald-500 border-emerald-600',
                risk: 'bg-amber-400 border-amber-500',
                blocked: 'bg-rose-500 border-rose-600 status-blocked',
                done: 'bg-slate-300 border-slate-400 grayscale opacity-50'
            };
            return map[s] || map.pending;
        },

        getStatusDot(s) {
            const map = {
                pending: 'bg-slate-300',
                ontrack: 'bg-emerald-500',
                risk: 'bg-amber-500',
                blocked: 'bg-rose-500',
                done: 'bg-slate-700'
            };
            return map[s];
        },

        getStatusTextColor(s) {
            const map = {
                pending: 'text-slate-400',
                ontrack: 'text-emerald-600',
                risk: 'text-amber-600',
                blocked: 'text-rose-600',
                done: 'text-slate-400'
            };
            return map[s];
        },

        getRiskLevelColor(l) {
            return { HIGH: 'text-rose-500', MED: 'text-amber-500', LOW: 'text-emerald-500' }[l];
        },

        getRiskLevelColorBg(l) {
            return { HIGH: 'bg-rose-500', MED: 'bg-amber-500', LOW: 'bg-emerald-500' }[l];
        },

        getRiskLevelClass(l) {
            return { high: 'bg-rose-100 text-rose-600', med: 'bg-amber-100 text-amber-600', low: 'bg-slate-200 text-slate-600' }[l];
        },

        getActivitiesByMonth(m) {
            if (!this.activeProject) return [];
            return this.activeProject.activities.filter(a => dayjs(a.date).month() + 1 === m).sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
        },

        // --- Excel 匯出 ---
        exportToExcel() {
            if (!this.activeProject) return;
            const p = this.activeProject;
            const wb = XLSX.utils.book_new();

            // Sheet 1: 概況
            const overviewData = [
                ["專案名稱", p.name], ["客戶/單位", p.org],
                ["目前狀態", p.status === 'completed' ? '已結案' : '進行中'], ["總體進度", `${this.calculateProgress(p)}%`],
                [], ["利害關係人", "資訊"], ...p.contacts.map(c => [c.name, c.info])
            ];
            const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
            XLSX.utils.book_append_sheet(wb, wsOverview, "專案概況");

            // Sheet 2: 執行細節
            const taskHeader = ["日期", "類型", "名稱", "狀態", "負責人", "備註"];
            const taskData = p.activities.map(a => [
                a.date, a.type === 'deadline' ? '里程碑' : '任務', a.name, this.statusText(a.status), a.owner, a.note
            ]);
            const wsTasks = XLSX.utils.aoa_to_sheet([taskHeader, ...taskData]);
            XLSX.utils.book_append_sheet(wb, wsTasks, "執行細節");

            // Sheet 3: 風險日誌
            const riskHeader = ["等級", "風險描述", "緩解對策"];
            const riskData = p.risks.map(r => [r.level === 'high' ? '高' : r.level === 'med' ? '中' : '低', r.desc, r.action]);
            const wsRisks = XLSX.utils.aoa_to_sheet([riskHeader, ...riskData]);
            XLSX.utils.book_append_sheet(wb, wsRisks, "風險日誌");

            XLSX.writeFile(wb, `${p.name}_報告.xlsx`);
        },

        // --- 資料匯入匯出 ---
        exportData() {
            const data = { projects: this.projects, templates: this.templates };
            const link = document.createElement('a');
            link.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
            link.download = `PM_System_Backup_${dayjs().format('YYYYMMDD')}.json`;
            link.click();
            this.showToastMsg('完整系統備份已下載');
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
        showToastMsg(msg) {
            this.toastMessage = msg;
            this.showToast = true;
            setTimeout(() => this.showToast = false, 2500);
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

        // 初始化深色模式
        if (this.theme === 'dark') {
            document.documentElement.classList.add('dark');
        }

        // 註冊鍵盤事件監聽器
        document.addEventListener('keydown', this.handleKeyboard);
    },

    beforeUnmount() {
        document.removeEventListener('keydown', this.handleKeyboard);
    }
}).mount('#app');
