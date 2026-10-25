const STORAGE_KEY = 'taskflow_tasks_v2';
const THEME_KEY = 'taskflow_theme';
const AUDIO_KEY = 'taskflow_audio_enabled';

// Application state
let tasks = [];
let currentFilter = 'all';
let categoryFilter = 'all';
let priorityFilter = 'all';
let searchQuery = '';
let sortBy = 'custom';
let soundEnabled = true;
let lastDeletedTask = null;
let draggedTaskId = null;

// DOM references
const taskForm = document.getElementById('taskForm');
const taskTitleInput = document.getElementById('taskTitleInput');
const taskCategorySelect = document.getElementById('taskCategorySelect');
const taskPrioritySelect = document.getElementById('taskPrioritySelect');
const taskDueDateInput = document.getElementById('taskDueDateInput');
const taskNotesInput = document.getElementById('taskNotesInput');
const toggleNotesBtn = document.getElementById('toggleNotesBtn');
const notesChevron = document.getElementById('notesChevron');

const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const emptyStateTitle = document.getElementById('emptyStateTitle');
const emptyStateSubtitle = document.getElementById('emptyStateSubtitle');
const emptyStateActionBtn = document.getElementById('emptyStateActionBtn');

const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const filterAllBtn = document.getElementById('filterAllBtn');
const filterActiveBtn = document.getElementById('filterActiveBtn');
const filterCompletedBtn = document.getElementById('filterCompletedBtn');
const categoryFilterSelect = document.getElementById('categoryFilterSelect');
const priorityFilterSelect = document.getElementById('priorityFilterSelect');
const sortBySelect = document.getElementById('sortBySelect');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const filteredResultsLabel = document.getElementById('filteredResultsLabel');

const tabCountAll = document.getElementById('tabCountAll');
const tabCountActive = document.getElementById('tabCountActive');
const tabCountCompleted = document.getElementById('tabCountCompleted');

const statTotal = document.getElementById('statTotal');
const statActive = document.getElementById('statActive');
const statCompleted = document.getElementById('statCompleted');
const statCompletedRatio = document.getElementById('statCompletedRatio');
const statOverdue = document.getElementById('statOverdue');
const productivityProgressBar = document.getElementById('productivityProgressBar');
const completionRateText = document.getElementById('completionRateText');
const momentumBadge = document.getElementById('momentumBadge');
const motivationalMessage = document.getElementById('motivationalMessage');

const editModal = document.getElementById('editModal');
const editTaskForm = document.getElementById('editTaskForm');
const editTaskId = document.getElementById('editTaskId');
const editTaskTitle = document.getElementById('editTaskTitle');
const editTaskCategory = document.getElementById('editTaskCategory');
const editTaskPriority = document.getElementById('editTaskPriority');
const editTaskDueDate = document.getElementById('editTaskDueDate');
const editTaskNotes = document.getElementById('editTaskNotes');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

const confirmModal = document.getElementById('confirmModal');
const confirmModalTitle = document.getElementById('confirmModalTitle');
const confirmModalMessage = document.getElementById('confirmModalMessage');
const cancelConfirmBtn = document.getElementById('cancelConfirmBtn');
const acceptConfirmBtn = document.getElementById('acceptConfirmBtn');
let onConfirmAction = null;

const themeToggleBtn = document.getElementById('themeToggleBtn');
const audioToggleBtn = document.getElementById('audioToggleBtn');
const soundOnIcon = document.getElementById('soundOnIcon');
const soundOffIcon = document.getElementById('soundOffIcon');
const loadSampleDataBtn = document.getElementById('loadSampleDataBtn');
const exportTasksBtn = document.getElementById('exportTasksBtn');
const importTasksInput = document.getElementById('importTasksInput');
const currentDateText = document.getElementById('currentDateText');
const toastContainer = document.getElementById('toastContainer');

// Local storage helpers
function saveToLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    showToast('Failed to save data. Local storage may be full.', 'error');
  }
}

function loadFromLocalStorage() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    tasks = rawData ? JSON.parse(rawData) : [];
    if (!Array.isArray(tasks)) tasks = [];
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    tasks = [];
  }
}

