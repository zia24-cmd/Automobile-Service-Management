/* =========================================================
   AUTOPRO SERVICE HUB
   Complete Frontend JavaScript
   Data is saved automatically in localStorage
   ========================================================= */


/* =========================
   GLOBAL DATA
========================= */

const STORAGE_KEY = "autopro_service_hub_v1";

let data;
let serviceChart;


/* =========================
   HELPERS
========================= */

const $ = id => document.getElementById(id);

const money = value =>
    "₹" + Number(value || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 0
    });


function escapeHTML(value){

    return String(value ?? "").replace(
        /[&<>"']/g,

        char => ({
            "&":"&amp;",
            "<":"&lt;",
            ">":"&gt;",
            '"':"&quot;",
            "'":"&#039;"
        }[char])
    );

}


function initials(name){

    return String(name || "?")
        .trim()
        .split(/\s+/)
        .slice(0,2)
        .map(x => x[0])
        .join("")
        .toUpperCase();

}


function toast(message){

    const element = $("toast");

    element.textContent = message;

    element.classList.add("show");

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(() => {

        element.classList.remove("show");

    }, 2800);

}


function statusBadge(status){

    const classes = {

        "Completed":"b-green",
        "Scheduled":"b-blue",
        "In Progress":"b-yellow",
        "Cancelled":"b-red",
        "Paid":"b-green",
        "Pending":"b-yellow"

    };

    return `
        <span class="badge ${classes[status] || "b-blue"}">
            ${escapeHTML(status)}
        </span>
    `;

}


/* =========================
   DEFAULT DATA
========================= */

function createInitialData(){

    const today =
        new Date().toISOString().slice(0,10);


    return {

        customers:[

            {
                id:1,
                name:"Arjun Mehta",
                phone:"9876543210",
                email:"arjun@example.com",
                address:"Bangalore"
            },

            {
                id:2,
                name:"Priya Sharma",
                phone:"9988776655",
                email:"priya@example.com",
                address:"Whitefield"
            }

        ],


        vehicles:[

            {
                id:1,
                customerId:1,
                registration:"KA01AB1234",
                make:"Toyota",
                model:"Corolla",
                year:2022,
                fuel:"Petrol",
                mileage:28400,
                color:"White"
            },

            {
                id:2,
                customerId:2,
                registration:"KA05MN7788",
                make:"Hyundai",
                model:"Creta",
                year:2023,
                fuel:"Diesel",
                mileage:17300,
                color:"Black"
            }

        ],


        mechanics:[

            {
                id:1,
                name:"Raj Kumar",
                specialization:"Engine & Diagnostics",
                experience:8,
                phone:"9000000001",
                status:"Available"
            },

            {
                id:2,
                name:"Vikram Singh",
                specialization:"Brakes & Suspension",
                experience:6,
                phone:"9000000002",
                status:"Available"
            },

            {
                id:3,
                name:"Amit Patil",
                specialization:"Electrical Systems",
                experience:5,
                phone:"9000000003",
                status:"Busy"
            }

        ],


        services:[

            {
                id:1,
                name:"Engine Service",
                category:"Maintenance",
                price:2500,
                duration:120
            },

            {
                id:2,
                name:"Oil Change",
                category:"Maintenance",
                price:900,
                duration:45
            },

            {
                id:3,
                name:"Brake Inspection",
                category:"Brakes",
                price:700,
                duration:60
            },

            {
                id:4,
                name:"Full Car Service",
                category:"Maintenance",
                price:4500,
                duration:180
            },

            {
                id:5,
                name:"AC Service",
                category:"Electrical",
                price:1800,
                duration:90
            }

        ],


        appointments:[

            {
                id:1,
                customerId:1,
                customer:"Arjun Mehta",
                phone:"9876543210",
                vehicleId:1,
                registration:"KA01AB1234",
                make:"Toyota",
                model:"Corolla",
                service:"Engine Service",
                mechanic:"Raj Kumar",
                date:today,
                time:"10:00",
                cost:2500,
                status:"In Progress",
                notes:"Engine inspection"
            },

            {
                id:2,
                customerId:2,
                customer:"Priya Sharma",
                phone:"9988776655",
                vehicleId:2,
                registration:"KA05MN7788",
                make:"Hyundai",
                model:"Creta",
                service:"Brake Inspection",
                mechanic:"Vikram Singh",
                date:today,
                time:"14:30",
                cost:700,
                status:"Scheduled",
                notes:"Brake check"
            }

        ],


        invoices:[]

    };

}


/* =========================
   STORAGE
========================= */

function loadData(){

    try{

        const saved =
            localStorage.getItem(STORAGE_KEY);

        data = saved
            ? JSON.parse(saved)
            : createInitialData();

    }

    catch(error){

        data = createInitialData();

    }

    saveData();

}


function saveData(){

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
    );

}


