// 全局数据
let studentData = {
    name: '',
    specialty: '',
    ecosystemsFixed: 0,
    diagnosisAccuracy: 0,
    prescriptionScore: 0,
    totalEnergy: 0,
    totalWater: 0,
    totalEmission: 0
};

let selectedSpecialty = '';
let ecosystemComponents = [];
let currentCase = 'xinjiang';
let dripPoints = [];
let currentChallenge = null;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    loadStudentData();
    initDragAndDrop();
    initIrrigationMap();
    updateDashboard();
});

// 登录和角色创建
function selectSpecialty(specialty) {
    selectedSpecialty = specialty;
    document.querySelectorAll('.specialty-option').forEach(el => {
        el.classList.remove('selected');
    });
    document.querySelector(`[data-specialty="${specialty}"]`).classList.add('selected');
    document.getElementById('start-btn').disabled = false;
}

function startLearning() {
    const name = document.getElementById('student-name').value.trim();
    if (!name || !selectedSpecialty) {
        alert('请填写姓名并选择专长');
        return;
    }

    studentData.name = name;
    studentData.specialty = selectedSpecialty;

    saveStudentData();
    showScreen('main-screen');
    updateStudentInfo();
}

function updateStudentInfo() {
    document.getElementById('student-info').textContent = 
        `欢迎，${studentData.name}（${studentData.specialty}医师）`;
}

// 屏幕切换
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function backToMain() {
    showScreen('main-screen');
}

function showDashboard() {
    showScreen('dashboard-screen');
    updateDashboard();
}

function showReport() {
    showScreen('report-screen');
    generateReportContent();
}

// 诊室导航
function openClinic(clinicNumber) {
    showScreen(`clinic-${clinicNumber}`);
    
    if (clinicNumber === 1) {
        initEcosystem();
    } else if (clinicNumber === 2) {
        loadCase('xinjiang');
    } else if (clinicNumber === 3) {
        loadPrescription('irrigation');
    }
}

// ========== 第一诊室：生态系统模拟器 ==========

function initEcosystem() {
    ecosystemComponents = [];
    document.getElementById('ecosystem-canvas').innerHTML = 
        '<div class="canvas-hint">拖拽组件到此处构建生态系统</div>';
    updateEcosystemInfo();
    updateStabilityScore();
}

function initDragAndDrop() {
    // 组件拖拽
    document.querySelectorAll('.component-item').forEach(item => {
        item.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', this.dataset.type);
        });
    });
}

function allowDrop(e) {
    e.preventDefault();
}

function drop(e) {
    e.preventDefault();
    const componentType = e.dataTransfer.getData('text/plain');
    
    if (e.target.classList.contains('ecosystem-canvas') || 
        e.target.closest('.ecosystem-canvas')) {
        const canvas = document.getElementById('ecosystem-canvas');
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        addComponentToCanvas(componentType, x, y);
    }
}

function addComponentToCanvas(type, x, y) {
    const canvas = document.getElementById('ecosystem-canvas');
    const hint = canvas.querySelector('.canvas-hint');
    if (hint) hint.remove();

    const component = document.createElement('div');
    component.className = 'ecosystem-component';
    component.style.left = `${x - 40}px`;
    component.style.top = `${y - 40}px`;
    component.dataset.type = type;
    
    const icons = {
        sun: 'ri-sun-line',
        water: 'ri-water-percent-line',
        soil: 'ri-landscape-line',
        plant: 'ri-plant-line',
        animal: 'ri-bear-smile-line',
        microbe: 'ri-microscope-line'
    };
    
    const names = {
        sun: '太阳',
        water: '水',
        soil: '土壤',
        plant: '植物',
        animal: '动物',
        microbe: '微生物'
    };
    
    component.innerHTML = `
        <i class="${icons[type]}"></i>
        <span>${names[type]}</span>
    `;
    
    component.addEventListener('dblclick', function() {
        this.remove();
        updateEcosystemInfo();
        updateStabilityScore();
    });
    
    component.addEventListener('mousedown', function(e) {
        let isDragging = false;
        let offsetX = e.clientX - this.offsetLeft;
        let offsetY = e.clientY - this.offsetTop;
        
        function onMouseMove(e) {
            isDragging = true;
            const canvas = document.getElementById('ecosystem-canvas');
            const rect = canvas.getBoundingClientRect();
            let newX = e.clientX - rect.left - offsetX;
            let newY = e.clientY - rect.top - offsetY;
            
            newX = Math.max(0, Math.min(newX, rect.width - 80));
            newY = Math.max(0, Math.min(newY, rect.height - 80));
            
            this.style.left = `${newX}px`;
            this.style.top = `${newY}px`;
        }
        
        function onMouseUp() {
            if (isDragging) {
                updateEcosystemInfo();
                updateStabilityScore();
            }
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }
        
        document.addEventListener('mousemove', onMouseMove.bind(this));
        document.addEventListener('mouseup', onMouseUp);
    });
    
    canvas.appendChild(component);
    ecosystemComponents.push({type, x, y});
    updateEcosystemInfo();
    updateStabilityScore();
}

