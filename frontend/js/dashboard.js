/**
 * DASHBOARD.JS
 * Handles all dashboard functionality for Fruit Detection Project
 * Features: Navigation, image upload, camera capture, API integration, charts, sensor data
 */

// =============================================
// GLOBAL VARIABLES
// =============================================

let currentSection = 'upload';
let uploadedImage = null;
let analysisResults = null;

// Chart instances
let spectralChart = null;
let nutrientChart = null;
let qualityChart = null;
let sensorChart = null;

// AS7265x sensor wavelengths (18 channels)
const SENSOR_WAVELENGTHS = [
    410, 435, 460, 485, 510, 535, 560, 585, 610, 
    645, 680, 705, 730, 760, 810, 860, 900, 940
];

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    checkAuth();
    
    // Initialize UI components
    initializeNavigation();
    initializeUpload();
    initializeCamera();
    initializeCharts();
    
    // Load user info
    loadUserInfo();
    
    // Setup logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
});

// =============================================
// AUTHENTICATION
// =============================================

/**
 * Check if user is authenticated
 */
function checkAuth() {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
    }
}


/**
 * Load user information from storage
 */
function loadUserInfo() {
    const userDataStr = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    
    if (userDataStr) {
        try {
            const userData = JSON.parse(userDataStr);
            document.getElementById('userName').textContent = userData.name || 'User';
            document.getElementById('userEmail').textContent = userData.email || 'user@atria.edu';
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
}

/**
 * Handle logout
 */
function handleLogout(e) {
    e.preventDefault();
    
    // Clear all storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    
    // Show toast
    showToast('Logged out successfully');
    
    // Redirect to login
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 500);
}

// =============================================
// NAVIGATION
// =============================================

/**
 * Initialize sidebar navigation
 */
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    const sections = document.querySelectorAll('.content-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            const sectionId = item.getAttribute('data-section');
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Update active section
            sections.forEach(section => section.classList.remove('active'));
            document.getElementById(`${sectionId}Section`).classList.add('active');
            
            // Update page title
            const pageTitle = item.querySelector('span').textContent;
            document.getElementById('pageTitle').textContent = pageTitle;
            
            currentSection = sectionId;
        });
    });
    
    // Sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });
}

// =============================================
// IMAGE UPLOAD
// =============================================

/**
 * Initialize image upload functionality
 */
function initializeUpload() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const cameraBtn = document.getElementById('cameraBtn');
    const imagePreview = document.getElementById('imagePreview');
    const previewImage = document.getElementById('previewImage');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const analyzeBtn = document.getElementById('analyzeBtn');
    
    // Click to browse
    uploadZone.addEventListener('click', () => fileInput.click());
    browseBtn.addEventListener('click', () => fileInput.click());
    
    // File selection
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });
    
    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--primary-color)';
        uploadZone.style.background = 'var(--bg-secondary)';
    });
    
    uploadZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '';
        uploadZone.style.background = '';
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '';
        uploadZone.style.background = '';
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleFileUpload(file);
        } else {
            showToast('Please upload a valid image file', 'error');
        }
    });
    
    // Remove image
    removeImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearUploadedImage();
    });
    
    // Analyze button
    analyzeBtn.addEventListener('click', () => {
        if (uploadedImage) {
            analyzeApple();
        }
    });
}

/**
 * Handle file upload
 * @param {File} file - Image file
 */
function handleFileUpload(file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please upload a valid image file', 'error');
        return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be less than 10MB', 'error');
        return;
    }
    
    // Read file and display preview
    const reader = new FileReader();
    
    reader.onload = (e) => {
        uploadedImage = {
            file: file,
            dataUrl: e.target.result
        };
        
        // Show preview
        document.getElementById('previewImage').src = e.target.result;
        document.getElementById('uploadZone').classList.add('hidden');
        document.querySelector('.upload-buttons').classList.add('hidden');
        document.getElementById('imagePreview').classList.remove('hidden');
        document.getElementById('analyzeBtn').classList.remove('hidden');
        
        showToast('Image uploaded successfully');
    };
    
    reader.onerror = () => {
        showToast('Error reading file', 'error');
    };
    
    reader.readAsDataURL(file);
}

/**
 * Clear uploaded image
 */