/* =========================
   PAGE NAVIGATION
========================= */

function showPage(page){

    document
        .querySelectorAll(".page")
        .forEach(element =>
            element.classList.remove("active")
        );


    const target = $("page-" + page);

    if(target){
        target.classList.add("active");
    }


    document
        .querySelectorAll(".nav")
        .forEach(button =>
            button.classList.toggle(
                "active",
                button.dataset.page === page
            )
        );


    const pageInfo = {

        dashboard:[
            "Dashboard",
            "Workshop overview and today's operations"
        ],

        appointments:[
            "Appointments",
            "Schedule and manage service jobs."
        ],

        vehicles:[
            "Vehicle Garage",
            "Registered vehicles and service profiles."
        ],

        customers:[
            "Customers",
            "Customer profiles and contact details."
        ],

        mechanics:[
            "Technicians",
            "Workshop team and availability."
        ],

        services:[
            "Service Catalog",
            "Available services and standard pricing."
        ],

        invoices:[
            "Invoices & Payments",
            "Monitor billing and collections."
        ],

        reports:[
            "Workshop Reports",
            "Quick operational insights."
        ],

        settings:[
            "Settings",
            "Workshop preferences."
        ]

    };


    if(pageInfo[page]){

        $("pageTitle").textContent =
            pageInfo[page][0];

        $("pageSub").textContent =
            pageInfo[page][1];

    }


    $("sidebar").classList.remove("open");


    renderAll();

}


/* =========================
   DASHBOARD
========================= */

function renderDashboard(){

    const appointments =
        data.appointments;


    const completed =
        appointments.filter(
            appointment =>
                appointment.status === "Completed"
        );


    const inProgress =
        appointments.filter(
            appointment =>
                appointment.status === "In Progress"
        );


    $("statTotal").textContent =
        appointments.length;


    $("statCompleted").textContent =
        completed.length;


    $("statProgress").textContent =
        inProgress.length;


    const revenue =
        completed.reduce(
            (sum, appointment) =>
                sum + Number(appointment.cost || 0),
            0
        );


    $("statRevenue").textContent =
        money(revenue);


    const today =
        new Date().toISOString().slice(0,10);


    const todayAppointments =
        appointments
            .filter(a => a.date === today)
            .sort((a,b) =>
                a.time.localeCompare(b.time)
            );


    $("todaySub").textContent =
        `${todayAppointments.length} appointment${
            todayAppointments.length === 1 ? "" : "s"
        }`;


    if(todayAppointments.length === 0){

        $("todayList").innerHTML = `
            <div style="padding:22px;color:#7c8492">
                No appointments today.
            </div>
        `;

    }

    else{

        $("todayList").innerHTML =
            todayAppointments
                .map(appointment => `

                    <div class="appt">

                        <div class="car">
                            🚗
                        </div>

                        <div class="appt-info">

                            <b>
                                ${escapeHTML(appointment.customer)}
                            </b>

                            <small>
                                ${escapeHTML(appointment.make)}
                                ${escapeHTML(appointment.model)}
                                ·
                                ${escapeHTML(appointment.service)}
                            </small>

                        </div>

                        <div class="appt-time">

                            <b>
                                ${escapeHTML(appointment.time)}
                            </b>

                            <small>
                                ${escapeHTML(appointment.status)}
                            </small>

                        </div>

                    </div>

                `)
                .join("");

    }


    const recent =
        appointments
            .slice()
            .sort((a,b) => b.id - a.id)
            .slice(0,7);


    $("recentTable").innerHTML =
        recent.length

        ?

        recent.map(appointment => `

            <tr>

                <td>
                    ${escapeHTML(appointment.customer)}
                </td>

                <td>
                    ${escapeHTML(appointment.registration)}
                </td>

                <td>
                    ${escapeHTML(appointment.service)}
                </td>

                <td>
                    ${escapeHTML(
                        appointment.mechanic ||
                        "Unassigned"
                    )}
                </td>

                <td>
                    ${escapeHTML(appointment.date)}
                </td>

                <td>
                    ${statusBadge(
                        appointment.status
                    )}
                </td>

                <td>
                    ${money(appointment.cost)}
                </td>

            </tr>

        `).join("")

        :

        `

            <tr>

                <td
                    colspan="7"
                    style="text-align:center;padding:30px"
                >
                    No appointments yet.
                </td>

            </tr>

        `;


    drawChart();

}


