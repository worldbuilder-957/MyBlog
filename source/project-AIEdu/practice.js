/**
 * practice.js
 * 地理知识挑战页面的核心逻辑脚本
 * 包含：AI出题、答题交互、错题本管理、PDF导出等功能
 */

// ============================================================
// 1. 常量定义 (Constants)
// ============================================================
const API_CONFIG = {
    URL: 'https://api.deepseek.com/v1/chat/completions',
    KEY: 'sk-64e582e67c9e4f7b89e67602b6670c4d', // 注意：生产环境中建议通过后端转发以保护密钥
    MODEL: 'deepseek-chat'
};

const STORAGE_KEYS = {
    MISTAKE_BOOK: 'geo_mistake_book'
};

// ============================================================
// 2. 状态管理 (State Management)
// ============================================================
const state = {
    totalQuestions: 0,
    correctAnswers: 0,
    currentQuestions: []
};

// ============================================================
// 3. DOM 元素引用 (DOM Elements)
// ============================================================
const dom = {
    // 按钮
    refreshBtn: null,
    viewMistakesBtn: null,
    backToPracticeBtn: null,
    clearMistakesBtn: null,
    exportPdfBtn: null,
    
    // 视图容器
    practiceView: null,
    mistakeView: null,
    
    // 内容区域
    questionArea: null,
    mistakeListEl: null,
    statsEl: null
};

// ============================================================
// 4. 初始化逻辑 (Initialization)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initDomElements();
    bindEventListeners();
    fetchQuestionFromDeepSeek(); // 页面加载时自动获取第一组题目
});

function initDomElements() {
    dom.refreshBtn = document.getElementById('refresh-question-btn');
    dom.viewMistakesBtn = document.getElementById('view-mistakes-btn');
    dom.backToPracticeBtn = document.getElementById('back-to-practice-btn');
    dom.clearMistakesBtn = document.getElementById('clear-mistakes-btn');
    dom.exportPdfBtn = document.getElementById('export-pdf-btn');
    
    dom.practiceView = document.getElementById('practice-view');
    dom.mistakeView = document.getElementById('mistake-view');
    
    dom.questionArea = document.getElementById('ai-question-area');
    dom.mistakeListEl = document.getElementById('mistake-list');
    dom.statsEl = document.getElementById('quiz-stats');
}

function bindEventListeners() {
    if (dom.refreshBtn) dom.refreshBtn.addEventListener('click', fetchQuestionFromDeepSeek);
    if (dom.viewMistakesBtn) dom.viewMistakesBtn.addEventListener('click', showMistakeView);
    if (dom.backToPracticeBtn) dom.backToPracticeBtn.addEventListener('click', showPracticeView);
    if (dom.clearMistakesBtn) dom.clearMistakesBtn.addEventListener('click', clearMistakes);
    if (dom.exportPdfBtn) dom.exportPdfBtn.addEventListener('click', exportMistakesToPdf);
}

// ============================================================
// 5. 视图切换 (View Switching)
// ============================================================
function showMistakeView() {
    dom.practiceView.style.display = 'none';
    dom.mistakeView.style.display = 'block';
    renderMistakes();
}

function showPracticeView() {
    dom.mistakeView.style.display = 'none';
    dom.practiceView.style.display = 'block';
}

// ============================================================
// 6. 核心业务逻辑 - 答题与统计 (Quiz Logic)
// ============================================================
function updateStats() {
    if (state.totalQuestions === 0) {
        dom.statsEl.textContent = '本次出题 0 道，答对 0 道。请开始作答吧！';
        return;
    }
    const accuracy = Math.round((state.correctAnswers / state.totalQuestions) * 100);
    let comment = '';
    if (accuracy === 100) comment = '太棒了！满分表现，继续保持！';
    else if (accuracy >= 80) comment = '表现不错，再接再厉，可以冲击满分！';
    else if (accuracy >= 50) comment = '已经有一定掌握，多练几道会更熟练。';
    else comment = '先别灰心，再多做几道题巩固一下基础知识。';
    
    dom.statsEl.textContent = `本次出题 ${state.totalQuestions} 道，答对 ${state.correctAnswers} 道（正确率 ${accuracy}%）。${comment}`;
}