// Audio feedback via Web Audio API
let audioCtx = null;

function initAudioContext() {
  if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(type) {
  if (!soundEnabled) return;
  try {
    initAudioContext();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'create') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'complete') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'delete') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.15);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  } catch (err) {
    // Browsers require user interaction before playing audio
  }
}

// Toast alerts
function showToast(message, type = 'info', action = null) {
  const toast = document.createElement('div');
  toast.className = `toast-item flex items-center justify-between gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-xl border shadow-xl text-xs font-semibold backdrop-blur-md transition-all ${
    type === 'success'
      ? 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
      : type === 'error'
      ? 'bg-rose-50 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800'
      : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-800'
  }`;

  const messageSpan = document.createElement('span');
  messageSpan.className = 'break-words min-w-0 flex-1';
  messageSpan.innerHTML = message;
  toast.appendChild(messageSpan);

  if (action && action.label && action.callback) {
    const actionBtn = document.createElement('button');
    actionBtn.className = 'px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-[11px] font-bold shadow-sm transition-colors cursor-pointer flex-shrink-0';
    actionBtn.textContent = action.label;
    actionBtn.onclick = () => {
      action.callback();
      dismissToast(toast);
    };
    toast.appendChild(actionBtn);
  }

  toastContainer.appendChild(toast);

  setTimeout(() => {
    dismissToast(toast);
  }, 4500);
}

function dismissToast(toast) {
  if (!toast || !toast.parentNode) return;
  toast.classList.add('toast-leave');
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 250);
}

// CRUD operations
function createTask(taskData) {
  const newTask = {
    id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    title: taskData.title.trim(),
    category: taskData.category || 'Work',
    priority: taskData.priority || 'Medium',
    dueDate: taskData.dueDate || '',
    notes: taskData.notes ? taskData.notes.trim() : '',
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  tasks.unshift(newTask);
  saveToLocalStorage();
  renderApp();
  playSound('create');
  showToast(`Task "<strong>${escapeHtml(newTask.title)}</strong>" created!`, 'success');

  if (tasks.length === 1 && typeof confetti === 'function') {
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
  }
}

function getFilteredAndSortedTasks() {
  return tasks.filter(task => {
    if (currentFilter === 'active' && task.completed) return false;
    if (currentFilter === 'completed' && !task.completed) return false;

    if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchNotes = (task.notes || '').toLowerCase().includes(q);
      const matchCategory = task.category.toLowerCase().includes(q);
      if (!matchTitle && !matchNotes && !matchCategory) return false;
    }

    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'dueDate-asc':
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      case 'dueDate-desc':
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(b.dueDate) - new Date(a.dueDate);
      case 'priority-desc': {
        const priorityWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      case 'title-asc':
        return a.title.localeCompare(b.title);
      case 'created-desc':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'created-asc':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'custom':
      default:
        return 0;
    }
  });
}

function updateTask(id, updatedFields) {
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return;

  tasks[index] = {
    ...tasks[index],
    ...updatedFields,
    title: updatedFields.title ? updatedFields.title.trim() : tasks[index].title,
    notes: updatedFields.notes !== undefined ? updatedFields.notes.trim() : tasks[index].notes
  };

  saveToLocalStorage();
  renderApp();
  showToast('Task updated successfully!', 'success');
}

function toggleTaskComplete(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  task.completedAt = task.completed ? new Date().toISOString() : null;

  saveToLocalStorage();
  renderApp();

  if (task.completed) {
    playSound('complete');
    
    const allCompleted = tasks.length > 0 && tasks.every(t => t.completed);
    if (allCompleted && typeof confetti === 'function') {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      showToast('🎉 All tasks completed! Amazing productivity streak!', 'success');
    } else {
      if (task.priority === 'High' && typeof confetti === 'function') {
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
      }
      showToast(`Marked "<strong>${escapeHtml(task.title)}</strong>" as completed.`, 'success');
    }
  } else {
    showToast(`Marked "<strong>${escapeHtml(task.title)}</strong>" as active.`, 'info');
  }
}

