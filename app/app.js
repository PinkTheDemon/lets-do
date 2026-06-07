const STORAGE_KEY = "lets-do-mvp";
const EXPORT_VERSION = 1;

const defaultCategories = [
  { id: "cat-work", name: "工作", color: "#ff7a59", createdAt: "2026-04-12T00:00:00.000Z" },
  { id: "cat-study", name: "学习", color: "#ffb347", createdAt: "2026-04-12T00:00:00.000Z" },
  { id: "cat-life", name: "生活", color: "#5c8d89", createdAt: "2026-04-12T00:00:00.000Z" }
];

function nowIso() {
  return new Date().toISOString();
}

function createInitialState() {
  const createdAt = nowIso();
  return {
    categories: defaultCategories,
    tasks: [
      {
        id: crypto.randomUUID(),
        title: "确认 MVP 首页信息结构",
        description: "把分类、任务列表和快速录入放在同一屏内完成。",
        categoryId: "cat-work",
        status: "todo",
        isToday: true,
        subtasks: [
          {
            id: crypto.randomUUID(),
            title: "检查分类、任务列表、快速录入是否同屏可见",
            status: "todo",
            createdAt,
            updatedAt: createdAt,
            completedAt: null
          }
        ],
        createdAt,
        updatedAt: createdAt,
        completedAt: null
      }
    ],
    selectedCategoryId: "all",
    activeView: "all",
    searchQuery: "",
    expandedSubtaskTaskIds: []
  };
}

function normalizeTask(task) {
  const createdAt = task.createdAt || nowIso();
  return {
    ...task,
    description: task.description || "",
    categoryId: task.categoryId || defaultCategories[0].id,
    status: task.status === "completed" ? "completed" : "todo",
    isToday: Boolean(task.isToday),
    subtasks: Array.isArray(task.subtasks) ? task.subtasks.map(normalizeSubtask) : [],
    createdAt,
    updatedAt: task.updatedAt || createdAt,
    completedAt: task.completedAt || null
  };
}

function normalizeSubtask(subtask) {
  const createdAt = subtask.createdAt || nowIso();
  return {
    ...subtask,
    id: subtask.id || crypto.randomUUID(),
    title: subtask.title || "",
    status: subtask.status === "completed" ? "completed" : "todo",
    createdAt,
    updatedAt: subtask.updatedAt || createdAt,
    completedAt: subtask.completedAt || null
  };
}

function loadState() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createInitialState();
  }

  try {
    const parsed = JSON.parse(raw);
    const activeView = parsed.activeView || (parsed.showCompleted ? "completed" : "pending");
    return {
      categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : defaultCategories,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map(normalizeTask) : [],
      selectedCategoryId: parsed.selectedCategoryId || "all",
      activeView: ["all", "pending", "today", "completed"].includes(activeView) ? activeView : "all",
      searchQuery: parsed.searchQuery || "",
      expandedSubtaskTaskIds: Array.isArray(parsed.expandedSubtaskTaskIds) ? parsed.expandedSubtaskTaskIds : []
    };
  } catch (error) {
    console.error("Failed to parse stored data", error);
    return createInitialState();
  }
}

let state = loadState();

const elements = {
  categoryForm: document.querySelector("#category-form"),
  categoryNameInput: document.querySelector("#category-name-input"),
  categoryColorInput: document.querySelector("#category-color-input"),
  categoryList: document.querySelector("#category-list"),
  taskForm: document.querySelector("#task-form"),
  taskTitleInput: document.querySelector("#task-title-input"),
  taskDescriptionInput: document.querySelector("#task-description-input"),
  taskCategorySelect: document.querySelector("#task-category-select"),
  taskTodayInput: document.querySelector("#task-today-input"),
  taskSearchInput: document.querySelector("#task-search-input"),
  taskList: document.querySelector("#task-list"),
  taskTemplate: document.querySelector("#task-card-template"),
  selectedCategoryCaption: document.querySelector("#selected-category-caption"),
  todoCount: document.querySelector("#todo-count"),
  completedCount: document.querySelector("#completed-count"),
  seedCategoriesButton: document.querySelector("#seed-categories-button"),
  exportDataButton: document.querySelector("#export-data-button"),
  importDataButton: document.querySelector("#import-data-button"),
  importDataInput: document.querySelector("#import-data-input"),
  viewTabs: document.querySelectorAll(".view-tab")
};

