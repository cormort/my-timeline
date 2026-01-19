/**
 * 專案計畫管理平台 v2.1.5
 * Vue.js 應用程式 - 完整整合無損版
 */

const { createApp } = Vue;

// ============================================
// 里程碑核心範本資料 (含四大報告)
// ============================================
const MILESTONE_TEMPLATE = {
  id: "tpl_milestone_2026_std",
  name: "標準計畫里程碑範本 (含四大報告)",
  org: "標準客戶單位",
  contacts: [{ name: "PM", info: "專案負責人" }],
  risks: [{ level: "med", desc: "時程風險", action: "建立每週里程碑控管機制" }],
  activities: [
    {
      id: 101,
      date: "2026-01-05",
      name: "專案啟動會議 (Kick-off Meeting)",
      status: "pending",
      owner: "PM",
      type: "deadline",
      note: "確立目標與範圍",
      showNote: false,
      showStatusMenu: false,
    },
    {
      id: 102,
      date: "2026-02-15",
      name: "需求訪談與功能細部規劃",
      status: "pending",
      owner: "SA",
      type: "activity",
      note: "",
      showNote: false,
      showStatusMenu: false,
    },
    {
      id: 103,
      date: "2026-04-10",
      name: "期中進度成果報告 (Mid-term Report)",
      status: "pending",
      owner: "PM",
      type: "deadline",
      note: "階段性原型展示",
      showNote: false,
      showStatusMenu: false,
    },
    {
      id: 104,
      date: "2026-06-20",
      name: "系統核心開發與整合測試",
      status: "pending",
      owner: "PG",
      type: "activity",
      note: "",
      showNote: false,
      showStatusMenu: false,
    },
    {
      id: 105,
      date: "2026-09-30",
      name: "期末驗收報告與展示 (Final Report)",
      status: "pending",
      owner: "PM",
      type: "deadline",
      note: "完整功能驗收流程",
      showNote: false,
      showStatusMenu: false,
    },
    {
      id: 106,
      date: "2026-11-15",
      name: "驗收意見修正報告 (Revision Report)",
      status: "pending",
      owner: "QA",
      type: "deadline",
      note: "修正意見調整確認",
      showNote: false,
      showStatusMenu: false,
    },
    {
      id: 107,
      date: "2026-12-20",
      name: "專案正式結案與移交",
      status: "pending",
      owner: "PM",
      type: "activity",
      note: "",
      showNote: false,
      showStatusMenu: false,
    },
  ],
};

const EMPTY_TEMPLATE = {
  id: null,
  name: "新空白範本",
  org: "",
  contacts: [],
  risks: [],
  activities: [],
};
const DEFAULT_TEMPLATE = MILESTONE_TEMPLATE;