function deleteTask(id) {
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return;

  const deletedTask = tasks[index];
  lastDeletedTask = { task: deletedTask, index: index };

  const cardEl = document.querySelector(`[data-task-id="${id}"]`);
  if (cardEl) {
    cardEl.classList.add('is-deleting');
  }

  playSound('delete');

  setTimeout(() => {
    tasks.splice(index, 1);
    saveToLocalStorage();
    renderApp();

    showToast(`Deleted "<strong>${escapeHtml(deletedTask.title)}</strong>"`, 'info', {
      label: 'Undo',
      callback: () => undoDeleteTask()
    });
  }, 220);
}

function undoDeleteTask() {
  if (!lastDeletedTask) return;
  tasks.splice(lastDeletedTask.index, 0, lastDeletedTask.task);
  saveToLocalStorage();
  renderApp();
  playSound('create');
  showToast(`Restored "<strong>${escapeHtml(lastDeletedTask.task.title)}</strong>"`, 'success');
  lastDeletedTask = null;
}

function clearCompletedTasks() {
  const completedCount = tasks.filter(t => t.completed).length;
  if (completedCount === 0) return;

  openConfirmModal(
    'Clear Completed Tasks?',
    `Are you sure you want to permanently delete all ${completedCount} completed task(s)? This action cannot be undone.`,
    () => {
      tasks = tasks.filter(t => !t.completed);
      saveToLocalStorage();
      renderApp();
      playSound('delete');
      showToast(`Cleared ${completedCount} completed task(s).`, 'success');
    }
  );
}

// Productivity metrics
function updateProductivityStats() {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const active = total - completed;

  const todayStr = getTodayDateString();
  const overdueCount = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < todayStr).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  statTotal.textContent = total;
  statActive.textContent = active;
  statCompleted.textContent = completed;
  statCompletedRatio.textContent = `${percentage}% done`;
  statOverdue.textContent = overdueCount;

  tabCountAll.textContent = total;
  tabCountActive.textContent = active;
  tabCountCompleted.textContent = completed;

  productivityProgressBar.style.width = `${percentage}%`;
  completionRateText.textContent = `${percentage}% Completed`;

  if (total === 0) {
    momentumBadge.textContent = "Let's get started!";
    momentumBadge.className = 'text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
    motivationalMessage.textContent = '"The secret of getting ahead is getting started." — Mark Twain';
  } else if (percentage === 100) {
    momentumBadge.textContent = '🔥 Peak Productivity!';
    momentumBadge.className = 'text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';
    motivationalMessage.textContent = '"Outstanding work! You crushed every single task on your list today!"';
  } else if (percentage >= 70) {
    momentumBadge.textContent = '⚡ Almost There!';
    momentumBadge.className = 'text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-950/70 text-brand-700 dark:text-brand-300 border border-brand-300 dark:border-brand-800';
    motivationalMessage.textContent = '"You are in the zone. Finish strong and celebrate the win!"';
  } else if (percentage >= 40) {
    momentumBadge.textContent = '🚀 Great Progress';
    momentumBadge.className = 'text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800';
    motivationalMessage.textContent = '"Small disciplines repeated with consistency every day lead to great achievements."';
  } else {
    momentumBadge.textContent = '🌱 Building Momentum';
    momentumBadge.className = 'text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800';
    motivationalMessage.textContent = '"Focus on being productive instead of busy." — Tim Ferriss';
  }

  clearCompletedBtn.disabled = completed === 0;
}