/* =========================
   CHART
========================= */

function drawChart(){

    const days = [];


    for(let i=6;i>=0;i--){

        const date =
            new Date();

        date.setDate(
            date.getDate() - i
        );

        days.push(
            date.toISOString().slice(0,10)
        );

    }


    const labels =
        days.map(date =>
            new Date(
                date + "T12:00:00"
            ).toLocaleDateString(
                "en-IN",
                {
                    weekday:"short"
                }
            )
        );


    const values =
        days.map(date =>
            data.appointments.filter(
                appointment =>
                    appointment.date === date
            ).length
        );


    if(serviceChart){

        serviceChart.destroy();

    }


    serviceChart =
        new Chart(
            $("serviceChart"),
            {

                type:"line",

                data:{

                    labels,

                    datasets:[{

                        data:values,

                        borderColor:"#ff5a1f",

                        backgroundColor:
                            "rgba(255,90,31,.08)",

                        fill:true,

                        tension:.4,

                        borderWidth:3,

                        pointRadius:4

                    }]

                },

                options:{

                    responsive:true,

                    maintainAspectRatio:false,

                    plugins:{

                        legend:{
                            display:false
                        }

                    },

                    scales:{

                        y:{
                            beginAtZero:true,
                            ticks:{
                                precision:0
                            }
                        },

                        x:{
                            grid:{
                                display:false
                            }
                        }

                    }

                }

            }
        );

}


/* =========================
   APPOINTMENTS
========================= */

function renderAppointments(
    list = data.appointments
){

    const sorted =
        list
            .slice()
            .sort(
                (a,b) =>
                    (a.date + a.time)
                    .localeCompare(
                        b.date + b.time
                    )
            );


    $("appointmentTable").innerHTML =

        sorted.length

        ?

        sorted.map(appointment => `

            <tr>

                <td>

                    <div class="person">

                        <div class="person-avatar">

                            ${initials(
                                appointment.customer
                            )}

                        </div>

                        <div>

                            <b>
                                ${escapeHTML(
                                    appointment.customer
                                )}
                            </b>

                            <small>
                                ${escapeHTML(
                                    appointment.phone
                                )}
                            </small>

                        </div>

                    </div>

                </td>


                <td>

                    <b>
                        ${escapeHTML(
                            appointment.make
                        )}
                        ${escapeHTML(
                            appointment.model
                        )}
                    </b>

                    <br>

                    <small>
                        ${escapeHTML(
                            appointment.registration
                        )}
                    </small>

                </td>


                <td>
                    ${escapeHTML(
                        appointment.service
                    )}
                </td>


                <td>

                    ${escapeHTML(
                        appointment.date
                    )}

                    <br>

                    ${escapeHTML(
                        appointment.time
                    )}

                </td>


                <td>
                    ${escapeHTML(
                        appointment.mechanic ||
                        "Unassigned"
                    )}
                </td>


                <td>
                    ${statusBadge(
                        appointment.status
                    )}
                </td>


                <td>

                    <select
                        class="select status-update"
                        data-id="${appointment.id}"
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
                            Completed
                        </option>

                        <option>
                            Cancelled
                        </option>

                    </select>

                </td>

            </tr>

        `).join("")

        :

        `

            <tr>

                <td
                    colspan="7"
                    style="text-align:center;padding:30px"
                >
                    No appointments found.
                </td>

            </tr>

        `;

}


/* =========================
   VEHICLES
========================= */

