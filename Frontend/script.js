/* ==========================================================================
   AutoPro Service Hub — Client Controller
   Design Language: "Not Generic AI UI" (Customer.io Inspired Reference)
   - Fully interactive frontend with dynamic data feeds
   - LocalStorage persistence with rich mock dataset
   - Universal real-time search across all views
   - Live Workshop Alerts & Notifications panel
   - Dynamic Reports & Analytics aggregating live database records
   - Dynamic Bay Utilization tracker
   ========================================================================== */

const STORAGE_KEY = "autopro_service_hub_v2";

let data = null;
let throughputChart = null;
let categoryChart = null;
let paymentChart = null;
let currentChartRange = "7d"; // "7d" or "14d"
let activeAppointmentFilter = "All";
let activeVehicleFuelFilter = "All";
let activeInvoiceInModal = null;
let activePageName = "dashboard";
let globalSearchQuery = "";
let alertsAcknowledged = false;

// Helpers
const $ = id => document.getElementById(id);

const money = val => "₹" + Number(val || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0
});

function escapeHTML(str) {
    return String(str ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[c]));
}

function initials(name) {
    return String(name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(x => x[0])
        .join("")
        .toUpperCase();
}

const AVATAR_COLORS = [
    "#3B82F6", "#8B5CF6", "#14B8A6", "#F59E0B", "#EC4899", "#6366F1"
];

function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < (name || "").length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function toast(msg) {
    const el = $("toastPill");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => {
        el.classList.remove("show");
    }, 2800);
}

/* ==========================================================================
   SEED / INITIAL DATA
   ========================================================================== */
function createInitialData() {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    return {
        customers: [
            { id: 1, name: "Rahul Sharma", phone: "9876543210", email: "rahul@example.com", address: "Indiranagar, Bengaluru" },
            { id: 2, name: "Aisha Khan", phone: "9988776655", email: "aisha@example.com", address: "Koramangala, Bengaluru" },
            { id: 3, name: "Vikram Patil", phone: "9123456789", email: "vikram@example.com", address: "Whitefield, Bengaluru" },
            { id: 4, name: "Priya Mehta", phone: "9345678901", email: "priya@example.com", address: "HSR Layout, Bengaluru" },
            { id: 5, name: "Arjun Rao", phone: "9012345678", email: "arjun@example.com", address: "Jayanagar, Bengaluru" }
        ],

        vehicles: [
            { id: 1, customerId: 1, registration: "KA01AB4521", make: "Hyundai", model: "Creta", year: 2022, fuel: "Diesel", mileage: 38500, color: "Polar White" },
            { id: 2, customerId: 2, registration: "KA05CD7821", make: "Honda", model: "City", year: 2021, fuel: "Petrol", mileage: 42100, color: "Crystal Black" },
            { id: 3, customerId: 3, registration: "KA03EF9012", make: "Toyota", model: "Fortuner", year: 2023, fuel: "Diesel", mileage: 18200, color: "Silver Metallic" },
            { id: 4, customerId: 4, registration: "KA41GH3210", make: "Tata", model: "Nexon EV", year: 2024, fuel: "Electric", mileage: 9400, color: "Teal Blue" },
            { id: 5, customerId: 5, registration: "KA06JK5512", make: "Mahindra", model: "XUV700", year: 2022, fuel: "Diesel", mileage: 32700, color: "Crimson Red" }
        ],

        mechanics: [
            { id: 1, name: "Arjun", specialization: "Engine & Diagnostics", experience: 7, status: "Available", phone: "+91 90000 11111" },
            { id: 2, name: "Vikram", specialization: "Electrical & AC Systems", experience: 5, status: "Busy", phone: "+91 90000 22222" },
            { id: 3, name: "Ravi", specialization: "Brakes & Suspension", experience: 8, status: "Available", phone: "+91 90000 33333" },
            { id: 4, name: "Suresh", specialization: "General Maintenance", experience: 6, status: "Available", phone: "+91 90000 44444" }
        ],

        services: [
            { id: 1, name: "Full Car Service", category: "Maintenance", price: 4500, duration: 180 },
            { id: 2, name: "Oil & Filter Change", category: "Maintenance", price: 2200, duration: 60 },
            { id: 3, name: "Brake Inspection", category: "Brakes", price: 1200, duration: 45 },
            { id: 4, name: "Brake Pad Replacement", category: "Brakes", price: 6800, duration: 120 },
            { id: 5, name: "AC Service & Gas Recharge", category: "Comfort", price: 3500, duration: 90 },
            { id: 6, name: "Engine Diagnostic Scan", category: "Diagnostics", price: 2500, duration: 60 },
            { id: 7, name: "Wheel Alignment & Balancing", category: "Tyres", price: 900, duration: 45 },
            { id: 8, name: "Battery Health Check", category: "Electrical", price: 500, duration: 30 }
        ],

        appointments: [
            {
                id: 1,
                customerId: 1,
                customer: "Rahul Sharma",
                phone: "9876543210",
                vehicleId: 1,
                registration: "KA01AB4521",
                make: "Hyundai",
                model: "Creta",
                service: "Full Car Service",
                mechanic: "Arjun",
                date: today,
                time: "10:00",
                cost: 4500,
                status: "In Progress",
                notes: "Engine inspection and oil filter change requested"
            },
            {
                id: 2,
                customerId: 2,
                customer: "Aisha Khan",
                phone: "9988776655",
                vehicleId: 2,
                registration: "KA05CD7821",
                make: "Honda",
                model: "City",
                service: "Oil & Filter Change",
                mechanic: "Suresh",
                date: today,
                time: "12:30",
                cost: 2200,
                status: "Completed",
                notes: "Standard semi-synthetic engine oil replacement"
            },
            {
                id: 3,
                customerId: 3,
                customer: "Vikram Patil",
                phone: "9123456789",
                vehicleId: 3,
                registration: "KA03EF9012",
                make: "Toyota",
                model: "Fortuner",
                service: "Brake Pad Replacement",
                mechanic: "Ravi",
                date: tomorrow,
                time: "14:00",
                cost: 6800,
                status: "Scheduled",
                notes: "Grinding noise on heavy deceleration"
            },
            {
                id: 4,
                customerId: 4,
                customer: "Priya Mehta",
                phone: "9345678901",
                vehicleId: 4,
                registration: "KA41GH3210",
                make: "Tata",
                model: "Nexon EV",
                service: "Battery Health Check",
                mechanic: "Vikram",
                date: today,
                time: "15:30",
                cost: 500,
                status: "In Progress",
                notes: "Range calibration and cell voltage scan"
            },
            {
                id: 5,
                customerId: 5,
                customer: "Arjun Rao",
                phone: "9012345678",
                vehicleId: 5,
                registration: "KA06JK5512",
                make: "Mahindra",
                model: "XUV700",
                service: "AC Service & Gas Recharge",
                mechanic: "Suresh",
                date: yesterday,
                time: "11:00",
                cost: 3500,
                status: "Completed",
                notes: "Cabin cooling efficiency drop in stop-go traffic"
            }
        ],

        invoices: [
            {
                id: 1,
                appointmentId: 2,
                invoiceNo: "INV-1001",
                customer: "Aisha Khan",
                registration: "KA05CD7821",
                service: "Oil & Filter Change",
                subtotal: 2200,
                tax: 396,
                discount: 0,
                total: 2596,
                status: "Paid",
                method: "UPI",
                date: today
            },
            {
                id: 2,
                appointmentId: 5,
                invoiceNo: "INV-1002",
                customer: "Arjun Rao",
                registration: "KA06JK5512",
                service: "AC Service & Gas Recharge",
                subtotal: 3500,
                tax: 630,
                discount: 200,
                total: 3930,
                status: "Paid",
                method: "Card",
                date: yesterday
            }
        ],

        activityFeed: [
            { id: 1, person: "Arjun", action: "dispatched Bay 1 lift for", target: "KA01AB4521 Creta", time: "22m ago" },
            { id: 2, person: "Vikram", action: "ran OBD diagnostic sweep on", target: "KA41GH3210 Nexon EV", time: "48m ago" },
            { id: 3, person: "Aisha Khan", action: "settled invoice INV-1001 via", target: "UPI (₹2,596)", time: "2h ago" },
            { id: 4, person: "Ravi", action: "staged OEM ceramic pads for", target: "KA03EF9012 Fortuner", time: "4h ago" },
            { id: 5, person: "Suresh", action: "finished compressor leak test on", target: "KA06JK5512 XUV700", time: "Yesterday" }
        ],

        settings: {
            workshopName: "AutoPro Service Hub",
            phone: "+91 98765 43210",
            email: "service@autoprohub.com",
            gstin: "29ABCDE1234F1Z5",
            taxRate: 18
        }
    };
}