// Rendering
function renderTasks() {
  const filteredTasks = getFilteredAndSortedTasks();
  taskList.innerHTML = '';

  let statusText = `Showing ${currentFilter} tasks`;
  if (categoryFilter !== 'all') statusText += ` in ${categoryFilter}`;
  if (priorityFilter !== 'all') statusText += ` (${priorityFilter})`;
  if (searchQuery.trim()) statusText += ` matching "${escapeHtml(searchQuery)}"`;
  filteredResultsLabel.textContent = `${statusText} (${filteredTasks.length})`;

  if (filteredTasks.length === 0) {
    emptyState.classList.remove('hidden');
    emptyState.classList.add('flex');

    if (tasks.length === 0) {
      emptyStateTitle.textContent = 'Your task list is empty!';
      emptyStateSubtitle.textContent = 'Add your first task above, or load sample demo tasks to explore features.';
      emptyStateActionBtn.textContent = 'Load Demo Tasks';
      emptyStateActionBtn.onclick = seedSampleData;
    } else {
      emptyStateTitle.textContent = 'No matching tasks found';
      emptyStateSubtitle.textContent = 'Try adjusting your search query, status tabs, category, or priority filters.';
      emptyStateActionBtn.textContent = 'Reset Filters';
      emptyStateActionBtn.onclick = resetFilters;
    }
    return;
  } else {
    emptyState.classList.add('hidden');
    emptyState.classList.remove('flex');
  }

  filteredTasks.forEach(task => {
    const card = createTaskCardElement(task);
    taskList.appendChild(card);
  });
}

function createTaskCardElement(task) {
  const card = document.createElement('div');
  card.className = `task-card group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md ${
    task.completed ? 'is-completed' : ''
  }`;
  card.setAttribute('data-task-id', task.id);
  card.setAttribute('draggable', sortBy === 'custom' ? 'true' : 'false');

  if (sortBy === 'custom') {
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('dragenter', handleDragEnter);
    card.addEventListener('dragleave', handleDragLeave);
    card.addEventListener('drop', handleDrop);
    card.addEventListener('dragend', handleDragEnd);
  }

  const categoryInfo = getCategoryMeta(task.category);
  const priorityInfo = getPriorityMeta(task.priority);
  const dueDateInfo = formatDueDateBadge(task.dueDate);

  card.innerHTML = `
    <div class="flex items-start sm:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
      <div class="drag-handle text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 p-0.5 sm:p-1 cursor-grab active:cursor-grabbing flex-shrink-0" title="Drag to reorder">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
        </svg>
      </div>

      <div class="pt-0.5 sm:pt-0 flex-shrink-0">
        <input 
          type="checkbox" 
          aria-label="Toggle task completion"
          class="custom-checkbox" 
          ${task.completed ? 'checked' : ''}
        >
      </div>

      <div class="flex-1 min-w-0 space-y-1.5">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="task-title text-sm font-semibold text-slate-800 dark:text-slate-100 break-words leading-snug">
            ${escapeHtml(task.title)}
          </span>
        </div>

        <div class="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs">
          <span class="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 rounded-full font-medium ${categoryInfo.badgeClass}">
            ${categoryInfo.icon} ${escapeHtml(task.category)}
          </span>

          <span class="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full font-medium ${priorityInfo.badgeClass}">
            ${priorityInfo.icon} ${escapeHtml(task.priority)}
          </span>

          ${dueDateInfo ? `
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium ${dueDateInfo.badgeClass}">
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              ${escapeHtml(dueDateInfo.label)}
            </span>
          ` : ''}
        </div>

        ${task.notes ? `
          <p class="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800/80 mt-1 line-clamp-2 break-words">
            ${escapeHtml(task.notes)}
          </p>
        ` : ''}
      </div>
    </div>

    <div class="flex items-center gap-1 self-end sm:self-center flex-shrink-0 pt-1 sm:pt-0">
      <button 
        class="edit-btn p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Edit task"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>

      <button 
        class="delete-btn p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
        title="Delete task"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  `;

  const checkbox = card.querySelector('.custom-checkbox');
  checkbox.addEventListener('change', () => toggleTaskComplete(task.id));

  const editBtn = card.querySelector('.edit-btn');
  editBtn.addEventListener('click', () => openEditModal(task.id));

  const deleteBtn = card.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', () => deleteTask(task.id));

  return card;
}

function renderApp() {
  updateProductivityStats();
  renderTasks();
}

// Drag and drop event handlers
function handleDragStart(e) {
  draggedTaskId = this.getAttribute('data-task-id');
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedTaskId);
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
  e.preventDefault();
  this.classList.add('drag-over');
}