function persistState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getCategoryById(categoryId) {
  return state.categories.find((category) => category.id === categoryId) || null;
}

function setState(updater) {
  state = updater(state);
  persistState();
  render();
}

function createCategoryList() {
  return [{ id: "all", name: "全部任务", color: "#24160b" }, ...state.categories];
}

function getVisibleTasks() {
  const query = state.searchQuery.trim().toLowerCase();
  return state.tasks.filter((task) => {
    const matchesCategory = state.selectedCategoryId === "all" || task.categoryId === state.selectedCategoryId;
    const matchesView = state.activeView === "all"
      ? true
      : state.activeView === "completed"
        ? task.status === "completed"
        : state.activeView === "today"
          ? task.isToday && task.status !== "completed"
          : task.status !== "completed";
    const searchableText = [
      task.title,
      task.description,
      ...task.subtasks.map((subtask) => subtask.title)
    ].join(" ").toLowerCase();
    return matchesCategory && matchesView && (!query || searchableText.includes(query));
  });
}

function renderCategories() {
  const categories = createCategoryList();
  elements.categoryList.innerHTML = "";
  elements.taskCategorySelect.innerHTML = "";

  categories.forEach((category) => {
    const listItem = document.createElement("li");
    listItem.className = `category-item${state.selectedCategoryId === category.id ? " active" : ""}`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "category-button";
    button.innerHTML = `
      <span class="category-swatch" style="background:${category.color}"></span>
      <span>${category.name}</span>
    `;
    button.addEventListener("click", () => {
      setState((currentState) => ({ ...currentState, selectedCategoryId: category.id }));
    });

    listItem.appendChild(button);

    if (category.id !== "all") {
      const count = document.createElement("span");
      count.className = "muted";
      count.textContent = String(state.tasks.filter((task) => task.categoryId === category.id && task.status !== "completed").length);
      listItem.appendChild(count);

      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.name;
      elements.taskCategorySelect.appendChild(option);
    }

    elements.categoryList.appendChild(listItem);
  });

  if (!state.categories.some((category) => category.id === elements.taskCategorySelect.value)) {
    elements.taskCategorySelect.value = state.categories[0]?.id || "";
  }
}

function renderTaskSummary() {
  const todoCount = state.tasks.filter((task) => task.status !== "completed").length;
  const completedCount = state.tasks.filter((task) => task.status === "completed").length;
  elements.todoCount.textContent = String(todoCount);
  elements.completedCount.textContent = String(completedCount);
  elements.taskSearchInput.value = state.searchQuery;

  elements.viewTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === state.activeView);
  });

  const categoryLabel = state.selectedCategoryId === "all"
    ? "全部"
    : getCategoryById(state.selectedCategoryId)?.name || "全部";
  elements.selectedCategoryCaption.textContent = `当前分类：${categoryLabel}`;
}

function renderTasks() {
  const tasks = getVisibleTasks().sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  elements.taskList.innerHTML = "";

  if (tasks.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = state.searchQuery.trim()
      ? "没有找到匹配的任务。"
      : "当前视图还没有任务。";
    elements.taskList.appendChild(emptyState);
    return;
  }

  tasks.forEach((task) => {
    elements.taskList.appendChild(createTaskCard(task));
  });
}