function updateEcosystemInfo() {
    const components = Array.from(document.querySelectorAll('.ecosystem-component'));
    const types = components.map(c => c.dataset.type);
    
    const hasSun = types.includes('sun');
    const hasWater = types.includes('water');
    const hasSoil = types.includes('soil');
    const hasPlant = types.includes('plant');
    const hasAnimal = types.includes('animal');
    const hasMicrobe = types.includes('microbe');
    
    // 能量流动
    if (hasSun && hasPlant) {
        document.getElementById('energy-flow').textContent = '已连接';
        document.getElementById('energy-flow').style.color = '#4a9b5f';
    } else {
        document.getElementById('energy-flow').textContent = '未连接';
        document.getElementById('energy-flow').style.color = '#999';
    }
    
    // 水循环
    if (hasWater && hasSoil && hasPlant) {
        document.getElementById('water-cycle').textContent = '已连接';
        document.getElementById('water-cycle').style.color = '#4a9b5f';
    } else {
        document.getElementById('water-cycle').textContent = '未连接';
        document.getElementById('water-cycle').style.color = '#999';
    }
    
    // 食物网
    if (hasPlant && hasAnimal && hasMicrobe) {
        document.getElementById('food-web').textContent = '已建立';
        document.getElementById('food-web').style.color = '#4a9b5f';
    } else {
        document.getElementById('food-web').textContent = '未建立';
        document.getElementById('food-web').style.color = '#999';
    }
}

function checkEcosystem() {
    const components = Array.from(document.querySelectorAll('.ecosystem-component'));
    const types = components.map(c => c.dataset.type);
    
    let score = 0;
    let feedback = [];
    
    // 检查必需组件
    const required = ['sun', 'water', 'soil', 'plant', 'animal', 'microbe'];
    const missing = required.filter(r => !types.includes(r));
    
    if (missing.length === 0) {
        score += 30;
        feedback.push('✓ 所有必需组件已添加');
    } else {
        feedback.push(`✗ 缺少组件: ${missing.join(', ')}`);
    }
    
    // 检查能量流动
    if (types.includes('sun') && types.includes('plant')) {
        score += 25;
        feedback.push('✓ 能量流动正常');
    } else {
        feedback.push('✗ 能量流动中断');
    }
    
    // 检查水循环
    if (types.includes('water') && types.includes('soil') && types.includes('plant')) {
        score += 25;
        feedback.push('✓ 水循环正常');
    } else {
        feedback.push('✗ 水循环不完整');
    }
    
    // 检查食物网
    if (types.includes('plant') && types.includes('animal') && types.includes('microbe')) {
        score += 20;
        feedback.push('✓ 食物网已建立');
    } else {
        feedback.push('✗ 食物网不完整');
    }
    
    updateStabilityScore(score);
    
    alert('系统检查完成！\n\n' + feedback.join('\n') + '\n\n稳定性评分: ' + score);
    
    if (score >= 80) {
        studentData.ecosystemsFixed++;
        saveStudentData();
    }
}

function updateStabilityScore(score = null) {
    if (score === null) {
        score = calculateStabilityScore();
    }
    document.getElementById('stability-score').textContent = score;
}

function calculateStabilityScore() {
    const components = Array.from(document.querySelectorAll('.ecosystem-component'));
    if (components.length === 0) return 0;
    
    const types = components.map(c => c.dataset.type);
    let score = 0;
    
    if (types.includes('sun')) score += 10;
    if (types.includes('water')) score += 10;
    if (types.includes('soil')) score += 10;
    if (types.includes('plant')) score += 15;
    if (types.includes('animal')) score += 15;
    if (types.includes('microbe')) score += 15;
    
    // 连接性加分
    if (types.includes('sun') && types.includes('plant')) score += 10;
    if (types.includes('water') && types.includes('soil')) score += 10;
    if (types.includes('plant') && types.includes('animal')) score += 5;
    
    return Math.min(score, 100);
}