function handleDragLeave() {
  this.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  const targetTaskId = this.getAttribute('data-task-id');

  if (!draggedTaskId || draggedTaskId === targetTaskId) return;

  const fromIndex = tasks.findIndex(t => t.id === draggedTaskId);
  const toIndex = tasks.findIndex(t => t.id === targetTaskId);

  if (fromIndex !== -1 && toIndex !== -1) {
    const [movedTask] = tasks.splice(fromIndex, 1);
    tasks.splice(toIndex, 0, movedTask);
    saveToLocalStorage();
    renderApp();
    showToast('Task order updated!', 'info');
  }
}

function handleDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.task-card').forEach(card => card.classList.remove('drag-over'));
  draggedTaskId = null;
}

// Edit modal
function openEditModal(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  editTaskId.value = task.id;
  editTaskTitle.value = task.title;
  editTaskCategory.value = task.category;
  editTaskPriority.value = task.priority;
  editTaskDueDate.value = task.dueDate || '';
  editTaskNotes.value = task.notes || '';

  editModal.classList.remove('hidden');
  editTaskTitle.focus();
}

function closeEditModal() {
  editModal.classList.add('hidden');
  editTaskForm.reset();
}

editTaskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = editTaskId.value;
  const title = editTaskTitle.value.trim();
  if (!title) return;

  updateTask(id, {
    title,
    category: editTaskCategory.value,
    priority: editTaskPriority.value,
    dueDate: editTaskDueDate.value,
    notes: editTaskNotes.value
  });

  closeEditModal();
});

closeEditModalBtn.addEventListener('click', closeEditModal);
cancelEditBtn.addEventListener('click', closeEditModal);
editModal.addEventListener('click', (e) => {
  if (e.target === editModal) closeEditModal();
});

// Confirmation modal
function openConfirmModal(title, message, onConfirm) {
  confirmModalTitle.textContent = title;
  confirmModalMessage.textContent = message;
  onConfirmAction = onConfirm;
  confirmModal.classList.remove('hidden');
}

function closeConfirmModal() {
  confirmModal.classList.add('hidden');
  onConfirmAction = null;
}

cancelConfirmBtn.addEventListener('click', closeConfirmModal);
confirmModal.addEventListener('click', (e) => {
  if (e.target === confirmModal) closeConfirmModal();
});

acceptConfirmBtn.addEventListener('click', () => {
  if (typeof onConfirmAction === 'function') {
    onConfirmAction();
  }
  closeConfirmModal();
});

// Helpers & formatting
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDueDateBadge(dueDateStr) {
  if (!dueDateStr) return null;

  const todayStr = getTodayDateString();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  if (dueDateStr < todayStr) {
    return {
      label: 'Overdue (' + formatDateDisplay(dueDateStr) + ')',
      badgeClass: 'due-overdue'
    };
  } else if (dueDateStr === todayStr) {
    return {
      label: 'Due Today',
      badgeClass: 'due-today'
    };
  } else if (dueDateStr === tomorrowStr) {
    return {
      label: 'Due Tomorrow',
      badgeClass: 'due-upcoming'
    };
  } else {
    return {
      label: 'Due ' + formatDateDisplay(dueDateStr),
      badgeClass: 'due-upcoming'
    };
  }
}

function formatDateDisplay(dateStr) {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
}

function getCategoryMeta(cat) {
  switch (cat) {
    case 'Work':
      return { icon: '💼', badgeClass: 'badge-work' };
    case 'Personal':
      return { icon: '🏡', badgeClass: 'badge-personal' };
    case 'Study':
      return { icon: '📚', badgeClass: 'badge-study' };
    case 'Health':
      return { icon: '🏃', badgeClass: 'badge-health' };
    case 'Finance':
      return { icon: '💰', badgeClass: 'badge-finance' };
    default:
      return { icon: '📌', badgeClass: 'badge-work' };
  }
}

