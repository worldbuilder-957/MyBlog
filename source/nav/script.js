// #region 1. 数据云同步配置=========================
// 使用网站：JSONbin
const BIN_CONFIG = {
    // 补充数据处：binID and url.
    binId: '695f5812ae596e708fccfb72',
    url: 'https://api.jsonbin.io/v3/b/'
};

// 获取 Key 的逻辑:第一次进入网站时弹窗输入，之后储存在本地缓存中
function getApiKey() {
    let key = localStorage.getItem('jsonbin_key');
    if (!key) {
        key = prompt("请输入 JSONBin API Key 以开启云同步：");
        if (key) localStorage.setItem('jsonbin_key', key);
    }
    return key;
}

// 1.1 从云端拉取数据 (读档)
async function loadFromCloud() {
    console.log('正在从云端同步数据...');
    try {
        const response = await fetch(`${BIN_CONFIG.url}${BIN_CONFIG.binId}/latest`, {
            method: 'GET',
            headers: {
                'X-Master-Key': getApiKey()
            }
        });
        
        if (!response.ok) throw new Error('云端连接失败');
        
        const result = await response.json();
        const cloudData = result.record; // JSONBin 的数据包裹在 record 里

        // 覆盖本地数据
        if (cloudData.myRichTodos) {
            localStorage.setItem('myRichTodos', JSON.stringify(cloudData.myRichTodos));
        }
        if (cloudData.calendarEvents) {
            localStorage.setItem('calendarEvents', JSON.stringify(cloudData.calendarEvents));
        }
        
        // 同步搜索引擎偏好
        if (cloudData.preferredEngine) {
            if (typeof selectEngine === 'function') {
                selectEngine(cloudData.preferredEngine);
            }
        }
        
        // 刷新页面显示
        renderTodos();
        refreshCalendarData();
        alert('☁️ 云端数据同步成功！');
        
    } catch (error) {
        console.error('同步失败:', error);
        alert('❌ 同步失败，请检查网络或配置');
    }
}

// 1.2 推送到云端 (存档)
async function saveToCloud() {
    console.log('正在保存到云端...');
    
    // 收集所有要存的数据：待办数据、日历数据和搜索引擎偏好
    const payload = {
        myRichTodos: JSON.parse(localStorage.getItem('myRichTodos') || '[]'),
        calendarEvents: JSON.parse(localStorage.getItem('calendarEvents') || '[]'),
        preferredEngine: localStorage.getItem('preferredEngine') || 'google'
    };

    try {
        const response = await fetch(`${BIN_CONFIG.url}${BIN_CONFIG.binId}`, {
            method: 'PUT', // 更新模式
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': getApiKey()
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('保存失败');
        console.log('✅ 云端保存成功');
        
    } catch (error) {
        console.error('保存失败:', error);
    }
}
// #endregion =================================================

// #region 2. 时钟功能模块=======================================================
function updateTime() {
    const now = new Date();
    document.getElementById('clock').innerText = now.toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute:'2-digit',second:"2-digit"});
    document.getElementById('date').innerText = now.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});
}
setInterval(updateTime, 1000);
updateTime();
// #endregion =================================================================

// #region 3. 日历功能模块=======================================================
// 功能：用于显示当前学期周数和全年周数，实现多时期同步显示
function updateCalendar() {
    const now = new Date();
    
    // ================= 配置区域：请务必修改这里的日期 =================
    // 逻辑：代码会从上往下找，看今天落在哪个区间里
    // 技巧：前一个的 end 最好是后一个 start 的前一天，保证时间连续
    const periods = [
        { name: 'Spring', start: '2026-03-02', end: '2026-07-06', type: 'term' }, 
        { name: 'SummerHoliday', start: '2025-07-07', end: '2025-09-04', type: 'vacation' },
        { name: 'Fall', start: '2025-09-05', end: '2026-01-25', type: 'term' },
        { name: 'WinterHoliday', start: '2026-01-26', end: '2026-03-01', type: 'vacation' }
    ];
    // ==============================================================
    const year = now.getFullYear();
    
    // --- 1. 更新右上角：全年周数 ---
    const startOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (now - startOfYear) / 86400000;
    const weekOfYear = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    
    // 2.写入新ID：corner-year-week
    document.getElementById('corner-year-week').innerText = `${year} W${weekOfYear}`;

    // 3. 微观系统：计算当前时期周数 (核心逻辑)
    let currentPeriod = null;
    let periodWeek = 0;

    // 遍历上面的清单，找今天在哪
    for (let period of periods) {
        const sDate = new Date(period.start);
        const eDate = new Date(period.end);
        // 把时间都归零，只比日期，防止有时差bug
        sDate.setHours(0,0,0,0);
        eDate.setHours(23,59,59,999);
        now.setHours(0,0,0,0);

        if (now >= sDate && now <= eDate) {
            currentPeriod = period;
            // 计算是该时期的第几天
            const diffTime = Math.abs(now - sDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1是因为第一天算第1天
            // 计算是第几周
            periodWeek = Math.ceil(diffDays / 7);
            break; // 找到了就停止寻找
        }
    }

    // 4. 更新右下角：学期周数 

    for (let period of periods) {
        const sDate = new Date(period.start);    //获取开始日期
        const eDate = new Date(period.end);      //获取结束日期
        sDate.setHours(0,0,0,0);                 //将开始日期的时间部分归零
        eDate.setHours(23,59,59,999);            //将结束日期的时间部分设为当天最后一刻
        now.setHours(0,0,0,0);                   //将当前日期的时间部分归零

        if (now >= sDate && now <= eDate) {
            currentPeriod = period;

            //将开学日期强制回推至那一周的周一
            const day = sDate.getDay();
            const dayAdjusted = day === 0 ? 7 : day;
            sDate.setDate(sDate.getDate() - (dayAdjusted - 1));

            const diffTime = Math.abs(now - sDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            periodWeek = Math.ceil(diffDays / 7);
            break;
        }
    }

    // 写入新ID：corner-school-week
    const schoolWeekEl = document.getElementById('corner-school-week');
    if (currentPeriod) {
        // 显示格式：25Fall W12
        schoolWeekEl.innerText = `${currentPeriod.name} W${periodWeek}`;
    } else {
        schoolWeekEl.innerText = "No Term";
    }
}

updateCalendar();
setInterval(updateCalendar, 60 * 60 * 1000);
// #endregion =================================================================

// #region 4. 待办任务事项======================================================
// 该模块实现一个待办事项系统，支持标题、日期、地点、标签等多种属性
const todoListEl = document.getElementById('todoList');
const modal = document.getElementById('taskModal');
let currentTodoId = null; // 新增：用于记录当前编辑的任务ID
let currentEditingTags = []; // 新增：用于暂存编辑框中的标签
let hideCompleted = localStorage.getItem('hideCompleted') === 'true'; // 读取隐藏状态

// 读取数据：如果没有旧数据，初始化一个包含元数据的示例
let todos = JSON.parse(localStorage.getItem('myRichTodos')) || [
    { id: 1, text: '完成指挥室搭建', date: '2025-12-31', loc: '宿舍', tags: ['Dev', '紧急'], done: false }
];

// --- A. 渲染核心 ---
function renderTodos(filterText = '') {
    todoListEl.innerHTML = '';
    
    // 过滤逻辑：搜索 标题 或 标签，且根据设置隐藏已完成
    const filtered = todos.filter(t => 
        (t.text.toLowerCase().includes(filterText.toLowerCase()) || 
        t.tags.some(tag => tag.toLowerCase().includes(filterText.toLowerCase()))) &&
        (!hideCompleted || !t.done)
    );

    filtered.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'todo-item';
        
        // 生成标签 HTML
        const tagsHtml = todo.tags.map(tag => 
            `<span class="tag" data-name="${tag}">${tag}</span>`
        ).join('');

        // 生成日期和地点的 HTML (如果有的话)
        let metaHtml = '';
        if (todo.date || todo.loc) {
            metaHtml = `<div class="todo-meta">`;
            if (todo.date) metaHtml += `<span class="meta-tag"><i class="ri-calendar-line"></i> ${todo.date.slice(5)}</span>`; // 只显示月-日
            if (todo.loc)  metaHtml += `<span class="meta-tag"><i class="ri-map-pin-line"></i> ${todo.loc}</span>`;
            // 显示重复图标
            if (todo.repeat) {
                metaHtml += `<span class="meta-tag" title="循环任务"><i class="ri-loop-right-line"></i></span>`;
            }
            metaHtml += `</div>`;
        }

        li.innerHTML = `
            <div class="todo-header">
                <input type="checkbox" ${todo.done ? 'checked' : ''} onclick="toggleTodo(${todo.id})">
                <span class="todo-text ${todo.done ? 'done' : ''}" onclick="openTaskModal(${todo.id})" style="cursor:pointer" title="点击编辑">${todo.text}</span>
                <i class="ri-close-circle-line" style="color:var(--text-sub); cursor:pointer; margin-left:auto;" onclick="deleteTodo(${todo.id})"></i>
            </div>
            ${metaHtml}
            <div class="tags-row">${tagsHtml}</div>
        `;
        todoListEl.appendChild(li);
    });
    
    updateToggleIcon(); // 确保图标状态正确
}

// 🆕 新增：计算下一个日期的辅助函数
function calculateNextDate(baseDate, repeat, intervalVal) {
    const date = new Date(baseDate);
    const interval = parseInt(intervalVal) || 1;
    
    switch (repeat) {
        case 'daily':
            date.setDate(date.getDate() + 1);
            break;
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'workweek':
            // 简单逻辑：如果是周五+3，周六+2，其他+1
            const day = date.getDay();
            if (day === 5) date.setDate(date.getDate() + 3);
            else if (day === 6) date.setDate(date.getDate() + 2);
            else date.setDate(date.getDate() + 1);
            break;
        case 'custom':
            date.setDate(date.getDate() + interval);
            break;
    }
    return date;
}

// --- B. 数据操作 ---
function saveTask() {
    const text = document.getElementById('taskInput').value;
    const date = document.getElementById('taskDate').value;
    const loc = document.getElementById('taskLoc').value;
    const repeat = document.getElementById('taskRepeat').value;
    const customInterval = document.getElementById('taskCustomInterval').value;
    const customEndDate = document.getElementById('taskCustomEndDate').value;
    
    if (!text.trim()) return alert("任务内容不能为空！");
    
    const tags = [...currentEditingTags]; // 使用当前编辑的标签数组

    if (currentTodoId) {
        // 编辑模式：更新现有任务
        const todo = todos.find(t => t.id === currentTodoId);
        if (todo) {
            todo.text = text;
            todo.date = date;
            todo.loc = loc;
            todo.tags = tags;
            todo.repeat = repeat;
            todo.customInterval = customInterval;
            todo.customEndDate = customEndDate;
        }
    } else {
        // 新增模式：创建新任务
        // 🆕 修改：如果设置了重复且有截止日期，则批量生成
        if (repeat && customEndDate && date) {
            let currentDate = new Date(date + 'T00:00:00'); // 确保本地时间
            const endDate = new Date(customEndDate + 'T00:00:00');
            let count = 0;
            const MAX_TASKS = 365; // 防止死循环

            // 批量生成列表 (先收集，再反向插入，保证最早的在最上面)
            const batchTodos = [];

            while (currentDate <= endDate && count < MAX_TASKS) {
                // 格式化日期 YYYY-MM-DD
                const y = currentDate.getFullYear();
                const m = String(currentDate.getMonth() + 1).padStart(2, '0');
                const d = String(currentDate.getDate()).padStart(2, '0');
                const dateStr = `${y}-${m}-${d}`;

                const newTodo = {
                    id: Date.now() + count, // 确保ID唯一
                    text: text,
                    date: dateStr,
                    loc: loc,
                    tags: tags,
                    done: false,
                    repeat: '', // ⚠️ 批量生成后，单条任务不再标记为重复，避免完成时再次生成
                    customInterval: '',
                    customEndDate: ''
                };
                batchTodos.push(newTodo);

                // 计算下一个日期
                currentDate = calculateNextDate(currentDate, repeat, customInterval);
                count++;
            }
            
            // 倒序插入，这样最早日期的任务会在列表最上面 (因为是 unshift)
            for (let i = batchTodos.length - 1; i >= 0; i--) {
                todos.unshift(batchTodos[i]);
            }

            if (count >= MAX_TASKS) alert('为防止卡顿，仅生成了前 365 个重复任务');
        } else {
            // 原有逻辑：单个创建 (无限重复或无重复)
            const newTodo = {
                id: Date.now(),
                text: text,
                date: date,
                loc: loc,
                tags: tags,
                done: false,
                repeat: repeat,
                customInterval: customInterval,
                customEndDate: customEndDate
            };
            todos.unshift(newTodo);
        }
    }

    saveAndRender();
    closeTaskModal();
}

function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        const wasDone = todo.done;
        todo.done = !todo.done;
        
        // 如果是标记为完成，且有重复规则，则生成下一个任务
        if (!wasDone && todo.done && todo.repeat && todo.date) {
            createNextRecurringTask(todo);
        }
        
        saveAndRender();
    }
}

// 生成下一个重复任务
function createNextRecurringTask(originalTodo) {
    const date = new Date(originalTodo.date);
    // 简单的日期计算逻辑
    switch (originalTodo.repeat) {
        case 'daily':
            date.setDate(date.getDate() + 1);
            break;
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'workweek':
            const day = date.getDay();
            // 周五(5) -> 周一(1) (+3天), 周六(6) -> 周一(1) (+2天), 其他 +1天
            if (day === 5) date.setDate(date.getDate() + 3);
            else if (day === 6) date.setDate(date.getDate() + 2);
            else date.setDate(date.getDate() + 1);
            break;
        case 'custom':
            const interval = parseInt(originalTodo.customInterval) || 1;
            date.setDate(date.getDate() + interval);
            break;
    }

    // 格式化回 YYYY-MM-DD
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const nextDateStr = `${y}-${m}-${d}`;

    // 检查是否超过截止日期
    if (originalTodo.customEndDate && nextDateStr > originalTodo.customEndDate) {
        return; // 超过截止日期，不再生成
    }

    // 创建新任务
    const newTodo = {
        ...originalTodo,
        id: Date.now(), // 新ID
        date: nextDateStr,
        done: false // 新任务未完成
    };
    
    // 插入到列表顶部
    todos.unshift(newTodo);
}