function resetEcosystem() {
    if (confirm('确定要重置生态系统吗？')) {
        initEcosystem();
    }
}

function generateChallenge() {
    const challenges = [
        {
            text: '系统缺少分解者，导致能量无法循环。请添加微生物组件。',
            missing: 'microbe',
            solution: '添加微生物组件'
        },
        {
            text: '能量流动中断，植物无法获得能量。请添加太阳组件并连接到植物。',
            missing: 'sun',
            solution: '添加太阳组件'
        },
        {
            text: '水循环不完整，缺少关键环节。请完善水循环系统。',
            missing: 'water',
            solution: '添加水组件'
        }
    ];
    
    currentChallenge = challenges[Math.floor(Math.random() * challenges.length)];
    document.getElementById('challenge-text').textContent = currentChallenge.text;
    
    // 清空画布，只保留挑战需要的组件
    document.getElementById('ecosystem-canvas').innerHTML = 
        '<div class="canvas-hint">根据挑战要求构建系统</div>';
    
    // 添加一些初始组件（除了缺失的）
    const allTypes = ['sun', 'water', 'soil', 'plant', 'animal', 'microbe'];
    const typesToAdd = allTypes.filter(t => t !== currentChallenge.missing);
    
    typesToAdd.forEach((type, index) => {
        setTimeout(() => {
            addComponentToCanvas(type, 100 + index * 100, 150);
        }, index * 200);
    });
}

// ========== 第二诊室：病例诊断平台 ==========

function loadCase(caseName) {
    currentCase = caseName;
    
    document.querySelectorAll('.case-content').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelectorAll('.case-btn').forEach(el => {
        el.classList.remove('active');
    });
    
    document.getElementById(`case-${caseName}`).classList.add('active');
    document.querySelector(`[onclick="loadCase('${caseName}')"]`).classList.add('active');
    
    if (caseName === 'xinjiang') {
        updateXinjiangSimulation();
    } else if (caseName === 'liaoning') {
        updateLiaoningSimulation();
    }
}

function updateXinjiangSimulation() {
    const duckCount = parseInt(document.getElementById('duck-count').value);
    const grazingTime = parseInt(document.getElementById('grazing-time').value);
    
    document.getElementById('duck-count-value').textContent = duckCount;
    document.getElementById('grazing-time-value').textContent = grazingTime;
    
    // 模拟计算
    const locustReduction = Math.min(95, 30 + (duckCount / 20) + (grazingTime * 2));
    const pesticideResidue = Math.max(0, 50 - (duckCount / 15) - (grazingTime * 1.5));
    const ecoBenefit = locustReduction > 80 && pesticideResidue < 10 ? '优秀' : 
                      locustReduction > 60 && pesticideResidue < 20 ? '良好' : '一般';
    
    document.getElementById('locust-reduction').textContent = locustReduction.toFixed(1) + '%';
    document.getElementById('pesticide-residue').textContent = pesticideResidue.toFixed(2) + 'mg/kg';
    document.getElementById('eco-benefit').textContent = ecoBenefit;
    
    // 绘制图表
    drawLocustChart(duckCount, grazingTime);
    
    // 更新准确率
    if (locustReduction > 80) {
        studentData.diagnosisAccuracy = Math.max(studentData.diagnosisAccuracy, 85);
        saveStudentData();
    }
}