function loadState() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            data = JSON.parse(stored);
        } else {
            data = createInitialData();
            saveState();
        }
    } catch (e) {
        data = createInitialData();
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error("Storage error", e);
    }
}

/* ==========================================================================
   NAVIGATION
   ========================================================================== */
function setupNavigation() {
    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.addEventListener("click", () => {
            const page = btn.dataset.page;
            if (!page) return;
            showPage(page);
        });
    });

    // Mobile menu toggle & backdrop
    const menuBtn = $("mobileMenuBtn");
    const sidebar = $("sidebar");
    const backdrop = $("sidebarBackdrop");
    if (menuBtn && sidebar) {
        menuBtn.addEventListener("click", () => {
            sidebar.classList.toggle("open");
            backdrop?.classList.toggle("show");
        });
        backdrop?.addEventListener("click", () => {
            sidebar.classList.remove("open");
            backdrop.classList.remove("show");
        });
        document.addEventListener("click", e => {
            if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
                sidebar.classList.remove("open");
                backdrop?.classList.remove("show");
            }
        });
    }
}

function showPage(pageName) {
    activePageName = pageName;
    document.querySelectorAll(".page-container").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(el => el.classList.remove("active"));

    const targetPage = $("page-" + pageName);
    if (targetPage) {
        targetPage.classList.add("active");
    }

    const targetNav = document.querySelector(`.nav-item[data-page="${pageName}"]`);
    if (targetNav) {
        targetNav.classList.add("active");
    }

    // Dismiss notifications dropdown if open
    $("notificationsDropdown")?.classList.remove("show");

    // Refresh specific page views
    if (pageName === "dashboard") renderDashboard();
    if (pageName === "appointments") renderAppointments();
    if (pageName === "vehicles") renderVehicles();
    if (pageName === "customers") renderCustomers();
    if (pageName === "mechanics") renderMechanics();
    if (pageName === "services") renderServices();
    if (pageName === "invoices") renderInvoices();
    if (pageName === "reports") renderReports();

    // Re-apply any active search filter to the current view
    if (globalSearchQuery) {
        applySearchToCurrentPage();
    }

    // Close mobile drawer if open
    $("sidebar")?.classList.remove("open");
    $("sidebarBackdrop")?.classList.remove("show");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ==========================================================================
   DASHBOARD RENDERING (Asymmetric Customer.io Layout)
   ========================================================================== */
function renderDashboard() {
    // 1. Task Cards Row ("Ready to keep going?")
    const activeTasks = data.appointments.slice(0, 3);
    const taskCardsContainer = $("quickTaskCards");

    if (taskCardsContainer) {
        taskCardsContainer.innerHTML = activeTasks.map(appt => `
            <div class="task-card" data-appt-id="${appt.id}">
                <div class="task-card-top">
                    <div class="task-meta-tag">
                        <div class="task-icon-sq">
                            <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        </div>
                        <span>${escapeHTML(appt.status)}</span>
                    </div>
                    <span class="task-time">${escapeHTML(appt.time)}</span>
                </div>
                <div>
                    <div class="task-card-title">${escapeHTML(appt.make)} ${escapeHTML(appt.model)} — ${escapeHTML(appt.service)}</div>
                    <div class="task-card-subtitle">${escapeHTML(appt.customer)} · Plate ${escapeHTML(appt.registration)}</div>
                </div>
            </div>
        `).join("");

        taskCardsContainer.querySelectorAll(".task-card").forEach(c => {
            c.addEventListener("click", () => {
                showPage("appointments");
            });
        });
    }

    // 2. Unboxed Data Viz (Bar Chart)
    drawThroughputChart();

    // 3. Right Rail: Completely Unboxed Activity Feed
    const feedContainer = $("activityFeedList");
    if (feedContainer) {
        feedContainer.innerHTML = data.activityFeed.map(item => `
            <div class="feed-item">
                <div class="feed-avatar" style="background-color: ${getAvatarColor(item.person)};">
                    ${initials(item.person)}
                </div>
                <div class="feed-content">
                    <strong>${escapeHTML(item.person)}</strong> ${escapeHTML(item.action)} 
                    <span class="feed-highlight">${escapeHTML(item.target)}</span>
                    <span class="feed-time">${escapeHTML(item.time)}</span>
                </div>
            </div>
        `).join("");
    }

    // 4. Dynamic Bay Status in Right Rail
    const inProgressCount = data.appointments.filter(a => a.status === "In Progress").length;
    const baySubtext = $("bayStatusSubtext");
    if (baySubtext) {
        if (inProgressCount === 0) {
            baySubtext.textContent = "All 4 hydraulic lift bays available";
        } else {
            baySubtext.textContent = `${inProgressCount} of 4 bays active · ${Math.max(0, 4 - inProgressCount)} ready for intake`;
        }
    }

    // Update appointment badge in sidebar
    const badge = $("navBadgeAppts");
    if (badge) {
        const activeCount = data.appointments.filter(a => a.status !== "Completed" && a.status !== "Cancelled").length;
        badge.textContent = activeCount;
    }

    // Update alerts
    renderNotifications();
}

/* Unboxed Chart.js Implementation (Dynamic date calculations) */
function drawThroughputChart() {
    const canvas = $("throughputChart");
    if (!canvas) return;

    if (throughputChart) {
        throughputChart.destroy();
    }

    const labels = [];
    const values = [];
    const numDays = currentChartRange === "7d" ? 7 : 14;

    for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const dateStr = d.toISOString().slice(0, 10);
        const dayLabel = i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
        labels.push(dayLabel);

        // Count matching appointments for this exact date
        const matchCount = data.appointments.filter(a => a.date === dateStr).length;
        // Baseline curve for demo history + live actual count
        const seedBase = [3, 5, 4, 7, 6, 8, 4, 6, 7, 5, 8, 6, 9, 0][14 - numDays + (numDays - 1 - i)] || 4;
        values.push(matchCount > 0 ? matchCount + seedBase : seedBase);
    }

    const ctx = canvas.getContext("2d");
    throughputChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: "#5EC9C4",
                hoverBackgroundColor: "#3FB8B0",
                borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
                borderSkipped: false,
                barPercentage: 0.62,
                categoryPercentage: 0.8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#1B2733",
                    titleColor: "#FFFFFF",
                    bodyColor: "#E6F5F4",
                    cornerRadius: 6,
                    padding: 8,
                    displayColors: false,
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.y} vehicles serviced`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: "#6B7684",
                        font: { family: "Inter", size: 12 }
                    },
                    border: { display: false }
                },
                y: {
                    grid: {
                        color: "#E7E9EC",
                        drawTicks: false
                    },
                    border: { display: false },
                    ticks: {
                        color: "#6B7684",
                        font: { family: "Inter", size: 11.5 },
                        stepSize: currentChartRange === "7d" ? 2 : 5
                    }
                }
            }
        }
    });
}

/* ==========================================================================
   APPOINTMENTS VIEW & STATUS STEPPER
   ========================================================================== */
function renderAppointments() {
    const tbody = $("appointmentsTableBody");
    if (!tbody) return;

    let list = data.appointments;
    if (activeAppointmentFilter !== "All") {
        list = list.filter(a => a.status === activeAppointmentFilter);
    }

    const query = globalSearchQuery || ($("appointmentSearch")?.value || "").toLowerCase().trim();
    if (query) {
        list = list.filter(a =>
            a.customer.toLowerCase().includes(query) ||
            a.registration.toLowerCase().includes(query) ||
            a.service.toLowerCase().includes(query) ||
            (a.mechanic && a.mechanic.toLowerCase().includes(query))
        );
    }

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: var(--text-secondary); padding: 36px 0;">
                    No service appointments match your filter.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = list.map(a => {
        let statusClass = "status-scheduled";
        if (a.status === "In Progress") statusClass = "status-progress";
        if (a.status === "Completed") statusClass = "status-completed";
        if (a.status === "Cancelled") statusClass = "status-cancelled";

        // Dynamic stepper action button
        let actionBtnHtml = "";
        if (a.status === "Scheduled") {
            actionBtnHtml = `<button class="btn-table-action" onclick="window.advanceAppointmentStatus(${a.id}, 'In Progress')">Start Job</button>`;
        } else if (a.status === "In Progress") {
            actionBtnHtml = `<button class="btn-table-action" onclick="window.advanceAppointmentStatus(${a.id}, 'Completed')" style="color: var(--accent-green); border-color: var(--accent-green);">Mark Complete</button>`;
        } else if (a.status === "Completed") {
            actionBtnHtml = `<button class="btn-table-action" onclick="window.openInvoiceForAppointment(${a.id})">Receipt</button>`;
        } else {
            actionBtnHtml = `<span style="color: var(--text-tertiary); font-size: 11.5px;">Closed</span>`;
        }

        return `
            <tr>
                <td>
                    <div class="person-cell">
                        <div class="feed-avatar" style="background-color: ${getAvatarColor(a.customer)};">
                            ${initials(a.customer)}
                        </div>
                        <div>
                            <b>${escapeHTML(a.customer)}</b>
                            <small>${escapeHTML(a.phone)}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="plate-badge">${escapeHTML(a.registration)}</span>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                        ${escapeHTML(a.make)} ${escapeHTML(a.model)}
                    </div>
                </td>
                <td>
                    <b>${escapeHTML(a.service)}</b>
                </td>
                <td>
                    <span style="font-size: 13px; color: var(--text-secondary);">${escapeHTML(a.mechanic || "Unassigned")}</span>
                </td>
                <td>
                    <div style="font-size: 12.5px; font-weight: 500;">${escapeHTML(a.date)}</div>
                    <small style="color: var(--text-secondary);">${escapeHTML(a.time)}</small>
                </td>
                <td>
                    <span class="status-pill ${statusClass}">
                        <span class="status-dot-sm"></span>
                        <span>${escapeHTML(a.status)}</span>
                    </span>
                </td>
                <td>
                    <b>${money(a.cost)}</b>
                </td>
                <td>
                    <div class="action-btn-group">
                        ${actionBtnHtml}
                        <button class="btn-table-action" onclick="window.cancelAppointmentPrompt(${a.id})" title="Cancel Job">✕</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// Global hooks for inline action handlers