function deleteTodo(id) {
    if(confirm('确定删除吗？')) {
        todos = todos.filter(t => t.id !== id);
        saveAndRender();
    }
}

function saveAndRender() {
    localStorage.setItem('myRichTodos', JSON.stringify(todos));
    renderTodos(document.getElementById('todoSearch').value);
    saveToCloud();
}

// 搜索监听
function filterTodos() {
    const query = document.getElementById('todoSearch').value;
    renderTodos(query);
}

// 切换显示/隐藏已完成
function toggleHideCompleted() {
    hideCompleted = !hideCompleted;
    localStorage.setItem('hideCompleted', hideCompleted);
    renderTodos(document.getElementById('todoSearch').value);
}

function updateToggleIcon() {
    const btnIcon = document.querySelector('#toggleCompletedBtn i');
    if (btnIcon) btnIcon.className = hideCompleted ? 'ri-eye-off-line' : 'ri-eye-line';
}

// --- C. 弹窗控制 ---
function openTaskModal(id = null) {
    currentTodoId = id;
    const modal = document.getElementById('taskModal');
    const titleEl = modal.querySelector('h3');
    const btnEl = modal.querySelector('.btn.primary');
    const tagInput = document.getElementById('tagInput');
    const repeatSelect = document.getElementById('taskRepeat');
    const customGroup = document.getElementById('customIntervalGroup');
    const customEndDateInput = document.getElementById('taskCustomEndDate');

    if (id) {
        // 编辑模式：填充数据
        const todo = todos.find(t => t.id === id);
        if (todo) {
            document.getElementById('taskInput').value = todo.text;
            document.getElementById('taskDate').value = todo.date || '';
            document.getElementById('taskLoc').value = todo.loc || '';
            
            repeatSelect.value = todo.repeat || '';
            document.getElementById('taskCustomInterval').value = todo.customInterval || 1;
            if(customEndDateInput) customEndDateInput.value = todo.customEndDate || '';
            
            currentEditingTags = [...todo.tags]; // 复制标签数据
            if(tagInput) tagInput.value = '';
            
            if(titleEl) titleEl.innerHTML = '<i class="ri-edit-circle-line"></i> 编辑任务';
            if(btnEl) btnEl.innerText = '保存修改';
        }
    } else {
        // 新增模式：清空表单
        document.getElementById('taskInput').value = '';
        document.getElementById('taskDate').value = '';
        document.getElementById('taskLoc').value = '';
        repeatSelect.value = '';
        document.getElementById('taskCustomInterval').value = 1;
        if(customEndDateInput) customEndDateInput.value = '';
        currentEditingTags = []; // 清空标签
        if(tagInput) tagInput.value = '';
        
        if(titleEl) titleEl.innerHTML = '<i class="ri-edit-circle-line"></i> 新建任务';
        if(btnEl) btnEl.innerText = '创建';
    }
    
    // 触发一次显示状态更新
    toggleCustomInterval();
    renderTagChips(); // 渲染标签胶囊
    modal.showModal();
}
function closeTaskModal() { modal.close(); }

// 切换自定义间隔输入框显示
function toggleCustomInterval() {
    const repeatVal = document.getElementById('taskRepeat').value;
    const group = document.getElementById('customIntervalGroup');
    const endGroup = document.getElementById('customEndDateGroup');
    if (group) {
        group.style.display = (repeatVal === 'custom') ? 'flex' : 'none';
    }
    if (endGroup) {
        endGroup.style.display = (repeatVal !== '') ? 'flex' : 'none';
    }
}

    // #region --- 标签输入系统逻辑 ---

    // 预设一组好看的颜色
    const TAG_PALETTE = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];

    // 根据字符串生成固定颜色
    function getTagColor(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash += str.charCodeAt(i);
        return TAG_PALETTE[hash % TAG_PALETTE.length];
    }

    // 渲染标签胶囊
    function renderTagChips() {
        const container = document.getElementById('tagChipsContainer');
        if (!container) return;
        container.innerHTML = '';

        currentEditingTags.forEach((tag, index) => {
            const chip = document.createElement('div');
            chip.className = 'tag-chip-edit';
            chip.style.backgroundColor = getTagColor(tag);
            chip.innerHTML = `
                <span>${tag}</span>
                <div class="tag-remove" onclick="removeTag(${index}, event)">
                    <i class="ri-close-line"></i>
                </div>
            `;
            container.appendChild(chip);
        });
    }

    // 添加标签
    function addTag(tagName) {
        const tag = tagName.trim();
        if (tag && !currentEditingTags.includes(tag)) {
            currentEditingTags.push(tag);
            renderTagChips();
        }
        document.getElementById('tagInput').value = '';
        document.getElementById('tagDropdown').style.display = 'none';
    }

    // 移除标签
    function removeTag(index, e) {
        if(e) e.stopPropagation(); // 防止触发输入框聚焦
        currentEditingTags.splice(index, 1);
        renderTagChips();
    }

    // 初始化标签输入监听
    function initTagInputSystem() {
        const input = document.getElementById('tagInput');
        const dropdown = document.getElementById('tagDropdown');
        
        if (!input || !dropdown) return;

        // 1. 监听输入：显示联想
        input.addEventListener('input', (e) => {
            const val = e.target.value.trim().toLowerCase();
            if (!val) {
                dropdown.style.display = 'none';
                return;
            }

            // 收集所有已存在的标签 (去重)
            const allTags = new Set();
            todos.forEach(t => t.tags.forEach(tag => allTags.add(tag)));
            
            // 过滤：匹配输入 且 不在当前已选列表中
            const matches = Array.from(allTags).filter(t => 
                t.toLowerCase().includes(val) && !currentEditingTags.includes(t)
            );

            if (matches.length > 0) {
                dropdown.innerHTML = matches.map(t => 
                    `<div class="tag-option" onclick="addTag('${t}')">${t}</div>`
                ).join('');
                dropdown.style.display = 'block';
            } else {
                dropdown.style.display = 'none';
            }
        });

        // 2. 监听回车：创建新标签
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addTag(input.value);
            }
            // Backspace 删除最后一个标签 (可选体验优化)
            if (e.key === 'Backspace' && input.value === '' && currentEditingTags.length > 0) {
                removeTag(currentEditingTags.length - 1);
            }
        });

        // 3. 点击外部关闭下拉
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.tag-input-wrapper') && !e.target.closest('.tag-dropdown')) {
                dropdown.style.display = 'none';
            }
        });
    }

    // 初始化
    renderTodos();
    initTagInputSystem(); // 启动标签系统
    // #endregion ================================================================= 
// #endregion =================================================================

// #region 5. 天气温度功能==============================================
// 该模块通过API接入和风天气，获取珠海当前天气与温度信息，并更新页面显示
async function fetchWeather() {
    const apiKey = '4dce09f66f4c46c1a5d5f631f019290e'; // 这里填和风天气的 apiKey
    const locationID = '101280701'; // 珠海的ID
    
    // API地址
    const url = `https://m963ywf52k.re.qweatherapi.com/v7/weather/now?location=${locationID}&key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.code === '200') {
            const now = data.now;
            
            // 1. 更新温度
            document.getElementById('weather-temp').innerText = now.temp + '°';
            
            // 2. 更新文字 (比如 "晴"、"多云")
            document.getElementById('weather-text').innerText = now.text;

            // 3. 更新图标 (简单的映射逻辑)
            // 你可以根据 needs 扩充这个列表
            const iconEl = document.getElementById('weather-icon');
            const text = now.text;
            
            // 先移除旧图标类名，保留基础类名
            iconEl.className = 'weather-icon'; 
            
            if (text.includes('晴')) {
                iconEl.classList.add('ri-sun-line');
            } else if (text.includes('云') || text.includes('阴')) {
                iconEl.classList.add('ri-cloudy-line');
            } else if (text.includes('雨')) {
                iconEl.classList.add('ri-rainy-line');
            } else if (text.includes('雷')) {
                iconEl.classList.add('ri-thunderstorms-line');
            } else {
                iconEl.classList.add('ri-sun-cloudy-line'); // 默认图标
            }
        } else {
            console.error('天气API报错:', data.code);
        }
    } catch (error) {
        console.error('无法获取天气:', error);
    }
}

// 页面加载后立即获取一次，之后每30分钟刷新一次
fetchWeather();
setInterval(fetchWeather, 30 * 60 * 1000);

// 在 worldbuilder957.com/nav/index.html 中
if ('serviceWorker' in navigator) {
  // 注意这里的 ./sw.js，表示加载当前目录下的脚本
  navigator.serviceWorker.register('./sw.js')
    .then(reg => console.log('子目录 PWA 注册成功', reg))
    .catch(err => console.log('失败', err));
}
// #endregion =================================================================

// #region 6. PWA 安装提示===========================================================
  let deferredPrompt;                                       // 用来存浏览器的“安装票据”
  const installBtn = document.getElementById('install-btn');

  // 1. 监听浏览器的“可安装”事件
  window.addEventListener('beforeinstallprompt', (e) => {
    // 阻止浏览器默认的（可能不会出现的）弹窗
    e.preventDefault();
    // 把事件存起来，等会儿用户点击按钮时再用
    deferredPrompt = e;

  // === 新增：检测设备类型 ===
    // 检查 UserAgent 字符串里是否包含 "Mobile" 或 "Android" 等关键词
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // 只有当它是移动设备时，才显示按钮
    if (isMobile) {
        installBtn.style.display = 'block';
        console.log('检测到移动设备，显示安装按钮');
    } else {
        installBtn.style.display = 'none';
        console.log('检测到桌面端，隐藏安装按钮');
    }
    // ==================================
  });

  // 2. 监听按钮点击
  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      // 拿出刚才存的票据，手动触发弹窗
      deferredPrompt.prompt();
      
      // 等待用户选择（是安装还是取消）
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`用户选择结果: ${outcome}`);
      
      // 票据用完了，扔掉
      deferredPrompt = null;
      // 既然点过了，就把按钮再藏起来
      installBtn.style.display = 'none';
    }
  });

  // 3. (可选) 如果APP已经成功安装了，监听这个事件来隐藏按钮
  window.addEventListener('appinstalled', () => {
    installBtn.style.display = 'none';
    deferredPrompt = null;
    console.log('PWA 已安装');
  });

  navigator.serviceWorker.register('/nav/sw.js', { scope: '/nav/' })
// #endregion ================================================================= 

// #region 7. 股票模块 (新浪静态图版) =========================
function changeStock(code, btnElement) {
    const img = document.getElementById('stock-image');
    
    // 1. 确定图片源 URL
    let url = '';
    if (code.startsWith('usr_')) {
        // 美股接口：https://image.sinajs.cn/newchart/us/min/代码.gif
        url = `https://image.sinajs.cn/newchart/us/min/${code.replace('usr_', '')}.gif`;
    } else {
        // A股接口：https://image.sinajs.cn/newchart/min/n/代码.gif
        url = `https://image.sinajs.cn/newchart/min/n/${code}.gif`;
    }
    
    // 2. 切换图片 (加个时间戳防止浏览器缓存旧图)
    img.src = `${url}?t=${new Date().getTime()}`;

    // 3. 切换按钮样式 (高亮当前点击的)
    // 先移除所有按钮的 active 类
    const buttons = document.querySelectorAll('.stock-btn');
    buttons.forEach(b => b.classList.remove('active'));
    // 给当前按钮加上 active 类
    btnElement.classList.add('active');
}

// (可选) 自动刷新：每分钟刷新一次图片
setInterval(() => {
    const activeBtn = document.querySelector('.stock-btn.active');
    if(activeBtn) activeBtn.click(); // 模拟点击当前按钮来刷新
}, 60000);

// #endregion ==================================

// #region 9. 日历系统逻辑 =========================

let calendarInstance = null; // 保存日历实例
let currentEventId = null; // 当前编辑的事件ID
let currentEventStart = null; // 当前编辑事件的开始时间 (用于区分重复事件的具体实例)

// --- 🎨 新增：颜色分类配置 ---
const EVENT_COLORS = [
    { name: '工作', value: '#d9f3fd', textColor: '#0c4a6e' }, // 浅蓝背景 -> 深蓝文字
    { name: '生活', value: '#d9f5d6', textColor: '#14532d' }, // 浅绿背景 -> 深绿文字
    { name: '重要', value: '#ea6363e7', textColor: '#7f1d1d' }, // 浅红背景 -> 深红文字
    { name: '学习', value: '#f8def8', textColor: '#581c87' }  // 浅紫背景 -> 深紫文字
];