function createTaskCard(task) {
  const fragment = elements.taskTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".task-card");
  const checkbox = fragment.querySelector(".task-status-input");
  const title = fragment.querySelector(".task-title");
  const description = fragment.querySelector(".task-description");
  const meta = fragment.querySelector(".task-meta");
  const chip = fragment.querySelector(".task-category-chip");
  const editPanel = fragment.querySelector(".task-edit");
  const editButton = fragment.querySelector(".task-edit-button");
  const saveButton = fragment.querySelector(".task-save-button");
  const cancelButton = fragment.querySelector(".task-cancel-button");
  const editTitle = fragment.querySelector(".task-edit-title");
  const editDescription = fragment.querySelector(".task-edit-description");
  const editCategory = fragment.querySelector(".task-edit-category");
  const editToday = fragment.querySelector(".task-edit-today");
  const subtaskPanel = fragment.querySelector(".subtask-panel");
  const subtaskList = fragment.querySelector(".subtask-list");
  const subtaskForm = fragment.querySelector(".subtask-form");
  const subtaskInput = fragment.querySelector(".subtask-title-input");
  const toggleSubtasksButton = fragment.querySelector(".task-toggle-subtasks-button");
  const deleteButton = fragment.querySelector(".task-delete-button");
  const category = getCategoryById(task.categoryId);

  card.classList.toggle("completed", task.status === "completed");
  checkbox.checked = task.status === "completed";
  title.textContent = task.title;
  description.textContent = task.description;
  chip.textContent = category?.name || "未分类";
  chip.style.setProperty("--chip-color", category?.color || "#24160b");
  meta.textContent = createTaskMeta(task);

  renderEditCategories(editCategory, task.categoryId);
  renderSubtasks(subtaskList, task);
  const isSubtaskPanelExpanded = state.expandedSubtaskTaskIds.includes(task.id);
  subtaskPanel.classList.toggle("expanded", isSubtaskPanelExpanded);
  toggleSubtasksButton.textContent = isSubtaskPanelExpanded ? "收起子任务" : "子任务";

  checkbox.addEventListener("change", () => {
    updateTask(task.id, (currentTask) => {
      const completed = currentTask.status !== "completed";
      return {
        ...currentTask,
        status: completed ? "completed" : "todo",
        completedAt: completed ? nowIso() : null,
        updatedAt: nowIso()
      };
    });
  });

  editButton.addEventListener("click", () => {
    editTitle.value = task.title;
    editDescription.value = task.description;
    editCategory.value = task.categoryId;
    editToday.checked = task.isToday;
    editPanel.hidden = false;
    title.hidden = true;
    description.hidden = true;
    editTitle.focus();
  });

  cancelButton.addEventListener("click", () => {
    editPanel.hidden = true;
    title.hidden = false;
    description.hidden = false;
  });

  saveButton.addEventListener("click", () => {
    const nextTitle = editTitle.value.trim();
    if (!nextTitle) {
      editTitle.focus();
      return;
    }

    updateTask(task.id, (currentTask) => ({
      ...currentTask,
      title: nextTitle,
      description: editDescription.value.trim(),
      categoryId: editCategory.value,
      isToday: editToday.checked,
      updatedAt: nowIso()
    }));
  });

  toggleSubtasksButton.addEventListener("click", () => {
    setState((currentState) => ({
      ...currentState,
      expandedSubtaskTaskIds: currentState.expandedSubtaskTaskIds.includes(task.id)
        ? currentState.expandedSubtaskTaskIds.filter((taskId) => taskId !== task.id)
        : [...currentState.expandedSubtaskTaskIds, task.id]
    }));
  });

  subtaskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const subtaskTitle = subtaskInput.value.trim();
    if (!subtaskTitle) {
      return;
    }

    updateTask(task.id, (currentTask) => ({
      ...currentTask,
      subtasks: [
        ...currentTask.subtasks,
        {
          id: crypto.randomUUID(),
          title: subtaskTitle,
          status: "todo",
          createdAt: nowIso(),
          updatedAt: nowIso(),
          completedAt: null
        }
      ],
      updatedAt: nowIso()
    }), { expandSubtasks: true });
  });

  deleteButton.addEventListener("click", () => {
    const confirmed = window.confirm(`确定删除任务“${task.title}”吗？此操作会同时删除它的子任务。`);
    if (!confirmed) {
      return;
    }

    deleteTask(task.id);
  });

  return fragment;
}

function renderEditCategories(select, selectedCategoryId) {
  select.innerHTML = "";
  state.categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.name;
    select.appendChild(option);
  });
  select.value = selectedCategoryId;
}

