const state = {
    dashboard: null,
    customers: [],
    vehicles: [],
    services: [],
    mechanics: [],
    appointments: [],
    chart: null
};


const $ = id =>
    document.getElementById(id);


const money = value =>
    "₹" + Number(value || 0).toLocaleString("en-IN");


const initials = name =>
    (name || "")
        .split(" ")
        .map(x => x[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();


function escapeHTML(value) {

    return String(value ?? "")
        .replace(/[&<>"']/g, character => {

            const map = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return map[character];

        });

}


function toast(message) {

    const element = $("toast");

    element.textContent = message;

    element.classList.add("show");

    setTimeout(() => {

        element.classList.remove("show");

    }, 2800);

}


function statusBadge(status) {

    const classes = {

        "Completed": "green",

        "Scheduled": "blue",

        "In Progress": "yellow",

        "Ready for Pickup": "green",

        "Cancelled": "red",

        "Paid": "green",

        "Pending": "yellow"

    };


    const className =
        classes[status] || "blue";


    return `
        <span class="status ${className}">
            ${escapeHTML(status)}
        </span>
    `;

}


async function api(url, options = {}) {

    const response =
        await fetch(url, options);


    let data = {};


    try {

        data =
            await response.json();

    } catch {

        data = {};

    }


    if (!response.ok) {

        throw new Error(
            data.detail ||
            "Request failed"
        );

    }


    return data;

}


/* =========================================================
   PAGE NAVIGATION
========================================================= */

function showPage(page) {

    document
        .querySelectorAll(".page")
        .forEach(element => {

            element.classList.remove(
                "active"
            );

        });


    const target =
        $("page-" + page);


    if (target) {

        target.classList.add("active");

    }


    document
        .querySelectorAll(".nav")
        .forEach(element => {

            element.classList.toggle(
                "active",
                element.dataset.page === page
            );

        });


    const titles = {

        dashboard: [
            "Dashboard",
            "Workshop overview and today's operations"
        ],

        appointments: [
            "Appointments",
            "Schedule, assign and track service jobs"
        ],

        vehicles: [
            "Vehicle Garage",
            "Every registered vehicle, owner and service profile"
        ],

        customers: [
            "Customers",
            "Customer profiles and registered vehicles"
        ],

        mechanics: [
            "Technicians",
            "Skills, experience and current availability"
        ],

        services: [
            "Service Catalog",
            "Pricing and estimated workshop duration"
        ],

        invoices: [
            "Invoices & Payments",
            "Monitor workshop billing and collections"
        ],

        reports: [
            "Workshop Reports",
            "Quick operational insights from your service data"
        ],

        settings: [
            "Settings",
            "Workshop configuration and system information"
        ]

    };


    if (titles[page]) {

        $("pageTitle").textContent =
            titles[page][0];

        $("pageSubtitle").textContent =
            titles[page][1];

    }


    if (page === "dashboard")
        loadDashboard();

    if (page === "appointments")
        loadAppointments();

    if (page === "vehicles")
        loadVehicles();

    if (page === "customers")
        loadCustomers();

    if (page === "mechanics")
        loadMechanics();

    if (page === "services")
        loadServices();

    if (page === "invoices")
        loadInvoices();

    if (page === "reports")
        renderReports();

}


/* =========================================================
   DASHBOARD
========================================================= */

async function loadDashboard() {

    try {

        state.dashboard =
            await api("/api/dashboard");


        const dashboard =
            state.dashboard;


        const stats =
            dashboard.stats;


        $("statTotal").textContent =
            stats.total_services;


        $("statCompleted").textContent =
            stats.completed;


        $("statProgress").textContent =
            stats.in_progress;


        $("statRevenue").textContent =
            money(stats.revenue);


        $("todaySub").textContent =
            `${dashboard.today.length}
             appointment${dashboard.today.length === 1 ? "" : "s"}
             today`;


        if (dashboard.today.length) {

            $("todayList").innerHTML =
                dashboard.today.map(item => `

                    <div class="schedule-item">

                        <div class="car-icon">
                            🚘
                        </div>

                        <div class="schedule-info">

                            <b>
                                ${escapeHTML(item.customer)}
                            </b>

                            <small>
                                ${escapeHTML(item.make)}
                                ${escapeHTML(item.model)}
                                ·
                                ${escapeHTML(item.service)}
                            </small>

                        </div>

                        <div class="schedule-time">

                            <b>
                                ${escapeHTML(item.appointment_time)}
                            </b>

                            <small>
                                ${statusBadge(item.status)}
                            </small>

                        </div>

                    </div>

                `).join("");

        } else {

            $("todayList").innerHTML = `

                <div style="
                    padding:30px 0;
                    text-align:center;
                    color:#7b8491;
                    font-size:10px;
                ">
                    No appointments today.
                </div>

            `;

        }


        $("recentTable").innerHTML =
            dashboard.recent.map(item => `

                <tr>

                    <td>

                        <div class="person">

                            <div class="person-avatar">
                                ${initials(item.customer)}
                            </div>

                            <div>

                                <b>
                                    ${escapeHTML(item.customer)}
                                </b>

                                <small>
                                    ${escapeHTML(item.phone || "")}
                                </small>

                            </div>

                        </div>

                    </td>


                    <td>

                        <b>
                            ${escapeHTML(item.make)}
                            ${escapeHTML(item.model)}
                        </b>

                        <br>

                        <small style="color:#7b8491">
                            ${escapeHTML(item.registration)}
                        </small>

                    </td>


                    <td>
                        ${escapeHTML(item.service)}
                    </td>


                    <td>
                        ${escapeHTML(item.mechanic || "Unassigned")}
                    </td>


                    <td>
                        ${escapeHTML(item.appointment_date)}
                    </td>


                    <td>
                        ${statusBadge(item.status)}
                    </td>


                    <td>
                        <b>
                            ${money(item.estimated_cost)}
                        </b>
                    </td>

                </tr>

            `).join("");


        drawChart(
            dashboard.chart
        );

    } catch (error) {

        toast(error.message);

    }

}


/* =========================================================
   CHART
========================================================= */

function drawChart(data) {

    if (state.chart) {

        state.chart.destroy();

    }


    state.chart =
        new Chart(
            $("serviceChart"),
            {

                type: "line",

                data: {

                    labels:
                        data.map(
                            item => item.date
                        ),

                    datasets: [

                        {

                            data:
                                data.map(
                                    item =>
                                        item.count
                                ),

                            borderColor:
                                "#ff5a1f",

                            backgroundColor:
                                "rgba(255,90,31,.08)",

                            fill: true,

                            tension: .4,

                            borderWidth: 3,

                            pointRadius: 4,

                            pointBackgroundColor:
                                "#ff5a1f"

                        }

                    ]

                },


                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: false
                        }

                    },


                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {
                                font: {
                                    size: 9
                                }
                            },

                            grid: {
                                color: "#eef0f4"
                            }

                        },


                        x: {

                            ticks: {
                                font: {
                                    size: 9
                                }
                            },

                            grid: {
                                display: false
                            }

                        }

                    }

                }

            }
        );

}