window.advanceAppointmentStatus = function(apptId, nextStatus) {
    const appt = data.appointments.find(x => x.id === apptId);
    if (!appt) return;

    appt.status = nextStatus;

    // Log to activity feed
    data.activityFeed.unshift({
        id: Date.now(),
        person: appt.mechanic || "Technician",
        action: nextStatus === "Completed" ? "completed service on" : "started bay inspection for",
        target: `${appt.registration} (${appt.service})`,
        time: "Just now"
    });

    // If completed, automatically generate an invoice if not already existing
    if (nextStatus === "Completed") {
        let existingInv = data.invoices.find(i => i.appointmentId === appt.id);
        if (!existingInv) {
            const tax = Math.round(appt.cost * 0.18);
            const total = appt.cost + tax;
            const newInv = {
                id: data.invoices.length + 1,
                appointmentId: appt.id,
                invoiceNo: "INV-" + (1000 + data.invoices.length + 1),
                customer: appt.customer,
                registration: appt.registration,
                service: appt.service,
                subtotal: appt.cost,
                tax: tax,
                discount: 0,
                total: total,
                status: "Pending",
                method: "Cash",
                date: new Date().toISOString().slice(0, 10)
            };
            data.invoices.unshift(newInv);
            toast(`Job finished! Invoice ${newInv.invoiceNo} generated.`);
        } else {
            toast(`Appointment marked as ${nextStatus}.`);
        }
    } else {
        toast(`Appointment marked as ${nextStatus}.`);
    }

    saveState();
    renderAppointments();
    renderDashboard();
};

