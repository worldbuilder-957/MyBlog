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
        { name: 'Spring', start: '2025-02-24', end: '2025-07-06', type: 'term' }, 
        { name: 'SummerHoliday', start: '2025-07-07', end: '2025-09-14', type: 'vacation' },
        { name: 'Fall', start: '2025-09-15', end: '2026-01-25', type: 'term' },
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

// #region 3. 搜索功能 (回车跳转)======================================================
function handleSearch(e) {
    if (e.key === 'Enter') {
        const query = document.getElementById('searchInput').value;
        window.location.href = `https://www.google.com/search?q=${query}`;
    }
}
// #endregion =================================================================

// #region 4. 超级待办事项 (Pro版)======================================================
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

// #region 5. 天气功能 (通过API接入和风天气)==============================================
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
  let deferredPrompt; // 用来存浏览器的“安装票据”
  const installBtn = document.getElementById('install-btn');

  // 1. 监听浏览器的“可安装”事件
  window.addEventListener('beforeinstallprompt', (e) => {
    // 阻止浏览器默认的（可能不会出现的）弹窗
    e.preventDefault();
    // 把事件存起来，等会儿用户点击按钮时再用
    deferredPrompt = e;
    // 🎉 重点：把我们的自定义按钮显示出来！
    installBtn.style.display = 'block';
    console.log('捕捉到安装事件，按钮已显示');

  // === 新增：检测设备类型的“门卫” ===
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

// #endregion =================================