/* =========================================================
   APPOINTMENTS
========================================================= */

async function loadAppointments() {

    try {

        state.appointments =
            await api(
                "/api/appointments"
            );


        renderAppointments();

    } catch (error) {

        toast(error.message);

    }

}


function renderAppointments() {

    const query =
        (
            $("appointmentSearch")
                .value ||
            ""
        ).toLowerCase();


    const filter =
        $("appointmentFilter").value;


    const rows =
        state.appointments.filter(
            appointment => {

                const matchesFilter =
                    !filter ||
                    appointment.status === filter;


                const matchesSearch =
                    !query ||
                    Object.values(
                        appointment
                    ).some(value =>
                        String(value)
                            .toLowerCase()
                            .includes(query)
                    );


                return (
                    matchesFilter &&
                    matchesSearch
                );

            }
        );


    if (!rows.length) {

        $("appointmentTable").innerHTML = `

            <tr>

                <td
                    colspan="7"
                    style="
                        text-align:center;
                        padding:35px;
                        color:#7b8491;
                    "
                >
                    No appointments found.
                </td>

            </tr>

        `;

        return;

    }


    $("appointmentTable").innerHTML =
        rows.map(item => `

            <tr>

                <td>

                    <div class="person">

                        <div class="person-avatar">
                            ${initials(item.customer)}
                        </div>

                        <div>

                            <b>
                                ${escapeHTML(item.customer)}
                            </b>

                            <small>
                                ${escapeHTML(item.phone)}
                            </small>

                        </div>

                    </div>

                </td>


                <td>

                    <b>
                        ${escapeHTML(item.make)}
                        ${escapeHTML(item.model)}
                    </b>

                    <br>

                    <small style="color:#7b8491">
                        ${escapeHTML(item.registration)}
                    </small>

                </td>


                <td>
                    ${escapeHTML(item.service)}
                </td>


                <td>

                    <b>
                        ${escapeHTML(item.appointment_date)}
                    </b>

                    <br>

                    <small>
                        ${escapeHTML(item.appointment_time)}
                    </small>

                </td>


                <td>
                    ${escapeHTML(item.mechanic || "Unassigned")}
                </td>


                <td>
                    ${statusBadge(item.status)}
                </td>


                <td>

                    <select
                        class="select status-update"
                        data-id="${item.id}"
                    >

                        <option value="">
                            Update
                        </option>

                        <option>
                            Scheduled
                        </option>

                        <option>
                            In Progress
                        </option>

                        <option>
                            Ready for Pickup
                        </option>

                        <option>
                            Completed
                        </option>

                        <option>
                            Cancelled
                        </option>

                    </select>

                </td>

            </tr>

        `).join("");

}