window.cancelAppointmentPrompt = function(apptId) {
    const appt = data.appointments.find(x => x.id === apptId);
    if (!appt) return;
    if (confirm(`Cancel appointment for ${appt.customer} (${appt.registration})?`)) {
        appt.status = "Cancelled";
        toast("Appointment cancelled.");
        saveState();
        renderAppointments();
        renderDashboard();
    }
};

window.openInvoiceForAppointment = function(apptId) {
    let inv = data.invoices.find(i => i.appointmentId === apptId);
    if (!inv) {
        const appt = data.appointments.find(x => x.id === apptId);
        if (appt) {
            const tax = Math.round(appt.cost * 0.18);
            inv = {
                id: data.invoices.length + 1,
                appointmentId: appt.id,
                invoiceNo: "INV-" + (1000 + data.invoices.length + 1),
                customer: appt.customer,
                registration: appt.registration,
                service: appt.service,
                subtotal: appt.cost,
                tax: tax,
                discount: 0,
                total: appt.cost + tax,
                status: "Pending",
                method: "Cash",
                date: new Date().toISOString().slice(0, 10)
            };
            data.invoices.unshift(inv);
            saveState();
        }
    }
    if (inv) {
        showInvoiceModal(inv.id);
    }
};

/* ==========================================================================
   VEHICLES GARAGE VIEW
   ========================================================================== */