function clearUploadedImage() {
    uploadedImage = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('uploadZone').classList.remove('hidden');
    document.querySelector('.upload-buttons').classList.remove('hidden');
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('analyzeBtn').classList.add('hidden');
}

// =============================================
// CAMERA CAPTURE
// =============================================

/**
 * Initialize camera capture functionality
 */
function initializeCamera() {
    const cameraBtn = document.getElementById('cameraBtn');
    const cameraModal = document.getElementById('cameraModal');
    const closeCameraModal = document.getElementById('closeCameraModal');
    const cancelCamera = document.getElementById('cancelCamera');
    const captureBtn = document.getElementById('captureBtn');
    const cameraStream = document.getElementById('cameraStream');
    const cameraCanvas = document.getElementById('cameraCanvas');
    
    let stream = null;
    
    // Open camera modal
    cameraBtn.addEventListener('click', async () => {
        try {
            // Request camera access
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            
            cameraStream.srcObject = stream;
            cameraModal.classList.remove('hidden');
            
        } catch (error) {
            console.error('Camera error:', error);
            showToast('Unable to access camera. Please check permissions.', 'error');
        }
    });
    
    // Close camera modal
    const closeCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        cameraModal.classList.add('hidden');
    };
    
    closeCameraModal.addEventListener('click', closeCamera);
    cancelCamera.addEventListener('click', closeCamera);
    
    // Capture photo
    captureBtn.addEventListener('click', () => {
        // Set canvas size to match video
        cameraCanvas.width = cameraStream.videoWidth;
        cameraCanvas.height = cameraStream.videoHeight;
        
        // Draw video frame to canvas
        const ctx = cameraCanvas.getContext('2d');
        ctx.drawImage(cameraStream, 0, 0);
        
        // Get image data
        cameraCanvas.toBlob((blob) => {
            // Create file from blob
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
            
            // Handle as uploaded file
            handleFileUpload(file);
            
            // Close camera
            closeCamera();
            
        }, 'image/jpeg', 0.95);
    });
}

// =============================================
// FRUIT ANALYSIS
// =============================================

/**
 * Analyze uploaded apple image
 */
async function analyzeApple() {
    if (!uploadedImage) {
        showToast('Please upload an image first', 'error');
        return;
    }
    
    // Show loading state
    const analyzeBtn = document.getElementById('analyzeBtn');
    const analyzeBtnText = document.getElementById('analyzeBtnText');
    const analyzeSpinner = document.getElementById('analyzeSpinner');
    
    analyzeBtn.disabled = true;
    analyzeBtnText.textContent = 'Analyzing...';
    analyzeSpinner.classList.remove('hidden');
    
    try {
        // Call analysis API
        const results = await callAnalysisAPI(uploadedImage.file);
        
        // Store results
        analysisResults = results;
        
        // Update UI with results
        displayAnalysisResults(results);
        
        // Switch to analyze section
        document.querySelector('.nav-item[data-section="analyze"]').click();
        
        showToast('Analysis completed successfully');
        
    } catch (error) {
        console.error('Analysis error:', error);
        showToast('Analysis failed. Please try again.', 'error');
        
    } finally {
        // Hide loading state
        analyzeBtn.disabled = false;
        analyzeBtnText.textContent = 'Analyze Apple';
        analyzeSpinner.classList.add('hidden');
    }
}

/**
 * Call analysis API endpoint
 * @param {File} imageFile - Image file to analyze
 * @returns {Promise<Object>} Analysis results
 */
async function callAnalysisAPI(imageFile) {
    const API_URL = 'http://127.0.0.1:8000/api/analyze/apple';  // fixed absolute URL

    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(API_URL, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Analysis request failed');
    }

    return await response.json();
}

/**
 * Generate mock analysis data for demo
 * @returns {Object} Mock analysis results
 */