function renderVehicles(){

    $("vehicleGrid").innerHTML =
        data.vehicles.map(vehicle => {

            const customer =
                data.customers.find(
                    customer =>
                        customer.id === vehicle.customerId
                );


            return `

                <div class="vehicle-card">

                    <div class="vehicle-top">

                        <div class="vehicle-art">
                            🚙
                        </div>

                        <span class="badge b-green">
                            ${escapeHTML(
                                vehicle.fuel
                            )}
                        </span>

                    </div>


                    <h3>
                        ${escapeHTML(
                            vehicle.make
                        )}
                        ${escapeHTML(
                            vehicle.model
                        )}
                    </h3>


                    <div class="reg">
                        ${escapeHTML(
                            vehicle.registration
                        )}
                    </div>


                    <div class="vehicle-meta">

                        <div>

                            <span>OWNER</span>

                            <b>
                                ${escapeHTML(
                                    customer?.name ||
                                    "Unknown"
                                )}
                            </b>

                        </div>


                        <div>

                            <span>YEAR</span>

                            <b>
                                ${vehicle.year}
                            </b>

                        </div>


                        <div>

                            <span>MILEAGE</span>

                            <b>
                                ${Number(
                                    vehicle.mileage || 0
                                ).toLocaleString()}
                                km
                            </b>

                        </div>


                        <div>

                            <span>COLOR</span>

                            <b>
                                ${escapeHTML(
                                    vehicle.color ||
                                    "—"
                                )}
                            </b>

                        </div>

                    </div>

                </div>

            `;

        }).join("");

}


/* =========================
   CUSTOMERS
========================= */

function renderCustomers(
    list = data.customers
){

    $("customerTable").innerHTML =
        list.length

        ?

        list.map(customer => `

            <tr>

                <td>

                    <div class="person">

                        <div class="person-avatar">

                            ${initials(
                                customer.name
                            )}

                        </div>

                        <div>

                            <b>
                                ${escapeHTML(
                                    customer.name
                                )}
                            </b>

                        </div>

                    </div>

                </td>


                <td>
                    ${escapeHTML(
                        customer.phone
                    )}
                </td>


                <td>
                    ${escapeHTML(
                        customer.email ||
                        "—"
                    )}
                </td>


                <td>
                    ${escapeHTML(
                        customer.address ||
                        "—"
                    )}
                </td>


                <td>

                    ${
                        data.vehicles.filter(
                            vehicle =>
                                vehicle.customerId ===
                                customer.id
                        ).length
                    }

                </td>

            </tr>

        `).join("")

        :

        `

            <tr>

                <td
                    colspan="5"
                    style="text-align:center;padding:30px"
                >
                    No customers found.
                </td>

            </tr>

        `;

}


/* =========================
   TECHNICIANS
========================= */

function renderMechanics(){

    $("mechanicGrid").innerHTML =
        data.mechanics.map(mechanic => `

            <div class="info-card">

                <div
                    style="
                    display:flex;
                    justify-content:space-between;
                    "
                >

                    <div class="vehicle-art">
                        👨‍🔧
                    </div>

                    ${statusBadge(
                        mechanic.status
                    )}

                </div>


                <h4>
                    ${escapeHTML(
                        mechanic.name
                    )}
                </h4>


                <p>

                    ${escapeHTML(
                        mechanic.specialization
                    )}

                    <br>

                    ${mechanic.experience}
                    years experience

                    <br>

                    ${escapeHTML(
                        mechanic.phone
                    )}

                </p>

            </div>

        `).join("");

}


/* =========================
   SERVICES
========================= */

function renderServices(){

    $("serviceGrid").innerHTML =
        data.services.map(service => `

            <div class="info-card">

                <span class="badge b-blue">
                    ${escapeHTML(
                        service.category
                    )}
                </span>


                <h4>
                    ${escapeHTML(
                        service.name
                    )}
                </h4>


                <p>
                    ${money(service.price)}
                    ·
                    ${service.duration}
                    minutes
                </p>

            </div>

        `).join("");

}


/* =========================
   INVOICES
========================= */

