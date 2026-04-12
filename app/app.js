const STORAGE_KEY = "lets-do-mvp";

const defaultCategories = [
  { id: "cat-work", name: "工作", color: "#ff7a59", createdAt: "2026-04-12T00:00:00.000Z" },
  { id: "cat-study", name: "学习", color: "#ffb347", createdAt: "2026-04-12T00:00:00.000Z" },
  { id: "cat-life", name: "生活", color: "#5c8d89", createdAt: "2026-04-12T00:00:00.000Z" }
];

function createInitialState() {
  return {
    categories: defaultCategories,
    tasks: [
      {
        id: crypto.randomUUID(),
        title: "确认 MVP 首页信息结构",
        description: "把分类、任务列表和快速录入放在同一屏内完成。",
        categoryId: "cat-work",
        status: "todo",
        createdAt: new Date().toISOString()
      }
    ],
    selectedCategoryId: "all",
    showCompleted: false
  };
}

function loadState() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createInitialState();
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : defaultCategories,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      selectedCategoryId: parsed.selectedCategoryId || "all",
      showCompleted: Boolean(parsed.showCompleted)
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
  taskList: document.querySelector("#task-list"),
  taskTemplate: document.querySelector("#task-card-template"),
  selectedCategoryCaption: document.querySelector("#selected-category-caption"),
  showCompletedToggle: document.querySelector("#show-completed-toggle"),
  todoCount: document.querySelector("#todo-count"),
  completedCount: document.querySelector("#completed-count"),
  seedCategoriesButton: document.querySelector("#seed-categories-button")
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
  return state.tasks.filter((task) => {
    const matchesCategory = state.selectedCategoryId === "all" || task.categoryId === state.selectedCategoryId;
    const matchesStatus = state.showCompleted ? true : task.status !== "completed";
    return matchesCategory && matchesStatus;
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
  elements.showCompletedToggle.checked = state.showCompleted;

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
    emptyState.textContent = state.showCompleted
      ? "当前筛选条件下还没有任务。"
      : "还没有待处理任务，先在左侧创建一个新的。";
    elements.taskList.appendChild(emptyState);
    return;
  }

  tasks.forEach((task) => {
    const fragment = elements.taskTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".task-card");
    const checkbox = fragment.querySelector(".task-status-input");
    const title = fragment.querySelector(".task-title");
    const description = fragment.querySelector(".task-description");
    const meta = fragment.querySelector(".task-meta");
    const chip = fragment.querySelector(".task-category-chip");
    const category = getCategoryById(task.categoryId);

    card.classList.toggle("completed", task.status === "completed");
    checkbox.checked = task.status === "completed";
    checkbox.addEventListener("change", () => {
      setState((currentState) => ({
        ...currentState,
        tasks: currentState.tasks.map((currentTask) => {
          if (currentTask.id !== task.id) {
            return currentTask;
          }
          return {
            ...currentTask,
            status: currentTask.status === "completed" ? "todo" : "completed"
          };
        })
      }));
    });

    title.textContent = task.title;
    description.textContent = task.description || "";
    chip.textContent = category?.name || "未分类";
    chip.style.setProperty("--chip-color", category?.color || "#24160b");
    meta.textContent = task.status === "completed"
      ? `已完成 · 创建于 ${formatDateTime(task.createdAt)}`
      : `进行中 · 创建于 ${formatDateTime(task.createdAt)}`;

    elements.taskList.appendChild(fragment);
  });
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
        createdAt: new Date().toISOString()
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
        createdAt: new Date().toISOString()
      }
    ]
  }));

  elements.taskForm.reset();
  elements.taskCategorySelect.value = categoryId;
});

elements.showCompletedToggle.addEventListener("change", (event) => {
  const { checked } = event.target;
  setState((currentState) => ({ ...currentState, showCompleted: checked }));
});

elements.seedCategoriesButton.addEventListener("click", () => {
  setState((currentState) => ({
    ...currentState,
    categories: defaultCategories
  }));
});

render();