async function changeStatus(
    id,
    status
) {

    if (!status)
        return;


    try {

        await api(
            `/api/appointments/${id}/status`,
            {

                method: "PATCH",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        status
                    })

            }
        );


        toast(
            "✓ Appointment status updated"
        );


        await loadAppointments();

        await loadDashboard();

    } catch (error) {

        toast(error.message);

    }

}


/* =========================================================
   CUSTOMERS
========================================================= */

async function loadCustomers() {

    try {

        state.customers =
            await api(
                "/api/customers"
            );


        renderCustomers();

    } catch (error) {

        toast(error.message);

    }

}


function renderCustomers() {

    const query =
        (
            $("customerSearch")?.value ||
            ""
        ).toLowerCase();


    const rows =
        state.customers.filter(
            customer =>

                Object.values(customer)
                    .some(value =>
                        String(value)
                            .toLowerCase()
                            .includes(query)
                    )
        );


    $("customerTable").innerHTML =
        rows.map(customer => `

            <tr>

                <td>

                    <div class="person">

                        <div class="person-avatar">
                            ${initials(customer.name)}
                        </div>

                        <div>

                            <b>
                                ${escapeHTML(customer.name)}
                            </b>

                            <small>
                                Customer #${customer.id}
                            </small>

                        </div>

                    </div>

                </td>


                <td>
                    ${escapeHTML(customer.phone)}
                </td>


                <td>
                    ${escapeHTML(customer.email || "—")}
                </td>


                <td>
                    ${escapeHTML(customer.address || "—")}
                </td>


                <td>
                    <b>
                        ${customer.vehicle_count}
                    </b>
                </td>

            </tr>

        `).join("");

}


/* =========================================================
   VEHICLES
========================================================= */

async function loadVehicles() {

    try {

        state.vehicles =
            await api(
                "/api/vehicles"
            );


        $("vehicleGrid").innerHTML =
            state.vehicles.map(
                vehicle => `

                    <article
                        class="vehicle-card"
                    >

                        <div class="vehicle-top">

                            <div class="vehicle-icon">
                                🚘
                            </div>

                            <span class="status green">
                                ${escapeHTML(vehicle.fuel)}
                            </span>

                        </div>


                        <h3>
                            ${escapeHTML(vehicle.make)}
                            ${escapeHTML(vehicle.model)}
                        </h3>


                        <div class="reg">
                            ${escapeHTML(vehicle.registration)}
                        </div>


                        <div class="vehicle-meta">

                            <div>

                                <span>
                                    OWNER
                                </span>

                                <b>
                                    ${escapeHTML(vehicle.customer)}
                                </b>

                            </div>


                            <div>

                                <span>
                                    YEAR
                                </span>

                                <b>
                                    ${vehicle.year}
                                </b>

                            </div>


                            <div>

                                <span>
                                    MILEAGE
                                </span>

                                <b>
                                    ${Number(
                                        vehicle.mileage || 0
                                    ).toLocaleString()}
                                    km
                                </b>

                            </div>


                            <div>

                                <span>
                                    COLOR
                                </span>

                                <b>
                                    ${escapeHTML(
                                        vehicle.color || "—"
                                    )}
                                </b>

                            </div>

                        </div>

                    </article>

                `
            ).join("");

    } catch (error) {

        toast(error.message);

    }

}