function renderVehicles() {
    const grid = $("vehiclesGrid");
    if (!grid) return;

    let list = data.vehicles;
    if (activeVehicleFuelFilter !== "All") {
        list = list.filter(v => v.fuel === activeVehicleFuelFilter);
    }

    if (globalSearchQuery) {
        list = list.filter(v =>
            v.registration.toLowerCase().includes(globalSearchQuery) ||
            v.make.toLowerCase().includes(globalSearchQuery) ||
            v.model.toLowerCase().includes(globalSearchQuery) ||
            v.fuel.toLowerCase().includes(globalSearchQuery)
        );
    }

    if (list.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">No vehicles match your filter.</div>`;
        return;
    }

    grid.innerHTML = list.map(v => {
        const owner = data.customers.find(c => c.id === v.customerId);
        return `
            <div class="entity-card">
                <div>
                    <div class="entity-card-head">
                        <div>
                            <span class="plate-badge" style="font-size: 13px;">${escapeHTML(v.registration)}</span>
                            <div class="entity-title" style="margin-top: 6px;">${escapeHTML(v.make)} ${escapeHTML(v.model)}</div>
                            <div class="entity-sub">Owner: ${escapeHTML(owner ? owner.name : "Unknown")}</div>
                        </div>
                    </div>
                    <div class="entity-specs">
                        <span class="spec-chip">${escapeHTML(v.fuel)}</span>
                        <span class="spec-chip">${escapeHTML(v.year)}</span>
                        <span class="spec-chip">${(v.mileage || 0).toLocaleString()} km</span>
                        <span class="spec-chip">${escapeHTML(v.color || "Standard")}</span>
                    </div>
                </div>
                <div class="entity-card-foot">
                    <span style="color: var(--text-secondary); font-size: 12px;">${escapeHTML(owner ? owner.phone : "")}</span>
                    <button class="btn-table-action" onclick="window.bookForVehicle(${v.id})" style="border-color: var(--accent-teal); color: var(--accent-teal);">
                        + Service Job
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

window.bookForVehicle = function(vehicleId) {
    const v = data.vehicles.find(x => x.id === vehicleId);
    if (!v) return;
    openModal("appointmentModal");
    populateDropdowns();
    $("apptCustomerId").value = v.customerId;
    updateVehicleDropdownForCustomer(v.customerId);
    $("apptVehicleId").value = v.id;
};

/* ==========================================================================
   CUSTOMERS VIEW
   ========================================================================== */
function renderCustomers() {
    const tbody = $("customersTableBody");
    if (!tbody) return;

    let list = data.customers;
    if (globalSearchQuery) {
        list = list.filter(c =>
            c.name.toLowerCase().includes(globalSearchQuery) ||
            c.phone.toLowerCase().includes(globalSearchQuery) ||
            (c.email && c.email.toLowerCase().includes(globalSearchQuery)) ||
            (c.address && c.address.toLowerCase().includes(globalSearchQuery))
        );
    }

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 36px; color: var(--text-secondary);">No customers found matching search.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(c => {
        const vehicleCount = data.vehicles.filter(v => v.customerId === c.id).length;
        return `
            <tr>
                <td>
                    <div class="person-cell">
                        <div class="feed-avatar" style="background-color: ${getAvatarColor(c.name)};">
                            ${initials(c.name)}
                        </div>
                        <div>
                            <b>${escapeHTML(c.name)}</b>
                        </div>
                    </div>
                </td>
                <td>
                    <a href="tel:${escapeHTML(c.phone)}" style="color: var(--text-primary); font-weight: 500;" title="Call customer">${escapeHTML(c.phone)}</a>
                </td>
                <td>
                    ${c.email ? `<a href="mailto:${escapeHTML(c.email)}" style="color: var(--accent-teal);" title="Send email">${escapeHTML(c.email)}</a>` : '<span style="color: var(--text-tertiary);">—</span>'}
                </td>
                <td>${escapeHTML(c.address || "Bengaluru")}</td>
                <td>
                    <span class="spec-chip" style="font-weight: 600;">${vehicleCount} Vehicles</span>
                </td>
                <td>
                    <button class="btn-table-action" onclick="window.bookForCustomer(${c.id})">+ Schedule</button>
                </td>
            </tr>
        `;
    }).join("");
}

window.bookForCustomer = function(customerId) {
    openModal("appointmentModal");
    populateDropdowns();
    $("apptCustomerId").value = customerId;
    updateVehicleDropdownForCustomer(customerId);
};

/* ==========================================================================
   TECHNICIANS VIEW
   ========================================================================== */
function renderMechanics() {
    const grid = $("mechanicsGrid");
    if (!grid) return;

    let list = data.mechanics;
    if (globalSearchQuery) {
        list = list.filter(m =>
            m.name.toLowerCase().includes(globalSearchQuery) ||
            m.specialization.toLowerCase().includes(globalSearchQuery)
        );
    }

    grid.innerHTML = list.map(m => {
        const isAvail = m.status === "Available";
        const assignedAppts = data.appointments.filter(a => a.mechanic === m.name && (a.status === "In Progress" || a.status === "Scheduled"));
        return `
            <div class="entity-card">
                <div>
                    <div class="entity-card-head">
                        <div>
                            <div class="entity-title">${escapeHTML(m.name)}</div>
                            <div class="entity-sub">${escapeHTML(m.specialization)}</div>
                        </div>
                        <span class="status-pill ${isAvail ? 'status-completed' : 'status-progress'}">
                            <span class="status-dot-sm"></span>
                            <span>${escapeHTML(m.status)}</span>
                        </span>
                    </div>
                    <div class="entity-specs">
                        <span class="spec-chip">${m.experience} Yrs Experience</span>
                        <span class="spec-chip">${escapeHTML(m.phone)}</span>
                        <span class="spec-chip">${assignedAppts.length} Active Jobs</span>
                    </div>
                </div>
                <div class="entity-card-foot">
                    <span style="color: var(--text-secondary); font-size: 12px;">Click to toggle bay status</span>
                    <button class="btn-table-action" onclick="window.toggleMechanicStatus(${m.id})">
                        Set ${isAvail ? 'Busy' : 'Available'}
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

window.toggleMechanicStatus = function(mechId) {
    const m = data.mechanics.find(x => x.id === mechId);
    if (!m) return;
    m.status = m.status === "Available" ? "Busy" : "Available";
    toast(`${m.name} is now marked ${m.status}.`);
    saveState();
    renderMechanics();
    renderNotifications();
};

/* ==========================================================================
   SERVICES CATALOG VIEW
   ========================================================================== */
function renderServices() {
    const grid = $("servicesGrid");
    if (!grid) return;

    let list = data.services;
    if (globalSearchQuery) {
        list = list.filter(s =>
            s.name.toLowerCase().includes(globalSearchQuery) ||
            s.category.toLowerCase().includes(globalSearchQuery)
        );
    }

    grid.innerHTML = list.map(s => `
        <div class="entity-card">
            <div>
                <div class="entity-card-head">
                    <div>
                        <div class="entity-title">${escapeHTML(s.name)}</div>
                        <div class="entity-sub">${escapeHTML(s.category)} Category</div>
                    </div>
                    <b style="font-size: 15px; color: var(--accent-teal);">${money(s.price)}</b>
                </div>
                <div class="entity-specs">
                    <span class="spec-chip">${s.duration} mins standard</span>
                    <span class="spec-chip">6-Month Warranty</span>
                </div>
            </div>
            <div class="entity-card-foot">
                <span style="color: var(--text-secondary); font-size: 12px;">Includes OEM parts</span>
                <button class="btn-table-action" onclick="window.bookForService(${s.id})">+ Book Service</button>
            </div>
        </div>
    `).join("");
}

window.bookForService = function(serviceId) {
    const s = data.services.find(x => x.id === serviceId);
    if (!s) return;
    openModal("appointmentModal");
    populateDropdowns();
    $("apptServiceId").value = s.id;
    $("apptCost").value = s.price;
};

/* ==========================================================================
   INVOICES VIEW & PRINTABLE RECEIPT MODAL
   ========================================================================== */
function renderInvoices() {
    const tbody = $("invoicesTableBody");
    if (!tbody) return;

    let list = data.invoices;
    if (globalSearchQuery) {
        list = list.filter(inv =>
            inv.invoiceNo.toLowerCase().includes(globalSearchQuery) ||
            inv.customer.toLowerCase().includes(globalSearchQuery) ||
            inv.registration.toLowerCase().includes(globalSearchQuery) ||
            inv.service.toLowerCase().includes(globalSearchQuery)
        );
    }

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: var(--text-secondary);">No invoices found.</td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(inv => {
        const isPaid = inv.status === "Paid";
        return `
            <tr>
                <td><b>${escapeHTML(inv.invoiceNo)}</b></td>
                <td>${escapeHTML(inv.customer)}</td>
                <td><span class="plate-badge">${escapeHTML(inv.registration)}</span></td>
                <td>${escapeHTML(inv.service)}</td>
                <td>${money(inv.subtotal)}</td>
                <td>${money(inv.tax)}</td>
                <td><b>${money(inv.total)}</b></td>
                <td>
                    <span class="status-pill ${isPaid ? 'status-paid' : 'status-pending'}">
                        <span class="status-dot-sm"></span>
                        <span>${escapeHTML(inv.status)} (${escapeHTML(inv.method || 'Cash')})</span>
                    </span>
                </td>
                <td>
                    <div class="action-btn-group">
                        <button class="btn-table-action" onclick="window.showInvoiceModal(${inv.id})">View / Print</button>
                        <button class="btn-table-action" onclick="window.toggleInvoicePaid(${inv.id})">${isPaid ? 'Mark Unpaid' : 'Mark Paid'}</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

window.showInvoiceModal = function(invoiceId) {
    const inv = data.invoices.find(x => x.id === invoiceId);
    if (!inv) return;
    activeInvoiceInModal = inv;

    const receipt = $("invoiceReceiptContent");
    if (receipt) {
        receipt.innerHTML = `
            <div class="inv-top">
                <div class="inv-brand">
                    <h2>AUTOPRO SERVICE HUB</h2>
                    <p style="color: var(--text-secondary); font-size: 12px; margin-top: 2px;">
                        Automotive Repair, Diagnostics & Periodic Maintenance<br>
                        GSTIN: <b>${escapeHTML(data.settings.gstin)}</b> · Ph: ${escapeHTML(data.settings.phone)}
                    </p>
                </div>
                <div class="inv-meta-right">
                    <div class="inv-number">${escapeHTML(inv.invoiceNo)}</div>
                    <div style="color: var(--text-secondary); font-size: 12px; margin-top: 2px;">Date: ${escapeHTML(inv.date)}</div>
                    <div style="margin-top: 6px;">
                        <span class="status-pill ${inv.status === 'Paid' ? 'status-paid' : 'status-pending'}">
                            ${escapeHTML(inv.status)} · ${escapeHTML(inv.method)}
                        </span>
                    </div>
                </div>
            </div>

            <div class="inv-parties">
                <div>
                    <div class="inv-party-title">BILLED TO CUSTOMER</div>
                    <b style="font-size: 14px;">${escapeHTML(inv.customer)}</b>
                    <div style="color: var(--text-secondary); font-size: 12px; margin-top: 2px;">Vehicle Plate: <b>${escapeHTML(inv.registration)}</b></div>
                </div>
                <div>
                    <div class="inv-party-title">WORKSHOP LOCATION</div>
                    <div style="font-size: 13px;">Bay 4, Central Auto Complex</div>
                    <div style="color: var(--text-secondary); font-size: 12px; margin-top: 2px;">Bengaluru, Karnataka 560038</div>
                </div>
            </div>

            <table class="inv-table">
                <thead>
                    <tr>
                        <th>Item & Description</th>
                        <th>SAC Code</th>
                        <th style="text-align: right;">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <b>${escapeHTML(inv.service)}</b>
                            <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">Comprehensive scheduled maintenance and multi-point checklist</div>
                        </td>
                        <td>998714</td>
                        <td style="text-align: right;">${money(inv.subtotal)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="inv-totals">
                <div class="inv-total-row">
                    <span>Taxable Subtotal</span>
                    <span>${money(inv.subtotal)}</span>
                </div>
                <div class="inv-total-row">
                    <span>CGST (9%)</span>
                    <span>${money(Math.round(inv.tax / 2))}</span>
                </div>
                <div class="inv-total-row">
                    <span>SGST (9%)</span>
                    <span>${money(Math.round(inv.tax / 2))}</span>
                </div>
                ${inv.discount ? `
                <div class="inv-total-row" style="color: var(--accent-green);">
                    <span>Discount Applied</span>
                    <span>-${money(inv.discount)}</span>
                </div>` : ''}
                <div class="inv-total-row grand">
                    <span>Total Amount</span>
                    <span>${money(inv.total)}</span>
                </div>
            </div>

            <div style="margin-top: 30px; padding-top: 14px; border-top: 1px dashed var(--border-subtle); text-align: center; color: var(--text-tertiary); font-size: 11px;">
                Thank you for choosing AutoPro Service Hub · Computer generated tax invoice · No physical signature required.
            </div>
        `;
    }

    const payBtn = $("invoicePayToggleBtn");
    if (payBtn) {
        payBtn.textContent = inv.status === "Paid" ? "Mark as Pending" : "Mark as Paid";
    }

    openModal("invoiceModal");
};

window.toggleInvoicePaid = function(invoiceId) {
    const inv = data.invoices.find(x => x.id === invoiceId);
    if (!inv) return;
    inv.status = inv.status === "Paid" ? "Pending" : "Paid";
    toast(`Invoice ${inv.invoiceNo} marked as ${inv.status}.`);
    saveState();
    renderInvoices();
    renderNotifications();
};

/* ==========================================================================
   REPORTS & ANALYTICS CHARTS (Dynamically aggregated from live data)
   ========================================================================== */
function renderReports() {
    const catCanvas = $("categoryChart");
    const payCanvas = $("paymentChart");

    if (catCanvas) {
        if (categoryChart) categoryChart.destroy();

        // Dynamically compute category distribution from appointments
        const categoryCounts = {};
        data.appointments.forEach(a => {
            const s = data.services.find(srv => srv.name === a.service);
            const cat = s ? s.category : "General";
            categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        // If counts are sparse, populate remaining categories
        data.services.forEach(s => {
            if (!categoryCounts[s.category]) categoryCounts[s.category] = 0;
        });

        const catLabels = Object.keys(categoryCounts);
        const catValues = Object.values(categoryCounts);

        const ctx = catCanvas.getContext("2d");
        categoryChart = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: catLabels,
                datasets: [{
                    data: catValues,
                    backgroundColor: ["#3FB8B0", "#3B82F6", "#F59E0B", "#8B5CF6", "#10B981", "#EC4899"],
                    borderWidth: 2,
                    borderColor: "#FFFFFF"
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: "right", labels: { boxWidth: 12, font: { family: "Inter", size: 12 } } },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.label}: ${ctx.parsed} service jobs`
                        }
                    }
                }
            }
        });
    }

    if (payCanvas) {
        if (paymentChart) paymentChart.destroy();

        // Dynamically compute revenue by payment method
        const methodTotals = { "UPI": 0, "Card": 0, "Cash": 0 };
        data.invoices.forEach(inv => {
            const m = inv.method || "Cash";
            methodTotals[m] = (methodTotals[m] || 0) + (inv.total || 0);
        });

        const payLabels = Object.keys(methodTotals);
        const payValues = Object.values(methodTotals);

        const ctx = payCanvas.getContext("2d");
        paymentChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: payLabels,
                datasets: [{
                    data: payValues,
                    backgroundColor: "#3FB8B0",
                    hoverBackgroundColor: "#2F948D",
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` Revenue: ${money(ctx.parsed.y)}`
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { family: "Inter", size: 12 } } },
                    y: {
                        grid: { color: "#E7E9EC" },
                        ticks: {
                            font: { family: "Inter", size: 11.5 },
                            callback: v => "₹" + v.toLocaleString("en-IN")
                        }
                    }
                }
            }
        });
    }
}

