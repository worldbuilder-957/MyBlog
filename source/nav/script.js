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

// #region 4. 待办人物事项======================================================
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

// #region 8. 快捷链接模块 (Wetab风格) =========================

// 1. 定义应用数据 (你想加什么就在这里写，不用动 HTML)
const apps = [
    { name: "Bilibili", url: "https://www.bilibili.com", icon: "ri-bilibili-line", color: "#fb7299" },
    { name: "GitHub", url: "https://github.com", icon: "ri-github-fill", color: "#fff" },
    { name: "ChatGPT", url: "https://chat.openai.com", icon: "ri-openai-fill", color: "#10a37f" },
    { name: "YouTube", url: "https://www.youtube.com", icon: "ri-youtube-fill", color: "#ff0000" },
    { name: "邮箱",     url: "https://mail.google.com", icon: "ri-mail-line",    color: "#4285f4" },
    { name: "知乎",     url: "https://www.zhihu.com",   icon: "ri-zhihu-line",   color: "#0084ff" },
    // 你可以无限复制上面这一行来添加新图标...
];

// 2. 渲染函数：把数据变成 HTML
function renderApps() {
    const container = document.getElementById('app-grid');
    if (!container) return; // 安全检查

    // 使用 map 方法遍历数组，生成一串 HTML 字符串
    const html = apps.map(app => `
        <a href="${app.url}" target="_blank" class="app-item">
            <div class="app-icon" style="color: ${app.color};">
                <i class="${app.icon}"></i>
            </div>
            <span class="app-name">${app.name}</span>
        </a>
    `).join('');

    // 一次性插入到页面中
    container.innerHTML = html;
}

// 3. 启动渲染
renderApps();

// #endregion =================================

// #region 9. 日历系统逻辑 =========================

let calendarInstance = null; // 保存日历实例
let currentEventId = null; // 当前编辑的事件ID
let currentEventStart = null; // 当前编辑事件的开始时间 (用于区分重复事件的具体实例)

// --- 🎨 新增：颜色分类配置 ---
const EVENT_COLORS = [
    { name: '默认', value: '#6b7280' }, // 灰色
    { name: '工作', value: '#67a1ffe1' }, // 蓝色
    { name: '生活', value: '#33edafe2' }, // 绿色
    { name: '重要', value: '#ea6363e7' }, // 红色
    { name: '学习', value: '#a37efbdc' }  // 紫色
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
        
        const eventData = {
            id: event.id,
            title: event.title || '未命名事件',
            start: startTime,
            end: endTime,
            backgroundColor: event.backgroundColor || '#6b7280',
            borderColor: event.borderColor || '#6b7280',
            textColor: event.textColor || '#ffffff',
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
        
        // 创建事件对象
        const eventData = {
            id: currentEventId || Date.now().toString(),
            title: title,
            start: start,
            end: end,
            backgroundColor: color, // 🎨 保存背景色
            borderColor: color,     // 🎨 边框同色
            extendedProps: {
                location: location || '',
                reminder: reminder || 0,
                description: description || ''  // 确保备注字段始终存在，即使为空字符串
            }
        };
        
        // 添加重复规则（仅在RRule可用时）
        if (repeat && typeof RRule !== 'undefined') {
            try {
                let rruleConfig = {
                    freq: null,
                    dtstart: start
                };
                
                // 处理截止日期 (UNTIL)
                if (customEndDate) {
                    const u = new Date(customEndDate);
                    u.setHours(23, 59, 59); // 设置为当天结束
                    rruleConfig.until = u;
                }

                switch (repeat) {
                    case 'daily':
                        rruleConfig.freq = RRule.DAILY;
                        break;
                    case 'weekly':
                        rruleConfig.freq = RRule.WEEKLY;
                        break;
                    case 'monthly':
                        rruleConfig.freq = RRule.MONTHLY;
                        break;
                    case 'workweek':
                        rruleConfig.freq = RRule.DAILY;
                        rruleConfig.byweekday = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR];
                        break;
                    case 'custom':
                        rruleConfig.freq = RRule.DAILY;
                        rruleConfig.interval = customInterval;
                        break;
                }
                
                if (rruleConfig.freq !== null) {
                    eventData.rrule = rruleConfig;
                }
            } catch (rruleError) {
                console.warn('RRule配置失败，将保存为不重复事件:', rruleError);
                // 如果RRule配置失败，继续保存但不添加重复规则
            }
        }
        
        // 保存到存储
        let events = JSON.parse(localStorage.getItem('calendarEvents')) || [];
        
        if (currentEventId) {
            // 更新已有事件
            const eventIndex = events.findIndex(e => e.id === currentEventId);
            if (eventIndex !== -1) {
                events[eventIndex] = eventData;
            } else {
                // 如果找不到，添加为新事件
                events.push(eventData);
            }
        } else {
            // 添加新事件
            events.push(eventData);
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
        
        console.log('事件保存成功:', eventData);
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