function renderInvoices(){

    const paid =
        data.invoices.filter(
            invoice =>
                invoice.payment === "Paid"
        );


    const pending =
        data.invoices.filter(
            invoice =>
                invoice.payment !== "Paid"
        );


    $("paidTotal").textContent =
        money(
            paid.reduce(
                (sum, invoice) =>
                    sum + Number(invoice.total),
                0
            )
        );


    $("pendingTotal").textContent =
        money(
            pending.reduce(
                (sum, invoice) =>
                    sum + Number(invoice.total),
                0
            )
        );


    $("invoiceTotal").textContent =
        data.invoices.length;


    $("invoiceTable").innerHTML =
        data.invoices.length

        ?

        data.invoices.map(invoice => `

            <tr>

                <td>
                    ${escapeHTML(invoice.no)}
                </td>

                <td>
                    ${escapeHTML(invoice.customer)}
                </td>

                <td>
                    ${escapeHTML(invoice.registration)}
                </td>

                <td>
                    ${escapeHTML(invoice.service)}
                </td>

                <td>
                    ${money(invoice.total)}
                </td>

                <td>
                    ${statusBadge(
                        invoice.payment
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        invoice.method ||
                        "Cash"
                    )}
                </td>

            </tr>

        `).join("")

        :

        `

            <tr>

                <td
                    colspan="7"
                    style="text-align:center;padding:30px"
                >
                    No invoices yet.
                </td>

            </tr>

        `;

}


/* =========================
   REPORTS
========================= */

function renderReports(){

    const total =
        data.appointments.length;


    const completed =
        data.appointments.filter(
            appointment =>
                appointment.status ===
                "Completed"
        );


    const completionRate =
        total
            ? Math.round(
                completed.length /
                total *
                100
            )
            : 0;


    $("reportCompletion").textContent =
        completionRate + "%";


    $("reportRevenue").textContent =
        money(
            completed.reduce(
                (sum, appointment) =>
                    sum +
                    Number(
                        appointment.cost || 0
                    ),
                0
            )
        );


    $("reportVehicles").textContent =
        data.vehicles.length;


    $("reportMechanics").textContent =
        data.mechanics.filter(
            mechanic =>
                mechanic.status ===
                "Available"
        ).length;

}


/* =========================
   MODALS
========================= */

function openModal(id){

    const modal = $(id);

    if(!modal) return;

    modal.classList.add("show");


    if(id === "appointmentModal"){

        $("appointmentForm").reset();

        const today =
            new Date()
                .toISOString()
                .slice(0,10);

        $("aDate").value = today;

        $("aTime").value = "10:00";

    }


    if(id === "vehicleModal"){

        $("vCustomer").innerHTML =
            data.customers
                .map(customer => `

                    <option
                        value="${customer.id}"
                    >
                        ${escapeHTML(
                            customer.name
                        )}
                    </option>

                `)
                .join("");

    }

}


function closeModal(id){

    $(id)?.classList.remove("show");

}


/* =========================
   CREATE APPOINTMENT
========================= */