// 辅助：注入颜色选择器 UI (自动插在"备注"前面)
function injectColorPicker() {
    if (document.getElementById('eventColorPicker')) return;

    const descEl = document.getElementById('eventDescription');
    if (!descEl) return;
    
    // 找到 description 的父容器 (form-group)，插在它前面
    const targetContainer = descEl.closest('.form-group') || descEl.parentNode;
    
    const container = document.createElement('div');
    container.id = 'eventColorPicker';
    container.className = 'form-group';
    
    const label = document.createElement('label');
    label.innerText = '颜色标记';
    container.appendChild(label);
    
    const swatches = document.createElement('div');
    swatches.style.display = 'flex';
    swatches.style.gap = '12px';
    swatches.style.marginTop = '5px';
    
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.id = 'eventColorInput';
    container.appendChild(hiddenInput);

    EVENT_COLORS.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.setAttribute('data-value', color.value);
        swatch.style.width = '24px';
        swatch.style.height = '24px';
        swatch.style.borderRadius = '50%';
        swatch.style.backgroundColor = color.value;
        swatch.style.cursor = 'pointer';
        swatch.style.border = '2px solid transparent';
        swatch.style.transition = 'transform 0.2s';
        swatch.title = color.name;
        
        swatch.onclick = () => selectColor(color.value);
        
        swatches.appendChild(swatch);
    });
    
    container.appendChild(swatches);
    targetContainer.parentNode.insertBefore(container, targetContainer);
}

// 辅助：选中颜色逻辑
function selectColor(value) {
    const input = document.getElementById('eventColorInput');
    if(input) input.value = value;
    
    document.querySelectorAll('.color-swatch').forEach(s => {
        if (s.getAttribute('data-value') === value) {
            s.style.border = '2px solid #333';
            s.style.transform = 'scale(1.2)';
        } else {
            s.style.border = '2px solid transparent';
            s.style.transform = 'scale(1)';
        }
    });
}

// 🚀 核心启动函数
function initCalendarSystem() {
    const calendarEl = document.getElementById('calendar');
    const containerEl = document.getElementById('external-events');
    
    // 读取用户偏好的时间范围 (默认 00:00 - 24:00)
    const savedMin = localStorage.getItem('calMinTime') || '00:00:00';
    const savedMax = localStorage.getItem('calMaxTime') || '24:00:00';

    // 1. 初始化左侧“可拖拽区域”
    new FullCalendar.Draggable(containerEl, {
        itemSelector: '.draggable-item',
        eventData: function(eventEl) {
            return {
                title: eventEl.innerText,
                id: eventEl.getAttribute('data-id'),
                backgroundColor: '#6b7280' // 拖进去后的默认颜色
            };
        }
    });

    // 2. 初始化右侧"日历"
    calendarInstance = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',   // 周视图 
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridThreeDay,timeGridWeek,timeGridDay' // 月视图、三日视图、周视图、日视图
        },
        buttonText: {
            today: '今日'
        },
        // 🎨 自定义标题格式：2026年1月（Wxx）
        datesSet: function(info) {
            if (info.view.type === 'dayGridMonth') return; // 月视图保持默认

            const titleEl = calendarEl.querySelector('.fc-toolbar-title');
            if (!titleEl) return;

            // 取视图中间的日期来决定显示哪个月/年（防止跨月时显示上个月）
            let targetDate = new Date(info.view.currentStart);
            if (info.view.type === 'timeGridWeek') {
                targetDate.setDate(targetDate.getDate() + 3);
            } else if (info.view.type === 'timeGridThreeDay') {
                targetDate.setDate(targetDate.getDate() + 1);
            }

            const year = targetDate.getFullYear();
            const month = targetDate.getMonth() + 1;
            const startOfYear = new Date(year, 0, 1);
            const weekOfYear = Math.ceil((((targetDate - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);

            titleEl.innerText = `${year}年${month}月（W${weekOfYear}）`;
        },
        locale: 'zh-cn',
        firstDay: 1,                   // 周一开头
        height: '100%',                // 自适应高度
        aspectRatio: 1.8,              // 设置宽高比
        editable: true,                // 允许在日历里拖动
        droppable: true,               // 允许从外部拖拽
        //plugins: ['rrule'], 理应集成RRule插件，但Gemini说这一行要注释掉
        
        // ✨ 新增：自定义事件内容渲染 (为了显示待办的勾选框)
        eventContent: function(arg) {
            if (arg.event.extendedProps.isTodo) {
                const isDone = arg.event.extendedProps.done;
                
                const container = document.createElement('div');
                container.style.display = 'flex';
                container.style.alignItems = 'center';
                container.style.gap = '4px';
                container.style.width = '100%';
                container.style.overflow = 'hidden';
                
                const icon = document.createElement('i');
                icon.className = isDone ? 'ri-checkbox-line' : 'ri-checkbox-blank-line';
                icon.style.cursor = 'pointer';
                icon.style.fontSize = '1.1em';
                
                // 阻止冒泡，防止触发编辑弹窗
                icon.addEventListener('click', function(e) {
                    e.stopPropagation();
                    toggleTodoStatusInCalendar(arg.event.id);
                });
                
                const title = document.createElement('div');
                title.innerText = arg.event.title;
                title.style.whiteSpace = 'nowrap';
                title.style.overflow = 'hidden';
                title.style.textOverflow = 'ellipsis';
                title.style.flex = '1';
                
                if (isDone) {
                    title.style.textDecoration = 'line-through';
                    title.style.opacity = '0.8';
                    container.style.opacity = '0.8';
                }
                
                container.appendChild(icon);
                container.appendChild(title);
                
                return { domNodes: [container] };
            }
            return true;
        },

        // 时间网格配置 - 确保时间轴显示
        slotMinTime: savedMin,       // 最早显示时间
        slotMaxTime: savedMax,       // 最晚显示时间
        slotDuration: '00:30:00',      // 时间间隔（30分钟）
        slotLabelInterval: '01:00:00', // 标签间隔（1小时）
        slotLabelFormat: {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        },
        allDaySlot: true, // 显示全天事件区域
        allDayText: '全天',
        // 自定义视图配置
        views: {
            dayGridMonth: {
                buttonText: '月'
            },
            timeGridThreeDay: {
                type: 'timeGrid',
                duration: { days: 3 },
                buttonText: '三日',
                slotMinTime: savedMin,
                slotMaxTime: savedMax,
                slotDuration: '00:30:00',
                slotLabelInterval: '01:00:00'
            },
            timeGridWeek: {
                buttonText: '周',
                slotMinTime: savedMin,
                slotMaxTime: savedMax,
                slotDuration: '00:30:00',
                slotLabelInterval: '01:00:00'
            },
            timeGridDay: {
                buttonText: '日',
                slotMinTime: savedMin,
                slotMaxTime: savedMax,
                slotDuration: '00:30:00',
                slotLabelInterval: '01:00:00'
            }
        },
        
        // 📥 核心：当外部任务被扔进日历时
        drop: function(info) {
            // 拿到任务ID和新日期
            const todoId = info.draggedEl.getAttribute('data-id');
            const newDate = info.dateStr; // 格式: 2025-12-18T14:30:00+08:00
            
            // 更新数据库
            updateTodoDate(todoId, newDate);
            
            // 视觉上移除左侧那个项目 (因为它已经进日历了)
            info.draggedEl.remove();
        },

        // 📅 核心：当在日历里移动任务时
        eventDrop: function(info) {
            // 1. 尝试作为普通日历事件更新
            let events = JSON.parse(localStorage.getItem('calendarEvents')) || [];
            const eventIndex = events.findIndex(e => e.id === info.event.id);
            
            if (eventIndex !== -1) {
                const eventData = events[eventIndex];
                
                // 检查是否为重复事件
                if (eventData.rrule) {
                    const choice = prompt("检测到这是重复事件，请选择：\n1. 仅移动当前日程\n2. 移动所有重复日程\n(点击取消则撤销操作)");
                    
                    if (choice === '1') {
                        // 1. 仅移动当前：将原日程的该实例时间加入 exdate (排除日期)
                        if (!eventData.exdate) eventData.exdate = [];
                        // 获取移动前的时间作为排除项 (需格式化为本地时间以匹配 rrule)
                        const oldStartStr = formatDateForInput(info.oldEvent.start);
                        if (!eventData.exdate.includes(oldStartStr)) {
                            eventData.exdate.push(oldStartStr);
                        }
                        
                        // 2. 创建一个新的独立事件
                        const newEvent = {
                            ...eventData,
                            id: Date.now().toString(), // 生成新ID
                            title: eventData.title,
                            start: info.event.startStr, // 使用拖拽后的新时间
                            end: info.event.endStr,
                            rrule: undefined,           // 移除重复规则
                            exdate: undefined,          // 移除排除日期
                            extendedProps: { ...eventData.extendedProps }
                        };
                        
                        events.push(newEvent);
                        events[eventIndex] = eventData; // 更新原事件的 exdate
                        
                        saveToStorage(events);
                        saveToCloud();
                        refreshCalendarData(); // 刷新视图以显示分离后的事件
                    } else if (choice === '2') {
                        // 移动所有：更新原事件的基准时间
                        eventData.start = info.event.startStr;
                        eventData.end = info.event.endStr;
                        events[eventIndex] = eventData;
                        saveToStorage(events);
                        saveToCloud();
                    } else {
                        info.revert(); // 用户取消，回退拖拽
                    }
                } else {
                    // 普通事件直接更新
                    eventData.start = info.event.startStr;
                    eventData.end = info.event.endStr;
                    events[eventIndex] = eventData;
                    saveToStorage(events);
                    saveToCloud();
                }
            } else {
                // 2. 如果找不到，说明可能是 Todo 拖进来的
                updateTodoDate(info.event.id, info.event.startStr);
            }
        },
        
        // 🔄 核心：拉伸任务改变时长时
        eventResize: function(info) {
             let events = JSON.parse(localStorage.getItem('calendarEvents')) || [];
             const eventIndex = events.findIndex(e => e.id === info.event.id);
             
             if (eventIndex !== -1) {
                 events[eventIndex].start = info.event.startStr;
                 events[eventIndex].end = info.event.endStr;
                 saveToStorage(events);
                 saveToCloud();
                 console.log("任务时长已更新");
             }
        },
        
        // 📝 核心：点击日历单元格创建事件
        dateClick: function(info) {
            openEventModal(info.dateStr);
        },
        
        // 🖱️ 核心：点击事件编辑
        eventClick: function(info) {
            openEventModalForEdit(info.event);
        }
    });

    calendarInstance.render();
    
    // 3. 加载数据
    refreshCalendarData();
    
    // 4. 确保日历尺寸正确
    setTimeout(() => {
        calendarInstance.updateSize();
        // 强制刷新视图以确保时间网格正确显示
        const currentView = calendarInstance.view;
        if (currentView) {
            calendarInstance.changeView(currentView.type);
        }
    }, 300);
}

// 🔄 新增：更新日历显示范围
function updateCalendarRange() {
    const startInput = document.getElementById('calStart').value;
    const endInput = document.getElementById('calEnd').value;
    
    if (!startInput || !endInput) return;
    if (startInput >= endInput) {
        alert('结束时间必须晚于开始时间');
        return;
    }

    const minTime = startInput + ':00';
    // 如果用户选了 23:59，我们自动视为 24:00:00 (全天)
    const maxTime = endInput === '23:59' ? '24:00:00' : endInput + ':00';

    localStorage.setItem('calMinTime', minTime);
    localStorage.setItem('calMaxTime', maxTime);

    if (calendarInstance) {
        calendarInstance.setOption('slotMinTime', minTime);
        calendarInstance.setOption('slotMaxTime', maxTime);
    }
}

// 🔄 数据刷新函数：从 LocalStorage 读取并分发
function refreshCalendarData() {
    // 检查日历实例是否存在
    if (!calendarInstance) {
        console.warn('日历实例未初始化，尝试初始化...');
        // 如果日历未初始化，尝试初始化
        const calendarEl = document.getElementById('calendar');
        if (calendarEl) {
            initCalendarSystem();
        } else {
            console.error('日历容器不存在，无法刷新数据');
            return;
        }
    }
    
    const calendarEvents = JSON.parse(localStorage.getItem('calendarEvents')) || [];
    const todos = JSON.parse(localStorage.getItem('myRichTodos')) || [];
    const containerEl = document.getElementById('external-events');
    // 加载订阅事件缓存
    const subCache = JSON.parse(localStorage.getItem('subscriptionEventsCache') || '{}');
    
    // 清空旧数据
    if (containerEl) {
        containerEl.innerHTML = '';
    }
    
    // 确保 calendarInstance 存在后再调用方法
    if (calendarInstance) {
        calendarInstance.removeAllEvents();
    } else {
        console.error('日历实例仍然不存在，无法刷新数据');
        return;
    }

    // 添加日历事件
    calendarEvents.forEach(event => {
        // 确保 extendedProps 存在，兼容旧数据
        const extendedProps = event.extendedProps || {};
        
        // 确保时间格式正确（ISO 8601 格式）
        let startTime = event.start;
        let endTime = event.end;
        
        // 如果时间格式不正确，尝试转换
        if (startTime && !startTime.includes('T')) {
            // 如果只有日期，添加默认时间
            startTime = startTime.includes(':') ? startTime : startTime + 'T09:00:00';
        }
        if (endTime && !endTime.includes('T')) {
            endTime = endTime.includes(':') ? endTime : endTime + 'T10:00:00';
        }

        // 🎨 根据背景色查找对应的文字颜色
        const bg = event.backgroundColor || '#6b7280';
        const colorConfig = EVENT_COLORS.find(c => c.value === bg);
        
        const eventData = {
            id: event.id,
            title: event.title || '未命名事件',
            start: startTime,
            end: endTime,
            backgroundColor: bg,
            borderColor: bg,
            textColor: colorConfig ? colorConfig.textColor : '#ffffff',
            extendedProps: {
                location: extendedProps.location || '',
                reminder: extendedProps.reminder || 0,
                description: extendedProps.description || ''  // 确保备注字段存在
            }
        };
        
        // 如果有重复规则，添加 rrule
        if (event.rrule) {
            eventData.rrule = event.rrule;
            // 支持排除日期 (exdate)
            if (event.exdate) {
                eventData.exdate = event.exdate;
            }
        }
        
        try {
            if (calendarInstance) {
                calendarInstance.addEvent(eventData);
            } else {
                console.error('日历实例不存在，无法添加事件');
            }
        } catch (error) {
            console.error('添加事件失败:', error, eventData);
        }
    });

    // --- 注入订阅日历事件 ---
    const subscriptions = JSON.parse(localStorage.getItem('calendarSubscriptions') || '[]');
    subscriptions.filter(s => s.enabled).forEach(sub => {
        const cachedEvents = subCache[sub.id] || [];
        cachedEvents.forEach(ev => {
            try {
                calendarInstance.addEvent({
                    id: ev.id,
                    title: ev.title || '(无标题)',
                    start: ev.start,
                    end: ev.end || ev.start,
                    allDay: ev.allDay || false,
                    backgroundColor: sub.color || '#9b59b6',
                    borderColor: sub.color || '#9b59b6',
                    textColor: sub.textColor || '#ffffff',
                    editable: false,
                    startEditable: false,
                    durationEditable: false,
                    extendedProps: {
                        isSubscription: true,
                        subscriptionId: sub.id,
                        subscriptionName: sub.name,
                        description: ev.description || '',
                        location: ev.location || ''
                    }
                });
            } catch (e) {
                console.warn('添加订阅事件失败:', e, ev);
            }
        });
    });

    // 添加待排期任务
    todos.forEach(todo => {
        // 1. 如果没有日期 -> 放进左侧待排期区域 (仅显示未完成)
        if (!todo.date) {
            if (!todo.done && containerEl) {
                const div = document.createElement('div');
                div.className = 'draggable-item';
                div.setAttribute('data-id', todo.id);
                div.innerText = todo.text;
                containerEl.appendChild(div);
            }
        } 
        // 2. 如果有日期 -> 直接渲染在日历上 (显示所有，已完成的变灰)
        else {
            calendarInstance.addEvent({
                id: todo.id,
                title: todo.text,
                start: todo.date,
                allDay: !todo.date.includes('T'), 
                backgroundColor: todo.done ? '#9ca3af' : '#10b981', // 完成变灰，未完成绿色
                borderColor: todo.done ? '#9ca3af' : '#10b981',
                textColor: '#ffffff',
                extendedProps: { 
                    isTodo: true,
                    done: todo.done 
                }
            });
        }
    });
}