/* ==========================================================================
   WORKSHOP ALERTS & NOTIFICATIONS SYSTEM
   ========================================================================== */
function renderNotifications() {
    const listEl = $("notifList");
    const badgeEl = $("notifBadge");
    if (!listEl) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const alerts = [];

    // Alert 1: Unpaid pending invoices
    const pendingInvoices = data.invoices.filter(i => i.status === "Pending");
    if (pendingInvoices.length > 0) {
        alerts.push({
            title: `${pendingInvoices.length} Pending Invoices`,
            desc: `Unpaid collections awaiting settlement (${pendingInvoices.map(i => i.invoiceNo).join(", ")})`,
            time: "Action required",
            action: () => showPage("invoices")
        });
    }

    // Alert 2: Jobs scheduled for today
    const todayJobs = data.appointments.filter(a => a.date === todayStr);
    if (todayJobs.length > 0) {
        alerts.push({
            title: `${todayJobs.length} Appointments Today`,
            desc: `Vehicles scheduled for workshop intake and inspection`,
            time: "Today",
            action: () => {
                showPage("appointments");
                document.querySelector('[data-filter="All"]')?.click();
            }
        });
    }

    // Alert 3: Busy technicians
    const busyTechs = data.mechanics.filter(m => m.status === "Busy");
    if (busyTechs.length > 0) {
        alerts.push({
            title: `${busyTechs.length} Technicians Assigned`,
            desc: `${busyTechs.map(m => m.name).join(", ")} currently engaged in active service bays`,
            time: "Live status",
            action: () => showPage("mechanics")
        });
    }

    // Badge visibility
    if (badgeEl) {
        if (alerts.length > 0 && !alertsAcknowledged) {
            badgeEl.classList.add("show");
        } else {
            badgeEl.classList.remove("show");
        }
    }

    if (alerts.length === 0) {
        listEl.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-secondary); font-size: 12px;">All clear! No urgent alerts.</div>`;
        return;
    }

    listEl.innerHTML = alerts.map((al, idx) => `
        <div class="notif-item" data-alert-index="${idx}">
            <div class="notif-item-top">
                <span class="notif-item-title">${escapeHTML(al.title)}</span>
                <span class="notif-item-time">${escapeHTML(al.time)}</span>
            </div>
            <div class="notif-item-desc">${escapeHTML(al.desc)}</div>
        </div>
    `).join("");

    listEl.querySelectorAll(".notif-item").forEach(item => {
        item.addEventListener("click", () => {
            const idx = Number(item.dataset.alertIndex);
            if (alerts[idx] && alerts[idx].action) {
                alerts[idx].action();
                $("notificationsDropdown")?.classList.remove("show");
            }
        });
    });
}