function getPriorityMeta(priority) {
  switch (priority) {
    case 'High':
      return { icon: '🔥', badgeClass: 'badge-priority-high' };
    case 'Medium':
      return { icon: '⚡', badgeClass: 'badge-priority-medium' };
    case 'Low':
      return { icon: '🌱', badgeClass: 'badge-priority-low' };
    default:
      return { icon: '⚡', badgeClass: 'badge-priority-medium' };
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function resetFilters() {
  currentFilter = 'all';
  categoryFilter = 'all';
  priorityFilter = 'all';
  searchQuery = '';
  sortBy = 'custom';

  searchInput.value = '';
  clearSearchBtn.classList.add('hidden');
  categoryFilterSelect.value = 'all';
  priorityFilterSelect.value = 'all';
  sortBySelect.value = 'custom';

  updateTabButtonStates();
  renderApp();
}

function updateTabButtonStates() {
  [filterAllBtn, filterActiveBtn, filterCompletedBtn].forEach(btn => {
    const filter = btn.getAttribute('data-filter');
    if (filter === currentFilter) {
      btn.classList.add('active', 'bg-white', 'dark:bg-slate-700', 'text-brand-600', 'dark:text-brand-300', 'shadow-sm');
      btn.classList.remove('text-slate-600', 'dark:text-slate-400');
      btn.setAttribute('aria-selected', 'true');
    } else {
      btn.classList.remove('active', 'bg-white', 'dark:bg-slate-700', 'text-brand-600', 'dark:text-brand-300', 'shadow-sm');
      btn.classList.add('text-slate-600', 'dark:text-slate-400');
      btn.setAttribute('aria-selected', 'false');
    }
  });
}

// Demo data
function seedSampleData() {
  const today = getTodayDateString();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 4);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  tasks = [
    {
      id: 'task_demo_1',
      title: 'Complete Dynamic Task Manager Internship Project',
      category: 'Work',
      priority: 'High',
      dueDate: today,
      notes: 'Verify all CRUD operations, localStorage persistence, and drag & drop reordering.',
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null
    },
    {
      id: 'task_demo_2',
      title: 'Review System Architecture & Code Design Patterns',
      category: 'Study',
      priority: 'High',
      dueDate: tomorrowStr,
      notes: 'Review clean code principles, modular JavaScript ES6+, and responsive CSS.',
      completed: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt: null
    },
    {
      id: 'task_demo_3',
      title: 'Weekly 5km Morning Cardio & Stretching',
      category: 'Health',
      priority: 'Medium',
      dueDate: yesterdayStr,
      notes: 'Keep heart rate steady in Zone 2 cardio.',
      completed: false,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      completedAt: null
    },
    {
      id: 'task_demo_4',
      title: 'Set Monthly Savings Budget & Investment Goals',
      category: 'Finance',
      priority: 'Medium',
      dueDate: nextWeekStr,
      notes: 'Allocate 20% to growth index funds and emergency savings.',
      completed: true,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      completedAt: new Date().toISOString()
    },
    {
      id: 'task_demo_5',
      title: 'Organize Workspace Desk & Clean Mechanical Keyboard',
      category: 'Personal',
      priority: 'Low',
      dueDate: '',
      notes: 'Declutter wires, wipe monitors, and set up ambient desk lighting.',
      completed: true,
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      completedAt: new Date().toISOString()
    }
  ];

  saveToLocalStorage();
  renderApp();
  playSound('create');
  showToast('5 Demo tasks loaded successfully!', 'success');
}

// Backup utilities
function exportTasks() {
  if (tasks.length === 0) {
    showToast('No tasks to export.', 'info');
    return;
  }
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tasks, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `taskflow_backup_${getTodayDateString()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Tasks backup exported successfully!', 'success');
}

function importTasks(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        tasks = imported;
        saveToLocalStorage();
        renderApp();
        showToast(`Successfully imported ${imported.length} tasks!`, 'success');
      } else {
        showToast('Invalid backup file format.', 'error');
      }
    } catch (err) {
      showToast('Error parsing JSON backup file.', 'error');
    }
  };
  reader.readAsText(file);
}

// Theme & preferences
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) {
    document.documentElement.classList.remove('dark');
    localStorage.setItem(THEME_KEY, 'light');
    showToast('Switched to Light mode', 'info');
  } else {
    document.documentElement.classList.add('dark');
    localStorage.setItem(THEME_KEY, 'dark');
    showToast('Switched to Dark mode', 'info');
  }
}

function initAudioSettings() {
  const savedAudio = localStorage.getItem(AUDIO_KEY);
  if (savedAudio !== null) {
    soundEnabled = savedAudio === 'true';
  }
  updateAudioIcon();
}

function toggleAudio() {
  soundEnabled = !soundEnabled;
  localStorage.setItem(AUDIO_KEY, soundEnabled);
  updateAudioIcon();
  showToast(soundEnabled ? 'Sound effects enabled' : 'Sound effects muted', 'info');
  if (soundEnabled) playSound('create');
}

function updateAudioIcon() {
  if (soundEnabled) {
    soundOnIcon.classList.remove('hidden');
    soundOffIcon.classList.add('hidden');
  } else {
    soundOnIcon.classList.add('hidden');
    soundOffIcon.classList.remove('hidden');
  }
}

function updateLiveDateBadge() {
  const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  currentDateText.textContent = new Date().toLocaleDateString(undefined, options);
}

// Event listeners
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = taskTitleInput.value.trim();
  if (!title) return;

  createTask({
    title,
    category: taskCategorySelect.value,
    priority: taskPrioritySelect.value,
    dueDate: taskDueDateInput.value,
    notes: taskNotesInput.value
  });

  taskTitleInput.value = '';
  taskNotesInput.value = '';
  taskDueDateInput.value = '';
  taskTitleInput.focus();
});

toggleNotesBtn.addEventListener('click', () => {
  const isHidden = taskNotesInput.classList.contains('hidden');
  if (isHidden) {
    taskNotesInput.classList.remove('hidden');
    notesChevron.textContent = '- Remove optional description/notes';
    taskNotesInput.focus();
  } else {
    taskNotesInput.classList.add('hidden');
    notesChevron.textContent = '+ Add optional description/notes';
    taskNotesInput.value = '';
  }
});

filterAllBtn.addEventListener('click', () => {
  currentFilter = 'all';
  updateTabButtonStates();
  renderApp();
});

filterActiveBtn.addEventListener('click', () => {
  currentFilter = 'active';
  updateTabButtonStates();
  renderApp();
});

filterCompletedBtn.addEventListener('click', () => {
  currentFilter = 'completed';
  updateTabButtonStates();
  renderApp();
});

categoryFilterSelect.addEventListener('change', (e) => {
  categoryFilter = e.target.value;
  renderApp();
});

priorityFilterSelect.addEventListener('change', (e) => {
  priorityFilter = e.target.value;
  renderApp();
});

sortBySelect.addEventListener('change', (e) => {
  sortBy = e.target.value;
  renderApp();
});

searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  if (searchQuery.length > 0) {
    clearSearchBtn.classList.remove('hidden');
  } else {
    clearSearchBtn.classList.add('hidden');
  }
  renderApp();
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  clearSearchBtn.classList.add('hidden');
  searchInput.focus();
  renderApp();
});

clearCompletedBtn.addEventListener('click', clearCompletedTasks);
loadSampleDataBtn.addEventListener('click', seedSampleData);
exportTasksBtn.addEventListener('click', exportTasks);

importTasksInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files[0]) {
    importTasks(e.target.files[0]);
    e.target.value = '';
  }
});


themeToggleBtn.addEventListener('click', toggleTheme);
audioToggleBtn.addEventListener('click', toggleAudio);

window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    searchInput.focus();
    searchInput.select();
  } else if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    searchInput.focus();
  }

  if (e.key.toLowerCase() === 'n' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    taskTitleInput.focus();
  }

  if (e.key === 'Escape') {
    if (!editModal.classList.contains('hidden')) closeEditModal();
    if (!confirmModal.classList.contains('hidden')) closeConfirmModal();
  }
});

function initApp() {
  initTheme();
  initAudioSettings();
  updateLiveDateBadge();
  loadFromLocalStorage();

  if (tasks.length === 0) {
    seedSampleData();
  } else {
    renderApp();
  }

  taskDueDateInput.min = getTodayDateString();
}

document.addEventListener('DOMContentLoaded', initApp);