// 💾 辅助：更新数据库日期
function updateTodoDate(id, dateStr) {
    let todos = JSON.parse(localStorage.getItem('myRichTodos')) || [];
    const todo = todos.find(t => t.id == id);
    if (todo) {
        todo.date = dateStr; // 写入新日期
        localStorage.setItem('myRichTodos', JSON.stringify(todos));
        // 同时也刷新首页的Bento卡片
        if(typeof renderTodos === 'function') renderTodos();
        // 👇 新增这一行
        saveToCloud();
    }
}

// 📁 保存到本地存储
function saveToStorage(events) {
    localStorage.setItem('calendarEvents', JSON.stringify(events));
}

// 🚪 界面操作：打开/关闭日历
function openCalendarView() {
    document.documentElement.style.overflow = 'hidden'; // 👈 新增：锁定 html 根元素
    document.body.style.overflow = 'hidden'; // 👈 新增：打开时禁止背景滚动
    const modal = document.getElementById('calendarModal');
    
    // 同步输入框状态
    const savedMin = localStorage.getItem('calMinTime') || '00:00:00';
    const savedMax = localStorage.getItem('calMaxTime') || '24:00:00';
    const startEl = document.getElementById('calStart');
    const endEl = document.getElementById('calEnd');
    if(startEl) startEl.value = savedMin.substring(0, 5);
    if(endEl) endEl.value = savedMax === '24:00:00' ? '23:59' : savedMax.substring(0, 5);

    modal.showModal(); // 显示弹窗
    
    // 延迟一丢丢渲染，防止尺寸计算错误
    setTimeout(() => {
        if (!calendarInstance) {
            initCalendarSystem();
        } else {
            refreshCalendarData(); // 每次打开都重新读最新数据
            // 延迟更新尺寸，确保容器已完全渲染
            setTimeout(() => {
                calendarInstance.updateSize(); // 重新适应屏幕大小
            }, 150);
        }
    }, 100);
}

function closeCalendar() {
    document.documentElement.style.overflow = ''; // 👈 新增：解锁 html 根元素
    document.body.style.overflow = ''; // 👈 新增：关闭时恢复背景滚动
    document.getElementById('calendarModal').close();
}

// 🔄 新增：在日历中切换待办状态
function toggleTodoStatusInCalendar(id) {
    const numericId = Number(id);
    // 调用已有的 toggleTodo 逻辑 (它会处理数据更新、云同步和重复任务生成)
    toggleTodo(numericId);
    // 额外刷新日历视图以反映变化
    refreshCalendarData();
}

// 🔄 新增：切换日程自定义间隔输入框显示
function toggleEventCustomInterval() {
    const repeatVal = document.getElementById('eventRepeat').value;
    const group = document.getElementById('eventCustomIntervalGroup');
    const endGroup = document.getElementById('eventCustomEndDateGroup');
    if (group) {
        group.style.display = (repeatVal === 'custom') ? 'flex' : 'none';
    }
    if (endGroup) {
        endGroup.style.display = (repeatVal !== '') ? 'flex' : 'none';
    }
}

// 📝 事件编辑模态框控制
function openEventModal(startDate = null) {
    const modal = document.getElementById('eventModal');
    
    // 隐藏删除按钮 (新建模式)
    const deleteBtn = document.getElementById('deleteEventBtn');
    if (deleteBtn) deleteBtn.style.display = 'none';

    const eventStart = document.getElementById('eventStart');
    const eventEnd = document.getElementById('eventEnd');
    
    // 重置表单
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventLocation').value = '';
    document.getElementById('eventReminder').value = '0';
    document.getElementById('eventRepeat').value = '';
    document.getElementById('eventDescription').value = '';
    
    // 重置自定义重复字段
    document.getElementById('eventCustomInterval').value = 1;
    document.getElementById('eventCustomEndDate').value = '';
    toggleEventCustomInterval();
    
    // 🎨 注入并重置颜色
    injectColorPicker();
    selectColor(EVENT_COLORS[0].value);

    // 设置默认时间
    if (startDate) {
        eventStart.value = formatDateForInput(new Date(startDate));
        // 默认1小时后结束
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 1);
        eventEnd.value = formatDateForInput(endDate);
    } else {
        // 设置当前时间
        const now = new Date();
        eventStart.value = formatDateForInput(now);
        // 默认1小时后结束
        const endTime = new Date(now);
        endTime.setHours(endTime.getHours() + 1);
        eventEnd.value = formatDateForInput(endTime);
    }
    
    currentEventId = null;
    currentEventStart = null;
    modal.showModal();
}

// 📝 编辑已有事件
function openEventModalForEdit(event) {
    const modal = document.getElementById('eventModal');
    
    // 注入或显示删除按钮
    let deleteBtn = document.getElementById('deleteEventBtn');
    if (!deleteBtn) {
        const footer = modal.querySelector('.modal-actions');
        if (footer) {
            deleteBtn = document.createElement('button');
            deleteBtn.id = 'deleteEventBtn';
            deleteBtn.type = 'button';
            deleteBtn.innerText = '删除';
            deleteBtn.className = 'btn';
            deleteBtn.style.backgroundColor = '#ef4444'; // 红色警示
            deleteBtn.style.color = '#ffffff';
            deleteBtn.style.marginRight = 'auto'; // 居左显示，与保存按钮分开
            deleteBtn.onclick = deleteEvent;
            footer.prepend(deleteBtn);
        }
    }
    if (deleteBtn) deleteBtn.style.display = 'block';

    // 确保 extendedProps 存在，兼容旧数据
    const extendedProps = event.extendedProps || {};
    
    document.getElementById('eventTitle').value = event.title || '';
    document.getElementById('eventStart').value = formatDateForInput(event.start);
    document.getElementById('eventEnd').value = formatDateForInput(event.end);
    document.getElementById('eventLocation').value = extendedProps.location || '';
    document.getElementById('eventReminder').value = extendedProps.reminder || '0';
    document.getElementById('eventDescription').value = extendedProps.description || '';  // 确保备注正确读取
    
    // 🎨 注入并设置当前颜色
    injectColorPicker();
    const currentColor = event.backgroundColor || EVENT_COLORS[0].value;
    selectColor(currentColor);

    // 重置自定义字段
    document.getElementById('eventCustomInterval').value = 1;
    document.getElementById('eventCustomEndDate').value = '';

    // 尝试从本地存储获取原始数据以获得准确的 rrule (因为 FullCalendar 的 event 对象可能不包含完整的 rrule 配置)
    const storedEvents = JSON.parse(localStorage.getItem('calendarEvents')) || [];
    const storedEvent = storedEvents.find(e => e.id === event.id);
    const sourceEvent = storedEvent || event;

    // 设置重复规则
    if (sourceEvent.rrule) {
        let repeatValue = '';
        const freq = sourceEvent.rrule.freq;
        const interval = sourceEvent.rrule.interval || 1;

        // 回显截止日期 (UNTIL)
        if (sourceEvent.rrule.until) {
             const untilDate = new Date(sourceEvent.rrule.until);
             const y = untilDate.getFullYear();
             const m = String(untilDate.getMonth() + 1).padStart(2, '0');
             const d = String(untilDate.getDate()).padStart(2, '0');
             document.getElementById('eventCustomEndDate').value = `${y}-${m}-${d}`;
        }

        // 回显间隔
        if (interval > 1) {
             document.getElementById('eventCustomInterval').value = interval;
        }

        switch (freq) {
            case RRule.DAILY:
                if (sourceEvent.rrule.byweekday) {
                    // 检查是否是工作日
                    const weekdays = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR];
                    if (JSON.stringify(sourceEvent.rrule.byweekday) === JSON.stringify(weekdays)) {
                        repeatValue = 'workweek';
                    } else {
                        repeatValue = 'daily';
                    }
                } else {
                    // 如果有间隔且不是工作日，则是自定义
                    repeatValue = (interval > 1) ? 'custom' : 'daily';
                }
                break;
            case RRule.WEEKLY:
                repeatValue = 'weekly';
                break;
            case RRule.MONTHLY:
                repeatValue = 'monthly';
                break;
        }
        document.getElementById('eventRepeat').value = repeatValue;
    } else {
        document.getElementById('eventRepeat').value = '';
    }
    toggleEventCustomInterval();
    
    currentEventId = event.id;
    currentEventStart = event.start; // 记录当前实例的开始时间
    modal.showModal();
}

function closeEventModal() {
    document.getElementById('eventModal').close();
    currentEventId = null;
    currentEventStart = null;
}