/* ==========================================================================
   MODAL CONTROLS & FORM SUBMISSIONS
   ========================================================================== */
function openModal(modalId) {
    const modal = $(modalId);
    if (modal) {
        modal.classList.add("show");
    }
}

function closeModal(modalId) {
    const modal = $(modalId);
    if (modal) {
        modal.classList.remove("show");
    }
}

function populateDropdowns() {
    // Customers dropdown
    const custSelect = $("apptCustomerId");
    const vehCustSelect = $("vehCustomerId");
    if (custSelect) {
        custSelect.innerHTML = data.customers.map(c => `
            <option value="${c.id}">${escapeHTML(c.name)} · ${escapeHTML(c.phone)}</option>
        `).join("");
    }
    if (vehCustSelect) {
        vehCustSelect.innerHTML = data.customers.map(c => `
            <option value="${c.id}">${escapeHTML(c.name)}</option>
        `).join("");
    }

    // Mechanics dropdown
    const mechSelect = $("apptMechanicId");
    if (mechSelect) {
        mechSelect.innerHTML = `<option value="">Unassigned (Bay Queue)</option>` +
            data.mechanics.map(m => `
                <option value="${m.name}">${escapeHTML(m.name)} (${escapeHTML(m.specialization)}) - ${m.status}</option>
            `).join("");
    }

    // Services dropdown
    const srvSelect = $("apptServiceId");
    if (srvSelect) {
        srvSelect.innerHTML = data.services.map(s => `
            <option value="${s.id}" data-price="${s.price}">${escapeHTML(s.name)} — ${money(s.price)}</option>
        `).join("");

        // Auto populate price
        srvSelect.addEventListener("change", () => {
            const opt = srvSelect.selectedOptions[0];
            if (opt && $("apptCost")) {
                $("apptCost").value = opt.dataset.price || 0;
            }
        });
        if (srvSelect.selectedOptions[0] && $("apptCost")) {
            $("apptCost").value = srvSelect.selectedOptions[0].dataset.price || 0;
        }
    }

    // Update vehicles for first customer
    if (data.customers.length > 0) {
        updateVehicleDropdownForCustomer(data.customers[0].id);
    }
}

function updateVehicleDropdownForCustomer(customerId) {
    const vehSelect = $("apptVehicleId");
    if (!vehSelect) return;
    const clientVehicles = data.vehicles.filter(v => v.customerId == customerId);
    if (clientVehicles.length === 0) {
        vehSelect.innerHTML = `<option value="">No vehicle registered for this customer</option>`;
    } else {
        vehSelect.innerHTML = clientVehicles.map(v => `
            <option value="${v.id}">${escapeHTML(v.registration)} · ${escapeHTML(v.make)} ${escapeHTML(v.model)} (${escapeHTML(v.fuel)})</option>
        `).join("");
    }
}

function setupFormHandlers() {
    // Dynamic change of vehicles when customer changes
    $("apptCustomerId")?.addEventListener("change", e => {
        updateVehicleDropdownForCustomer(e.target.value);
    });

    // Appointment form submit
    $("appointmentForm")?.addEventListener("submit", e => {
        e.preventDefault();
        const custId = Number($("apptCustomerId").value);
        const vehId = Number($("apptVehicleId").value);
        const srvId = Number($("apptServiceId").value);

        const cust = data.customers.find(c => c.id === custId);
        const veh = data.vehicles.find(v => v.id === vehId);
        const srv = data.services.find(s => s.id === srvId);

        if (!cust || !veh || !srv) {
            alert("Please make sure Customer, Vehicle, and Service are selected.");
            return;
        }

        const newAppt = {
            id: Date.now(),
            customerId: cust.id,
            customer: cust.name,
            phone: cust.phone,
            vehicleId: veh.id,
            registration: veh.registration,
            make: veh.make,
            model: veh.model,
            service: srv.name,
            mechanic: $("apptMechanicId").value || "Unassigned",
            date: $("apptDate").value || new Date().toISOString().slice(0, 10),
            time: $("apptTime").value || "10:00",
            cost: Number($("apptCost").value) || srv.price,
            status: "Scheduled",
            notes: $("apptNotes").value || ""
        };

        data.appointments.unshift(newAppt);
        data.activityFeed.unshift({
            id: Date.now(),
            person: cust.name,
            action: "booked appointment for",
            target: `${veh.registration} (${srv.name})`,
            time: "Just now"
        });

        saveState();
        closeModal("appointmentModal");
        toast("Appointment scheduled successfully!");
        renderAppointments();
        renderDashboard();
    });

    // Vehicle form submit
    $("vehicleForm")?.addEventListener("submit", e => {
        e.preventDefault();
        const custId = Number($("vehCustomerId").value);
        const plate = $("vehRegistration").value.trim().toUpperCase();

        if (data.vehicles.some(v => v.registration === plate)) {
            alert("This license plate is already registered!");
            return;
        }

        const newVeh = {
            id: Date.now(),
            customerId: custId,
            registration: plate,
            make: $("vehMake").value.trim(),
            model: $("vehModel").value.trim(),
            year: Number($("vehYear").value) || 2023,
            fuel: $("vehFuel").value,
            mileage: Number($("vehMileage").value) || 0,
            color: $("vehColor").value.trim() || "Standard"
        };

        data.vehicles.unshift(newVeh);
        saveState();
        closeModal("vehicleModal");
        toast(`Vehicle ${newVeh.registration} registered.`);
        renderVehicles();
    });

    // Customer form submit
    $("customerForm")?.addEventListener("submit", e => {
        e.preventDefault();
        const newCust = {
            id: Date.now(),
            name: $("custName").value.trim(),
            phone: $("custPhone").value.trim(),
            email: $("custEmail").value.trim(),
            address: $("custAddress").value.trim()
        };

        data.customers.unshift(newCust);
        saveState();
        closeModal("customerModal");
        toast(`Customer ${newCust.name} added.`);
        renderCustomers();
    });

    // Modal close & open buttons
    document.querySelectorAll("[data-open]").forEach(btn => {
        btn.addEventListener("click", () => {
            const mId = btn.dataset.open;
            populateDropdowns();
            openModal(mId);
        });
    });

    document.querySelectorAll("[data-close]").forEach(btn => {
        btn.addEventListener("click", () => {
            const mId = btn.dataset.close;
            closeModal(mId);
        });
    });

    // Close on overlay backdrop click
    document.querySelectorAll(".modal-overlay").forEach(overlay => {
        overlay.addEventListener("click", e => {
            if (e.target === overlay) {
                overlay.classList.remove("show");
            }
        });
    });

    // Print Invoice button
    $("printInvoiceBtn")?.addEventListener("click", () => {
        window.print();
    });

    // Invoice Pay button in modal
    $("invoicePayToggleBtn")?.addEventListener("click", () => {
        if (!activeInvoiceInModal) return;
        activeInvoiceInModal.status = activeInvoiceInModal.status === "Paid" ? "Pending" : "Paid";
        toast(`Invoice updated to ${activeInvoiceInModal.status}`);
        saveState();
        showInvoiceModal(activeInvoiceInModal.id);
        renderInvoices();
        renderNotifications();
    });
}