/* =========================================================
   MECHANICS
========================================================= */

async function loadMechanics() {

    try {

        state.mechanics =
            await api(
                "/api/mechanics"
            );


        $("mechanicGrid").innerHTML =
            state.mechanics.map(
                mechanic => `

                    <article
                        class="mechanic-card"
                    >

                        <div class="top">

                            <div class="mechanic-avatar">
                                👨‍🔧
                            </div>

                            ${statusBadge(
                                mechanic.status
                            )}

                        </div>


                        <h3>
                            ${escapeHTML(
                                mechanic.name
                            )}
                        </h3>


                        <p>

                            <b>
                                ${escapeHTML(
                                    mechanic.specialization
                                )}
                            </b>

                            <br>

                            ${mechanic.experience}
                            years experience

                            <br>

                            ${escapeHTML(
                                mechanic.phone
                            )}

                        </p>


                        <span class="skill">
                            Workshop Technician
                        </span>

                    </article>

                `
            ).join("");

    } catch (error) {

        toast(error.message);

    }

}


/* =========================================================
   SERVICES
========================================================= */

async function loadServices() {

    try {

        state.services =
            await api(
                "/api/services"
            );


        $("serviceGrid").innerHTML =
            state.services.map(
                service => `

                    <article
                        class="service-card"
                    >

                        <div class="top">

                            <span class="status blue">
                                ${escapeHTML(
                                    service.category
                                )}
                            </span>

                            <b
                                style="
                                    color:#ff5a1f;
                                    font-size:12px
                                "
                            >
                                ${money(
                                    service.price
                                )}
                            </b>

                        </div>


                        <h3>
                            ${escapeHTML(
                                service.name
                            )}
                        </h3>


                        <p>

                            Estimated workshop duration

                            <br>

                            <b>
                                ${service.duration}
                                minutes
                            </b>

                        </p>

                    </article>

                `
            ).join("");

    } catch (error) {

        toast(error.message);

    }

}


/* =========================================================
   INVOICES
========================================================= */

async function loadInvoices() {

    try {

        const rows =
            await api(
                "/api/invoices"
            );


        const paid =
            rows
                .filter(
                    invoice =>
                        invoice.payment_status === "Paid"
                )
                .reduce(
                    (sum, invoice) =>
                        sum +
                        Number(invoice.total),
                    0
                );


        const pending =
            rows
                .filter(
                    invoice =>
                        invoice.payment_status === "Pending"
                )
                .reduce(
                    (sum, invoice) =>
                        sum +
                        Number(invoice.total),
                    0
                );


        $("paidTotal").textContent =
            money(paid);


        $("pendingTotal").textContent =
            money(pending);


        $("invoiceTotal").textContent =
            rows.length;


        $("invoiceTable").innerHTML =
            rows.map(
                invoice => `

                    <tr>

                        <td>
                            <b>
                                ${escapeHTML(
                                    invoice.invoice_no
                                )}
                            </b>
                        </td>

                        <td>
                            ${escapeHTML(
                                invoice.customer
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                invoice.registration
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                invoice.service
                            )}
                        </td>

                        <td>
                            <b>
                                ${money(
                                    invoice.total
                                )}
                            </b>
                        </td>

                        <td>
                            ${statusBadge(
                                invoice.payment_status
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                invoice.payment_method
                            )}
                        </td>

                    </tr>

                `
            ).join("");

    } catch (error) {

        toast(error.message);

    }

}


/* =========================================================
   FORMS
========================================================= */