$("appointmentForm")
    .addEventListener(
        "submit",
        function(event){

            event.preventDefault();


            const customerName =
                $("aCustomer")
                    .value
                    .trim();


            const phone =
                $("aPhone")
                    .value
                    .trim();


            const registration =
                $("aVehicle")
                    .value
                    .trim()
                    .toUpperCase();


            const make =
                $("aMake")
                    .value
                    .trim();


            const model =
                $("aModel")
                    .value
                    .trim();


            const serviceName =
                $("aService")
                    .value
                    .trim();


            const mechanic =
                $("aMechanic")
                    .value
                    .trim();


            const date =
                $("aDate")
                    .value;


            const time =
                $("aTime")
                    .value;


            const cost =
                Number(
                    $("aCost")
                        .value || 0
                );


            const notes =
                $("aNotes")
                    .value
                    .trim();


            /* VALIDATION */

            if(!customerName ||
               !phone ||
               !registration ||
               !make ||
               !model ||
               !serviceName ||
               !date ||
               !time){

                toast(
                    "Please fill all required fields."
                );

                return;

            }


            /* CHECK VEHICLE BOOKING */

            const existingBooking =
                data.appointments.find(
                    appointment =>

                        appointment.registration ===
                        registration &&

                        appointment.date ===
                        date &&

                        appointment.time ===
                        time &&

                        appointment.status !==
                        "Cancelled"
                );


            if(existingBooking){

                toast(
                    "This vehicle already has an appointment at this time."
                );

                return;

            }


            /* CUSTOMER */

            let customer =
                data.customers.find(
                    item =>
                        item.phone === phone
                );


            if(!customer){

                customer = {

                    id:Date.now(),

                    name:customerName,

                    phone:phone,

                    email:"",

                    address:""

                };


                data.customers.push(
                    customer
                );

            }

            else{

                customer.name =
                    customerName;

            }


            /* VEHICLE */

            let vehicle =
                data.vehicles.find(
                    item =>
                        item.registration ===
                        registration
                );


            if(!vehicle){

                vehicle = {

                    id:Date.now()+1,

                    customerId:
                        customer.id,

                    registration,

                    make,

                    model,

                    year:
                        new Date()
                            .getFullYear(),

                    fuel:"Petrol",

                    mileage:0,

                    color:""

                };


                data.vehicles.push(
                    vehicle
                );

            }

            else{

                vehicle.customerId =
                    customer.id;

                vehicle.make =
                    make || vehicle.make;

                vehicle.model =
                    model || vehicle.model;

            }


            /* SERVICE */

            let service =
                data.services.find(
                    item =>
                        item.name
                            .toLowerCase() ===
                        serviceName
                            .toLowerCase()
                );


            if(!service){

                service = {

                    id:Date.now()+2,

                    name:serviceName,

                    category:"Custom",

                    price:cost,

                    duration:60

                };


                data.services.push(
                    service
                );

            }


            /* APPOINTMENT */

            const appointment = {

                id:Date.now()+3,

                customerId:
                    customer.id,

                customer:
                    customer.name,

                phone,

                vehicleId:
                    vehicle.id,

                registration,

                make:
                    vehicle.make,

                model:
                    vehicle.model,

                service:
                    service.name,

                mechanic,

                date,

                time,

                cost:
                    cost || service.price,

                status:
                    "Scheduled",

                notes

            };


            data.appointments.push(
                appointment
            );


            saveData();


            closeModal(
                "appointmentModal"
            );


            toast(
                "✓ Appointment created successfully"
            );


            renderAll();

        }
    );


/* =========================
   ADD CUSTOMER
========================= */

$("customerForm")
    .addEventListener(
        "submit",
        function(event){

            event.preventDefault();


            const phone =
                $("cPhone").value.trim();


            if(
                data.customers.some(
                    customer =>
                        customer.phone === phone
                )
            ){

                toast(
                    "Customer with this phone number already exists."
                );

                return;

            }


            data.customers.push({

                id:Date.now(),

                name:
                    $("cName")
                        .value
                        .trim(),

                phone,

                email:
                    $("cEmail")
                        .value
                        .trim(),

                address:
                    $("cAddress")
                        .value
                        .trim()

            });


            saveData();


            closeModal(
                "customerModal"
            );


            toast(
                "✓ Customer added successfully"
            );


            renderAll();

        }
    );


/* =========================
   ADD VEHICLE
========================= */

$("vehicleForm")
    .addEventListener(
        "submit",
        function(event){

            event.preventDefault();


            const registration =
                $("vReg")
                    .value
                    .trim()
                    .toUpperCase();


            if(
                data.vehicles.some(
                    vehicle =>
                        vehicle.registration ===
                        registration
                )
            ){

                toast(
                    "Vehicle registration already exists."
                );

                return;

            }


            data.vehicles.push({

                id:Date.now(),

                customerId:
                    Number(
                        $("vCustomer")
                            .value
                    ),

                registration,

                make:
                    $("vMake")
                        .value
                        .trim(),

                model:
                    $("vModel")
                        .value
                        .trim(),

                year:
                    Number(
                        $("vYear")
                            .value || 2024
                    ),

                fuel:
                    $("vFuel")
                        .value,

                mileage:
                    Number(
                        $("vMileage")
                            .value || 0
                    ),

                color:
                    $("vColor")
                        .value
                        .trim()

            });


            saveData();


            closeModal(
                "vehicleModal"
            );


            toast(
                "✓ Vehicle registered successfully"
            );


            renderAll();

        }
    );


/* =========================
   UPDATE APPOINTMENT STATUS
========================= */

