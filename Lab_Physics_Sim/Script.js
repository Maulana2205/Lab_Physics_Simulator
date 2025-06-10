class DatabaseManager {
    constructor() {
        this.users = {};
        this.experiments = [];
        this.nextExperimentId = 1;
        
        // Initialize with admin user if empty
        if (Object.keys(this.users).length === 0) {
            this.users['admin'] = {
                name: 'Admin',
                password: this.hashPassword('admin123'),
                totalExperiments: 0,
                joinDate: new Date().toISOString(),
                lastSession: new Date().toISOString(),
                isAdmin: true
            };
        }
    }

    // Basic password hashing (in a real app, use proper hashing like bcrypt)
    hashPassword(password) {
        return password.split('').reverse().join('') + password.length;
    }

    usernameExists(username) {
        return this.users.hasOwnProperty(username);
    }

    registerUser(username, password) {
        if (this.usernameExists(username)) {
            return { success: false, message: 'Username already exists' };
        }
        
        this.users[username] = {
            name: username,
            password: this.hashPassword(password),
            totalExperiments: 0,
            joinDate: new Date().toISOString(),
            lastSession: new Date().toISOString(),
            isAdmin: false
        };
        
        return { success: true };
    }

    authenticate(username, password) {
        const user = this.users[username];
        if (!user) {
            return { success: false, message: 'User not found' };
        }
        
        if (user.password !== this.hashPassword(password)) {
            return { success: false, message: 'Incorrect password' };
        }
        
        return { success: true, user };
    }

    getUser(username) {
        return this.users[username] || null;
    }

    saveUser(username, userData) {
        this.users[username] = userData;
    }

    saveExperiment(experiment) {
        experiment.id = this.nextExperimentId++;
        experiment.userId = currentUser;
        experiment.timestamp = new Date().toISOString();
        this.experiments.push(experiment);
        
        // Update user's experiment count
        if (this.users[currentUser]) {
            this.users[currentUser].totalExperiments = (this.users[currentUser].totalExperiments || 0) + 1;
        }
        
        return experiment.id;
    }

    getExperiments(username = null) {
        if (username) {
            return this.experiments.filter(exp => exp.userId === username);
        }
        return [...this.experiments];
    }

    deleteExperiment(id) {
        this.experiments = this.experiments.filter(exp => exp.id !== id);
    }

    exportData() {
        return {
            users: this.users,
            experiments: this.experiments,
            nextExperimentId: this.nextExperimentId
        };
    }

    importData(data) {
        this.users = data.users || {};
        this.experiments = data.experiments || [];
        this.nextExperimentId = data.nextExperimentId || 1;
    }
}

// Global variables
const db = new DatabaseManager();
let currentUser = null;
let currentTab = 'single';
let springCount = 3;
let dataPoints = [];
let chart = null;

// Spring configuration data
const springConfigs = {
    single: {
        title: 'Pegas Tunggal',
        info: 'Konstanta pegas: k = F/x. Gaya berbanding langsung dengan perpindahan.',
        formula: 'F = k × x<br><span style="font-size: 0.8rem; opacity: 0.7;">k = F / x</span>',
        showSpringCount: false
    },
    series: {
        title: 'Pegas Seri',
        info: 'Susunan seri: 1/k_total = 1/k₁ + 1/k₂ + ... + 1/kₙ. Konstanta total lebih kecil dari konstanta individual.',
        formula: '1/k_total = 1/k₁ + 1/k₂ + ... + 1/kₙ<br><span style="font-size: 0.8rem; opacity: 0.7;">F = k_total × x</span>',
        showSpringCount: true
    },
    parallel: {
        title: 'Pegas Paralel',
        info: 'Susunan paralel: k_total = k₁ + k₂ + ... + kₙ. Konstanta total lebih besar dari konstanta individual.',
        formula: 'k_total = k₁ + k₂ + ... + kₙ<br><span style="font-size: 0.8rem; opacity: 0.7;">F = k_total × x</span>',
        showSpringCount: true
    }
};

// Physics constants
const GRAVITY = 9.8; // m/s²
const DEFAULT_SPRING_CONSTANT = 19.6; // N/m

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.container').style.display = 'none';
    initChart();
    generateSprings();
    updateSpringVisual();
    document.getElementById('loginModal').style.display = 'flex';
});

// Chart initialization
function initChart() {
    const ctx = document.getElementById('forceChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Gaya vs Perpindahan',
                data: [],
                backgroundColor: 'rgba(102, 126, 234, 0.8)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 1,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Perpindahan (m)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Gaya (N)'
                    }
                }
            },
            responsive: true,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `F: ${context.parsed.y.toFixed(2)}N, x: ${context.parsed.x.toFixed(3)}m`;
                        }
                    }
                }
            }
        }
    });
}