// ============================================
// Vue 應用程式
// ============================================
createApp({
  data() {
    return {
      theme: localStorage.getItem("pm-theme") || "light",
      currentTab: "project",
      viewMode: "list", // list, board
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
      toastMessage: "",
      listFilter: "active",
      showNewProjectModal: false,
      projects: JSON.parse(localStorage.getItem("pm-projects-v2")) || [],
      templates: (() => {
        const saved = JSON.parse(localStorage.getItem("pm-templates-v1")) || [];
        // 確保預設範本始終存在
        const defaultExists = saved.some(t => t.id === MILESTONE_TEMPLATE.id);
        if (!defaultExists) {
          saved.unshift(JSON.parse(JSON.stringify(MILESTONE_TEMPLATE)));
        }
        return saved.length > 0 ? saved : [JSON.parse(JSON.stringify(MILESTONE_TEMPLATE))];
      })(),
      searchQuery: "",
      fontSize: parseInt(localStorage.getItem("pm-font-size")) || 16,
      tabs: [
        { id: "time", n: "年度全覽", icon: "fa-calendar-days" },
        { id: "calendar", n: "日曆視圖", icon: "fa-calendar-alt" },
        { id: "project", n: "專案管理", icon: "fa-list-check" },
        { id: "report", n: "報告 & 儀表板", icon: "fa-chart-pie" },
        { id: "template", n: "範本管理", icon: "fa-copy" },
      ],
      // Calendar State
      calendarDate: dayjs(),
      selectedDate: dayjs().format("YYYY-MM-DD"),
      holidays: {},
    };
  },

  // ============================================
  // 計算屬性
  // ============================================
  computed: {
    filteredProjects() {
      const status =
        this.listFilter === "active" ? ["active", undefined] : ["completed"];
      return this.projects.filter((p) => status.includes(p.status));
    },
    searchedProjects() {
      const query = this.searchQuery.toLowerCase().trim();
      if (!query) return this.filteredProjects;
      return this.filteredProjects.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.org && p.org.toLowerCase().includes(query))
      );
    },
    activeProjects() {
      return this.projects.filter((p) => p.status !== "completed");
    },
    activeProject() {
      return this.projects.find((p) => p.id === this.selectedPid);
    },
    sortedActivities() {
      // 移除自動排序，改為依照陣列順序 (支援拖曳排序)
      return this.activeProject?.activities || [];
    },
    kanbanColumns() {
      if (!this.activeProject) return {};
      return {
        pending: {
          title: "待辦事項",
          icon: "fa-regular fa-circle",
          color: "slate",
          items: this.activeProject.activities.filter(
            (a) => a.status === "pending"
          ),
        },
        ontrack: {
          title: "進行中",
          icon: "fa-solid fa-play",
          color: "emerald",
          items: this.activeProject.activities.filter(
            (a) => a.status === "ontrack"
          ),
        },
        risk: {
          title: "風險 / 卡關",
          icon: "fa-solid fa-triangle-exclamation",
          color: "amber",
          items: this.activeProject.activities.filter((a) =>
            ["risk", "blocked"].includes(a.status)
          ),
        },
        done: {
          title: "已完成",
          icon: "fa-solid fa-check",
          color: "indigo",
          items: this.activeProject.activities.filter(
            (a) => a.status === "done"
          ),
        },
      };
    },
    isArchived() {
      return this.activeProject?.status === "completed";
    },
    activeTemplate() {
      return this.templates.find((t) => t.id === this.selectedTplId);
    },
    today() {
      return dayjs().format("YYYY-MM-DD");
    },
    isCurrentYear() {
      return dayjs().year() === 2026;
    },
    themeClasses() {
      const isForest = this.theme === "forest";
      return {
        body: isForest
          ? "bg-[#1a472a] text-[#e2e8f0]"
          : this.theme === "sakura"
          ? "bg-[#fff5f7] text-[#5d4037]"
          : "bg-slate-50 text-slate-700",
        card: isForest
          ? "bg-white/90 border-[#2d6a4f] text-[#1b4332] shadow-emerald-900/20"
          : this.theme === "sakura"
          ? "bg-white/90 border-[#fecfef] shadow-pink-100"
          : "bg-white border-slate-200",
        brand: isForest
          ? "text-[#2d6a4f]"
          : this.theme === "sakura"
          ? "text-[#d81b60]"
          : "text-slate-800",
        innerCard: isForest
          ? "bg-[#f0fdf4] border-[#b7e4c7]"
          : this.theme === "sakura"
          ? "bg-[#fff0f3] border-[#fecfef]"
          : "bg-slate-50 border-slate-100",
        activeItem: isForest
          ? "bg-[#2d6a4f] border-[#95d5b2] text-[#d8f3dc]"
          : this.theme === "sakura"
          ? "bg-[#fff0f3] border-[#ff7eb3] text-[#d81b60] shadow-md shadow-pink-100"
          : "bg-white border-indigo-500 text-indigo-700 shadow-md",
        inactiveItem: isForest
          ? "border-transparent opacity-60 hover:bg-[#2d6a4f]/50"
          : this.theme === "sakura"
          ? "border-transparent opacity-70 hover:bg-white/80"
          : "border-transparent opacity-60 hover:bg-white hover:shadow-sm",
      };
    },
    // --- 日曆相關計算屬性 (Moved from methods) ---
    calendarHeader() {
      return this.calendarDate.format("YYYY 年 M 月");
    },
    calendarDays() {
      const year = this.calendarDate.year();
      const month = this.calendarDate.month(); // 0-11
      const firstDayOfMonth = dayjs(new Date(year, month, 1));
      const lastDayOfMonth = dayjs(new Date(year, month + 1, 0));
      
      const startDayOfWeek = firstDayOfMonth.day(); // 0 (Sun) - 6 (Sat)
      
      const days = [];
      
      const createDay = (d, currentMonth) => {
        const dateStr = d.format('YYYY-MM-DD');
        const holiday = this.holidays[dateStr];
        return {
          date: dateStr,
          day: d.date(),
          currentMonth,
          isToday: dateStr === this.today,
          holidayName: holiday?.isHoliday ? holiday.name : null,
          isHoliday: holiday?.isHoliday
        };
      };
      
      // Previous month padding
      const prevMonthLastDay = dayjs(new Date(year, month, 0));
      for (let i = startDayOfWeek - 1; i >= 0; i--) {
        days.push(createDay(prevMonthLastDay.subtract(i, 'day'), false));
      }
      
      // Current month days
      for (let i = 1; i <= lastDayOfMonth.date(); i++) {
        days.push(createDay(firstDayOfMonth.date(i), true));
      }
      
      // Next month padding to fill 42 cells (6 rows)
      const remainingCells = 42 - days.length;
      const nextMonthFirstDay = dayjs(new Date(year, month + 1, 1));
      for (let i = 0; i < remainingCells; i++) {
        days.push(createDay(nextMonthFirstDay.add(i, 'day'), false));
      }
      
      return days;
    },
    calendarTasks() {
      const taskMap = {};
      this.activeProjects.forEach(p => {
        p.activities.forEach(act => {
          if (!taskMap[act.date]) taskMap[act.date] = [];
          taskMap[act.date].push({
            ...act,
            projectName: p.name,
            projectId: p.id
          });
        });
      });
      return taskMap;
    },
    selectedDayTasks() {
      return this.calendarTasks[this.selectedDate] || [];
    },
  },

  // ============================================
  // 監聽器 - 自動儲存
  // ============================================
  watch: {
    activeProject: {
      handler() {
        if (this.currentTab === "report") {
          this.initCharts();
        }
      },
      deep: true,
    },
    currentTab(val) {
      if (val === "report") {
        this.initCharts();
      }
    },
    projects: {
      handler(val) {
        localStorage.setItem("pm-projects-v2", JSON.stringify(val));
      },
      deep: true,
    },
    templates: {
      handler(val) {
        localStorage.setItem("pm-templates-v1", JSON.stringify(val));
      },
      deep: true,
    },
  },

  // ============================================
  // 方法
  // ============================================
  methods: {
    dayjs,

    // --- 核心計算方法 ---
    calculateProgress(p) {
      if (!p || !p.activities?.length) return 0;
      return Math.round(
        (p.activities.filter((a) => a.status === "done").length /
          p.activities.length) *
          100
      );
    },

    getYearPos(date) {
      const diff = dayjs(date).diff(dayjs("2026-01-01"), "day");
      return Math.min(100, Math.max(0, (diff / 365) * 100));
    },

    getRiskCount(p) {
      const activities = p?.activities || [];
      return {
        blocked: activities.filter((a) => a.status === "blocked").length,
        risk: activities.filter((a) => a.status === "risk").length,
      };
    },

    getActivitiesByMonth(month) {
      if (!this.activeProject) return [];
      return this.activeProject.activities.filter(
        (a) => dayjs(a.date).month() + 1 === month
      );
    },

    // --- Deadline 警告計算 ---
    getDeadlineWarning(act) {
      // 已完成的任務不需要警告
      if (act.status === "done") return null;
      
      const today = dayjs();
      const deadline = dayjs(act.date);
      const daysUntil = deadline.diff(today, "day");

      // 只對 deadline 類型 或狀態為 risk/blocked 的任務顯示警告
      if (act.type === "deadline" || act.status === "risk" || act.status === "blocked") {
        // 高風險：1週內（7天）- 紅色燃燒
        if (daysUntil <= 7 && daysUntil >= 0) {
          return "high";
        }
        // 已過期 - 也視為高風險
        if (daysUntil < 0) {
          return "overdue";
        }
      }

      // 中風險：3天內或當週星期一開始 - 橘色
      if (act.status === "risk") {
        const mondayOfWeek = today.day(1); // 本週星期一
        if (deadline.isBefore(mondayOfWeek.add(7, "day")) && deadline.isAfter(today.subtract(1, "day"))) {
          return "medium";
        }
      }

      return null;
    },

    getRiskScore(p) {
      if (!p) return 0;
      const risks = p.risks || [];
      let score = 0;
      risks.forEach((r) => {
        if (r.level === "high") score += 3;
        else if (r.level === "med") score += 2;
        else score += 1;
      });
      return score;
    },

    getRiskLevelColor(score) {
      if (score >= 6) return "text-rose-600";
      if (score >= 3) return "text-amber-600";
      return "text-emerald-600";
    },

    getRiskLevelColorBg(score) {
      if (score >= 6) return "bg-rose-500";
      if (score >= 3) return "bg-amber-500";
      return "bg-emerald-500";
    },

    // --- 狀態相關方法 ---
    statusText(s) {
      return (
        { pending: "待辦", ontrack: "正常", risk: "風險", blocked: "卡關", done: "完成" }[s] || s
      );
    },

    statusIcon(s) {
      return {
        pending: "fa-regular fa-circle",
        ontrack: "fa-solid fa-play",
        risk: "fa-solid fa-triangle-exclamation",
        blocked: "fa-solid fa-ban",
        done: "fa-solid fa-check",
      }[s];
    },

    getStatusColorClass(s) {
      return {
        pending: "bg-slate-300 border-slate-400",
        ontrack: "bg-emerald-500 border-emerald-600",
        risk: "bg-amber-500 border-amber-600",
        blocked: "bg-rose-500 border-rose-600 status-blocked",
        done: "bg-indigo-500 border-indigo-600",
      }[s];
    },

    getStatusBtnClass(s) {
      return {
        pending: "bg-slate-50 text-slate-500 border-slate-200",
        ontrack: "bg-emerald-50 text-emerald-600 border-emerald-200",
        risk: "bg-amber-50 text-amber-600 border-amber-200",
        blocked: "bg-rose-50 text-rose-600 border-rose-200",
        done: "bg-indigo-50 text-indigo-600 border-indigo-200",
      }[s];
    },



    getStatusDot(s) {
      return {
        pending: "bg-slate-400",
        ontrack: "bg-emerald-500",
        risk: "bg-amber-500",
        blocked: "bg-rose-500",
        done: "bg-indigo-500",
      }[s];
    },

    getStatusTextColor(s) {
      return {
        pending: "text-slate-500",
        ontrack: "text-emerald-600",
        risk: "text-amber-600",
        blocked: "text-rose-600",
        done: "text-indigo-600",
      }[s];
    },

    getRiskLevelClass(l) {
      return {
        high: "bg-rose-500 text-white",
        med: "bg-amber-500 text-white",
        low: "bg-emerald-500 text-white",
      }[l];
    },

    // --- 主題設定 ---
    setTheme(t) {
      this.theme = t;
      localStorage.setItem("pm-theme", t);
      // 移除所有主題類別
      document.documentElement.classList.remove("dark", "forest", "sakura", "animal");
      // 加入當前主題類別
      if (t !== "light") {
        document.documentElement.classList.add(t);
      }
      // 根據主題觸發對應粒子效果
      this.$nextTick(() => {
        this.updateParticles(t);
      });
    },

    // --- 粒子效果更新 ---
    updateParticles(theme) {
      const container = document.getElementById("sakura-container");
      if (!container) return;
      container.innerHTML = "";

      let emojis = [];
      if (theme === "sakura") {
        emojis = ["🌸", "💮", "🎀"];
      } else if (theme === "forest") {
        emojis = ["🌲", "🍂", "🍃", "🌿"];
      } else if (theme === "animal") {
        emojis = ["🐭", "🐮", "🐯", "🐰", "🐲", "🐍", "🐎", "🐑", "🦁", "🐔", "🐶", "🐷", "🦆", "🐒", "🦌"];
      }

      if (emojis.length === 0) return;

      const particleCount = 25;
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement("div");
        particle.className = "particle";
        particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];

        const left = Math.random() * 100 + "%";
        const delay = Math.random() * 10 + "s";
        const duration = Math.random() * 15 + 10 + "s";
        const size = Math.random() * 10 + 16 + "px";

        particle.style.left = left;
        particle.style.animationDelay = delay;
        particle.style.animationDuration = duration;
        particle.style.fontSize = size;
        particle.style.position = "absolute";
        particle.style.top = "-50px";
        particle.style.opacity = "0.7";
        particle.style.pointerEvents = "none";
        particle.style.animation = `fall ${duration} linear ${delay} infinite`;

        container.appendChild(particle);
      }
    },

    // --- 字體大小調整 ---
    adjustFont(delta) {
      this.fontSize = Math.max(12, Math.min(24, this.fontSize + delta));
      localStorage.setItem("pm-font-size", this.fontSize);
      document.documentElement.style.fontSize = this.fontSize + "px";
    },

    // --- 鍵盤快捷鍵 ---
    handleKeyboard(e) {
      // 在輸入框中不觸發快捷鍵
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.tagName === "SELECT"
      )
        return;

      // N: 新增專案
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        this.showNewProjectModal = true;
      }
      // T: 新增任務 (需選中專案)
      if (
        (e.key === "t" || e.key === "T") &&
        this.activeProject &&
        !this.isArchived
      ) {
        e.preventDefault();
        this.addActivity();
        this.showToastMsg("已新增任務");
      }
      // Escape: 關閉 Modal
      if (e.key === "Escape") {
        this.showNewProjectModal = false;
      }
      // Cmd/Ctrl + D: 切換深淺色主題 (依照順序循環)
      if ((e.metaKey || e.ctrlKey) && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        const themes = ["light", "forest", "sakura", "animal"];
        const nextIdx = (themes.indexOf(this.theme) + 1) % themes.length;
        this.setTheme(themes[nextIdx]);
      }
    },

    // --- 專案操作 ---
    createFromTemplate(tpl) {
      const id = Date.now();
      let newProject = {
        id,
        name: tpl ? `${tpl.name} (Copy)` : "新專案",
        org: tpl ? tpl.org : "",
        status: "active",
        contacts: tpl ? JSON.parse(JSON.stringify(tpl.contacts)) : [],
        risks: tpl ? JSON.parse(JSON.stringify(tpl.risks)) : [],
        activities: [],
      };
      if (tpl && tpl.activities) {
        newProject.activities = tpl.activities.map((a) => ({
          ...a,
          id: id + Math.random(),
          status: "pending",
          showStatusMenu: false,
        }));
      }
      this.projects.unshift(newProject);
      this.selectedPid = id;
      this.listFilter = "active";
      this.showNewProjectModal = false;
      this.showToastMsg("專案建立成功！");
    },

    saveAsTemplate() {
      if (!this.activeProject) return;
      if (
        !confirm(
          "確定要將目前的專案結構另存為新範本嗎？\n(將複製里程碑、風險與關係人結構，但會重置進度)"
        )
      )
        return;
      const p = this.activeProject;
      const newTpl = {
        id: Date.now(),
        name: `[範本] ${p.name}`,
        org: p.org || "",
        contacts: JSON.parse(JSON.stringify(p.contacts)),
        risks: JSON.parse(JSON.stringify(p.risks)),
        activities: p.activities.map((a) => ({
          ...a,
          id: Date.now() + Math.random(),
          status: "pending",
          note: "",
          showNote: false,
          showStatusMenu: false,
        })),
      };
      this.templates.unshift(newTpl);
      this.showToastMsg("已成功建立範本！請至「範本管理」查看");
    },

    toggleProjectStatus() {
      if (!this.activeProject) return;
      const isComplete = this.activeProject.status === "completed";
      if (
        confirm(
          isComplete ? "確定要重新啟動此專案？" : "確定要將此專案結案歸檔？"
        )
      ) {
        this.activeProject.status = isComplete ? "active" : "completed";
        this.listFilter = this.activeProject.status;
        this.showToastMsg(isComplete ? "專案已重啟" : "專案已歸檔");
      }
    },

    async deleteProject() {
      if (confirm("⚠️ 確定刪除專案？\n(刪除後可立即復原)")) {
        const p = this.projects.find((p) => p.id === this.selectedPid);
        const idx = this.projects.findIndex((p) => p.id === this.selectedPid);

        this.deletedData = { type: "project", data: p, index: idx };
        this.projects = this.projects.filter((p) => p.id !== this.selectedPid);
        this.selectedPid = null;

        this.showToastMsg("專案已刪除", true);
      }
    },

    // --- 範本操作 ---
    createNewTemplate() {
      const newTpl = JSON.parse(JSON.stringify(EMPTY_TEMPLATE));
      newTpl.id = Date.now();
      newTpl.name = "新計畫架構範本";
      this.templates.push(newTpl);
      this.selectedTplId = newTpl.id; // 修正：確保切換至新範本
    },

    addTemplateActivity() {
      if (!this.activeTemplate) return;
      this.activeTemplate.activities.push({
        id: Date.now(),
        date: "2026-01-01",
        name: "新節點",
        type: "activity",
        owner: "",
        status: "pending",
        showNote: false,
      });
    },

    deleteTemplate() {
      if (confirm("確定刪除此範本？")) {
        const t = this.templates.find((t) => t.id === this.selectedTplId);
        const idx = this.templates.findIndex(
          (t) => t.id === this.selectedTplId
        );

        this.deletedData = { type: "template", data: t, index: idx };
        this.templates = this.templates.filter(
          (t) => t.id !== this.selectedTplId
        );
        this.selectedTplId = null;

        this.showToastMsg("範本已刪除", true);
      }
    },

    // --- 任務操作 ---
    addActivity() {
      this.activeProject.activities.push({
        id: Date.now(),
        name: "",
        date: dayjs().year(2026).format("YYYY-MM-DD"),
        status: "pending",
        owner: "",
        type: "activity",
        note: "",
        showNote: false,
        showStatusMenu: false,
      });
    },

    removeActivity(idx) {
      if (confirm("確定刪除這項任務嗎？")) {
        const act = this.activeProject.activities[idx];
        this.deletedData = {
          type: "activity",
          data: act,
          index: idx,
          parentId: this.selectedPid,
        };
        this.activeProject.activities.splice(idx, 1);
        this.showToastMsg("任務已刪除", true);
      }
    },

    removeActivityById(id) {
      const idx = this.activeProject.activities.findIndex((a) => a.id === id);
      if (idx !== -1) {
        this.removeActivity(idx);
      }
    },

    // --- 移動與排序 ---
    moveActivity(idx, dir) {
      const list = this.activeProject.activities;
      const targetIndex = idx + dir;
      if (targetIndex >= 0 && targetIndex < list.length) {
        const temp = list[idx];
        list[idx] = list[targetIndex];
        list[targetIndex] = temp;
      }
    },

    sortByDate() {
      if (!this.activeProject) return;
      this.activeProject.activities.sort(
        (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix()
      );
      this.showToastMsg("已按時間重新排序任務");
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
    },

    // --- 聯絡人操作 ---
    addContact() {
      this.activeProject.contacts.push({ name: "", info: "" });
    },

    removeContact(idx) {
      if (confirm("移除此關係人？")) this.activeProject.contacts.splice(idx, 1);
    },

    // --- 風險操作 ---
    addRisk() {
      if (!this.activeProject.risks) this.activeProject.risks = [];
      this.activeProject.risks.push({ level: "med", desc: "", action: "" });
    },

    removeRisk(idx) {
      if (confirm("移除此風險紀錄？")) this.activeProject.risks.splice(idx, 1);
    },

    // --- 復原機制 (Undo) ---
    handleUndo() {
      if (!this.deletedData) return;

      const { type, data, index, parentId } = this.deletedData;

      if (type === "project") {
        this.projects.splice(index, 0, data);
      } else if (type === "template") {
        this.templates.splice(index, 0, data);
      } else if (type === "activity") {
        const p = this.projects.find((p) => p.id === parentId);
        if (p) {
          p.activities.splice(index, 0, data);
        }
      }

      this.deletedData = null;
      this.showToast = false; // 關閉 Toast
      this.showToastMsg("已復原動作");
    },

    // --- 資料匯入匯出 ---
    exportData() {
      const data = { projects: this.projects, templates: this.templates };
      const link = document.createElement("a");
      link.href =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(data));
      link.download = `PM_System_Backup_${dayjs().format("YYYYMMDD")}.json`;
      link.click();
      this.showToastMsg("完整系統備份 (JSON) 已下載");
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
          this.showToastMsg("資料還原成功！");
        } catch (err) {
          alert("檔案格式錯誤");
        }
        event.target.value = "";
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
      if (targetStatus === "risk") {
        if (this.draggedActivity.status !== "blocked") {
          newStatus = "risk";
        } else {
          // 如果已經是 blocked，拖回 risk 欄位 (可能是調整順序?) -> 保持 blocked
          newStatus = "blocked";
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
      if (!this.activeProject || this.currentTab !== "report") return;

      // 延遲執行確保 DOM 存在
      this.$nextTick(() => {
        this.renderStatusChart();
        this.renderRiskChart();
      });
    },

    renderStatusChart() {
      const ctx = document.getElementById("statusChart");
      if (!ctx) return;

      // 銷毀舊圖表
      if (this.statusChartInstance) {
        this.statusChartInstance.destroy();
      }

      const stats = {
        pending: this.activeProject.activities.filter(
          (a) => a.status === "pending"
        ).length,
        ontrack: this.activeProject.activities.filter(
          (a) => a.status === "ontrack"
        ).length,
        menu_risk: this.activeProject.activities.filter(
          (a) => a.status === "risk"
        ).length,
        blocked: this.activeProject.activities.filter(
          (a) => a.status === "blocked"
        ).length,
        done: this.activeProject.activities.filter((a) => a.status === "done")
          .length,
      };

      // 根據主題調整配色 (Forest / Sakura / Default)
      let colors = ["#cbd5e1", "#10b981", "#f59e0b", "#f43f5e", "#64748b"];
      if (this.theme === "forest") {
        colors = ["#d1fae5", "#34d399", "#fbbf24", "#f87171", "#065f46"]; // Forest Palette
      } else if (this.theme === "sakura") {
        colors = ["#fce7f3", "#f472b6", "#fbbf24", "#f43f5e", "#be185d"]; // Sakura Palette
      }

      const data = {
        labels: ["待辦", "正常", "風險", "卡關", "完成"],
        datasets: [
          {
            data: [
              stats.pending,
              stats.ontrack,
              stats.menu_risk,
              stats.blocked,
              stats.done,
            ],
            backgroundColor: colors,
            borderWidth: 0,
          },
        ],
      };

      this.statusChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "right",
              labels: { font: { family: "Inter" }, boxWidth: 12, padding: 15 },
            },
          },
          cutout: "75%",
          elements: { arc: { borderRadius: 4 } }, // 圓角效果
        },
      });
    },

    renderRiskChart() {
      const ctx = document.getElementById("riskChart");
      if (!ctx) return;

      if (this.riskChartInstance) {
        this.riskChartInstance.destroy();
      }

      const risks = this.activeProject.risks || [];
      const stats = {
        high: risks.filter((r) => r.level === "high").length,
        med: risks.filter((r) => r.level === "med").length,
        low: risks.filter((r) => r.level === "low").length,
      };

      // 根據主題調整配色
      let colors = ["#f43f5e", "#f59e0b", "#10b981"];
      if (this.theme === "forest") {
        colors = ["#ef4444", "#f59e0b", "#10b981"];
      } else if (this.theme === "sakura") {
        colors = ["#f43f5e", "#f59e0b", "#ec4899"];
      }

      const data = {
        labels: ["高風險", "中風險", "低風險"],
        datasets: [
          {
            label: "數量",
            data: [stats.high, stats.med, stats.low],
            backgroundColor: colors,
            borderRadius: 6, // 圓角柱狀圖
            barThickness: 25,
          },
        ],
      };

      this.riskChartInstance = new Chart(ctx, {
        type: "bar",
        data: data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1, font: { family: "Inter" } },
              grid: {
                display: true,
                borderDash: [5, 5],
                color: "rgba(0,0,0,0.05)",
              },
            },
            x: {
              grid: { display: false },
              ticks: { font: { family: "Inter" } },
            },
          },
          plugins: {
            legend: { display: false },
          },
        },
      });
    },

    // --- 日曆操作 ---
    async fetchHolidays() {
      try {
        // 使用 GitHub CDN 抓取 2026 年台灣行事曆
        const res = await fetch("https://cdn.jsdelivr.net/gh/ruyut/TaiwanCalendar/data/2026.json");
        const data = await res.json();
        // 格式處理： { date: "20260101", description: "...", isHoliday: true }
        data.forEach(d => {
           if (d.isHoliday) {
             const y = d.date.substring(0, 4);
             const m = d.date.substring(4, 6);
             const day = d.date.substring(6, 8);
             const dateStr = `${y}-${m}-${day}`;
             this.holidays[dateStr] = { name: d.description, isHoliday: true };
           }
        });
      } catch (e) {
        console.error("Failed to fetch holidays:", e);
      }
    },

    changeMonth(delta) {
      this.calendarDate = this.calendarDate.add(delta, 'month');
    },
    selectDate(date) {
      this.selectedDate = date;
    },
    
    // --- 櫻花特效邏輯 ---
    createPetals() {
      const container = document.getElementById("sakura-container");
      if (!container) return;
      container.innerHTML = ""; // 清空預設內容

      const petalCount = 30; // 花瓣數量
      for (let i = 0; i < petalCount; i++) {
        const petal = document.createElement("div");
        petal.className = "petal";

        // 隨機屬性
        const size = Math.random() * 15 + 10 + "px";
        const left = Math.random() * 100 + "%";
        const delay = Math.random() * 10 + "s";
        const duration = Math.random() * 15 + 10 + "s";
        const rotate = Math.random() * 360 + "deg";

        petal.style.width = size;
        petal.style.height = size;
        petal.style.left = left;
        petal.style.animationDelay = delay;
        petal.style.animationDuration = duration;
        petal.style.transform = `rotate(${rotate})`;

        container.appendChild(petal);
      }
    },
  },

  // ============================================
  // 生命週期
  // ============================================
  mounted() {
    // 預設選取第一個專案
    if (this.projects.length) {
      this.selectedPid = this.projects[0].id;
    }

    // 抓取假日資料
    this.fetchHolidays();

    // 初始化主題類別
    if (this.theme !== "light") {
      document.documentElement.classList.add(this.theme);
    }

    // 註冊鍵盤事件監聽器
    document.addEventListener("keydown", this.handleKeyboard);

    // 初始化主題粒子效果
    this.updateParticles(this.theme);

    // 初始化字體大小
    document.documentElement.style.fontSize = this.fontSize + "px";
  },

  beforeUnmount() {
    document.removeEventListener("keydown", this.handleKeyboard);
  },
}).mount("#app");
