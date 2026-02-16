/**
 * MATH_BELGHIT Teacher Dashboard
 * Vanilla JavaScript - Mobile First - RTL Support
 */

// ==================== CONFIGURATION ====================
const CONFIG = {
    WORKER_BASE: 'https://long-mud-24f2.mmondeer346.workers.dev',
    PIN_STORAGE_KEY: 'teacher_pin',
    PIN_EXPIRY_KEY: 'teacher_pin_expiry',
    PIN_EXPIRY_HOURS: 8,
    DEBOUNCE_MS: 200
};

// ==================== STATE MANAGEMENT ====================
const state = {
    pin: null,
    allStudents: [],
    filteredStudents: [],
    currentFilter: 'all',
    currentSort: 'name',
    searchTerm: ''
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Debounce function for search input
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Format date to Arabic relative time
 */
function formatDate(isoString) {
    if (!isoString) return 'لم يحضر بعد';
    
    const date = new Date(isoString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
    
    // Fallback to locale date
    return date.toLocaleDateString('ar-DZ', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

/**
 * Get state badge HTML
 */
function getStateBadge(state) {
    const badges = {
        ok: '<span class="badge badge-ok">✅ نشط</span>',
        due_at_4: '<span class="badge badge-due">⚠️ مستحق</span>',
        suspended: '<span class="badge badge-suspended">🚫 موقوف</span>'
    };
    return badges[state] || badges.ok;
}

/**
 * Store PIN with expiry
 */
function storePIN(pin) {
    const expiryTime = Date.now() + (CONFIG.PIN_EXPIRY_HOURS * 60 * 60 * 1000);
    localStorage.setItem(CONFIG.PIN_STORAGE_KEY, pin);
    localStorage.setItem(CONFIG.PIN_EXPIRY_KEY, expiryTime.toString());
}

/**
 * Get stored PIN if not expired
 */
function getStoredPIN() {
    const pin = localStorage.getItem(CONFIG.PIN_STORAGE_KEY);
    const expiry = localStorage.getItem(CONFIG.PIN_EXPIRY_KEY);
    
    if (!pin || !expiry) return null;
    
    if (Date.now() > parseInt(expiry)) {
        clearPIN();
        return null;
    }
    
    return pin;
}

/**
 * Clear stored PIN
 */
function clearPIN() {
    localStorage.removeItem(CONFIG.PIN_STORAGE_KEY);
    localStorage.removeItem(CONFIG.PIN_EXPIRY_KEY);
    state.pin = null;
}

// ==================== API FUNCTIONS ====================

/**
 * Validate PIN with backend
 */
async function validatePIN(pin) {
    const response = await fetch(`${CONFIG.WORKER_BASE}/auth`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pin })
    });
    
    const data = await response.json();
    
    if (!response.ok || !data.ok) {
        throw new Error(data.error || 'PIN غير صحيح');
    }
    
    return true;
}

/**
 * Fetch dashboard data
 */
async function fetchDashboardData(pin) {
    const response = await fetch(`${CONFIG.WORKER_BASE}/students?pin=${pin}`);
    
    if (!response.ok) {
        if (response.status === 401) {
            clearPIN();
            showAuthSection();
            throw new Error('انتهت صلاحية الجلسة');
        }
        throw new Error('فشل تحميل البيانات');
    }
    
    const data = await response.json();
    
    if (!data.ok) {
        throw new Error(data.error || 'فشل تحميل البيانات');
    }
    
    return data;
}

// ==================== UI FUNCTIONS ====================

/**
 * Show auth section
 */
function showAuthSection() {
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('dashboardSection').style.display = 'none';
}

/**
 * Show dashboard section
 */
function showDashboardSection() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
}

/**
 * Show loading state
 */
function showLoading() {
    document.getElementById('loadingSkeleton').classList.add('show');
    document.getElementById('studentsTable').style.display = 'none';
    document.getElementById('studentCards').style.display = 'none';
    document.getElementById('emptyState').classList.remove('show');
    document.getElementById('errorBox').classList.remove('show');
}

/**
 * Hide loading state
 */
function hideLoading() {
    document.getElementById('loadingSkeleton').classList.remove('show');
    
    // Show appropriate view based on screen size
    if (window.innerWidth > 968) {
        document.getElementById('studentsTable').style.display = 'table';
    } else {
        document.getElementById('studentCards').style.display = 'block';
    }
}

/**
 * Show error
 */
function showError(message) {
    const errorBox = document.getElementById('errorBox');
    const errorMessage = document.getElementById('errorMessage');
    
    errorMessage.textContent = message;
    errorBox.classList.add('show');
    
    hideLoading();
}

/**
 * Hide error
 */
function hideError() {
    document.getElementById('errorBox').classList.remove('show');
}

/**
 * Show empty state
 */
function showEmptyState() {
    document.getElementById('emptyState').classList.add('show');
    document.getElementById('studentsTable').style.display = 'none';
    document.getElementById('studentCards').style.display = 'none';
}