// Generate spring visual elements
function generateSprings() {
    const container = document.getElementById('springContainer');
    container.innerHTML = '';
    
    if (currentTab === 'single') {
        const spring = document.createElement('div');
        spring.className = 'spring-single';
        spring.innerHTML = '<div class="spring-coil"></div>';
        container.appendChild(spring);
    } 
    else if (currentTab === 'series') {
        const springGroup = document.createElement('div');
        springGroup.className = 'spring-series';
        
        for (let i = 0; i < springCount; i++) {
            const springUnit = document.createElement('div');
            springUnit.className = 'spring-unit';
            springUnit.innerHTML = '<div class="spring-coil"></div>';
            springGroup.appendChild(springUnit);
            
            if (i < springCount - 1) {
                const connector = document.createElement('div');
                connector.className = 'connector';
                springGroup.appendChild(connector);
            }
        }
        
        container.appendChild(springGroup);
    } 
    else if (currentTab === 'parallel') {
        const springGroup = document.createElement('div');
        springGroup.className = 'spring-parallel';
        
        for (let i = 0; i < springCount; i++) {
            const springUnit = document.createElement('div');
            springUnit.className = 'spring-unit';
            springUnit.innerHTML = '<div class="spring-coil"></div>';
            springGroup.appendChild(springUnit);
        }
        
        container.appendChild(springGroup);
    }
}

// Update spring visual based on displacement
function updateSpringVisual() {
    const displacement = parseFloat(document.getElementById('displacementInput').value) || 0;
    const mass = parseFloat(document.getElementById('massInput').value) || 0;
    
    // Update mass display
    document.getElementById('mass').textContent = `${mass}g`;
    
    // Calculate spring stretch (simplified visualization)
    const stretchFactor = displacement * 1000; // Scale for visualization
    
    if (currentTab === 'single') {
        const spring = document.querySelector('.spring-single .spring-coil');
        spring.style.height = `${150 + stretchFactor}px`;
    } 
    else if (currentTab === 'series') {
        const springs = document.querySelectorAll('.spring-series .spring-coil');
        const unitStretch = stretchFactor / springCount;
        springs.forEach(spring => {
            spring.style.height = `${50 + unitStretch}px`;
        });
    } 
    else if (currentTab === 'parallel') {
        const springs = document.querySelectorAll('.spring-parallel .spring-coil');
        springs.forEach(spring => {
            spring.style.height = `${150 + stretchFactor}px`;
        });
    }
    
    // Add bounce animation
    const massElement = document.getElementById('mass');
    massElement.classList.add('bouncing');
    setTimeout(() => massElement.classList.remove('bouncing'), 1500);
}

// Update force calculation
function updateForce() {
    const mass = parseFloat(document.getElementById('massInput').value) || 0;
    const force = (mass / 1000) * GRAVITY; // Convert grams to kg and calculate force
    document.getElementById('forceInput').value = force.toFixed(2);
    updateSpringVisual();
}

// Update spring count
function updateSpringCount() {
    springCount = parseInt(document.getElementById('springCountInput').value) || 3;
    generateSprings();
    updateSpringVisual();
}

// Add data point to chart
function addDataPoint() {
    if (!currentUser) {
        alert('Silakan login terlebih dahulu!');
        return;
    }
    
    const force = parseFloat(document.getElementById('forceInput').value);
    const displacement = parseFloat(document.getElementById('displacementInput').value);
    
    if (isNaN(force)) {
        alert('Silakan masukkan massa terlebih dahulu!');
        return;
    }
    
    dataPoints.push({ x: displacement, y: force });
    chart.data.datasets[0].data = dataPoints;
    chart.update();
    
    document.getElementById('dataPoints').textContent = dataPoints.length;
}