function renderQuestions(questions) {
    state.currentQuestions = questions.map(q => ({ ...q, answered: false }));

    if (!dom.questionArea) return;
    dom.questionArea.innerHTML = '';

    state.currentQuestions.forEach((q, qIndex) => {
        const container = document.createElement('div');
        container.className = 'question-container';
        container.setAttribute('data-q-index', String(qIndex));

        const optionsHtml = (q.options || []).map((opt, idx) =>
            `<button class="option-button" data-index="${idx}">${String.fromCharCode(65 + idx)}. ${opt}</button>`
        ).join('');

        container.innerHTML = `
            <div class="question-number">题目 ${qIndex + 1}：单选题</div>
            <div class="question-text">${q.question || '（题目内容加载失败）'}</div>
            <div class="option-list">${optionsHtml || '<p>选项加载失败。</p>'}</div>
            <div class="answer-explanation" style="display:none;"></div>
        `;

        const buttons = container.querySelectorAll('.option-button');
        const explanationEl = container.querySelector('.answer-explanation');

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const index = Number(btn.getAttribute('data-index'));
                handleAnswer(qIndex, index, buttons, explanationEl);
            });
        });

        dom.questionArea.appendChild(container);
    });
}

function handleAnswer(qIndex, selectedIndex, buttons, explanationEl) {
    const q = state.currentQuestions[qIndex];
    if (!q || q.answered) return;
    q.answered = true;

    const correctIndex = Number(q.correctIndex);

    buttons.forEach(btn => {
        const idx = Number(btn.getAttribute('data-index'));
        btn.disabled = true;
        if (idx === correctIndex) btn.classList.add('correct');
    });

    const isCorrect = selectedIndex === correctIndex;
    if (!isCorrect && buttons[selectedIndex]) {
        buttons[selectedIndex].classList.add('incorrect');
        saveMistake(q, selectedIndex); // 自动保存错题
    }

    state.totalQuestions++;
    if (isCorrect) state.correctAnswers++;

    const correctLabel = typeof correctIndex === 'number' ? String.fromCharCode(65 + correctIndex) : '（未知）';
    const explanation = q.explanation || '暂无解析。';

    if (explanationEl) {
        explanationEl.style.display = 'block';
        explanationEl.innerHTML = `
            <p><strong>${isCorrect ? '✅ 回答正确！' : '❌ 回答错误。'}</strong></p>
            <p><strong>正确答案：</strong>${correctLabel}</p>
            <p><strong>解析：</strong>${explanation}</p>
        `;
    }

    updateStats();
}

// ============================================================
// 7. 错题本管理 (Mistake Book Management)
// ============================================================
function saveMistake(question, userChoiceIndex) {
    const mistakes = JSON.parse(localStorage.getItem(STORAGE_KEYS.MISTAKE_BOOK) || '[]');
    // 查重：避免重复添加
    const exists = mistakes.some(m => m.question === question.question);
    if (!exists) {
        mistakes.push({
            ...question,
            userChoiceIndex: userChoiceIndex,
            date: new Date().toISOString()
        });
        localStorage.setItem(STORAGE_KEYS.MISTAKE_BOOK, JSON.stringify(mistakes));
    }
}

function renderMistakes() {
    const mistakes = JSON.parse(localStorage.getItem(STORAGE_KEYS.MISTAKE_BOOK) || '[]');
    
    if (mistakes.length === 0) {
        dom.mistakeListEl.innerHTML = '<p style="text-align:center; color:#666; padding: 20px;">暂无错题记录，继续加油！🎉</p>';
        return;
    }

    dom.mistakeListEl.innerHTML = '';
    mistakes.forEach((q, index) => {
        const container = document.createElement('div');
        container.className = 'question-container';
        container.style.borderLeftColor = '#e74c3c';
        container.style.marginBottom = '15px';
        
        // 头部：编号 + 重做按钮
        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;';
        header.innerHTML = `
            <div class="question-number" style="color: #e74c3c; margin:0;">错题 ${index + 1}</div>
            <button class="btn-refresh btn-redo" style="font-size: 12px; padding: 5px 10px; margin: 0; background: #3498db;">🔄 重做此题</button>
        `;

        const questionText = document.createElement('div');
        questionText.className = 'question-text';
        questionText.textContent = q.question;

        const optionList = document.createElement('div');
        optionList.className = 'option-list';
        optionList.innerHTML = generateStaticOptionsHtml(q);

        const explanation = document.createElement('div');
        explanation.className = 'answer-explanation';
        explanation.style.cssText = 'display:block; background: #fff5f5;';
        explanation.innerHTML = `<p><strong>解析：</strong>${q.explanation || '暂无解析'}</p>`;

        container.appendChild(header);
        container.appendChild(questionText);
        container.appendChild(optionList);
        container.appendChild(explanation);
        dom.mistakeListEl.appendChild(container);

        // 绑定重做事件
        const redoBtn = header.querySelector('.btn-redo');
        redoBtn.addEventListener('click', () => {
            startRedo(q, index, optionList, explanation, redoBtn);
        });
    });
}