document.addEventListener(
    "change",
    function(event){

        if(
            !event.target.matches(
                ".status-update"
            )
        ){

            return;

        }


        const id =
            Number(
                event.target.dataset.id
            );


        const appointment =
            data.appointments.find(
                item =>
                    item.id === id
            );


        if(!appointment) return;


        const newStatus =
            event.target.value;


        if(!newStatus) return;


        appointment.status =
            newStatus;


        /* CREATE INVOICE WHEN COMPLETED */

        if(
            newStatus === "Completed" &&
            !data.invoices.some(
                invoice =>
                    invoice.appointmentId ===
                    appointment.id
            )
        ){

            data.invoices.push({

                id:Date.now(),

                appointmentId:
                    appointment.id,

                no:
                    "INV-" +
                    String(
                        Date.now()
                    ).slice(-6),

                customer:
                    appointment.customer,

                registration:
                    appointment.registration,

                service:
                    appointment.service,

                total:
                    appointment.cost,

                payment:
                    "Pending",

                method:
                    "Cash"

            });

        }


        saveData();


        toast(
            "✓ Appointment status updated"
        );


        renderAll();

    }
);


/* =========================
   SEARCH APPOINTMENTS
========================= */

function filterAppointments(){

    const query =
        $("appointmentSearch")
            .value
            .toLowerCase();


    const status =
        $("appointmentFilter")
            .value;


    const filtered =
        data.appointments.filter(
            appointment => {

                const matchesSearch =
                    !query ||
                    Object.values(
                        appointment
                    ).some(
                        value =>
                            String(value)
                                .toLowerCase()
                                .includes(query)
                    );


                const matchesStatus =
                    !status ||
                    appointment.status ===
                    status;


                return (
                    matchesSearch &&
                    matchesStatus
                );

            }
        );


    renderAppointments(
        filtered
    );

}


/* =========================
   CUSTOMER SEARCH
========================= */

function filterCustomers(){

    const query =
        $("customerSearch")
            .value
            .toLowerCase();


    const filtered =
        data.customers.filter(
            customer =>
                Object.values(
                    customer
                ).some(
                    value =>
                        String(value)
                            .toLowerCase()
                            .includes(query)
                )
        );


    renderCustomers(
        filtered
    );

}


/* =========================
   REFRESH
========================= */

$("refreshBtn")
    .addEventListener(
        "click",
        function(){

            renderAll();

            toast(
                "✓ Dashboard refreshed"
            );

        }
    );


/* =========================
   MOBILE MENU
========================= */

$("menuBtn")
    .addEventListener(
        "click",
        function(){

            $("sidebar")
                .classList
                .toggle("open");

        }
    );


/* =========================
   SETTINGS
========================= */

$("saveSettings")
    .addEventListener(
        "click",
        function(){

            const settings = {

                name:
                    $("workshopName")
                        .value,

                location:
                    $("workshopLocation")
                        .value

            };


            localStorage.setItem(
                "autopro_settings",
                JSON.stringify(settings)
            );


            toast(
                "✓ Settings saved"
            );

        }
    );


/* =========================
   CLOSE MODALS
========================= */

document.addEventListener(
    "click",
    function(event){

        const openButton =
            event.target.closest(
                "[data-open]"
            );


        if(openButton){

            openModal(
                openButton.dataset.open
            );

        }


        const closeButton =
            event.target.closest(
                "[data-close]"
            );


        if(closeButton){

            closeModal(
                closeButton.dataset.close
            );

        }


        const pageButton =
            event.target.closest(
                "[data-page-link]"
            );


        if(pageButton){

            showPage(
                pageButton.dataset.pageLink
            );

        }


        const navButton =
            event.target.closest(
                ".nav[data-page]"
            );


        if(navButton){

            showPage(
                navButton.dataset.page
            );

        }

    }
);


/* =========================
   CLOSE MODAL ON BACKDROP
========================= */

document.addEventListener(
    "click",
    function(event){

        if(
            event.target.classList.contains(
                "modal"
            )
        ){

            event.target.classList.remove(
                "show"
            );

        }

    }
);


/* =========================
   SEARCH EVENTS
========================= */

$("appointmentSearch")
    .addEventListener(
        "input",
        filterAppointments
    );


$("appointmentFilter")
    .addEventListener(
        "change",
        filterAppointments
    );


$("customerSearch")
    .addEventListener(
        "input",
        filterCustomers
    );


/* =========================
   RENDER EVERYTHING
========================= */

function renderAll(){

    renderDashboard();

    renderAppointments();

    renderVehicles();

    renderCustomers();

    renderMechanics();

    renderServices();

    renderInvoices();

    renderReports();

}


/* =========================
   START APPLICATION
========================= */

loadData();

renderAll();