function drawLocustChart(duckCount, grazingTime) {
    const canvas = document.getElementById('locust-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 150;
    
    ctx.clearRect(0, 0, width, height);
    
    // 绘制背景
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    
    // 绘制曲线
    ctx.strokeStyle = '#4a9b5f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const points = 20;
    for (let i = 0; i <= points; i++) {
        const x = (i / points) * width;
        const baseY = height * 0.8;
        const reduction = 100 - (i / points) * (30 + (duckCount / 20) + (grazingTime * 2));
        const y = baseY - (reduction / 100) * (height * 0.6);
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.stroke();
    
    // 添加标签
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.fillText('蝗虫数量变化', 10, 15);
}

function updateLiaoningSimulation() {
    const straw = parseInt(document.getElementById('straw-input').value);
    const manure = parseInt(document.getElementById('manure-input').value);
    const temp = parseInt(document.getElementById('ferment-temp').value);
    const time = parseInt(document.getElementById('ferment-time').value);
    
    document.getElementById('straw-input-value').textContent = straw;
    document.getElementById('manure-input-value').textContent = manure;
    document.getElementById('ferment-temp-value').textContent = temp;
    document.getElementById('ferment-time-value').textContent = time;
    
    // 模拟计算
    const baseBiogas = (straw + manure) * 0.3;
    const tempFactor = temp >= 30 && temp <= 40 ? 1.2 : 0.8;
    const timeFactor = time >= 10 && time <= 20 ? 1.1 : 0.9;
    
    const biogasOutput = baseBiogas * tempFactor * timeFactor;
    const energyEfficiency = Math.min(95, (biogasOutput / (straw + manure)) * 100);
    const economicBenefit = biogasOutput * 2.5;
    
    document.getElementById('biogas-output').textContent = biogasOutput.toFixed(1) + 'm³';
    document.getElementById('energy-efficiency').textContent = energyEfficiency.toFixed(1) + '%';
    document.getElementById('economic-benefit').textContent = economicBenefit.toFixed(0) + '元';
    
    // 更新能量数据
    studentData.totalEnergy += biogasOutput * 5; // 假设每m³沼气相当于5kWh
    saveStudentData();
}

// ========== 第三诊室：智慧药方设计器 ==========

function loadPrescription(prescriptionType) {
    document.querySelectorAll('.prescription-content').forEach(el => {
        el.classList.remove('active');
    });
    document.querySelectorAll('.prescription-btn').forEach(el => {
        el.classList.remove('active');
    });
    
    document.getElementById(`prescription-${prescriptionType}`).classList.add('active');
    document.querySelector(`[onclick="loadPrescription('${prescriptionType}')"]`).classList.add('active');
    
    if (prescriptionType === 'irrigation') {
        initIrrigationMap();
    }
}

function initIrrigationMap() {
    const map = document.getElementById('irrigation-map');
    if (!map) return;
    
    map.addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 检查是否点击在已有滴灌点上
        const existingPoint = Array.from(this.querySelectorAll('.drip-point')).find(point => {
            const pointRect = point.getBoundingClientRect();
            const pointX = pointRect.left - rect.left + 10;
            const pointY = pointRect.top - rect.top + 10;
            const distance = Math.sqrt(Math.pow(x - pointX, 2) + Math.pow(y - pointY, 2));
            return distance < 20;
        });
        
        if (existingPoint) {
            existingPoint.remove();
            dripPoints = dripPoints.filter(p => 
                Math.abs(p.x - x) > 20 || Math.abs(p.y - y) > 20
            );
        } else {
            const point = document.createElement('div');
            point.className = 'drip-point';
            point.style.left = `${x - 10}px`;
            point.style.top = `${y - 10}px`;
            this.appendChild(point);
            dripPoints.push({x, y});
        }
        
        document.getElementById('drip-points').value = dripPoints.length;
        calculateIrrigation();
    });
    
    // 移除提示
    const hint = map.querySelector('.map-instructions');
    if (hint && dripPoints.length > 0) {
        hint.style.display = 'none';
    }
}

function calculateIrrigation() {
    const pointCount = dripPoints.length;
    const density = document.getElementById('pipe-density').value;
    
    if (pointCount === 0) {
        document.getElementById('water-saving').textContent = '--%';
        document.getElementById('cost-saving').textContent = '--元';
        document.getElementById('irrigation-score').textContent = '--';
        return;
    }
    
    const densityFactors = {low: 0.8, medium: 1.0, high: 1.2};
    const densityFactor = densityFactors[density];
    
    // 计算节水率（基于滴灌点数量和密度）
    const baseSaving = Math.min(90, pointCount * 5 + (densityFactor - 1) * 20);
    const waterSaving = baseSaving;
    
    // 计算成本节约
    const costSaving = waterSaving * 50; // 假设每1%节水率节约50元
    
    // 计算评分
    let score = 60;
    if (pointCount >= 5) score += 20;
    if (pointCount >= 10) score += 10;
    if (density === 'medium' || density === 'high') score += 10;
    
    document.getElementById('water-saving').textContent = waterSaving.toFixed(1) + '%';
    document.getElementById('cost-saving').textContent = costSaving.toFixed(0) + '元';
    document.getElementById('irrigation-score').textContent = score;
    
    // 更新水资源数据
    studentData.totalWater += waterSaving * 10; // 假设每1%节水率节约10吨
    studentData.prescriptionScore = Math.max(studentData.prescriptionScore, score);
    saveStudentData();
}