function renderSubtasks(list, task) {
  list.innerHTML = "";

  if (task.subtasks.length === 0) {
    const item = document.createElement("li");
    item.className = "subtask-empty";
    item.textContent = "还没有子任务。";
    list.appendChild(item);
    return;
  }

  task.subtasks.forEach((subtask) => {
    const item = document.createElement("li");
    item.className = `subtask-item${subtask.status === "completed" ? " completed" : ""}`;

    const row = document.createElement("div");
    row.className = "subtask-row";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = subtask.status === "completed";
    input.addEventListener("change", () => {
      updateSubtask(task.id, subtask.id, (currentSubtask) => {
        const completed = currentSubtask.status !== "completed";
        return {
          ...currentSubtask,
          status: completed ? "completed" : "todo",
          completedAt: completed ? nowIso() : null,
          updatedAt: nowIso()
        };
      }, { expandSubtasks: true });
    });

    const text = document.createElement("span");
    text.textContent = subtask.title;

    const editButton = document.createElement("button");
    editButton.className = "subtask-edit-button ghost-button";
    editButton.type = "button";
    editButton.textContent = "编辑";

    const deleteButton = document.createElement("button");
    deleteButton.className = "subtask-delete-button danger-button";
    deleteButton.type = "button";
    deleteButton.textContent = "删除";

    const editForm = document.createElement("form");
    editForm.className = "subtask-edit-form";
    editForm.hidden = true;

    const editInput = document.createElement("input");
    editInput.type = "text";
    editInput.maxLength = 80;
    editInput.value = subtask.title;

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.textContent = "保存";

    const cancelButton = document.createElement("button");
    cancelButton.className = "ghost-button";
    cancelButton.type = "button";
    cancelButton.textContent = "取消";

    editButton.addEventListener("click", () => {
      row.hidden = true;
      editForm.hidden = false;
      editInput.focus();
      editInput.select();
    });

    cancelButton.addEventListener("click", () => {
      editInput.value = subtask.title;
      row.hidden = false;
      editForm.hidden = true;
    });

    editForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const nextTitle = editInput.value.trim();
      if (!nextTitle) {
        editInput.focus();
        return;
      }

      updateSubtask(task.id, subtask.id, (currentSubtask) => ({
        ...currentSubtask,
        title: nextTitle,
        updatedAt: nowIso()
      }), { expandSubtasks: true });
    });

    deleteButton.addEventListener("click", () => {
      const confirmed = window.confirm(`确定删除子任务“${subtask.title}”吗？`);
      if (!confirmed) {
        return;
      }

      deleteSubtask(task.id, subtask.id);
    });

    row.append(input, text, editButton, deleteButton);
    editForm.append(editInput, saveButton, cancelButton);
    item.append(row, editForm);
    list.appendChild(item);
  });
}

function createTaskMeta(task) {
  const doneCount = task.subtasks.filter((subtask) => subtask.status === "completed").length;
  const subtaskText = task.subtasks.length > 0 ? ` · 子任务 ${doneCount}/${task.subtasks.length}` : "";
  const todayText = task.isToday ? " · 今日" : "";
  return task.status === "completed"
    ? `已完成 · 创建于 ${formatDateTime(task.createdAt)}${subtaskText}${todayText}`
    : `进行中 · 创建于 ${formatDateTime(task.createdAt)}${subtaskText}${todayText}`;
}

function updateTask(taskId, updater, options = {}) {
  setState((currentState) => ({
    ...currentState,
    tasks: currentState.tasks.map((task) => task.id === taskId ? updater(task) : task),
    expandedSubtaskTaskIds: options.expandSubtasks && !currentState.expandedSubtaskTaskIds.includes(taskId)
      ? [...currentState.expandedSubtaskTaskIds, taskId]
      : currentState.expandedSubtaskTaskIds
  }));
}

function updateSubtask(taskId, subtaskId, updater, options = {}) {
  updateTask(taskId, (task) => ({
    ...task,
    subtasks: task.subtasks.map((subtask) => subtask.id === subtaskId ? updater(subtask) : subtask),
    updatedAt: nowIso()
  }), options);
}

function deleteTask(taskId) {
  setState((currentState) => ({
    ...currentState,
    tasks: currentState.tasks.filter((task) => task.id !== taskId),
    expandedSubtaskTaskIds: currentState.expandedSubtaskTaskIds.filter((expandedTaskId) => expandedTaskId !== taskId)
  }));
}