/* ==========================================================================
   SEARCH & FILTER LOGIC
   ========================================================================== */
function applySearchToCurrentPage() {
    if (activePageName === "appointments") renderAppointments();
    else if (activePageName === "vehicles") renderVehicles();
    else if (activePageName === "customers") renderCustomers();
    else if (activePageName === "mechanics") renderMechanics();
    else if (activePageName === "services") renderServices();
    else if (activePageName === "invoices") renderInvoices();
}

/* ==========================================================================
   INTERACTIVE FILTERS & KEYBOARD SHORTCUTS
   ========================================================================== */
function setupInteractivity() {
    // Universal Global Search input (⌘K)
    const searchInput = $("globalSearchInput");
    if (searchInput) {
        searchInput.addEventListener("input", e => {
            globalSearchQuery = e.target.value.toLowerCase().trim();

            // If user searches while on dashboard, auto-navigate to appointments
            if (activePageName === "dashboard" && globalSearchQuery) {
                showPage("appointments");
            } else {
                applySearchToCurrentPage();
            }
        });
    }

    // Global keyboard shortcut
    document.addEventListener("keydown", e => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            searchInput?.focus();
        }
        if (e.key === "Escape") {
            document.querySelectorAll(".modal-overlay.show").forEach(m => m.classList.remove("show"));
            $("notificationsDropdown")?.classList.remove("show");
            searchInput?.blur();
        }
    });

    // Notifications toggle
    $("notificationsBtn")?.addEventListener("click", e => {
        e.stopPropagation();
        $("notificationsDropdown")?.classList.toggle("show");
    });

    $("clearNotifsBtn")?.addEventListener("click", () => {
        alertsAcknowledged = true;
        $("notifBadge")?.classList.remove("show");
        toast("All alerts marked as read.");
    });

    // Close notifications dropdown when clicking outside
    document.addEventListener("click", e => {
        const notifDropdown = $("notificationsDropdown");
        const notifBtn = $("notificationsBtn");
        if (notifDropdown && notifBtn && !notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
            notifDropdown.classList.remove("show");
        }
    });

    // Appointment Status filter pills
    $("appointmentStatusFilters")?.querySelectorAll(".filter-chip").forEach(btn => {
        btn.addEventListener("click", () => {
            $("appointmentStatusFilters").querySelectorAll(".filter-chip").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeAppointmentFilter = btn.dataset.filter;
            renderAppointments();
        });
    });

    // Appointment search input
    $("appointmentSearch")?.addEventListener("input", e => {
        globalSearchQuery = e.target.value.toLowerCase().trim();
        renderAppointments();
    });

    // Vehicle Fuel filter pills
    $("vehicleFuelFilters")?.querySelectorAll(".filter-chip").forEach(btn => {
        btn.addEventListener("click", () => {
            $("vehicleFuelFilters").querySelectorAll(".filter-chip").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            activeVehicleFuelFilter = btn.dataset.fuel;
            renderVehicles();
        });
    });

    // Chart range toggle ("Last 7 Days throughput")
    $("chartRangeToggle")?.addEventListener("click", e => {
        e.preventDefault();
        currentChartRange = currentChartRange === "7d" ? "14d" : "7d";
        const label = currentChartRange === "7d" ? "Last 7 Days throughput" : "Last 14 Days throughput";
        $("chartRangeToggle").querySelector("span").textContent = label;
        drawThroughputChart();
    });

    // Action cards clicks in dashboard
    document.querySelectorAll(".action-card").forEach(card => {
        card.addEventListener("click", () => {
            const action = card.dataset.action;
            if (action === "filter-scheduled") {
                showPage("appointments");
                const scheduledBtn = document.querySelector('[data-filter="Scheduled"]');
                if (scheduledBtn) scheduledBtn.click();
            } else if (action === "view-invoices") {
                showPage("invoices");
            } else if (action === "open-vehicle-modal") {
                populateDropdowns();
                openModal("vehicleModal");
            }
        });
    });

    // Bottom toolbar pills
    document.querySelectorAll("[data-action]").forEach(btn => {
        btn.addEventListener("click", () => {
            const act = btn.dataset.action;
            if (act === "quick-filter-progress") {
                showPage("appointments");
                document.querySelector('[data-filter="In Progress"]')?.click();
            } else if (act === "quick-filter-scheduled") {
                showPage("appointments");
                document.querySelector('[data-filter="Scheduled"]')?.click();
            } else if (act === "quick-filter-available-techs") {
                showPage("mechanics");
            }
        });
    });

    // Settings actions
    $("saveSettingsBtn")?.addEventListener("click", () => {
        data.settings.workshopName = $("settingWorkshopName").value;
        data.settings.phone = $("settingPhone").value;
        data.settings.gstin = $("settingGst").value;
        saveState();
        toast("Workshop settings saved.");
    });

    $("exportDataBtn")?.addEventListener("click", () => {
        const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", jsonStr);
        downloadAnchor.setAttribute("download", "autopro_backup.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        toast("Backup JSON exported.");
    });

    $("resetDataBtn")?.addEventListener("click", () => {
        if (confirm("Reset all workshop data back to original demo values?")) {
            data = createInitialData();
            saveState();
            location.reload();
        }
    });

    // Set today's date on appointment date input
    if ($("apptDate")) {
        $("apptDate").value = new Date().toISOString().slice(0, 10);
    }
}

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    loadState();
    setupNavigation();
    setupFormHandlers();
    setupInteractivity();
    renderDashboard();
});