function generateMockAnalysisData() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                freshness_score: Math.floor(Math.random() * 20) + 75, // 75-95
                dry_matter_percent: (Math.random() * 3 + 12).toFixed(1), // 12-15%
                spoilage_risk: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
                pesticide_class: ['Pure', 'Fungicide Low', 'Fungicide High', 'Insecticide Low'][Math.floor(Math.random() * 4)],
                estimated_weight_kg: (Math.random() * 0.15 + 0.15).toFixed(2), // 0.15-0.30 kg
                nutrition: {
                    water_percent: (Math.random() * 3 + 84).toFixed(1), // 84-87%
                    sugar_percent: (Math.random() * 2 + 10).toFixed(1), // 10-12%
                    fiber: (Math.random() * 1 + 2).toFixed(1), // 2-3g
                    vitamin_c_mg: (Math.random() * 3 + 4).toFixed(1) // 4-7mg
                },
                spectral_prediction_graph_data: Array.from({length: 50}, (_, i) => 
                    Math.sin(i / 5) * 20 + 50 + Math.random() * 10
                ),
                sensor_emulation_values: Array.from({length: 18}, () => 
                    Math.floor(Math.random() * 30000) + 5000
                )
            });
        }, 2000);
    });
}

/**
 * Display analysis results in UI
 * @param {Object} results - Analysis results
 */
function displayAnalysisResults(results) {
    // Update stat cards
    document.getElementById('freshnessScore').textContent = results.freshness_score;
    document.getElementById('dryMatter').textContent = results.dry_matter_percent + '%';
    document.getElementById('spoilageRisk').textContent = results.spoilage_risk;
    document.getElementById('pesticideLevel').textContent = results.pesticide_class;
    document.getElementById('estimatedWeight').textContent = results.estimated_weight_kg + ' kg';
    
    // Update nutrition values
    document.getElementById('waterContent').textContent = results.nutrition.water_percent + '%';
    document.getElementById('sugarContent').textContent = results.nutrition.sugar_percent + '%';
    document.getElementById('vitaminC').textContent = results.nutrition.vitamin_c_mg + ' mg';
    document.getElementById('fiberContent').textContent = results.nutrition.fiber + ' g';
    
    // Apply color coding to spoilage card
    const spoilageCard = document.getElementById('spoilageCard');
    spoilageCard.className = 'stat-card';
    spoilageCard.classList.add(`spoilage-${results.spoilage_risk.toLowerCase()}`);
    
    // Apply color coding to pesticide card
    const pesticideCard = document.getElementById('pesticideCard');
    pesticideCard.className = 'stat-card';
    if (results.pesticide_class.toLowerCase().includes('pure')) {
        pesticideCard.classList.add('pesticide-pure');
    } else if (results.pesticide_class.toLowerCase().includes('high')) {
        pesticideCard.classList.add('pesticide-high');
    } else {
        pesticideCard.classList.add('pesticide-low');
    }
    
    // Display quality assessment banner
    displayQualityAssessment(results);
    
    // Update charts
    updateSpectralChart(results.spectral_prediction_graph_data);
    updateNutrientChart(results.nutrition);
    updateQualityChart(results.freshness_score, results.spoilage_risk);
    
    // Update sensor data
    displaySensorData(results.sensor_emulation_values);
}

/**
 * Display overall quality assessment with safety recommendation
 * @param {Object} results - Analysis results
 */
function displayQualityAssessment(results) {
    const banner = document.getElementById('qualityBanner');
    const qualityGrade = document.getElementById('qualityGrade');
    const qualityMessage = document.getElementById('qualityMessage');
    const safetyBadge = document.getElementById('safetyBadge');
    const weightBadge = document.getElementById('weightBadge');
    const shelfLifeBadge = document.getElementById('shelfLifeBadge');
    
    // Calculate overall quality grade
    const assessment = calculateQualityGrade(results);
    
    // Update banner styling
    banner.className = 'quality-banner ' + assessment.grade.toLowerCase();
    banner.classList.remove('hidden');
    
    // Update content
    qualityGrade.textContent = assessment.gradeText;
    qualityMessage.textContent = assessment.message;
    
    // Update safety badge
    if (assessment.safeToEat) {
        safetyBadge.innerHTML = '✓ Safe to Eat';
        safetyBadge.style.background = 'rgba(255, 255, 255, 0.3)';
    } else {
        safetyBadge.innerHTML = '✗ Not Recommended';
        safetyBadge.style.background = 'rgba(255, 255, 255, 0.5)';
    }
    
    // Update weight badge
    weightBadge.textContent = `Weight: ${results.estimated_weight_kg} kg`;
    
    // Update shelf life badge
    shelfLifeBadge.textContent = `Shelf Life: ${assessment.shelfLife}`;
}