function deleteSubtask(taskId, subtaskId) {
  updateTask(taskId, (task) => ({
    ...task,
    subtasks: task.subtasks.filter((subtask) => subtask.id !== subtaskId),
    updatedAt: nowIso()
  }), { expandSubtasks: true });
}

function createExportPayload() {
  return {
    version: EXPORT_VERSION,
    exportedAt: nowIso(),
    data: {
      categories: state.categories,
      tasks: state.tasks,
      selectedCategoryId: state.selectedCategoryId,
      activeView: state.activeView,
      searchQuery: state.searchQuery,
      expandedSubtaskTaskIds: state.expandedSubtaskTaskIds
    }
  };
}

function downloadJson(payload) {
  const dateLabel = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lets-do-backup-${dateLabel}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function normalizeImportedState(payload) {
  const data = payload?.data || payload;
  const categories = Array.isArray(data?.categories) && data.categories.length > 0 ? data.categories : null;
  const tasks = Array.isArray(data?.tasks) ? data.tasks.map(normalizeTask) : null;

  if (!categories || !tasks) {
    throw new Error("Invalid backup file");
  }

  const activeView = ["all", "pending", "today", "completed"].includes(data.activeView) ? data.activeView : "all";
  const selectedCategoryId = data.selectedCategoryId === "all" || categories.some((category) => category.id === data.selectedCategoryId)
    ? data.selectedCategoryId || "all"
    : "all";

  return {
    categories,
    tasks,
    selectedCategoryId,
    activeView,
    searchQuery: data.searchQuery || "",
    expandedSubtaskTaskIds: Array.isArray(data.expandedSubtaskTaskIds) ? data.expandedSubtaskTaskIds : []
  };
}

function formatDateTime(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function render() {
  renderCategories();
  renderTaskSummary();
  renderTasks();
}

elements.categoryForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = elements.categoryNameInput.value.trim();
  const color = elements.categoryColorInput.value;
  if (!name) {
    return;
  }

  setState((currentState) => ({
    ...currentState,
    categories: [
      ...currentState.categories,
      {
        id: crypto.randomUUID(),
        name,
        color,
        createdAt: nowIso()
      }
    ]
  }));

  elements.categoryForm.reset();
  elements.categoryColorInput.value = "#ff7a59";
});

elements.taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = elements.taskTitleInput.value.trim();
  const description = elements.taskDescriptionInput.value.trim();
  const categoryId = elements.taskCategorySelect.value;

  if (!title || !categoryId) {
    return;
  }

  setState((currentState) => ({
    ...currentState,
    tasks: [
      ...currentState.tasks,
      {
        id: crypto.randomUUID(),
        title,
        description,
        categoryId,
        status: "todo",
        isToday: elements.taskTodayInput.checked,
        subtasks: [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
        completedAt: null
      }
    ],
    activeView: currentState.activeView === "completed" ? "pending" : currentState.activeView
  }));

  elements.taskForm.reset();
  elements.taskCategorySelect.value = categoryId;
  elements.taskTodayInput.checked = true;
});

elements.taskSearchInput.addEventListener("input", (event) => {
  setState((currentState) => ({ ...currentState, searchQuery: event.target.value }));
});

elements.viewTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setState((currentState) => ({ ...currentState, activeView: tab.dataset.view }));
  });
});

elements.seedCategoriesButton.addEventListener("click", () => {
  setState((currentState) => ({
    ...currentState,
    categories: defaultCategories
  }));
});

elements.exportDataButton.addEventListener("click", () => {
  downloadJson(createExportPayload());
});

elements.importDataButton.addEventListener("click", () => {
  elements.importDataInput.click();
});

elements.importDataInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const importedState = normalizeImportedState(JSON.parse(String(reader.result)));
      const confirmed = window.confirm("导入会覆盖当前本地数据。确定继续吗？");
      if (!confirmed) {
        return;
      }

      state = importedState;
      persistState();
      render();
    } catch (error) {
      console.error("Failed to import data", error);
      window.alert("导入失败：请选择有效的 Let's do JSON 数据文件。");
    } finally {
      elements.importDataInput.value = "";
    }
  });
  reader.readAsText(file);
});

render();
