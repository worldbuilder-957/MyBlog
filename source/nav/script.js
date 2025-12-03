// 1. 时钟功能
function updateTime() {
    const now = new Date();
    document.getElementById('clock').innerText = now.toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute:'2-digit',second:"2-digit"});
    document.getElementById('date').innerText = now.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'});
}
setInterval(updateTime, 1000);
updateTime();

// 2. 日历功能 (多时期版)
function updateCalendar() {
    const now = new Date();
    
    // ================= 配置区域：请务必修改这里的日期 =================
    // 逻辑：代码会从上往下找，看今天落在哪个区间里
    // 技巧：前一个的 end 最好是后一个 start 的前一天，保证时间连续
    const periods = [
        { name: 'Spring', start: '2025-02-24', end: '2025-07-06', type: 'term' }, 
        { name: 'SummerHoliday',     start: '2025-07-07', end: '2025-09-12', type: 'vacation' },
        { name: 'Fall', start: '2025-09-13', end: '2026-01-25', type: 'term' },
        { name: 'WinterHoliday',     start: '2026-01-26', end: '2026-03-01', type: 'vacation' }
    ];
    // ==============================================================
    const year = now.getFullYear();
    
    // --- 1. 更新右上角：全年周数 ---
    const startOfYear = new Date(year, 0, 1);
    const pastDaysOfYear = (now - startOfYear) / 86400000;
    const weekOfYear = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
    
    // 2.写入新ID：corner-year-week
    document.getElementById('corner-year-week').innerText = `${Year} W${weekOfYear}`;

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
        const sDate = new Date(period.start);
        const eDate = new Date(period.end);
        sDate.setHours(0,0,0,0);
        eDate.setHours(23,59,59,999);
        now.setHours(0,0,0,0);

        if (now >= sDate && now <= eDate) {
            currentPeriod = period;
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

// 2. 搜索功能 (回车跳转)
function handleSearch(e) {
    if (e.key === 'Enter') {
        const query = document.getElementById('searchInput').value;
        window.location.href = `https://www.google.com/search?q=${query}`;
    }
}

// 3. 待办事项 (使用 LocalStorage 保存)
const todoListEl = document.getElementById('todoList');
let todos = JSON.parse(localStorage.getItem('myTodos')) || ['完成博客搭建', '学习Hexo'];

function renderTodos() {
    todoListEl.innerHTML = '';
    todos.forEach((todo, index) => {
        const li = document.createElement('li');
        li.className = 'todo-item';
        li.innerHTML = `
            <input type="checkbox" onclick="removeTodo(${index})">
            <span>${todo}</span>
        `;
        todoListEl.appendChild(li);
    });
}

function addTodo(e) {
    if (e.key === 'Enter' && e.target.value.trim() !== '') {
        todos.push(e.target.value);
        localStorage.setItem('myTodos', JSON.stringify(todos));
        e.target.value = '';
        renderTodos();
    }
}

function removeTodo(index) {
    setTimeout(() => { // 延迟一点让用户看到勾选动画
        todos.splice(index, 1);
        localStorage.setItem('myTodos', JSON.stringify(todos));
        renderTodos();
    }, 300);
}

renderTodos();

// 4. 天气功能 (API版)
async function fetchWeather() {
    const apiKey = '4dce09f66f4c46c1a5d5f631f019290e'; // 这里填和风天气 Key
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