// Calculate spring constant
function calculateConstant() {
    if (dataPoints.length < 2) {
        alert('Minimal diperlukan 2 data point untuk menghitung konstanta pegas!');
        return;
    }
    
    // Simple linear regression (slope = spring constant)
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    const n = dataPoints.length;
    
    dataPoints.forEach(point => {
        sumX += point.x;
        sumY += point.y;
        sumXY += point.x * point.y;
        sumXX += point.x * point.x;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    let ssTot = 0, ssRes = 0;
    const meanY = sumY / n;
    
    dataPoints.forEach(point => {
        ssTot += Math.pow(point.y - meanY, 2);
        const predictedY = slope * point.x + intercept;
        ssRes += Math.pow(point.y - predictedY, 2);
    });
    
    const rSquared = 1 - (ssRes / ssTot);
    
    document.getElementById('springConstant').textContent = slope.toFixed(2);
    document.getElementById('rSquared').textContent = rSquared.toFixed(4);
    document.getElementById('uncertainty').textContent = `±${(slope * 0.05).toFixed(2)}`;
}

// Reset data points
function resetData() {
    dataPoints = [];
    chart.data.datasets[0].data = [];
    chart.update();
    
    document.getElementById('dataPoints').textContent = '0';
    document.getElementById('springConstant').textContent = '-';
    document.getElementById('rSquared').textContent = '-';
    document.getElementById('uncertainty').textContent = '-';
}

// Save experiment
function saveExperiment() {
    if (!currentUser) {
        alert('Silakan login terlebih dahulu!');
        return;
    }
    
    if (dataPoints.length < 2) {
        alert('Minimal diperlukan 2 data point untuk menyimpan percobaan!');
        return;
    }
    
    const springConstant = document.getElementById('springConstant').textContent;
    
    const experiment = {
        type: currentTab,
        springCount: springCount,
        springConstant: parseFloat(springConstant),
        dataPoints: [...dataPoints],
        timestamp: new Date().toISOString()
    };
    
    db.saveExperiment(experiment);
    alert('Percobaan berhasil disimpan!');
}

// Switch between tabs
function switchTab(tab) {
    currentTab = tab;
    
    // Update UI
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    document.getElementById('simulatorTitle').textContent = `🌟 Virtual Spring Lab - ${springConfigs[tab].title}`;
    document.getElementById('springInfo').innerHTML = `
        <h4>${springConfigs[tab].title}</h4>
        <p>${springConfigs[tab].info}</p>
    `;
    document.getElementById('formulaDisplay').innerHTML = springConfigs[tab].formula;
    
    // Show/hide spring count control
    const springCountControl = document.getElementById('springCountControl');
    if (springConfigs[tab].showSpringCount) {
        springCountControl.classList.add('show');
    } else {
        springCountControl.classList.remove('show');
    }
    
    generateSprings();
    updateSpringVisual();
}

// User management functions
function logout() {
    currentUser = null;
    document.querySelector('.container').style.display = 'none';
    document.getElementById('loginModal').style.display = 'flex';
    resetData();
}

function showHistory() {
    if (!currentUser) {
        alert('Silakan login terlebih dahulu!');
        return;
    }
    
    const historyTableBody = document.getElementById('historyTableBody');
    historyTableBody.innerHTML = '';
    
    const userExperiments = db.getExperiments(currentUser);
    
    if (userExperiments.length === 0) {
        historyTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Belum ada data percobaan</td></tr>';
    } else {
        userExperiments.forEach(exp => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(exp.timestamp).toLocaleString()}</td>
                <td>${exp.type === 'single' ? 'Tunggal' : exp.type === 'series' ? 'Seri' : 'Paralel'}</td>
                <td>${exp.springCount || '-'}</td>
                <td>${exp.springConstant.toFixed(2)}</td>
                <td>${exp.dataPoints.length}</td>
                <td>-</td>
                <td>
                    <button class="btn btn-small btn-secondary" onclick="loadExperiment(${exp.id})">Muat</button>
                    <button class="btn btn-small btn-danger" onclick="deleteExperiment(${exp.id})">Hapus</button>
                </td>
            `;
            historyTableBody.appendChild(row);
        });
    }
    
    document.getElementById('historySection').style.display = 'block';
}

function hideHistory() {
    document.getElementById('historySection').style.display = 'none';
}

function loadExperiment(id) {
    const experiment = db.experiments.find(exp => exp.id === id);
    if (!experiment) return;
    
    currentTab = experiment.type;
    springCount = experiment.springCount || 3;
    dataPoints = [...experiment.dataPoints];
    
    // Update UI
    switchTab(currentTab);
    document.getElementById('springCountInput').value = springCount;
    
    // Update chart
    chart.data.datasets[0].data = dataPoints;
    chart.update();
    
    // Update results
    document.getElementById('dataPoints').textContent = dataPoints.length;
    document.getElementById('springConstant').textContent = experiment.springConstant.toFixed(2);
    
    hideHistory();
}

function deleteExperiment(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus percobaan ini?')) return;
    
    db.deleteExperiment(id);
    showHistory();
}

function exportUserData() {
    if (!currentUser) {
        alert('Silakan login terlebih dahulu!');
        return;
    }
    
    const userExperiments = db.getExperiments(currentUser);
    const data = {
        user: db.getUser(currentUser),
        experiments: userExperiments
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `physics_lab_data_${currentUser}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importUserData(event) {
    if (!currentUser) {
        alert('Silakan login terlebih dahulu!');
        return;
    }
    
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.user && data.user.name !== currentUser) {
                alert('Data tidak cocok dengan user yang sedang login!');
                return;
            }
            
            // Add imported experiments
            if (data.experiments && data.experiments.length > 0) {
                data.experiments.forEach(exp => {
                    db.saveExperiment(exp);
                });
                alert(`${data.experiments.length} percobaan berhasil diimpor!`);
                showHistory();
            }
            
            event.target.value = '';
        } catch (error) {
            alert('Error importing data: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// Update user interface after login
function updateUserInterface() {
    const user = db.getUser(currentUser);
    if (!user) return;
    
    // Update user info
    document.getElementById('userAvatar').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('userWelcome').textContent = `Selamat datang, ${user.name}!`;
    document.getElementById('userStats').textContent = `Total percobaan: ${user.totalExperiments || 0} | Sesi terakhir: ${new Date(user.lastSession).toLocaleString()}`;
    
    // Show user section
    document.getElementById('userInfo').style.display = 'flex';
    document.getElementById('userActions').style.display = 'block';
}

// Login/Registration Functions
function switchLoginTab(tab) {
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
    
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
}

function performLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        alert('Silakan isi username dan password!');
        return;
    }
    
    const result = db.authenticate(username, password);
    if (!result.success) {
        alert(result.message);
        return;
    }
    
    // Successful login
    currentUser = username;
    const user = result.user;
    user.lastSession = new Date().toISOString();
    db.saveUser(username, user);
    
    // Hide login modal and show main app
    document.getElementById('loginModal').style.display = 'none';
    document.querySelector('.container').style.display = 'block';
    updateUserInterface();
}

function performRegistration() {
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirm').value;
    
    if (!username || !password || !confirm) {
        alert('Silakan isi semua field!');
        return;
    }
    
    if (password !== confirm) {
        alert('Password dan konfirmasi password tidak cocok!');
        return;
    }
    
    if (username.length < 3 || username.length > 20) {
        alert('Username harus antara 3-20 karakter!');
        return;
    }
    
    if (password.length < 6) {
        alert('Password harus minimal 6 karakter!');
        return;
    }
    
    const result = db.registerUser(username, password);
    if (!result.success) {
        alert(result.message);
        return;
    }
    
    alert('Registrasi berhasil! Silakan login dengan akun Anda.');
    switchLoginTab('login');
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = '';
    document.getElementById('registerUsername').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerConfirm').value = '';
}

// Database Manager Functions
function showDatabaseManager() {
    if (!currentUser || !db.getUser(currentUser)?.isAdmin) {
        alert('Hanya admin yang dapat mengakses database manager!');
        return;
    }
    
    // Populate user list
    const userListBody = document.getElementById('userListBody');
    userListBody.innerHTML = '';
    
    Object.keys(db.users).forEach(username => {
        const user = db.users[username];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${username}</td>
            <td>${user.totalExperiments || 0}</td>
            <td>${new Date(user.joinDate).toLocaleDateString('id-ID')}</td>
            <td>
                <button class="btn btn-small btn-danger" onclick="deleteUser('${username}')">Hapus</button>
            </td>
        `;
        userListBody.appendChild(row);
    });
    
    document.getElementById('databaseManagerModal').style.display = 'flex';
}

function hideDatabaseManager() {
    document.getElementById('databaseManagerModal').style.display = 'none';
}

function deleteUser(username) {
    if (username === 'admin') {
        alert('Tidak dapat menghapus akun admin!');
        return;
    }
    
    if (!confirm(`Apakah Anda yakin ingin menghapus user ${username}?`)) return;
    
    // Delete user's experiments first
    db.experiments = db.experiments.filter(exp => exp.userId !== username);
    delete db.users[username];
    
    // Refresh user list
    showDatabaseManager();
    alert(`User ${username} berhasil dihapus!`);
}

function exportAllData() {
    const data = db.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `physics_lab_full_database_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importAllData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!confirm('Import data akan menimpa semua data yang ada. Lanjutkan?')) {
        event.target.value = '';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            db.importData(data);
            alert('Database berhasil diimpor!');
            event.target.value = '';
        } catch (error) {
            alert('Error importing database: ' + error.message);
        }
    };
    reader.readAsText(file);
}

function clearAllData() {
    if (!confirm('PERINGATAN: Ini akan menghapus SEMUA data kecuali akun admin. Lanjutkan?')) return;
    
    // Keep only admin user
    const adminUser = db.users['admin'];
    db.users = {};
    db.users['admin'] = adminUser;
    db.experiments = [];
    db.nextExperimentId = 1;
    
    alert('Semua data berhasil dihapus!');
    hideDatabaseManager();
}

// Calculate total spring constant
function calculateTotalSpringConstant() {
    if (currentTab === 'single') {
        return DEFAULT_SPRING_CONSTANT;
    } else if (currentTab === 'series') {
        return 1 / (springCount * (1/DEFAULT_SPRING_CONSTANT));
    } else if (currentTab === 'parallel') {
        return springCount * DEFAULT_SPRING_CONSTANT;
    }
}