function searchHometownCase() {
    const location = document.getElementById('hometown-location').value.trim();
    const keywords = document.getElementById('problem-keywords').value.trim();
    
    if (!location || !keywords) {
        alert('请填写家乡位置和问题关键词');
        return;
    }
    
    // 模拟案例推荐
    const recommendations = [
        {
            title: '水污染治理案例',
            location: '类似地区',
            description: '通过生态修复和污染源控制，成功改善水质',
            similarity: '85%'
        },
        {
            title: '土壤退化修复案例',
            location: '类似地区',
            description: '采用有机肥和轮作制度，恢复土壤肥力',
            similarity: '78%'
        },
        {
            title: '生物多样性保护案例',
            location: '类似地区',
            description: '建立生态保护区，恢复本地物种',
            similarity: '72%'
        }
    ];
    
    const list = document.getElementById('recommendation-list');
    list.innerHTML = recommendations.map(rec => `
        <div class="recommendation-item">
            <h4>${rec.title}</h4>
            <p>地区: ${rec.location} | 相似度: ${rec.similarity}</p>
            <p>${rec.description}</p>
        </div>
    `).join('');
    
    document.getElementById('case-recommendations').style.display = 'block';
}

function evaluateSolution() {
    const name = document.getElementById('solution-name').value.trim();
    const measures = document.getElementById('solution-measures').value.trim();
    const effects = document.getElementById('solution-effects').value.trim();
    
    if (!name || !measures || !effects) {
        alert('请填写完整的方案信息');
        return;
    }
    
    // 评估逻辑
    let feasibility = 60;
    let tips = [];
    
    if (measures.length > 50) feasibility += 10;
    if (effects.length > 30) feasibility += 10;
    if (measures.includes('生态') || measures.includes('修复')) feasibility += 10;
    if (measures.includes('可持续') || measures.includes('循环')) feasibility += 10;
    
    if (feasibility < 70) {
        tips.push('建议增加更多具体的生态修复措施');
    }
    if (feasibility < 80) {
        tips.push('可以考虑加入数据监测和评估机制');
    }
    if (feasibility >= 80) {
        tips.push('方案设计合理，具有很好的可行性');
    }
    
    document.getElementById('feasibility-score').textContent = feasibility;
    document.getElementById('optimization-tips').textContent = tips.join('；');
    document.getElementById('solution-result').style.display = 'block';
    
    // 更新评分
    studentData.prescriptionScore = Math.max(studentData.prescriptionScore, feasibility);
    saveStudentData();
}

// ========== 仪表盘 ==========

function updateDashboard() {
    document.getElementById('ecosystems-fixed').textContent = studentData.ecosystemsFixed;
    document.getElementById('diagnosis-accuracy').textContent = 
        studentData.diagnosisAccuracy.toFixed(0) + '%';
    document.getElementById('prescription-score').textContent = studentData.prescriptionScore;
    
    // 计算医师等级
    const totalScore = studentData.ecosystemsFixed * 20 + 
                     studentData.diagnosisAccuracy + 
                     studentData.prescriptionScore;
    
    let level = '见习';
    if (totalScore >= 200) level = '专家';
    else if (totalScore >= 150) level = '高级';
    else if (totalScore >= 100) level = '初级';
    
    document.getElementById('doctor-level').textContent = level;
    
    // 绘制图表
    drawCharts();
}

function drawCharts() {
    drawEnergyChart();
    drawWaterChart();
    drawEmissionChart();
}