/**
 * Update summary cards
 */
function updateSummary(summary) {
    document.getElementById('totalStudents').textContent = summary.totalStudents || 0;
    document.getElementById('todaySessions').textContent = summary.totalSessionsToday || 0;
    
    // Calculate active students (ok state)
    const activeCount = state.allStudents.filter(s => s.state === 'ok').length;
    document.getElementById('activeStudents').textContent = activeCount;
    document.getElementById('dueStudents').textContent = summary.dueStudents || 0;
    document.getElementById('suspendedStudents').textContent = summary.suspendedStudents || 0;
}

/**
 * Render students table (desktop)
 */
        function renderTable(students) {
    const tbody = document.getElementById('studentsTableBody');

    if (students.length === 0) {
        tbody.innerHTML = '';
        showEmptyState();
        return;
    }

    const rows = students.map(s => `
        <tr>
        <td style="font-weight:900;">${escapeHtml(s.fullName || '---')}</td>
        <td style="font-weight:900; font-size:16px;">${Number(s.sessionsInCycle || 0)}</td>
        <td>${escapeHtml(formatDate(s.lastAttendanceAt))}</td>
        <td>
            <button 
            class="filter-btn" 
            style="background:#111; color:#fff; border-color:#111;"
            data-reset-id="${escapeHtml(s.studentId)}">
            ♻️ Reset
            </button>
        </td>
        </tr>
    `).join('');

    tbody.innerHTML = rows;

    // attach reset clicks
    tbody.querySelectorAll('[data-reset-id]').forEach(btn => {
        btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-reset-id');
        resetStudentCounter(id);
        };
    });
    }

/**
 * Render student cards (mobile)
 */