/**
 * Calculate overall quality grade based on all metrics
 * @param {Object} results - Analysis results
 * @returns {Object} Quality assessment
 */
function calculateQualityGrade(results) {
    const freshness = results.freshness_score;
    const spoilage = results.spoilage_risk;
    const pesticide = results.pesticide_class.toLowerCase();
    
    let grade = 'Excellent';
    let gradeText = 'Excellent Quality';
    let safeToEat = true;
    let message = '';
    let shelfLife = '';
    
    // Determine safety based on pesticide level
    const isPesticideHigh = pesticide.includes('high');
    const isPesticidePure = pesticide.includes('pure');
    
    // Determine grade and safety
    if (spoilage === 'High') {
        grade = 'Poor';
        gradeText = 'Poor Quality - High Spoilage Risk';
        safeToEat = false;
        message = '⚠️ This apple shows signs of spoilage and is NOT recommended for consumption. Discard immediately.';
        shelfLife = 'Spoiled';
    } else if (isPesticideHigh) {
        grade = 'Unsafe';
        gradeText = 'Unsafe - High Pesticide Levels';
        safeToEat = false;
        message = '⚠️ High pesticide residue detected. This apple should NOT be consumed without thorough washing or processing.';
        shelfLife = 'Not Safe';
    } else if (freshness >= 80 && spoilage === 'Low' && isPesticidePure) {
        grade = 'Excellent';
        gradeText = 'Excellent Quality';
        safeToEat = true;
        message = '✓ This apple is in perfect condition! Fresh, ripe, and free from pesticides. Safe to eat immediately.';
        shelfLife = '7-10 days';
    } else if (freshness >= 70 && spoilage === 'Low') {
        grade = 'Good';
        gradeText = 'Good Quality';
        safeToEat = true;
        message = '✓ This apple is in good condition and safe to eat. Wash thoroughly before consumption.';
        shelfLife = '5-7 days';
    } else if (freshness >= 60 && spoilage === 'Medium') {
        grade = 'Fair';
        gradeText = 'Fair Quality - Consume Soon';
        safeToEat = true;
        message = '⚡ This apple is edible but showing early signs of aging. Consume within 1-2 days. Best used for cooking.';
        shelfLife = '1-3 days';
    } else if (spoilage === 'Medium') {
        grade = 'Fair';
        gradeText = 'Fair Quality - Limited Freshness';
        safeToEat = true;
        message = '⚡ This apple is past its prime but still edible. Best used for cooking, baking, or smoothies within 1-2 days.';
        shelfLife = '1-2 days';
    } else {
        grade = 'Poor';
        gradeText = 'Poor Quality';
        safeToEat = false;
        message = '✗ This apple has deteriorated and is not recommended for consumption. Quality is too low.';
        shelfLife = 'Not recommended';
    }
    
    // Additional pesticide warnings
    if (safeToEat && !isPesticidePure) {
        message += ' Note: Pesticide residue detected - wash thoroughly with water or use produce wash.';
    }
    
    return {
        grade: grade,
        gradeText: gradeText,
        safeToEat: safeToEat,
        message: message,
        shelfLife: shelfLife
    };
}

// =============================================
// CHARTS
// =============================================

/**
 * Initialize all charts
 */