function drawEnergyChart() {
    const canvas = document.getElementById('energy-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 200;
    
    ctx.clearRect(0, 0, width, height);
    
    // 绘制柱状图
    const value = studentData.totalEnergy;
    const maxValue = 1000;
    const barHeight = (value / maxValue) * height * 0.8;
    
    ctx.fillStyle = '#4a9b5f';
    ctx.fillRect(width * 0.2, height - barHeight - 20, width * 0.6, barHeight);
    
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(value.toFixed(0) + ' kWh', width / 2, height - 5);
}

function drawWaterChart() {
    const canvas = document.getElementById('water-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 200;
    
    ctx.clearRect(0, 0, width, height);
    
    const value = studentData.totalWater;
    const maxValue = 500;
    const barHeight = (value / maxValue) * height * 0.8;
    
    ctx.fillStyle = '#4a9b5f';
    ctx.fillRect(width * 0.2, height - barHeight - 20, width * 0.6, barHeight);
    
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(value.toFixed(0) + ' 吨', width / 2, height - 5);
}

function drawEmissionChart() {
    const canvas = document.getElementById('emission-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 200;
    
    ctx.clearRect(0, 0, width, height);
    
    const value = studentData.totalEmission;
    const maxValue = 100;
    const barHeight = (value / maxValue) * height * 0.8;
    
    ctx.fillStyle = '#4a9b5f';
    ctx.fillRect(width * 0.2, height - barHeight - 20, width * 0.6, barHeight);
    
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(value.toFixed(1) + ' 吨CO₂', width / 2, height - 5);
}

// ========== 报告生成 ==========

function generateReportContent() {
    document.getElementById('report-student-info').textContent = 
        `生态医师：${studentData.name} | 专长：${studentData.specialty}`;
    document.getElementById('report-date').textContent = 
        `生成时间：${new Date().toLocaleString('zh-CN')}`;
    
    document.getElementById('report-ecosystems').textContent = studentData.ecosystemsFixed;
    document.getElementById('report-accuracy').textContent = 
        studentData.diagnosisAccuracy.toFixed(0) + '%';
    document.getElementById('report-prescription').textContent = studentData.prescriptionScore;
    
    const totalScore = studentData.ecosystemsFixed * 20 + 
                     studentData.diagnosisAccuracy + 
                     studentData.prescriptionScore;
    
    let level = '见习';
    if (totalScore >= 200) level = '专家';
    else if (totalScore >= 150) level = '高级';
    else if (totalScore >= 100) level = '初级';
    
    document.getElementById('report-level').textContent = level;
    document.getElementById('report-energy').textContent = studentData.totalEnergy.toFixed(0);
    document.getElementById('report-water').textContent = studentData.totalWater.toFixed(0);
    document.getElementById('report-emission').textContent = studentData.totalEmission.toFixed(1);
    
    // 评价
    let evaluation = '';
    if (totalScore >= 200) {
        evaluation = '您是一位卓越的生态医师！在生态系统修复、病例诊断和方案设计方面都表现出色，为守护家乡的绿水青山做出了重要贡献！';
    } else if (totalScore >= 150) {
        evaluation = '您是一位优秀的生态医师！在生态保护方面展现了良好的专业素养和实践能力，继续努力，您将成为生态保护领域的专家！';
    } else if (totalScore >= 100) {
        evaluation = '您是一位有潜力的生态医师！在学习和实践中不断成长，相信通过持续努力，您一定能在生态保护领域取得更大成就！';
    } else {
        evaluation = '您是一位见习生态医师！刚刚踏上生态保护的道路，继续学习和实践，您将不断进步，成为优秀的生态守护者！';
    }
    
    document.getElementById('report-evaluation').textContent = evaluation;
    
    // 证书
    document.getElementById('cert-name').textContent = studentData.name;
    document.getElementById('cert-level').textContent = level + '医师';
    document.getElementById('cert-date').textContent = new Date().toLocaleDateString('zh-CN');
}

function generateReport() {
    generateReportContent();
    
    // 创建打印样式
    const printWindow = window.open('', '_blank');
    const reportHTML = document.getElementById('report-content').innerHTML;
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>生态医师报告</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 40px; }
                .report-header { text-align: center; margin-bottom: 40px; }
                .report-section { margin-bottom: 30px; }
                .report-metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
                .report-certificate { margin-top: 40px; padding: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; }
            </style>
        </head>
        <body>
            ${reportHTML}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
}

// ========== 数据存储 ==========

function saveStudentData() {
    localStorage.setItem('ecologicalMedicalTeam_studentData', JSON.stringify(studentData));
}

function loadStudentData() {
    const saved = localStorage.getItem('ecologicalMedicalTeam_studentData');
    if (saved) {
        studentData = JSON.parse(saved);
        if (studentData.name) {
            showScreen('main-screen');
            updateStudentInfo();
        }
    }
}