// 💾 保存事件
function saveEvent() {
    try {
        const title = document.getElementById('eventTitle').value.trim();
        const start = document.getElementById('eventStart').value;
        const end = document.getElementById('eventEnd').value;
        const location = document.getElementById('eventLocation').value.trim();
        const reminder = parseInt(document.getElementById('eventReminder').value) || 0;
        const repeat = document.getElementById('eventRepeat').value;
        const customInterval = parseInt(document.getElementById('eventCustomInterval').value) || 1;
        const customEndDate = document.getElementById('eventCustomEndDate').value;
        const description = document.getElementById('eventDescription').value.trim();  // 读取备注并去除首尾空格
        const color = document.getElementById('eventColorInput').value || EVENT_COLORS[0].value; // 获取颜色
        
        // 验证必填字段
        if (!title || !start || !end) {
            alert('请填写标题和时间');
            return;
        }
        
        // 验证时间格式
        if (!start.includes('T') || !end.includes('T')) {
            alert('时间格式不正确，请重新选择时间');
            return;
        }
        
        // 验证结束时间晚于开始时间
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (endDate <= startDate) {
            alert('结束时间必须晚于开始时间');
            return;
        }
        
        // 🆕 准备保存的事件列表
        const eventsToSave = [];
        const batchGroupId = Date.now().toString(); // 生成一个批次ID，用于关联批量生成的日程

        // 🆕 判断逻辑：如果设置了重复 且 设置了截止日期 -> 批量生成独立事件
        if (repeat && customEndDate) {
            let currentStart = new Date(startDate);
            const duration = endDate.getTime() - startDate.getTime(); // 保持时长
            const untilDate = new Date(customEndDate);
            untilDate.setHours(23, 59, 59, 999);
            
            let count = 0;
            const MAX_EVENTS = 365; // 防止死循环

            while (currentStart <= untilDate && count < MAX_EVENTS) {
                // 计算当前结束时间
                const currentEnd = new Date(currentStart.getTime() + duration);
                
                // 构造事件
                const eventData = {
                    // 如果是第一个且是编辑模式，复用ID；否则生成新ID
                    id: (count === 0 && currentEventId) ? currentEventId : (Date.now() + count).toString(),
                    title: title,
                    start: formatDateForInput(currentStart),
                    end: formatDateForInput(currentEnd),
                    backgroundColor: color,
                    borderColor: color,
                    groupId: batchGroupId, // ✨ 关键：添加组ID，标记它们为同一系列
                    extendedProps: {
                        location: location || '',
                        reminder: reminder || 0,
                        description: description || ''
                    }
                    // ⚠️ 批量生成时不使用 rrule，它们是独立的
                };
                
                eventsToSave.push(eventData);
                
                // 计算下一次时间 (复用之前的 calculateNextDate 函数)
                currentStart = calculateNextDate(currentStart, repeat, customInterval);
                count++;
            }
            
            if (count >= MAX_EVENTS) alert('为防止卡顿，仅生成了前 365 个重复日程');

        } else {
            // 🆕 原有逻辑：单次事件 或 无限重复(RRule)
            const eventData = {
                id: currentEventId || Date.now().toString(),
                title: title,
                start: start,
                end: end,
                backgroundColor: color,
                borderColor: color,
                extendedProps: {
                    location: location || '',
                    reminder: reminder || 0,
                    description: description || ''
                }
            };
            
            // 添加重复规则（仅在RRule可用时，且未触发批量生成逻辑）
            if (repeat && typeof RRule !== 'undefined') {
                try {
                    let rruleConfig = { freq: null, dtstart: start };
                    switch (repeat) {
                        case 'daily': rruleConfig.freq = RRule.DAILY; break;
                        case 'weekly': rruleConfig.freq = RRule.WEEKLY; break;
                        case 'monthly': rruleConfig.freq = RRule.MONTHLY; break;
                        case 'workweek': rruleConfig.freq = RRule.DAILY; rruleConfig.byweekday = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR]; break;
                        case 'custom': rruleConfig.freq = RRule.DAILY; rruleConfig.interval = customInterval; break;
                    }
                    if (rruleConfig.freq !== null) eventData.rrule = rruleConfig;
                } catch (e) { console.warn('RRule配置失败', e); }
            }
            eventsToSave.push(eventData);
        }
        
        // --- 保存到 localStorage ---
        let events = JSON.parse(localStorage.getItem('calendarEvents')) || [];
        
        // 🆕 处理重复事件的特殊编辑逻辑 (RRule)
        if (currentEventId) {
            const originalIndex = events.findIndex(e => e.id === currentEventId);
            if (originalIndex !== -1) {
                const originalEvent = events[originalIndex];
                // 只有当是 RRule 重复事件，且我们有当前实例的开始时间时才触发
                // ✨ 修改：同时支持 RRule 和 groupId (批量生成) 的检测
                if ((originalEvent.rrule || originalEvent.groupId) && currentEventStart) {
                    const choice = prompt("检测到这是重复日程，请选择修改模式：\n1. 仅修改当前日程\n2. 修改当前及之后的所有日程\n3. 修改所有日程\n(点击取消则返回)");
                    
                    if (choice === '1') {
                        // 1. 仅修改当前
                        if (originalEvent.rrule) {
                            // RRule模式：原事件添加 exdate
                            if (!originalEvent.exdate) originalEvent.exdate = [];
                            const dateStr = formatDateForInput(currentEventStart);
                            if (!originalEvent.exdate.includes(dateStr)) {
                                originalEvent.exdate.push(dateStr);
                            }
                            events[originalIndex] = originalEvent;
                            currentEventId = null; // 新增独立事件
                        } else if (originalEvent.groupId) {
                            // Group模式：仅修改当前 -> 意味着当前事件脱离组织
                            // 逻辑：直接让后续的保存逻辑覆盖当前ID的事件，但我们要确保新事件不再带有旧的 groupId
                            // 如果 eventsToSave 是个列表（因为表单里还选着重复），我们只取第一个作为“当前事件”
                            // 并清除它的 groupId (或者生成新的)
                            
                            // 这里简化处理：
                            // 既然是“仅修改当前”，我们假设用户希望当前这个变成独立的，或者变成一个新系列的开头
                            // 我们不需要对旧的 events 数组做删除操作，只需要让 saveToStorage 正常更新当前ID即可
                            // 但需要把 eventsToSave 里的 groupId 换掉或去掉，防止混淆
                            
                            // 如果用户在表单里取消了重复，eventsToSave 只有一个，正好。
                            // 如果用户在表单里保留了重复，eventsToSave 是一组新序列。
                            // 此时“仅修改当前”的语义比较模糊，通常意味着“把当前这个改成新的样子（可能带新重复），旧系列的其他人不变”
                            
                            // 动作：将当前事件从旧 Group 中移除 (逻辑上) -> 其实就是更新它时，赋予它新的属性
                            // 只要不删除其他 groupId 的事件即可。
                            // 唯一要注意的是：如果 eventsToSave 是个序列，我们是替换当前事件，还是追加？
                            // 现有逻辑是：有 currentEventId 就替换 events[eventIndex]，然后 push 剩下的。
                            // 这符合预期。
                        }
                        
                    } else if (choice === '2') {
                        // 2. 修改当前及之后
                        if (originalEvent.rrule) {
                            // RRule模式：截断旧的
                            const untilDate = new Date(currentEventStart);
                            untilDate.setMilliseconds(untilDate.getMilliseconds() - 1);
                            originalEvent.rrule.until = untilDate;
                            events[originalIndex] = originalEvent;
                            currentEventId = null; 
                        } else if (originalEvent.groupId) {
                            // Group模式：删除旧系列中 >= 当前时间的
                            const startThres = new Date(currentEventStart).getTime();
                            events = events.filter(e => {
                                // 保留：不同组的 OR (同组 且 时间早于当前的)
                                if (e.groupId !== originalEvent.groupId) return true;
                                return new Date(e.start).getTime() < startThres;
                            });
                            currentEventId = null; // 视为新增
                        }
                        
                    } else if (choice === '3') {
                        // 3. 修改所有
                        if (originalEvent.rrule) {
                            // RRule模式：直接覆盖（保持 currentEventId 即可）
                        } else if (originalEvent.groupId) {
                            // Group模式：删除旧系列所有事件
                            events = events.filter(e => e.groupId !== originalEvent.groupId);
                            currentEventId = null; // 视为新增
                        }
                    } else {
                        return; // 用户取消
                    }
                }
            }
        }
        
        if (currentEventId) {
            // 更新已有事件
            const eventIndex = events.findIndex(e => e.id === currentEventId);
            if (eventIndex !== -1) {
                // 替换旧事件为新序列的第一个
                events[eventIndex] = eventsToSave[0];
                // 追加剩余的
                for (let i = 1; i < eventsToSave.length; i++) {
                    events.push(eventsToSave[i]);
                }
            } else {
                // 如果找不到，添加为新事件
                events.push(...eventsToSave);
            }
        } else {
            // 添加新事件
            events.push(...eventsToSave);
        }
        
        // 保存到localStorage
        saveToStorage(events);
        
        // 更新日历显示（确保日历已初始化）
        try {
            // 检查日历容器是否存在且可见
            const calendarEl = document.getElementById('calendar');
            const calendarModal = document.getElementById('calendarModal');
            
            // 如果日历模态框是打开的，确保日历已初始化
            if (calendarModal && calendarModal.open) {
                if (!calendarInstance) {
                    // 如果日历未初始化，先初始化
                    if (calendarEl) {
                        initCalendarSystem();
                    }
                }
                
                // 刷新日历数据
                if (calendarInstance) {
                    refreshCalendarData();
                } else {
                    console.warn('日历实例未初始化，数据已保存但未刷新显示');
                }
            } else {
                // 如果日历视图未打开，数据已保存，下次打开时会自动加载
                console.log('日历视图未打开，数据已保存到localStorage');
            }
        } catch (refreshError) {
            console.error('刷新日历显示时出错:', refreshError);
            // 即使刷新失败，数据也已经保存了
        }
        
        // 关闭模态框
        closeEventModal();

        // 👇 新增这一行：自动上传
        saveToCloud();
        console.log('事件保存成功:', eventsToSave);
    } catch (error) {  
        console.error('保存事件时出错:', error);
        alert('保存失败，请检查控制台错误信息');
    }
}

// �️ 删除事件
function deleteEvent() {
    if (!currentEventId) return;

    let events = JSON.parse(localStorage.getItem('calendarEvents')) || [];
    const eventIndex = events.findIndex(e => e.id === currentEventId);
    
    if (eventIndex === -1) {
        closeEventModal();
        return;
    }

    const eventData = events[eventIndex];
    let needSave = false;

    // 检查是否为重复事件
    if (eventData.rrule) {
        const choice = prompt("检测到这是重复事件，请选择：\n1. 仅删除当前日程\n2. 删除所有重复日程\n(点击取消则不进行操作)");
        
        if (choice === '1') {
            // 仅删除当前：将当前实例的时间添加到 exdate (排除日期) 中
            if (!eventData.exdate) eventData.exdate = [];
            
            // 格式化当前时间为 ISO 字符串 (YYYY-MM-DDTHH:mm) 以匹配 rrule
            const dateStr = formatDateForInput(currentEventStart);
            if (!eventData.exdate.includes(dateStr)) {
                eventData.exdate.push(dateStr);
            }
            events[eventIndex] = eventData;
            needSave = true;
        } else if (choice === '2') {
            // 删除所有
            if (confirm('确定要删除所有重复事件吗？')) {
                events.splice(eventIndex, 1);
                needSave = true;
            }
        }
    } else if (eventData.groupId) {
        // ✨ 新增：处理批量生成的独立事件删除
        const choice = prompt("检测到这是重复日程(批量)，请选择：\n1. 仅删除当前日程\n2. 删除所有重复日程\n(点击取消则不进行操作)");
        if (choice === '1') {
            events.splice(eventIndex, 1);
            needSave = true;
        } else if (choice === '2') {
            if (confirm('确定要删除该系列所有日程吗？')) {
                events = events.filter(e => e.groupId !== eventData.groupId);
                needSave = true;
            }
        }
    } else {
        // 普通事件直接删除
        if (confirm('确定要删除这个事件吗？')) {
            events.splice(eventIndex, 1);
            needSave = true;
        }
    }

    if (needSave) {
        saveToStorage(events);
        refreshCalendarData(); // 刷新日历以应用更改
        closeEventModal();
        saveToCloud();
        console.log('事件已删除/更新');
    }
}

// �🛠️ 辅助函数：格式化日期为input类型的datetime-local格式
function formatDateForInput(date) {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// #endregion

// #region 10. 搜索引擎及搜索功能实现 ========================

// 1. 定义引擎配置
const searchEngines = {
    bing: {
        url: "https://cn.bing.com/search?q=",
        icon: "ri-search-fill"
    },
    google: {
        url: "https://www.google.com/search?q=",
        icon: "ri-google-fill"
    },
    baidu: {
        url: "https://www.baidu.com/s?wd=",
        icon: "ri-baidu-fill"
    },
    yandex: {
        url: "https://yandex.com/search/?text=",
        icon: "ri-search-fill"
    }
};

// 默认引擎 (你可以改成 google 或 baidu)
let currentEngine = 'google';

// 2. 切换下拉菜单显示/隐藏
function toggleEngineList(e) {
    e.stopPropagation();              // 阻止冒泡，防止触发 document 的点击关闭
    const dropdown = document.getElementById('engine-dropdown');
    dropdown.classList.toggle('show');
}

// 3. 选择引擎
function selectEngine(engineKey, e) {
    // 阻止冒泡，防止触发父级 toggleEngineList 导致菜单无法关闭
    if (e) e.stopPropagation();

    // 更新当前引擎变量
    currentEngine = engineKey;
    
    // 更新左侧图标
    const icon = document.getElementById('current-engine-icon');
    
    // 移除旧图标并添加新图标 (保留其他样式类)
    Object.values(searchEngines).forEach(e => icon.classList.remove(e.icon));
    icon.classList.add(searchEngines[engineKey].icon);
    
    // (可选) 更新 Placeholder 提示文字
    // document.getElementById('search-input').placeholder = `Search with ${engineKey}...`;

    // 存入本地存储，下次打开记住选择
    localStorage.setItem('preferredEngine', currentEngine);
    
    // 关闭下拉菜单
    const dropdown = document.getElementById('engine-dropdown');
    if (dropdown) dropdown.classList.remove('show');
}

// 4. 执行搜索 (回车触发)
function handleSearch(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const query = document.getElementById('search-input').value;
        if (query.trim()) {
            const url = searchEngines[currentEngine].url + encodeURIComponent(query);
            window.open(url, '_blank');                            // 在新标签页打开
        }
    }
}

// 5. 初始化：读取上次的选择
document.addEventListener('DOMContentLoaded', () => {
    const savedEngine = localStorage.getItem('preferredEngine');
    if (savedEngine && searchEngines[savedEngine]) {
        selectEngine(savedEngine);
    }
    
    // 点击页面其他地方，关闭下拉菜单
    document.addEventListener('click', () => {
        const dropdown = document.getElementById('engine-dropdown');
        if (dropdown) dropdown.classList.remove('show');
    });
});

// #endregion

// #region 11. 自动启动项 =========================
// 页面加载 1 秒后尝试自动从云端拉取数据
setTimeout(() => {
    // 确保 loadFromCloud 函数存在（防止报错）
    if (typeof loadFromCloud === 'function') {
        loadFromCloud();
    }
}, 1000);
// #endregion ====================================

// #region 12. 本地通知系统 (Notification) =========================

// 1. 申请通知权限 (需要用户手动触发，浏览器才允许)
function requestNotificationPermission() {
    if (!("Notification" in window)) {
        alert("抱歉，您的设备不支持通知功能。");
        return;
    }

    Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
            // 第一次授权成功，发一条测试通知
            new Notification("🎉 通知已开启", {
                body: "以后日程快到时，我会在这里提醒你！",
                icon: "/images/CatIcon192.png" // 确保这里有你的图标
            });
        } else {
            alert("需要通知权限才能发送提醒哦！请在系统设置中允许。");
        }
    });
}