function generateStaticOptionsHtml(q) {
    return (q.options || []).map((opt, idx) => {
        let styleClass = '';
        let icon = '';
        if (idx === Number(q.correctIndex)) {
            styleClass = 'correct'; icon = '✅ ';
        } else if (idx === q.userChoiceIndex) {
            styleClass = 'incorrect'; icon = '❌ ';
        }
        return `<div class="option-button ${styleClass}" style="cursor: default; opacity: 1;">
            ${icon}${String.fromCharCode(65 + idx)}. ${opt}
        </div>`;
    }).join('');
}

function clearMistakes() {
    if(confirm('确定要清空所有错题记录吗？')) {
        localStorage.removeItem(STORAGE_KEYS.MISTAKE_BOOK);
        renderMistakes();
    }
}

// ============================================================
// 8. 错题重做逻辑 (Redo Logic)
// ============================================================
function startRedo(q, index, optionListEl, explanationEl, redoBtn) {
    explanationEl.style.display = 'none';
    redoBtn.style.display = 'none';
    
    optionListEl.innerHTML = '';
    (q.options || []).forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'option-button';
        btn.textContent = `${String.fromCharCode(65 + idx)}. ${opt}`;
        btn.onclick = () => checkRedoAnswer(q, index, idx, optionListEl, explanationEl, redoBtn);
        optionListEl.appendChild(btn);
    });
}

function checkRedoAnswer(q, index, selectedIdx, optionListEl, explanationEl, redoBtn) {
    const correctIndex = Number(q.correctIndex);
    const buttons = optionListEl.querySelectorAll('.option-button');
    
    buttons.forEach(btn => btn.disabled = true);

    if (selectedIdx === correctIndex) {
        buttons[selectedIdx].classList.add('correct');
        setTimeout(() => {
            if(confirm('恭喜你答对了！🎉\n是否将此题从错题本中移除？')) {
                removeMistake(index);
            } else {
                explanationEl.style.display = 'block';
                redoBtn.style.display = 'block';
                redoBtn.textContent = '🔄 再做一次';
            }
        }, 100);
    } else {
        buttons[selectedIdx].classList.add('incorrect');
        if (buttons[correctIndex]) buttons[correctIndex].classList.add('correct');
        explanationEl.style.display = 'block';
        redoBtn.style.display = 'block';
        redoBtn.textContent = '🔄 再试一次';
    }
}

function removeMistake(index) {
    const mistakes = JSON.parse(localStorage.getItem(STORAGE_KEYS.MISTAKE_BOOK) || '[]');
    mistakes.splice(index, 1);
    localStorage.setItem(STORAGE_KEYS.MISTAKE_BOOK, JSON.stringify(mistakes));
    renderMistakes();
}