function renderCards(students) {
    const container = document.getElementById('studentCards');
    
    if (students.length === 0) {
        container.innerHTML = '';
        showEmptyState();
        return;
    }
    
    const cards = students.map(student => `
        <div class="student-card">
            <div class="student-card-header">
                <div class="student-name">${student.fullName}</div>
                ${getStateBadge(student.state)}
            </div>
            <div class="student-details">
                <div class="detail-item">
                    <div class="detail-label">القسم</div>
                    <div class="detail-value">${student.class}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">الحصص</div>
                    <div class="detail-value">${student.sessionsInCycle}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">متبقي للدفع</div>
                    <div class="detail-value">${student.remainingToPay}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">متبقي للحد</div>
                    <div class="detail-value">${student.remainingToMax}</div>
                </div>
                <div class="detail-item" style="grid-column: 1 / -1;">
                    <div class="detail-label">آخر حضور</div>
                    <div class="detail-value">${formatDate(student.lastAttendanceAt)}</div>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = cards;
}

/**
 * Render students (both table and cards)
 */
function renderStudents() {
    const students = state.filteredStudents;
    
    hideLoading();
    hideError();
    
    renderTable(students);
    renderCards(students);
}

// ==================== FILTER & SORT FUNCTIONS ====================

/**
 * Filter students by state
 */
function filterByState(students, filter) {
    if (filter === 'all') return students;
    return students.filter(s => s.state === filter);
}

/**
 * Filter students by search term
 */
function filterBySearch(students, term) {
    if (!term) return students;
    
    const lowerTerm = term.toLowerCase();
    return students.filter(s => 
        s.fullName.toLowerCase().includes(lowerTerm) ||
        s.studentCode.toLowerCase().includes(lowerTerm)
    );
}

/**
 * Sort students
 */
function sortStudents(students, sortBy) {
    const sorted = [...students];
    
    switch (sortBy) {
        case 'name':
            sorted.sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
            break;
        case 'sessions':
            sorted.sort((a, b) => b.sessionsInCycle - a.sessionsInCycle);
            break;
        case 'lastAttendance':
            sorted.sort((a, b) => {
                if (!a.lastAttendanceAt) return 1;
                if (!b.lastAttendanceAt) return -1;
                return new Date(b.lastAttendanceAt) - new Date(a.lastAttendanceAt);
            });
            break;
    }
    
    return sorted;
}

/**
 * Apply all filters and sort
 */
function applyFiltersAndSort() {
    let filtered = filterByState(state.allStudents, state.currentFilter);
    filtered = filterBySearch(filtered, state.searchTerm);
    filtered = sortStudents(filtered, state.currentSort);
    
    state.filteredStudents = filtered;
    renderStudents();
}

// ==================== EVENT HANDLERS ====================

/**
 * Handle PIN form submit
 */
async function handlePINSubmit(e) {
    e.preventDefault();
    
    const pinInput = document.getElementById('pinInput');
    const pinError = document.getElementById('pinError');
    const submitBtn = document.getElementById('pinSubmitBtn');
    const pin = pinInput.value.trim();
    
    // Clear previous errors
    pinInput.classList.remove('error');
    pinError.classList.remove('show');
    
    // Validate format
    if (!/^[0-9]{4,6}$/.test(pin)) {
        pinInput.classList.add('error');
        pinError.textContent = 'يجب أن يكون رمز PIN من 4 إلى 6 أرقام';
        pinError.classList.add('show');
        return;
    }
    
    // Show loading
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    
    try {
        // Validate PIN with backend
        await validatePIN(pin);
        
        // Store PIN
        storePIN(pin);
        state.pin = pin;
        
        // Load dashboard
        showDashboardSection();
        await loadDashboard();
        
    } catch (error) {
        pinInput.classList.add('error');
        pinError.textContent = error.message;
        pinError.classList.add('show');
    } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    clearPIN();
    showAuthSection();
    
    // Reset form
    document.getElementById('pinForm').reset();
    document.getElementById('pinInput').classList.remove('error');
    document.getElementById('pinError').classList.remove('show');
}

/**
 * Handle refresh
 */
async function handleRefresh() {
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.disabled = true;
    
    try {
        await loadDashboard();
    } catch (error) {
        showError(error.message);
    } finally {
        refreshBtn.disabled = false;
    }
}

/**
 * Handle filter button click
 */
function handleFilterClick(e) {
    const filterBtn = e.target.closest('.filter-btn');
    if (!filterBtn) return;
    
    // Update active state
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    filterBtn.classList.add('active');
    
    // Apply filter
    state.currentFilter = filterBtn.dataset.filter;
    applyFiltersAndSort();
}

/**
 * Handle search input
 */
const handleSearch = debounce((e) => {
    state.searchTerm = e.target.value.trim();
    applyFiltersAndSort();
}, CONFIG.DEBOUNCE_MS);

/**
 * Handle sort change
 */
function handleSortChange(e) {
    state.currentSort = e.target.value;
    applyFiltersAndSort();
}

// ==================== MAIN FUNCTIONS ====================

/**
 * Load dashboard data
 */
async function loadDashboard() {
    showLoading();
    hideError();
    
    try {
        const data = await fetchDashboardData(state.pin);
        
        // Update state
        state.allStudents = data.students || [];
        state.filteredStudents = [...state.allStudents];
        
        // Update UI
        updateSummary(data.summary);
        applyFiltersAndSort();
        
    } catch (error) {
        showError(error.message);
        throw error;
    }
}

/**
 * Initialize math background animation
 */
function initMathBackground() {
    const mathBg = document.getElementById('mathBg');
    const symbols = ['∑', '∫', 'π', '√', '∞', 'α', 'β', 'θ', 'λ', 'μ', 'σ', 'Δ', '∂', '≈', '≠', '≤', '≥'];
    
    for (let i = 0; i < 30; i++) {
        const symbol = document.createElement('div');
        symbol.className = 'math-symbol';
        symbol.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        symbol.style.left = Math.random() * 100 + '%';
        symbol.style.top = Math.random() * 100 + '%';
        symbol.style.animationDelay = Math.random() * 15 + 's';
        symbol.style.fontSize = (Math.random() * 1.5 + 1.5) + 'rem';
        mathBg.appendChild(symbol);
    }
}

/**
 * Initialize dashboard
 */
async function initDashboard() {
    // Initialize math background
    initMathBackground();
    
    // Check for stored PIN
    const storedPIN = getStoredPIN();
    
    if (storedPIN) {
        state.pin = storedPIN;
        showDashboardSection();
        
        try {
            await loadDashboard();
        } catch (error) {
            // If loading fails with stored PIN, show auth
            showAuthSection();
        }
    } else {
        showAuthSection();
    }
    
    // Attach event listeners
    document.getElementById('pinForm').addEventListener('submit', handlePINSubmit);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('refreshBtn').addEventListener('click', handleRefresh);
    document.getElementById('retryBtn').addEventListener('click', handleRefresh);
    
    // Filter buttons
    document.querySelector('.filter-buttons').addEventListener('click', handleFilterClick);
    
    // Search input
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    // Sort select
    document.getElementById('sortSelect').addEventListener('change', handleSortChange);
    
    // Handle Enter key on PIN input
    document.getElementById('pinInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('pinForm').requestSubmit();
        }
    });
    
    // Handle window resize for responsive table/cards
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (state.filteredStudents.length > 0) {
                renderStudents();
            }
        }, 100);
    });
}

   async function resetStudentCounter(studentId){
    if (!confirm("هل تريد إعادة عداد الحصص لهذا الطالب؟ سيبدأ من 0 في دورة جديدة.")) return;

    try{
        const res = await fetch(`${CONFIG.WORKER_BASE}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: state.pin, studentId })
        });

        const data = await res.json();
        if(!res.ok || !data.ok) throw new Error(data.error || "فشل Reset");

        // ✅ بعد reset نعاود نحمّل الداشبورد
        await loadDashboard();

    }catch(err){
        alert(err.message);
    }
    }


        function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }
// ==================== INITIALIZE ====================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}

 

    