// 2. 核心逻辑：检查有没有快到期的日程
function checkReminders() {
    // 如果没权限，就别白费力气了
    if (Notification.permission !== "granted") return;

    const events = JSON.parse(localStorage.getItem('calendarEvents')) || [];
    const now = new Date();
    
    // 获取当前时间的“分钟级”时间戳（忽略秒）
    const currentMinuteStr = formatDateForInput(now); // 借用你之前写的格式化函数: YYYY-MM-DDTHH:mm

    events.forEach(event => {
        // 1. 检查有没有设置提醒
        const reminderMinutes = event.extendedProps?.reminder;
        if (!reminderMinutes || reminderMinutes == 0) return;

        // 2. 计算“应该提醒的时间”
        const startTime = new Date(event.start);
        const triggerTime = new Date(startTime.getTime() - reminderMinutes * 60000); // 提前 N 分钟
        
        // 3. 格式化为分钟字符串进行比对
        const triggerTimeStr = formatDateForInput(triggerTime);

        // 4. 如果“现在”正好是“提醒时间”
        // 为了防止一分钟内重复弹窗，我们可以加个简单的锁，或者利用 localStorage 记录 "notified_ids"
        // 这里用最简单的逻辑：检查时间是否完全匹配
        if (triggerTimeStr === currentMinuteStr) {
            // ⚠️ 为了防止每秒都弹，我们需要记录一下“这个事件我已经提醒过了”
            // 简单方案：利用 SessionStorage (刷新后失效) 或者给 event 加个临时标记
            // 这里我们采用：只在每分钟的第 0-5 秒检测，避免重复
            if (now.getSeconds() < 10) { 
                sendNotification(event);
            }
        }
    });
}

// 3. 发送具体通知
function sendNotification(event) {
    // 防止重复弹窗的简单锁 (SessionStorage)
    const lockKey = `notified_${event.id}_${new Date().getTime()}`; // 加时间戳防止还是旧的
    // 这里简化一下：用分钟级锁
    const simpleLockKey = `notified_${event.id}_${formatDateForInput(new Date())}`;
    
    if (sessionStorage.getItem(simpleLockKey)) return; // 如果这一分钟已经弹过了，就不弹了

    // 弹窗！
    const title = `🔔 日程提醒: ${event.title}`;
    const options = {
        body: `${event.start.replace('T', ' ')} 开始\n地点: ${event.extendedProps.location || '无地点'}`,
        icon: "/images/CatIcon192.png",
        tag: event.id, // 相同tag的通知会覆盖，不会堆叠
        renotify: true,
        requireInteraction: true // 强制需要用户点击才会消失（防止漏看）
    };

    // 尝试发送 (兼容 Service Worker 和 普通网页)
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, options);
        });
    } else {
        new Notification(title, options);
    }

    // 标记已发送
    sessionStorage.setItem(simpleLockKey, 'true');
}

// 4. 启动“闹钟守卫”：每分钟检查一次
setInterval(checkReminders, 60 * 1000); 

// #endregion =================================================