// ============================================================
// 9. PDF 导出功能 (Export PDF)
// ============================================================
function exportMistakesToPdf() {
    const mistakes = JSON.parse(localStorage.getItem(STORAGE_KEYS.MISTAKE_BOOK) || '[]');
    if (mistakes.length === 0) {
        alert('错题本为空，无法导出。');
        return;
    }

    const printWindow = window.open('', '_blank');
    const dateStr = new Date().toLocaleDateString();
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>地理错题集 - ${dateStr}</title>
            <style>
                body { font-family: 'Microsoft YaHei', Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                .header { text-align: center; border-bottom: 2px solid #2c3e50; padding-bottom: 20px; margin-bottom: 30px; }
                .header h1 { margin: 0; color: #2c3e50; }
                .header p { color: #666; margin: 10px 0 0; }
                .question-item { margin-bottom: 30px; page-break-inside: avoid; border: 1px solid #eee; padding: 15px; border-radius: 5px; }
                .question-title { font-weight: bold; font-size: 16px; margin-bottom: 15px; color: #2c3e50; }
                .options { margin-left: 10px; margin-bottom: 15px; }
                .option { margin-bottom: 8px; }
                .explanation { background: #f8f9fa; padding: 15px; border-left: 4px solid #3498db; font-size: 14px; color: #555; }
                .explanation strong { color: #2c3e50; }
                @media print {
                    body { padding: 0; }
                    .question-item { border: none; border-bottom: 1px solid #eee; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>地理错题集</h1>
                <p>生成日期：${dateStr} | 共 ${mistakes.length} 道错题</p>
            </div>
            ${mistakes.map((q, index) => {
                const optionsHtml = (q.options || []).map((opt, idx) => {
                    let mark = '';
                    let style = '';
                    if (idx === Number(q.correctIndex)) {
                        mark = '✅'; style = 'color: #27ae60; font-weight: bold;';
                    } else if (idx === q.userChoiceIndex) {
                        mark = '❌'; style = 'color: #c0392b;';
                    }
                    return `<div class="option" style="${style}">${String.fromCharCode(65 + idx)}. ${opt} ${mark}</div>`;
                }).join('');
                return `
                    <div class="question-item">
                        <div class="question-title">第 ${index + 1} 题：${q.question}</div>
                        <div class="options">${optionsHtml}</div>
                        <div class="explanation"><strong>解析：</strong>${q.explanation || '暂无解析'}</div>
                    </div>`;
            }).join('')}
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
}

// ============================================================
// 10. API 交互 (API Interaction)
// ============================================================
async function fetchQuestionFromDeepSeek() {
    if (!dom.refreshBtn || !dom.questionArea) return;
    
    dom.refreshBtn.disabled = true;
    dom.questionArea.innerHTML = `
        <div class="question-container">
            <div class="question-number">题目加载中...</div>
            <div class="question-text">正在出题，请稍候。</div>
        </div>
    `;

    try {
        const response = await fetch(API_CONFIG.URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.KEY}`
            },
            body: JSON.stringify({
                model: API_CONFIG.MODEL,
                messages: [
                    {
                        role: 'system',
                        content: '你是一名初中地理老师，善于根据课程内容出规范的选择题，并用简明清晰的语言给出解析。'
                    },
                    {
                        role: 'user',
                        content: '请你一次出 3 道与地球自转、公转、昼夜交替或四季变化相关的地理单选题，整体返回一个 JSON 数组，每个元素为一个对象，字段为：question（题干字符串，不含选项前缀）、options（4 个字符串选项的数组）、correctIndex（0-3 之间的数字）、explanation（解析说明）。只返回 JSON 数组，不要包含其他文字、Markdown 代码块或额外说明。'
                    }
                ],
                temperature: 0.7,
                max_tokens: 800
            })
        });

        if (!response.ok) throw new Error('网络请求失败：' + response.status);

        const data = await response.json();
        let content = data?.choices?.[0]?.message?.content?.trim() || '';

        // 清理 Markdown 标记
        content = content.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');

        let list = [];
        try {
            list = JSON.parse(content);
        } catch (parseErr) {
            console.error('JSON解析失败:', parseErr, content);
            throw new Error('解析题目数据失败，请稍后重试。');
        }

        if (!Array.isArray(list) || !list.length) throw new Error('返回数据为空或格式不符合约定');
        
        renderQuestions(list.slice(0, 3));
    } catch (err) {
        console.error(err);
        dom.questionArea.innerHTML = `
            <div class="question-container">
                <div class="question-number">题目加载失败</div>
                <div class="question-text">无法从 AI 获取题目，请检查网络或稍后重试。</div>
            </div>
        `;
    } finally {
        dom.refreshBtn.disabled = false;
    }
}