function initializeCharts() {
    // Spectral Chart
    const spectralCtx = document.getElementById('spectralChart').getContext('2d');
    spectralChart = new Chart(spectralCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Spectral Response',
                data: [],
                borderColor: 'rgb(79, 70, 229)',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Intensity'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Wavelength Index'
                    }
                }
            }
        }
    });
    
    // Nutrient Chart
    const nutrientCtx = document.getElementById('nutrientChart').getContext('2d');
    nutrientChart = new Chart(nutrientCtx, {
        type: 'bar',
        data: {
            labels: ['Water', 'Sugar', 'Fiber', 'Vitamin C'],
            datasets: [{
                label: 'Nutrient Composition',
                data: [0, 0, 0, 0],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(239, 68, 68, 0.7)'
                ],
                borderColor: [
                    'rgb(59, 130, 246)',
                    'rgb(245, 158, 11)',
                    'rgb(16, 185, 129)',
                    'rgb(239, 68, 68)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Value'
                    }
                }
            }
        }
    });
    
    // Quality Chart
    const qualityCtx = document.getElementById('qualityChart').getContext('2d');
    qualityChart = new Chart(qualityCtx, {
        type: 'doughnut',
        data: {
            labels: ['Fresh', 'At Risk', 'Spoiled'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(239, 68, 68, 0.7)'
                ],
                borderColor: [
                    'rgb(16, 185, 129)',
                    'rgb(245, 158, 11)',
                    'rgb(239, 68, 68)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

/**
 * Update spectral chart with data
 * @param {Array} data - Spectral data array
 */
function updateSpectralChart(data) {
    spectralChart.data.labels = data.map((_, i) => i + 1);
    spectralChart.data.datasets[0].data = data;
    spectralChart.update();
}

/**
 * Update nutrient chart with data
 * @param {Object} nutrition - Nutrition data
 */
function updateNutrientChart(nutrition) {
    nutrientChart.data.datasets[0].data = [
        parseFloat(nutrition.water_percent),
        parseFloat(nutrition.sugar_percent),
        parseFloat(nutrition.fiber),
        parseFloat(nutrition.vitamin_c_mg)
    ];
    nutrientChart.update();
}

/**
 * Update quality distribution chart
 * @param {number} freshness - Freshness score
 * @param {string} spoilage - Spoilage risk level
 */
function updateQualityChart(freshness, spoilage) {
    let fresh = 0, atRisk = 0, spoiled = 0;
    
    if (spoilage === 'Low') {
        fresh = 80;
        atRisk = 15;
        spoiled = 5;
    } else if (spoilage === 'Medium') {
        fresh = 40;
        atRisk = 45;
        spoiled = 15;
    } else {
        fresh = 10;
        atRisk = 30;
        spoiled = 60;
    }
    
    qualityChart.data.datasets[0].data = [fresh, atRisk, spoiled];
    qualityChart.update();
}

// =============================================
// SENSOR EMULATION
// =============================================

/**
 * Display AS7265x sensor data
 * @param {Array} values - 18 sensor channel values
 */
function displaySensorData(values) {
    const tableBody = document.getElementById('sensorTableBody');
    tableBody.innerHTML = '';
    
    values.forEach((value, index) => {
        const row = document.createElement('tr');
        
        // Calculate intensity percentage
        const maxValue = 65535; // 16-bit max
        const percentage = (value / maxValue * 100).toFixed(1);
        
        row.innerHTML = `
            <td><strong>CH${index + 1}</strong></td>
            <td>${SENSOR_WAVELENGTHS[index]} nm</td>
            <td>${value.toLocaleString()}</td>
            <td>
                <div class="intensity-bar">
                    <div class="intensity-fill" style="width: ${percentage}%"></div>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Setup sensor graph button
    const viewSensorGraphBtn = document.getElementById('viewSensorGraphBtn');
    viewSensorGraphBtn.onclick = () => {
        document.getElementById('sensorChartCard').classList.remove('hidden');
        updateSensorChart(values);
        
        // Scroll to chart
        document.getElementById('sensorChartCard').scrollIntoView({ behavior: 'smooth' });
    };
}

/**
 * Update sensor visualization chart
 * @param {Array} values - 18 sensor channel values
 */
function updateSensorChart(values) {
    const ctx = document.getElementById('sensorChart').getContext('2d');
    
    // Destroy existing chart if exists
    if (sensorChart) {
        sensorChart.destroy();
    }
    
    // Create new chart
    sensorChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: SENSOR_WAVELENGTHS.map(w => `${w}nm`),
            datasets: [{
                label: 'Sensor Response',
                data: values,
                borderColor: 'rgb(139, 92, 246)',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'AS7265x 18-Channel Spectral Response'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Intensity Value'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Wavelength (nm)'
                    }
                }
            }
        }
    });
}

// =============================================
// TOAST NOTIFICATIONS
// =============================================

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type ('success' or 'error')
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// =============================================
// DEMO HELPERS
// =============================================

console.log('%c🎨 Fruit Detection Project Dashboard Loaded', 'color: #4f46e5; font-size: 14px; font-weight: bold;');
console.log('%cUpload an image or use camera to analyze fruit quality', 'color: #6b7280; font-size: 12px;');