// #region 13. 汇率板块 =========================
async function fetchExchangeRates() {
    const timeEl = document.getElementById('rate-update-time');
    try {
        // 使用 @fawazahmed0/currency-api (CDN方式，稳定且支持历史)
        
        // 1. 计算昨天的日期
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        // 格式化日期为 YYYY-MM-DD
        const pad = (n) => n.toString().padStart(2, '0');
        const yStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

        // 2. API 地址 (使用 JSDelivr CDN)
        const urlNow = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/cny.json';
        const urlPrev = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${yStr}/v1/currencies/cny.json`;

        // 3. 并行获取 (允许历史数据获取失败，不影响今日数据显示)
        const [resNow, resPrev] = await Promise.all([
            fetch(urlNow),
            fetch(urlPrev).catch(() => null) // catch: 如果昨天的数据获取失败，返回 null
        ]);

        if (!resNow || !resNow.ok) {
            throw new Error('无法获取最新汇率');
        }

        const dataNow = await resNow.json();
        const ratesNow = dataNow.cny || {};
        
        let ratesPrev = {};
        if (resPrev && resPrev.ok) {
            try {
                const dataPrev = await resPrev.json();
                ratesPrev = dataPrev.cny || {};
            } catch (e) {
                console.warn('历史数据解析失败');
            }
        }
        
        // 定义货币映射 (注意API返回的是小写key)
        const currencies = [
            { code: 'usd', id: 'rate-usd', changeId: 'change-usd' },
            { code: 'eur', id: 'rate-eur', changeId: 'change-eur' },
            { code: 'gbp', id: 'rate-gbp', changeId: 'change-gbp' },
            { code: 'jpy', id: 'rate-jpy', changeId: 'change-jpy' }
        ];
        
        currencies.forEach(curr => {
            // 1. 计算今日汇率 (1 外币 = ? CNY)
            // API 返回 1 CNY = X 外币
            const rateN = ratesNow[curr.code];
            if (rateN) {
                const valNow = 1 / rateN;
                const elVal = document.getElementById(curr.id);
                if(elVal) elVal.innerText = valNow.toFixed(4);

                // 2. 计算涨跌 (对比昨日)
                const rateP = ratesPrev[curr.code];
                if (rateP) {
                    const valPrev = 1 / rateP;
                    const diff = valNow - valPrev;
                    
                    const elChange = document.getElementById(curr.changeId);
                    if (elChange) {
                        const isUp = diff >= 0;
                        const icon = isUp ? 'ri-arrow-up-s-fill' : 'ri-arrow-down-s-fill';
                        const colorClass = isUp ? 'rate-up' : 'rate-down';
                        
                        elChange.className = `rate-change ${colorClass}`;
                        elChange.innerHTML = `<i class="${icon}"></i>`;
                    }
                }
            }
        });
        
        // 更新时间
        if(timeEl) {
            timeEl.innerText = '更新: ' + dataNow.date;
        }
        
    } catch (error) {
        console.error('汇率获取失败:', error);
        if(timeEl) timeEl.innerText = '数据暂不可用';
    }
}

fetchExchangeRates();
// #endregion

// #region 15. 日历订阅模块 (ICS 解析 + 管理) =========================

// --- 订阅数据持久化 Key ---
const SUBSCRIPTIONS_KEY = 'calendarSubscriptions';
const SUB_CACHE_KEY = 'subscriptionEventsCache';
const AUTO_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 分钟

// 预设订阅颜色（与本地事件颜色区分）
const SUBSCRIPTION_COLORS = [
    { name: '珊瑚粉', bg: '#FF6384', text: '#ffffff' },
    { name: '翡翠绿', bg: '#4BC0C0', text: '#ffffff' },
    { name: '琥珀橙', bg: '#FF9F40', text: '#ffffff' },
    { name: '靛蓝',   bg: '#9966FF', text: '#ffffff' },
    { name: '钢蓝',   bg: '#36A2EB', text: '#ffffff' },
    { name: '橄榄绿', bg: '#C9CB3F', text: '#1a1a1a' },
    { name: '玫瑰金', bg: '#E8A0BF', text: '#1a1a1a' },
    { name: '石板灰', bg: '#7B8D8E', text: '#ffffff' }
];

// 订阅类型切换 UI
function onSubTypeChange() {
    const typeSelect = document.getElementById('subTypeSelect');
    const authFields = document.getElementById('caldavAuthFields');
    const urlLabel = document.getElementById('subUrlLabel');
    const urlInput = document.getElementById('subUrlInput');

    if (!typeSelect || !authFields || !urlLabel || !urlInput) return;

    const isCaldav = typeSelect.value === 'caldav';

    authFields.style.display = isCaldav ? 'flex' : 'none';

    if (isCaldav) {
        urlLabel.textContent = 'CalDAV 服务器地址';
        urlInput.placeholder = 'https://your-server.com/dav/';
        urlInput.type = 'text';
    } else {
        urlLabel.textContent = 'ICS 订阅链接';
        urlInput.placeholder = 'https://...ics';
        urlInput.type = 'text';
    }
}

// CORS 代理列表（按优先级依次尝试）
const CORS_PROXIES = [
    '',                                      // 直连（第 1 优先）
    'https://corsproxy.io/?',                // 备选 1
    'https://api.allorigins.win/raw?url=',   // 备选 2
];

// ==========================================
// ICS 解析器（纯前端，无第三方依赖）
// ==========================================

/**
 * 解析 ICS 文本为事件数组
 * @param {string} icsText - ICS 文件原始文本
 * @param {string} subscriptionId - 订阅源 ID（用于生成事件 ID 前缀）
 * @returns {Array} 事件对象数组
 */
function parseICS(icsText, subscriptionId) {
    if (!icsText || typeof icsText !== 'string') {
        throw new Error('无效的 ICS 内容');
    }

    // 1. 展开折叠行（以空格/Tab 开头的续行）
    const unfolded = icsText.replace(/\r?\n[ \t]/g, '');

    // 2. 提取所有 VEVENT 块
    const eventBlocks = [];
    const lines = unfolded.split(/\r?\n/);
    let inEvent = false;
    let currentBlock = [];
    let inCalendar = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.toUpperCase() === 'BEGIN:VCALENDAR') {
            inCalendar = true;
        } else if (line.toUpperCase() === 'END:VCALENDAR') {
            inCalendar = false;
        } else if (line.toUpperCase() === 'BEGIN:VEVENT' && inCalendar) {
            inEvent = true;
            currentBlock = [];
        } else if (line.toUpperCase() === 'END:VEVENT' && inEvent) {
            inEvent = false;
            if (currentBlock.length > 0) {
                eventBlocks.push(currentBlock.join('\n'));
            }
        } else if (inEvent) {
            currentBlock.push(line);
        }
    }

    if (eventBlocks.length === 0) {
        throw new Error('ICS 文件中未找到任何事件 (VEVENT)');
    }

    // 3. 解析每个 VEVENT
    const events = [];
    for (let idx = 0; idx < eventBlocks.length; idx++) {
        try {
            const event = parseVEvent(eventBlocks[idx], subscriptionId, idx);
            if (event) events.push(event);
        } catch (e) {
            console.warn('解析第 ' + (idx + 1) + ' 个事件失败:', e.message);
        }
    }

    return events;
}

/**
 * 解析单个 VEVENT 块
 */
function parseVEvent(block, subscriptionId, index) {
    const props = {};

    // 按行解析属性
    const lines = block.split('\n');
    for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;

        let propName = line.substring(0, colonIdx).trim().toUpperCase();
        let propValue = line.substring(colonIdx + 1).trim();

        // 处理带参数属性，如 DTSTART;VALUE=DATE:20250101
        const semicolonIdx = propName.indexOf(';');
        if (semicolonIdx !== -1) {
            const params = propName.substring(semicolonIdx + 1).split(';');
            propName = propName.substring(0, semicolonIdx);
            // 提取 VALUE= 参数
            for (const p of params) {
                const eqIdx = p.indexOf('=');
                if (eqIdx !== -1) {
                    const pKey = p.substring(0, eqIdx).trim().toUpperCase();
                    const pVal = p.substring(eqIdx + 1).trim().toUpperCase();
                    props['PARAM_' + pKey] = pVal;
                }
            }
        }

        if (!props[propName]) {
            props[propName] = propValue;
        }
    }

    // 必须有 DTSTART
    if (!props['DTSTART']) {
        throw new Error('事件缺少 DTSTART');
    }

    const rawStart = props['DTSTART'];
    const rawEnd = props['DTEND'] || rawStart;
    const isAllDay = props['PARAM_VALUE'] === 'DATE' || 
                     (rawStart.length === 8 && !rawStart.includes('T'));

    // 解析 ISO 日期
    const start = parseICSDate(rawStart, isAllDay);
    const end = parseICSDate(rawEnd, isAllDay);

    if (!start) {
        throw new Error('无法解析日期: ' + rawStart);
    }

    // 处理 RRULE
    let rrule = null;
    if (props['RRULE']) {
        rrule = parseRRule(props['RRULE'], start);
    }

    // 生成唯一 ID
    const uid = props['UID'] || (subscriptionId + '_evt_' + index + '_' + Date.now());
    const safeUid = uid.replace(/[^a-zA-Z0-9@._-]/g, '_');

    const event = {
        id: 'ical_' + safeUid,
        title: decodeICSString(props['SUMMARY'] || '(无标题)'),
        start: start,
        end: end,
        allDay: isAllDay,
        description: decodeICSString(props['DESCRIPTION'] || ''),
        location: decodeICSString(props['LOCATION'] || ''),
        isSubscription: true,
        subscriptionId: subscriptionId
    };

    if (rrule) {
        event.rrule = rrule;
    }

    return event;
}

/**
 * 解析 ICS 日期字符串为 ISO 8601 格式
 * 支持: 20250101T140000Z, 20250101T140000, 20250101
 */
function parseICSDate(dateStr, isAllDay) {
    if (!dateStr || typeof dateStr !== 'string') return null;

    // 移除可能的 T 和 Z
    const cleaned = dateStr.replace(/[TZ]/g, ' ').trim();

    let year, month, day, hours = 0, minutes = 0, seconds = 0;

    if (cleaned.length >= 8) {
        year = parseInt(cleaned.substring(0, 4), 10);
        month = parseInt(cleaned.substring(4, 6), 10);
        day = parseInt(cleaned.substring(6, 8), 10);
    } else {
        return null;
    }

    if (cleaned.length >= 15 && !isAllDay) {
        hours = parseInt(cleaned.substring(9, 11), 10) || 0;
        minutes = parseInt(cleaned.substring(11, 13), 10) || 0;
        seconds = parseInt(cleaned.substring(13, 15), 10) || 0;
    }

    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    const pad = function(n) { return String(n).padStart(2, '0'); };

    if (isAllDay) {
        return year + '-' + pad(month) + '-' + pad(day);
    }
    return year + '-' + pad(month) + '-' + pad(day) + 'T' + pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}

/**
 * 解析 RRULE 字符串为简单配置对象
 */
function parseRRule(rruleStr, dtstart) {
    if (typeof RRule === 'undefined') {
        console.warn('RRule 库未加载，跳过重复规则解析');
        return null;
    }

    try {
        const parts = rruleStr.split(';');
        const config = { dtstart: new Date(dtstart) };

        for (const part of parts) {
            const eqIdx = part.indexOf('=');
            if (eqIdx === -1) continue;
            const key = part.substring(0, eqIdx).trim().toUpperCase();
            const val = part.substring(eqIdx + 1).trim();

            switch (key) {
                case 'FREQ':
                    switch (val.toUpperCase()) {
                        case 'DAILY': config.freq = RRule.DAILY; break;
                        case 'WEEKLY': config.freq = RRule.WEEKLY; break;
                        case 'MONTHLY': config.freq = RRule.MONTHLY; break;
                        case 'YEARLY': config.freq = RRule.YEARLY; break;
                        default: config.freq = RRule.DAILY;
                    }
                    break;
                case 'INTERVAL':
                    config.interval = parseInt(val, 10) || 1;
                    break;
                case 'UNTIL':
                    const untilDate = parseICSDate(val.replace(/Z$/, ''), false);
                    if (untilDate) config.until = new Date(untilDate);
                    break;
                case 'BYDAY':
                    config.byweekday = val.split(',').map(function(d) {
                        const dayMap = { MO: RRule.MO, TU: RRule.TU, WE: RRule.WE, TH: RRule.TH, FR: RRule.FR, SA: RRule.SA, SU: RRule.SU };
                        return dayMap[d.trim().toUpperCase()] || null;
                    }).filter(Boolean);
                    break;
                case 'COUNT':
                    config.count = parseInt(val, 10);
                    break;
            }
        }

        if (!config.freq) return null;

        // 验证 RRule 合法性
        new RRule(config);
        return config;
    } catch (e) {
        console.warn('RRule 解析失败:', rruleStr, e);
        return null;
    }
}

/**
 * 解码 ICS 转义字符
 */
function decodeICSString(str) {
    if (!str) return '';
    return str
        .replace(/\\,/g, ',')
        .replace(/\\;/g, ';')
        .replace(/\\\\/g, '\\')
        .replace(/\\n/g, '\n')
        .replace(/\\N/g, '\n');
}

// ==========================================
// 订阅管理器
// ==========================================

/**
 * 获取所有订阅源
 */
function getSubscriptions() {
    try {
        return JSON.parse(localStorage.getItem(SUBSCRIPTIONS_KEY) || '[]');
    } catch (e) {
        console.error('读取订阅列表失败:', e);
        return [];
    }
}

/**
 * 保存订阅源列表
 */
function saveSubscriptions(subs) {
    localStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(subs));
}

/**
 * 获取订阅事件缓存
 */
function getSubscriptionCache() {
    try {
        return JSON.parse(localStorage.getItem(SUB_CACHE_KEY) || '{}');
    } catch (e) {
        return {};
    }
}

/**
 * 保存订阅事件缓存
 */
function saveSubscriptionCache(cache) {
    localStorage.setItem(SUB_CACHE_KEY, JSON.stringify(cache));
}

// ==========================================
// CalDAV 客户端（纯前端实现）
// ==========================================

/**
 * CalDAV 通用请求（支持 PROPFIND / REPORT 等自定义方法）
 */
async function caldavFetch(url, method, body, username, password, extraHeaders) {
    extraHeaders = extraHeaders || {};

    const authHeaders = {};
    if (username && password) {
        authHeaders['Authorization'] = 'Basic ' + btoa(username + ':' + password);
    }

    const fetchOptions = {
        method: method,
        headers: Object.assign({
            'Content-Type': 'application/xml; charset=utf-8',
            'Accept': 'application/xml, text/xml, */*'
        }, extraHeaders, authHeaders),
        body: body || undefined
    };

    // 尝试直连
    try {
        const resp = await fetch(url, fetchOptions);
        if (resp.ok) return resp;
        console.warn('[CalDAV] 直连返回 ' + resp.status + ': ' + resp.statusText);
    } catch (e) {
        console.warn('[CalDAV] 直连失败:', e.message);
    }

    // 尝试通过 CORS 代理（POST + method override）
    for (var i = 0; i < CORS_PROXIES.length; i++) {
        var proxy = CORS_PROXIES[i];
        if (!proxy) continue;
        try {
            var proxyUrl = proxy + encodeURIComponent(url);
            var proxyResp = await fetch(proxyUrl, {
                method: 'POST',
                headers: Object.assign({
                    'Content-Type': 'application/xml; charset=utf-8',
                    'Accept': 'application/xml, text/xml, */*',
                    'X-HTTP-Method-Override': method
                }, extraHeaders, authHeaders),
                body: body || undefined
            });
            if (proxyResp.ok) return proxyResp;
        } catch (e) {
            console.warn('[CalDAV] 代理 ' + proxy + ' 失败:', e.message);
        }
    }

    throw new Error('CalDAV 连接失败：直连和代理均不可用。请确认服务器支持跨域，或配置反向代理。');
}

/**
 * 解析 XML 中所有 href 和 displayname
 */
function caldavParseHrefs(xmlText, baseUrl) {
    var calendars = [];
    // 匹配 <D:href>...</D:href> 或 <d:href>...</d:href>
    var hrefRegex = /<[dD]:href>([^<]+)<\/[dD]:href>/g;
    var displayRegex = /<[dD]:displayname>([^<]*)<\/[dD]:displayname>/g;

    var hrefs = [];
    var displays = [];
    var m;

    while ((m = hrefRegex.exec(xmlText)) !== null) {
        hrefs.push(m[1]);
    }
    while ((m = displayRegex.exec(xmlText)) !== null) {
        displays.push(m[1]);
    }

    // 检查哪些资源是日历集合（包含 calendar 资源类型）
    var blocks = xmlText.split(/<[dD]:response>/i);
    for (var b = 1; b < blocks.length; b++) {
        var block = blocks[b];
        if (block.indexOf('calendar') !== -1 || block.indexOf('CALENDAR') !== -1) {
            var hrefMatch = /<[dD]:href>([^<]+)<\/[dD]:href>/i.exec(block);
            var nameMatch = /<[dD]:displayname>([^<]*)<\/[dD]:displayname>/i.exec(block);
            if (hrefMatch) {
                calendars.push({
                    href: hrefMatch[1],
                    name: (nameMatch && nameMatch[1]) || hrefMatch[1].split('/').filter(Boolean).pop() || '日历'
                });
            }
        }
    }

    // 如果没通过 resource type 找到，退回使用所有 href
    if (calendars.length === 0) {
        for (var j = 0; j < hrefs.length; j++) {
            if (hrefs[j] !== baseUrl && hrefs[j] !== '/') {
                calendars.push({
                    href: hrefs[j],
                    name: displays[j] || hrefs[j].split('/').filter(Boolean).pop() || ('日历 ' + (j + 1))
                });
            }
        }
    }

    return calendars;
}

/**
 * PROPFIND 发现 CalDAV 日历集合
 * @returns {Array} [{href, name}, ...]
 */
async function caldavDiscoverCalendars(serverUrl, username, password) {
    var propfindBody = '<?xml version="1.0" encoding="UTF-8"?>' +
        '<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">' +
        '<D:prop>' +
        '<D:resourcetype/>' +
        '<D:displayname/>' +
        '</D:prop>' +
        '</D:propfind>';

    var resp = await caldavFetch(serverUrl, 'PROPFIND', propfindBody, username, password, {
        'Depth': '1'
    });

    var xmlText = await resp.text();
    return caldavParseHrefs(xmlText, serverUrl);
}

/**
 * REPORT calendar-query 获取日历事件
 */
async function caldavFetchEvents(calendarUrl, username, password) {
    var now = new Date();
    var threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    var sixMonthsLater = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

    var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
    var fmtDate = function(d) {
        return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T000000Z';
    };

    var reportBody = '<?xml version="1.0" encoding="UTF-8"?>' +
        '<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">' +
        '<D:prop>' +
        '<D:getetag/>' +
        '<C:calendar-data/>' +
        '</D:prop>' +
        '<C:filter>' +
        '<C:comp-filter name="VCALENDAR">' +
        '<C:comp-filter name="VEVENT">' +
        '<C:time-range start="' + fmtDate(threeMonthsAgo) + '" end="' + fmtDate(sixMonthsLater) + '"/>' +
        '</C:comp-filter>' +
        '</C:comp-filter>' +
        '</C:filter>' +
        '</C:calendar-query>';

    var resp = await caldavFetch(calendarUrl, 'REPORT', reportBody, username, password, {
        'Depth': '1'
    });

    return await resp.text();
}

/**
 * 从 CalDAV REPORT 响应中提取 ICS 数据并解析为事件
 */
function caldavExtractICS(xmlText, subscriptionId) {
    // 提取所有 <CALDAV:calendar-data> 或 <C:calendar-data> 中的内容
    var cdRegex = /<[cC](?:ALDAV)?:calendar-data[^>]*>([\s\S]*?)<\/[cC](?:ALDAV)?:calendar-data>/gi;
    var allICS = '';
    var m;

    while ((m = cdRegex.exec(xmlText)) !== null) {
        allICS += m[1] + '\n';
    }

    if (!allICS.trim()) {
        // 尝试提取 CDATA 中的内容
        var cdataRegex = /<!\[CDATA\[([\s\S]*?)\]\]>/gi;
        var cdataICS = '';
        while ((m = cdataRegex.exec(xmlText)) !== null) {
            if (m[1].indexOf('BEGIN:VEVENT') !== -1) {
                cdataICS += m[1] + '\n';
            }
        }
        if (cdataICS.trim()) {
            allICS = cdataICS;
        }
    }

    if (!allICS.trim()) {
        throw new Error('CalDAV 响应中未找到日历事件数据');
    }

    // 用现有 ICS 解析器解析
    var wrappedICS = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//CalDAV Client//EN\n' + allICS + '\nEND:VCALENDAR';
    return parseICS(wrappedICS, subscriptionId);
}

/**
 * 同步单个 CalDAV 订阅源
 */
async function syncCalDAVSubscription(sub) {
    if (!sub.url) throw new Error('CalDAV 服务器地址为空');
    if (!sub.username || !sub.password) throw new Error('CalDAV 需要用户名和密码');

    // 如果 URL 已经是具体日历路径（以 .ics 结尾或包含具体日历标识），直接用 REPORT
    if (sub.url.match(/\.ics$/i) || sub.url.indexOf('/calendars/') !== -1) {
        var xmlText = await caldavFetchEvents(sub.url, sub.username, sub.password);
        return caldavExtractICS(xmlText, sub.id);
    }

    // 否则先 PROPFIND 发现日历，再逐一获取事件
    var calendars;
    try {
        calendars = await caldavDiscoverCalendars(sub.url, sub.username, sub.password);
    } catch (e) {
        // 如果 PROPFIND 失败，尝试直接 REPORT
        console.warn('[CalDAV] PROPFIND 失败，尝试直接 REPORT:', e.message);
        var xmlText2 = await caldavFetchEvents(sub.url, sub.username, sub.password);
        return caldavExtractICS(xmlText2, sub.id);
    }

    if (calendars.length === 0) {
        throw new Error('未在服务器上发现日历集合。请确认 CalDAV 地址正确。');
    }

    console.log('[CalDAV] 发现 ' + calendars.length + ' 个日历: ' + calendars.map(function(c) { return c.name; }).join(', '));

    // 获取所有日历的事件并合并
    var allEvents = [];
    for (var i = 0; i < calendars.length; i++) {
        try {
            var calUrl = calendars[i].href;
            // 拼接完整 URL
            if (!calUrl.match(/^https?:\/\//)) {
                var baseUrl = sub.url.replace(/\/+$/, '');
                calUrl = baseUrl + (calUrl.charAt(0) === '/' ? '' : '/') + calUrl;
            }
            var xml = await caldavFetchEvents(calUrl, sub.username, sub.password);
            var events = caldavExtractICS(xml, sub.id);
            allEvents = allEvents.concat(events);
            console.log('[CalDAV] 日历 "' + calendars[i].name + '" 获取 ' + events.length + ' 个事件');
        } catch (e) {
            console.warn('[CalDAV] 获取日历 "' + calendars[i].name + '" 失败:', e.message);
        }
    }

    if (allEvents.length === 0) {
        throw new Error('所有日历均未获取到事件');
    }

    return allEvents;
}

// ==========================================
// 订阅管理器
// ==========================================

/**
 * 添加订阅源
 */
async function addSubscription(name, url, color, type, username, password) {
    if (!name || !url) {
        throw new Error('名称和链接不能为空');
    }

    type = type || 'ics';

    // 基本 URL 校验（CalDAV URL 可能不是完整 URL 格式，宽松校验）
    if (type === 'ics') {
        try {
            new URL(url);
        } catch (e) {
            throw new Error('无效的订阅链接格式');
        }
    } else {
        // CalDAV URL 至少需要以 http:// 或 https:// 开头
        if (!url.match(/^https?:\/\//)) {
            throw new Error('CalDAV 地址需以 http:// 或 https:// 开头');
        }
        if (!username || !password) {
            throw new Error('CalDAV 订阅需要提供用户名和密码');
        }
    }

    const subs = getSubscriptions();
    const id = 'sub_' + Date.now();

    const newSub = {
        id: id,
        name: name.trim(),
        type: type,
        url: url.trim(),
        username: username ? username.trim() : null,
        password: password || null,
        color: color || SUBSCRIPTION_COLORS[subs.length % SUBSCRIPTION_COLORS.length].bg,
        textColor: SUBSCRIPTION_COLORS.find(function(c) { return c.bg === color; })?.text || '#ffffff',
        enabled: true,
        lastSync: null,
        error: null
    };

    subs.push(newSub);
    saveSubscriptions(subs);

    // 立即同步一次
    await syncSubscription(id);

    return newSub;
}

/**
 * 删除订阅源
 */
function deleteSubscription(subId) {
    let subs = getSubscriptions();
    subs = subs.filter(function(s) { return s.id !== subId; });
    saveSubscriptions(subs);

    // 清理缓存
    const cache = getSubscriptionCache();
    delete cache[subId];
    saveSubscriptionCache(cache);
}

/**
 * 切换订阅源启用状态
 */
function toggleSubscription(subId) {
    const subs = getSubscriptions();
    const sub = subs.find(function(s) { return s.id === subId; });
    if (sub) {
        sub.enabled = !sub.enabled;
        saveSubscriptions(subs);
        refreshCalendarData();
    }
}

/**
 * 同步单个订阅源
 */
async function syncSubscription(subId) {
    const subs = getSubscriptions();
    const sub = subs.find(function(s) { return s.id === subId; });
    if (!sub) return;

    // --- CalDAV 路径 ---
    if (sub.type === 'caldav') {
        let events;
        try {
            events = await syncCalDAVSubscription(sub);
        } catch (e) {
            sub.error = e.message;
            sub.lastSync = new Date().toISOString();
            const idx = subs.findIndex(function(s) { return s.id === subId; });
            if (idx !== -1) subs[idx] = sub;
            saveSubscriptions(subs);
            throw e;
        }

        // 保存缓存
        const cache = getSubscriptionCache();
        cache[subId] = events;
        saveSubscriptionCache(cache);

        sub.error = null;
        sub.lastSync = new Date().toISOString();
        const idx = subs.findIndex(function(s) { return s.id === subId; });
        if (idx !== -1) subs[idx] = sub;
        saveSubscriptions(subs);

        console.log('[CalDAV] "' + sub.name + '" 同步成功，' + events.length + ' 个事件');
        return events;
    }

    // --- ICS 路径 ---
    let lastError = null;
    let icsText = null;

    // 尝试多种方式获取 ICS 内容（直连 → CORS 代理）
    for (const proxy of CORS_PROXIES) {
        try {
            const fetchUrl = proxy ? (proxy + encodeURIComponent(sub.url)) : sub.url;
            console.log('[订阅] 尝试获取: ' + fetchUrl.substring(0, 80) + '...');

            const controller = new AbortController();
            const timeoutId = setTimeout(function() { controller.abort(); }, 15000);

            const resp = await fetch(fetchUrl, {
                signal: controller.signal,
                headers: { 'Accept': 'text/calendar, text/plain, */*' }
            });
            clearTimeout(timeoutId);

            if (!resp.ok) {
                throw new Error('HTTP ' + resp.status + ': ' + resp.statusText);
            }

            icsText = await resp.text();

            // 验证是否为 ICS 内容
            if (!icsText.includes('BEGIN:VCALENDAR') && !icsText.includes('BEGIN:VEVENT')) {
                throw new Error('返回内容不是有效的 ICS 日历格式');
            }

            break;
        } catch (e) {
            lastError = e;
            console.warn('[订阅] 获取失败 (' + (proxy || '直连') + '):', e.message);
        }
    }

    if (!icsText) {
        sub.error = lastError ? lastError.message : '未知错误';
        sub.lastSync = new Date().toISOString();
        const idx = subs.findIndex(function(s) { return s.id === subId; });
        if (idx !== -1) subs[idx] = sub;
        saveSubscriptions(subs);
        throw new Error('所有获取方式均失败: ' + sub.error);
    }

    // 解析 ICS
    let events;
    try {
        events = parseICS(icsText, subId);
    } catch (parseErr) {
        sub.error = '解析失败: ' + parseErr.message;
        sub.lastSync = new Date().toISOString();
        const idx = subs.findIndex(function(s) { return s.id === subId; });
        if (idx !== -1) subs[idx] = sub;
        saveSubscriptions(subs);
        throw parseErr;
    }

    // 保存缓存
    const cache = getSubscriptionCache();
    cache[subId] = events;
    saveSubscriptionCache(cache);

    // 更新订阅状态
    sub.error = null;
    sub.lastSync = new Date().toISOString();
    const idx = subs.findIndex(function(s) { return s.id === subId; });
    if (idx !== -1) subs[idx] = sub;
    saveSubscriptions(subs);

    console.log('[订阅] "' + sub.name + '" 同步成功，' + events.length + ' 个事件');
    return events;
}

/**
 * 同步所有启用的订阅源
 */
async function syncAllSubscriptions() {
    const subs = getSubscriptions().filter(function(s) { return s.enabled; });
    if (subs.length === 0) return;

    console.log('[订阅] 开始同步 ' + subs.length + ' 个订阅源...');
    const results = await Promise.allSettled(
        subs.map(function(sub) { return syncSubscription(sub.id); })
    );

    let successCount = 0;
    let failCount = 0;
    results.forEach(function(r, i) {
        if (r.status === 'fulfilled') {
            successCount++;
        } else {
            failCount++;
            console.warn('[订阅] "' + subs[i].name + '" 同步失败:', r.reason);
        }
    });

    console.log('[订阅] 同步完成: ' + successCount + ' 成功, ' + failCount + ' 失败');

    if (successCount > 0) {
        refreshCalendarData();
    }
}

/**
 * 手动触发所有订阅同步（用户点击）
 */
async function manualRefreshSubscriptions() {
    const subs = getSubscriptions().filter(function(s) { return s.enabled; });
    if (subs.length === 0) {
        alert('没有启用的订阅源');
        return;
    }

    const refreshBtn = document.getElementById('subscriptionRefreshBtn');
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> 同步中...';
    }

    try {
        await syncAllSubscriptions();
        renderSubscriptionList();
        alert('订阅刷新完成');
    } catch (e) {
        console.error('手动刷新订阅失败:', e);
    } finally {
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="ri-refresh-line"></i> 刷新全部';
        }
    }
}

// --- UI 渲染函数 ---

/**
 * 打开订阅管理弹窗
 */
function openSubscriptionManager() {
    const modal = document.getElementById('subscriptionModal');
    if (!modal) {
        console.error('订阅管理弹窗不存在');
        return;
    }
    renderSubscriptionList();
    modal.showModal();
}

/**
 * 关闭订阅管理弹窗
 */
function closeSubscriptionManager() {
    const modal = document.getElementById('subscriptionModal');
    if (modal) modal.close();
}

/**
 * 渲染订阅列表
 */
function renderSubscriptionList() {
    const container = document.getElementById('subscriptionList');
    if (!container) return;

    const subs = getSubscriptions();
    const cache = getSubscriptionCache();

    if (subs.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-sub);"><i class="ri-calendar-2-line" style="font-size:2rem; display:block; margin-bottom:10px;"></i>暂无订阅源，点击上方按钮添加</div>';
        return;
    }

    container.innerHTML = subs.map(function(sub) {
        const cachedCount = (cache[sub.id] || []).length;
        const statusIcon = sub.enabled
            ? (sub.error ? '⚠️' : '✅')
            : '⏸️';
        const statusClass = sub.error ? 'sub-status-error' : (sub.enabled ? 'sub-status-ok' : 'sub-status-paused');
        const lastSyncText = sub.lastSync
            ? new Date(sub.lastSync).toLocaleString('zh-CN')
            : '从未同步';
        const isCaldav = sub.type === 'caldav';
        const typeBadge = isCaldav
            ? '<span class="sub-type-badge caldav"><i class="ri-sync-line"></i> CalDAV</span>'
            : '<span class="sub-type-badge ics"><i class="ri-link"></i> ICS</span>';

        return '<div class="subscription-item ' + statusClass + '">' +
            '<div class="sub-item-header">' +
                '<span class="sub-color-dot" style="background:' + sub.color + '"></span>' +
                '<span class="sub-name">' + escapeHtml(sub.name) + '</span>' +
                typeBadge +
                '<span class="sub-status-text">' + statusIcon + '</span>' +
            '</div>' +
            '<div class="sub-item-body">' +
                '<div class="sub-url" title="' + escapeHtml(sub.url) + '">' +
                    escapeHtml(sub.url.substring(0, 50)) + (sub.url.length > 50 ? '...' : '') +
                '</div>' +
                '<div class="sub-meta">' +
                    '<span>事件: ' + cachedCount + '</span>' +
                    '<span>同步: ' + lastSyncText + '</span>' +
                '</div>' +
                (sub.error ? '<div class="sub-error">' + escapeHtml(sub.error) + '</div>' : '') +
            '</div>' +
            '<div class="sub-item-actions">' +
                '<button class="btn btn-small" onclick="syncSubscription(\'' + sub.id + '\').then(function(){ renderSubscriptionList(); refreshCalendarData(); }).catch(function(){ renderSubscriptionList(); })" title="立即同步">' +
                    '<i class="ri-refresh-line"></i>' +
                '</button>' +
                '<button class="btn btn-small" onclick="toggleSubscription(\'' + sub.id + '\'); renderSubscriptionList();" title="' + (sub.enabled ? '禁用' : '启用') + '">' +
                    '<i class="' + (sub.enabled ? 'ri-pause-line' : 'ri-play-line') + '"></i>' +
                '</button>' +
                '<button class="btn btn-small btn-danger" onclick="if(confirm(\'确定删除订阅「' + escapeHtml(sub.name) + '」？\')){ deleteSubscription(\'' + sub.id + '\'); renderSubscriptionList(); refreshCalendarData(); }" title="删除">' +
                    '<i class="ri-delete-bin-line"></i>' +
                '</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

/**
 * 处理添加订阅表单提交
 */
async function handleAddSubscription() {
    const nameInput = document.getElementById('subNameInput');
    const urlInput = document.getElementById('subUrlInput');
    const colorInput = document.getElementById('subColorSelect');
    const typeInput = document.getElementById('subTypeSelect');
    const usernameInput = document.getElementById('subUsernameInput');
    const passwordInput = document.getElementById('subPasswordInput');
    const addBtn = document.getElementById('subAddBtn');

    if (!nameInput || !urlInput) return;

    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    const color = colorInput ? colorInput.value : null;
    const type = typeInput ? typeInput.value : 'ics';
    const username = usernameInput ? usernameInput.value.trim() : null;
    const password = passwordInput ? passwordInput.value : null;

    if (!name || !url) {
        alert('请填写订阅名称和链接');
        return;
    }

    if (type === 'caldav' && (!username || !password)) {
        alert('CalDAV 订阅需要填写用户名和密码');
        return;
    }

    if (addBtn) {
        addBtn.disabled = true;
        addBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> 添加中...';
    }

    try {
        await addSubscription(name, url, color, type, username, password);
        nameInput.value = '';
        urlInput.value = '';
        if (usernameInput) usernameInput.value = '';
        if (passwordInput) passwordInput.value = '';
        renderSubscriptionList();
        refreshCalendarData();
    } catch (e) {
        alert('添加失败: ' + e.message);
    } finally {
        if (addBtn) {
            addBtn.disabled = false;
            addBtn.innerHTML = '<i class="ri-add-line"></i> 添加';
        }
    }
}

/**
 * HTML 转义（防 XSS）
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

// --- 初始化 ---

/**
 * 启动自动刷新定时器
 */
let subscriptionRefreshTimer = null;

function startAutoRefresh() {
    if (subscriptionRefreshTimer) {
        clearInterval(subscriptionRefreshTimer);
    }

    // 首次延迟 10 秒后执行（等页面初始化完成）
    setTimeout(function() {
        syncAllSubscriptions();
    }, 10000);

    // 定期刷新
    subscriptionRefreshTimer = setInterval(function() {
        syncAllSubscriptions();
    }, AUTO_REFRESH_INTERVAL);

    console.log('[订阅] 自动刷新已启动（间隔: ' + (AUTO_REFRESH_INTERVAL / 60000) + ' 分钟）');
}

// 页面加载后启动自动刷新
setTimeout(function() {
    startAutoRefresh();
}, 3000);

// #endregion

// #region 14. 日程导出功能 =========================
function exportToICS() {
    const events = JSON.parse(localStorage.getItem('calendarEvents')) || [];
    if (events.length === 0) {
        alert('没有可导出的日程');
        return;
    }

    let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//My Blog//Calendar//CN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ];

    // 辅助：格式化日期为 ICS 格式 (YYYYMMDDTHHMMSS) - 本地时间
    const formatICSDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        
        const pad = n => n < 10 ? '0' + n : n;
        return '' + date.getFullYear() + 
               pad(date.getMonth() + 1) + 
               pad(date.getDate()) + 'T' + 
               pad(date.getHours()) + 
               pad(date.getMinutes()) + 
               pad(date.getSeconds());
    };

    events.forEach(event => {
        icsContent.push('BEGIN:VEVENT');
        icsContent.push(`UID:${event.id}@myblog`);
        // DTSTAMP 使用 UTC 格式
        icsContent.push('DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z');
        
        if (event.start) icsContent.push(`DTSTART:${formatICSDate(event.start)}`);
        if (event.end) icsContent.push(`DTEND:${formatICSDate(event.end)}`);
        
        icsContent.push(`SUMMARY:${event.title || '未命名日程'}`);
        
        if (event.extendedProps?.description) {
            icsContent.push(`DESCRIPTION:${event.extendedProps.description.replace(/\n/g, '\\n')}`);
        }
        if (event.extendedProps?.location) {
            icsContent.push(`LOCATION:${event.extendedProps.location}`);
        }

        // 尝试处理 RRule
        if (event.rrule && typeof RRule !== 'undefined') {
            try {
                const rruleOptions = { ...event.rrule };
                if (rruleOptions.dtstart) rruleOptions.dtstart = new Date(rruleOptions.dtstart);
                if (rruleOptions.until) rruleOptions.until = new Date(rruleOptions.until);
                const rule = new RRule(rruleOptions);
                icsContent.push(rule.toString());
            } catch (e) { console.warn('RRule export skipped', e); }
        }

        icsContent.push('END:VEVENT');
    });

    icsContent.push('END:VCALENDAR');

    // 创建下载链接
    const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `calendar_export_${new Date().toISOString().slice(0,10)}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
// #endregion