async function prepareForms() {

    const [
        customers,
        vehicles,
        services,
        mechanics
    ] = await Promise.all([

        api("/api/customers"),

        api("/api/vehicles"),

        api("/api/services"),

        api("/api/mechanics")

    ]);


    state.customers = customers;

    state.vehicles = vehicles;

    state.services = services;

    state.mechanics = mechanics;


    $("aCustomer").innerHTML =
        customers.map(
            customer => `

                <option
                    value="${customer.id}"
                >
                    ${escapeHTML(customer.name)}
                    ·
                    ${escapeHTML(customer.phone)}
                </option>

            `
        ).join("");


    $("vCustomer").innerHTML =
        customers.map(
            customer => `

                <option
                    value="${customer.id}"
                >
                    ${escapeHTML(customer.name)}
                </option>

            `
        ).join("");


    $("aService").innerHTML =
        services.map(
            service => `

                <option
                    value="${service.id}"
                >
                    ${escapeHTML(service.name)}
                    ·
                    ${money(service.price)}
                </option>

            `
        ).join("");


    $("aMechanic").innerHTML =

        `<option value="">
            Unassigned
        </option>` +

        mechanics
            .filter(
                mechanic =>
                    mechanic.status !== "Busy"
            )
            .map(
                mechanic => `

                    <option
                        value="${mechanic.id}"
                    >
                        ${escapeHTML(
                            mechanic.name
                        )}
                        ·
                        ${escapeHTML(
                            mechanic.specialization
                        )}
                    </option>

                `
            )
            .join("");


    updateVehiclesForCustomer();

    updateCost();

}


function updateVehiclesForCustomer() {

    const customerId =
        Number(
            $("aCustomer").value
        );


    const vehicles =
        state.vehicles.filter(
            vehicle =>
                vehicle.customer_id ===
                customerId
        );


    $("aVehicle").innerHTML =
        vehicles.length

            ?

            vehicles.map(
                vehicle => `

                    <option
                        value="${vehicle.id}"
                    >
                        ${escapeHTML(
                            vehicle.make
                        )}
                        ${escapeHTML(
                            vehicle.model
                        )}

                        ·

                        ${escapeHTML(
                            vehicle.registration
                        )}
                    </option>

                `
            ).join("")

            :

            `<option value="">
                No vehicle registered
            </option>`;

}


function updateCost() {

    const service =
        state.services.find(
            item =>
                item.id ===
                Number(
                    $("aService").value
                )
        );


    if (service) {

        $("aCost").value =
            service.price;

    }

}


/* =========================================================
   MODALS
========================================================= */

function openModal(id) {

    $(id).classList.add(
        "show"
    );

}


function closeModal(id) {

    $(id).classList.remove(
        "show"
    );

}


/* =========================================================
   CREATE APPOINTMENT
========================================================= */

$("appointmentForm")
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            try {

                await api(
                    "/api/appointments",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                customer_id:
                                    Number(
                                        $("aCustomer")
                                            .value
                                    ),

                                vehicle_id:
                                    Number(
                                        $("aVehicle")
                                            .value
                                    ),

                                service_id:
                                    Number(
                                        $("aService")
                                            .value
                                    ),

                                mechanic_id:
                                    $("aMechanic")
                                        .value

                                        ?

                                        Number(
                                            $("aMechanic")
                                                .value
                                        )

                                        :

                                        null,

                                appointment_date:
                                    $("aDate")
                                        .value,

                                appointment_time:
                                    $("aTime")
                                        .value,

                                estimated_cost:
                                    Number(
                                        $("aCost")
                                            .value
                                    ),

                                notes:
                                    $("aNotes")
                                        .value

                            })

                    }
                );


                closeModal(
                    "appointmentModal"
                );


                event.target.reset();


                toast(
                    "✓ Appointment created successfully"
                );


                await loadDashboard();

            } catch (error) {

                toast(error.message);

            }

        }
    );


/* =========================================================
   CREATE CUSTOMER
========================================================= */

$("customerForm")
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            try {

                await api(
                    "/api/customers",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                name:
                                    $("cName")
                                        .value,

                                phone:
                                    $("cPhone")
                                        .value,

                                email:
                                    $("cEmail")
                                        .value,

                                address:
                                    $("cAddress")
                                        .value

                            })

                    }
                );


                closeModal(
                    "customerModal"
                );


                event.target.reset();


                toast(
                    "✓ Customer added successfully"
                );


                await loadCustomers();

                await loadDashboard();

            } catch (error) {

                toast(error.message);

            }

        }
    );


/* =========================================================
   CREATE VEHICLE
========================================================= */

