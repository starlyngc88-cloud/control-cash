
// View Switching Logic
function switchView(viewId) {
    // Hide all views
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('active');
    });
    
    // Show selected view
    const target = document.getElementById(`view-${viewId}`);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }

    // Update Sidebar active state
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Update Header Title
    const titles = {
        'dashboard': 'Dashboard General',
        'ingresos': 'Gestión de Ingresos',
        'gastos': 'Gestión de Gastos',
        'hucha': 'Hucha y Ahorros'
    };
    document.getElementById('page-title').innerText = titles[viewId] || 'KellyCash';
}

// Initialize Charts when DOM is loaded
document.addEventListener("DOMContentLoaded", function() {
    
    // Cashflow Line Chart
    const ctxCashflow = document.getElementById('cashflowChart').getContext('2d');
    new Chart(ctxCashflow, {
        type: 'line',
        data: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago'],
            datasets: [
                {
                    label: 'Ingresos',
                    data: [4200, 4500, 4300, 5100, 4800, 5200, 5000, 5100],
                    borderColor: '#10b981', // emerald-500
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Gastos',
                    data: [2800, 3100, 2900, 3500, 2600, 3000, 2850, 2900],
                    borderColor: '#f43f5e', // rose-500
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8 } }
            },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [2, 4], color: '#f1f5f9' }, border: {display: false} },
                x: { grid: { display: false }, border: {display: false} }
            }
        }
    });

    // Category Doughnut Chart
    const ctxCategory = document.getElementById('categoryChart').getContext('2d');
    new Chart(ctxCategory, {
        type: 'doughnut',
        data: {
            labels: ['Alimentación', 'Vivienda', 'Transporte', 'Ocio'],
            datasets: [{
                data: [40, 30, 15, 15],
                backgroundColor: [
                    '#3b82f6', // blue-500
                    '#8b5cf6', // violet-500
                    '#f59e0b', // amber-500
                    '#ec4899'  // pink-500
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
            }
        }
    });
});
