// #region 1. 时钟功能模块=======================================================
function updateTime() {
    const now = new Date();
    document.getElementById('clock').innerText = now.toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute:'2-digit',second:"2-digit"});
    document.getElementById('date').innerText = now.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});
}
setInterval(updateTime, 1000);
updateTime();
// #endregion =================================================================

// #region 2. 日历功能模块 (多时期版)=======================================================
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

// #region 3. 超级待办事项 (Pro版)======================================================
const todoListEl = document.getElementById('todoList');
const modal = document.getElementById('taskModal');

// 读取数据：如果没有旧数据，初始化一个包含元数据的示例
let todos = JSON.parse(localStorage.getItem('myRichTodos')) || [
    { id: 1, text: '完成指挥室搭建', date: '2025-12-31', loc: '宿舍', tags: ['Dev', '紧急'], done: false }
];

// --- A. 渲染核心 ---
function renderTodos(filterText = '') {
    todoListEl.innerHTML = '';
    
    // 过滤逻辑：搜索 标题 或 标签
    const filtered = todos.filter(t => 
        t.text.toLowerCase().includes(filterText.toLowerCase()) || 
        t.tags.some(tag => tag.toLowerCase().includes(filterText.toLowerCase()))
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
            metaHtml += `</div>`;
        }

        li.innerHTML = `
            <div class="todo-header">
                <input type="checkbox" ${todo.done ? 'checked' : ''} onclick="toggleTodo(${todo.id})">
                <span class="todo-text ${todo.done ? 'done' : ''}">${todo.text}</span>
                <i class="ri-close-circle-line" style="color:var(--text-sub); cursor:pointer; margin-left:auto;" onclick="deleteTodo(${todo.id})"></i>
            </div>
            ${metaHtml}
            <div class="tags-row">${tagsHtml}</div>
        `;
        todoListEl.appendChild(li);
    });
}

// --- B. 数据操作 ---
function addTask() {
    const text = document.getElementById('taskInput').value;
    const date = document.getElementById('taskDate').value;
    const loc = document.getElementById('taskLoc').value;
    const tagsStr = document.getElementById('taskTags').value;
    
    if (!text.trim()) return alert("任务内容不能为空！");

    const newTodo = {
        id: Date.now(), // 使用时间戳作为唯一ID
        text: text,
        date: date,
        loc: loc,
        tags: tagsStr.split(' ').filter(t => t), // 按空格分割标签
        done: false
    };

    todos.unshift(newTodo); // 加到最前面
    saveAndRender();
    closeTaskModal();
    
    // 清空表单
    document.getElementById('taskInput').value = '';
    document.getElementById('taskTags').value = '';
}

function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.done = !todo.done;
        saveAndRender();
    }
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
}

// 搜索监听
function filterTodos() {
    const query = document.getElementById('todoSearch').value;
    renderTodos(query);
}

// --- C. 弹窗控制 ---
function openTaskModal() { modal.showModal(); }
function closeTaskModal() { modal.close(); }

// 初始化
renderTodos();
// #endregion ================================================================= 

// #region 4. 天气功能 (通过API接入和风天气)==============================================
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