$("vehicleForm")
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            try {

                await api(
                    "/api/vehicles",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                customer_id:
                                    Number(
                                        $("vCustomer")
                                            .value
                                    ),

                                registration:
                                    $("vReg")
                                        .value,

                                make:
                                    $("vMake")
                                        .value,

                                model:
                                    $("vModel")
                                        .value,

                                year:
                                    Number(
                                        $("vYear")
                                            .value
                                    ),

                                fuel:
                                    $("vFuel")
                                        .value,

                                mileage:
                                    Number(
                                        $("vMileage")
                                            .value ||
                                        0
                                    ),

                                color:
                                    $("vColor")
                                        .value

                            })

                    }
                );


                closeModal(
                    "vehicleModal"
                );


                event.target.reset();


                toast(
                    "✓ Vehicle registered successfully"
                );


                await loadVehicles();

                await loadDashboard();

            } catch (error) {

                toast(error.message);

            }

        }
    );


/* =========================================================
   REPORTS
========================================================= */

async function renderReports() {

    if (!state.dashboard) {

        await loadDashboard();

    }


    const stats =
        state.dashboard.stats;


    const completion =
        stats.total_services

            ?

            Math.round(
                (
                    stats.completed /
                    stats.total_services
                ) * 100
            )

            :

            0;


    $("reportCompletion")
        .textContent =
        completion + "%";


    $("reportRevenue")
        .textContent =
        money(stats.revenue);


    $("reportVehicles")
        .textContent =
        stats.vehicles;


    const mechanics =
        await api(
            "/api/mechanics"
        );


    $("reportMechanics")
        .textContent =
        mechanics.filter(
            mechanic =>
                mechanic.status ===
                "Available"
        ).length;

}


/* =========================================================
   EVENT HANDLERS
========================================================= */

document.addEventListener(
    "click",
    async event => {

        const nav =
            event.target.closest(
                ".nav"
            );


        if (nav) {

            showPage(
                nav.dataset.page
            );

        }


        const pageLink =
            event.target.closest(
                "[data-page-link]"
            );


        if (pageLink) {

            showPage(
                pageLink.dataset.pageLink
            );

        }


        const close =
            event.target.closest(
                "[data-close]"
            );


        if (close) {

            closeModal(
                close.dataset.close
            );

        }


        if (
            event.target.id ===
                "heroAppointment" ||

            event.target.id ===
                "appointmentAdd" ||

            event.target.id ===
                "recentAdd"
        ) {

            await prepareForms();


            $("aDate").value =
                new Date()
                    .toISOString()
                    .slice(0, 10);


            $("aTime").value =
                "10:00";


            openModal(
                "appointmentModal"
            );

        }


        if (
            event.target.id ===
            "customerAdd"
        ) {

            openModal(
                "customerModal"
            );

        }


        if (
            event.target.id ===
            "vehicleAdd"
        ) {

            await prepareForms();

            openModal(
                "vehicleModal"
            );

        }


        if (
            event.target.id ===
            "refreshBtn"
        ) {

            await loadDashboard();

            toast(
                "Dashboard refreshed"
            );

        }


        const statusUpdate =
            event.target.closest(
                ".status-update"
            );


        if (statusUpdate) {

            await changeStatus(

                Number(
                    statusUpdate.dataset.id
                ),

                statusUpdate.value

            );

        }


        if (
            event.target.id ===
            "saveSettings"
        ) {

            toast(
                "✓ Workshop settings saved"
            );

        }

    }
);


/* =========================================================
   INPUT EVENTS
========================================================= */

$("aCustomer")
    .addEventListener(
        "change",
        updateVehiclesForCustomer
    );


$("aService")
    .addEventListener(
        "change",
        updateCost
    );


$("appointmentSearch")
    .addEventListener(
        "input",
        renderAppointments
    );


$("appointmentFilter")
    .addEventListener(
        "change",
        renderAppointments
    );


$("customerSearch")
    .addEventListener(
        "input",
        renderCustomers
    );


$("globalSearch")
    .addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Enter"
            ) {

                const query =
                    event.target.value
                        .trim();


                if (!query)
                    return;


                showPage(
                    "appointments"
                );


                $("appointmentSearch")
                    .value =
                    query;


                renderAppointments();

            }

        }
    );


/* =========================================================
   MODAL OUTSIDE CLICK
========================================================= */

document
    .querySelectorAll(".modal")
    .forEach(modal => {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    modal
                ) {

                    modal.classList
                        .remove("show");

                }

            }
        );

    });


/* =========================================================
   INITIAL LOAD
========================================================= */

(async function initialize() {

    await loadDashboard();

    await loadCustomers();

    await loadVehicles();

})();