// #region 5. PWA 安装提示===========================================================
  let deferredPrompt;                                     // 用来存浏览器的“安装票据”
  const installBtn = document.getElementById('install-btn');

  // 1. 监听浏览器的“可安装”事件
  window.addEventListener('beforeinstallprompt', (e) => {
    // 阻止浏览器默认的（可能不会出现的）弹窗
    e.preventDefault();
    // 把事件存起来，等会儿用户点击按钮时再用
    deferredPrompt = e;
    // 把我们的自定义按钮显示出来
    installBtn.style.display = 'block';
    console.log('捕捉到安装事件，按钮已显示');

  // === 新增：检测设备类型 ===
    // 检查 UserAgent 字符串里是否包含 "Mobile" 或 "Android" 等关键词
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // 只有当它是移动设备时，才显示按钮
    if (isMobile) {
        installBtn.style.display = 'block';
        console.log('检测到移动设备，显示安装按钮');
    } else {
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
// #endregion ================================================================= 

// #region 6. 股票模块 (新浪静态图版) =========================
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

// #region 7. 快捷链接模块 (Wetab风格) =========================

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

// #region 8. 日历系统逻辑 =========================

let calendarInstance = null; // 保存日历实例
let currentEventId = null; // 当前编辑的事件ID

// 🚀 核心启动函数
function initCalendarSystem() {
    const calendarEl = document.getElementById('calendar');
    const containerEl = document.getElementById('external-events');
    
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
        initialView: 'timeGridWeek', // 周视图 
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridThreeDay,timeGridWeek,timeGridDay' // 月视图、三日视图、周视图、日视图
        },
        locale: 'zh-cn',
        firstDay: 1, // 周一开头
        height: 'auto', // 改为 auto 以自适应容器
        aspectRatio: 1.8, // 设置宽高比
        editable: true,     // 允许在日历里拖动
        droppable: true,    // ✨ 允许从外部拖进去！
        //plugins: ['rrule'], 理应集成RRule插件，但Gemini说这一行要注释掉
        // 时间网格配置 - 确保时间轴显示
        slotMinTime: '00:00:00', // 最早显示时间
        slotMaxTime: '24:00:00', // 最晚显示时间
        slotDuration: '00:30:00', // 时间间隔（30分钟）
        slotLabelInterval: '01:00:00', // 标签间隔（1小时）
        allDaySlot: true, // 显示全天事件区域
        // 自定义视图配置
        views: {
            dayGridMonth: {
                buttonText: '月'
            },
            timeGridThreeDay: {
                type: 'timeGrid',
                duration: { days: 3 },
                buttonText: '三日',
                slotMinTime: '00:00:00',
                slotMaxTime: '24:00:00',
                slotDuration: '00:30:00',
                slotLabelInterval: '01:00:00'
            },
            timeGridWeek: {
                buttonText: '周',
                slotMinTime: '00:00:00',
                slotMaxTime: '24:00:00',
                slotDuration: '00:30:00',
                slotLabelInterval: '01:00:00'
            },
            timeGridDay: {
                buttonText: '日',
                slotMinTime: '00:00:00',
                slotMaxTime: '24:00:00',
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
            updateTodoDate(info.event.id, info.event.startStr);
        },
        
        // 🔄 核心：拉伸任务改变时长时
        eventResize: function(info) {
             // 暂时我们只存开始时间，如果需要存时长，逻辑类似
             console.log("任务时长变了");
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
        if (!todo.date && !todo.done) { // 只显示未完成且无日期的
            const div = document.createElement('div');
            div.className = 'draggable-item';
            div.setAttribute('data-id', todo.id);
            div.innerText = todo.text;
            containerEl.appendChild(div);
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
    }
}

// 📁 保存到本地存储
function saveToStorage(events) {
    localStorage.setItem('calendarEvents', JSON.stringify(events));
}

// 🚪 界面操作：打开/关闭日历
function openCalendarView() {
    const modal = document.getElementById('calendarModal');
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
    document.getElementById('calendarModal').close();
}

// 📝 事件编辑模态框控制
function openEventModal(startDate = null) {
    const modal = document.getElementById('eventModal');
    const eventStart = document.getElementById('eventStart');
    const eventEnd = document.getElementById('eventEnd');
    
    // 重置表单
    document.getElementById('eventTitle').value = '';
    document.getElementById('eventLocation').value = '';
    document.getElementById('eventReminder').value = '0';
    document.getElementById('eventRepeat').value = '';
    document.getElementById('eventDescription').value = '';
    
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
    modal.showModal();
}

// 📝 编辑已有事件
function openEventModalForEdit(event) {
    const modal = document.getElementById('eventModal');
    
    // 确保 extendedProps 存在，兼容旧数据
    const extendedProps = event.extendedProps || {};
    
    document.getElementById('eventTitle').value = event.title || '';
    document.getElementById('eventStart').value = formatDateForInput(event.start);
    document.getElementById('eventEnd').value = formatDateForInput(event.end);
    document.getElementById('eventLocation').value = extendedProps.location || '';
    document.getElementById('eventReminder').value = extendedProps.reminder || '0';
    document.getElementById('eventDescription').value = extendedProps.description || '';  // 确保备注正确读取
    
    // 设置重复规则
    if (event.rrule) {
        let repeatValue = '';
        switch (event.rrule.freq) {
            case RRule.DAILY:
                if (event.rrule.byweekday) {
                    // 检查是否是工作日
                    const weekdays = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR];
                    if (JSON.stringify(event.rrule.byweekday) === JSON.stringify(weekdays)) {
                        repeatValue = 'workweek';
                    } else {
                        repeatValue = 'daily';
                    }
                } else {
                    repeatValue = 'daily';
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
    
    currentEventId = event.id;
    modal.showModal();
}

function closeEventModal() {
    document.getElementById('eventModal').close();
    currentEventId = null;
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
        const description = document.getElementById('eventDescription').value.trim();  // 读取备注并去除首尾空格
        
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
        
        console.log('事件保存成功:', eventData);
    } catch (error) {
        console.error('保存事件时出错:', error);
        alert('保存失败，请检查控制台错误信息');
    }
}

// 🛠️ 辅助函数：格式化日期为input类型的datetime-local格式
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

// #region 9. 搜索引擎及搜索功能实现 ========================

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
function selectEngine(engineKey) {
    // 更新当前引擎变量
    currentEngine = engineKey;
    
    // 更新左侧图标
    const icon = document.getElementById('current-engine-icon');
    icon.className = searchEngines[engineKey].icon;
    
    // (可选) 更新 Placeholder 提示文字
    // document.getElementById('search-input').placeholder = `Search with ${engineKey}...`;

    // 存入本地存储，下次打开记住选择
    localStorage.setItem('preferredEngine', currentEngine);
}

// 4. 执行搜索 (回车触发)
function handleSearch(e) {
    if (e.key === 'Enter') {
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