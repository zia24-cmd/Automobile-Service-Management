from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime, timedelta
import sqlite3
import uvicorn
import os

APP_NAME = "AutoPro Service Hub"
DB_FILE = "autopro.db"

app = FastAPI(title=APP_NAME, version="2.0.0")


# ============================================================
# DATABASE
# ============================================================

def db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = db()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT DEFAULT '',
            address TEXT DEFAULT '',
            created_at TEXT NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS vehicles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            registration TEXT UNIQUE NOT NULL,
            make TEXT NOT NULL,
            model TEXT NOT NULL,
            year INTEGER DEFAULT 2024,
            fuel TEXT DEFAULT 'Petrol',
            mileage INTEGER DEFAULT 0,
            color TEXT DEFAULT '',
            FOREIGN KEY(customer_id) REFERENCES customers(id)
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS mechanics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT DEFAULT '',
            specialization TEXT DEFAULT 'General Service',
            experience INTEGER DEFAULT 1,
            status TEXT DEFAULT 'Available'
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT DEFAULT 'General',
            price REAL DEFAULT 0,
            duration INTEGER DEFAULT 60
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            vehicle_id INTEGER NOT NULL,
            service_id INTEGER NOT NULL,
            mechanic_id INTEGER,
            appointment_date TEXT NOT NULL,
            appointment_time TEXT NOT NULL,
            status TEXT DEFAULT 'Scheduled',
            notes TEXT DEFAULT '',
            estimated_cost REAL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY(customer_id) REFERENCES customers(id),
            FOREIGN KEY(vehicle_id) REFERENCES vehicles(id),
            FOREIGN KEY(service_id) REFERENCES services(id),
            FOREIGN KEY(mechanic_id) REFERENCES mechanics(id)
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            appointment_id INTEGER NOT NULL,
            invoice_no TEXT UNIQUE NOT NULL,
            subtotal REAL DEFAULT 0,
            tax REAL DEFAULT 0,
            discount REAL DEFAULT 0,
            total REAL DEFAULT 0,
            payment_status TEXT DEFAULT 'Pending',
            payment_method TEXT DEFAULT 'Cash',
            created_at TEXT NOT NULL,
            FOREIGN KEY(appointment_id) REFERENCES appointments(id)
        )
    """)

    # Seed data only when tables are empty.
    if cur.execute("SELECT COUNT(*) FROM customers").fetchone()[0] == 0:
        now = datetime.now().isoformat(timespec="seconds")

        customers = [
            ("Rahul Sharma", "9876543210", "rahul@example.com", "Bengaluru"),
            ("Aisha Khan", "9988776655", "aisha@example.com", "Bengaluru"),
            ("Vikram Patil", "9123456789", "vikram@example.com", "Mysuru"),
            ("Priya Mehta", "9345678901", "priya@example.com", "Bengaluru"),
            ("Arjun Rao", "9012345678", "arjun@example.com", "Tumakuru"),
        ]
        cur.executemany(
            "INSERT INTO customers(name,phone,email,address,created_at) VALUES(?,?,?,?,?)",
            [(a,b,c,d,now) for a,b,c,d in customers]
        )

        cur.executemany("""
            INSERT INTO vehicles(customer_id,registration,make,model,year,fuel,mileage,color)
            VALUES(?,?,?,?,?,?,?,?)
        """, [
            (1, "KA01AB4521", "Hyundai", "Creta", 2022, "Diesel", 38500, "White"),
            (2, "KA05CD7821", "Honda", "City", 2021, "Petrol", 42100, "Black"),
            (3, "KA03EF9012", "Toyota", "Fortuner", 2023, "Diesel", 18200, "Silver"),
            (4, "KA41GH3210", "Tata", "Nexon", 2024, "Petrol", 9400, "Blue"),
            (5, "KA06JK5512", "Mahindra", "XUV700", 2022, "Diesel", 32700, "Red"),
        ])

        cur.executemany("""
            INSERT INTO mechanics(name,phone,specialization,experience,status)
            VALUES(?,?,?,?,?)
        """, [
            ("Arjun", "9000011111", "Engine & Diagnostics", 7, "Available"),
            ("Vikram", "9000022222", "Electrical Systems", 5, "Busy"),
            ("Ravi", "9000033333", "Brakes & Suspension", 8, "Available"),
            ("Suresh", "9000044444", "AC & Cooling", 6, "Available"),
        ])

        cur.executemany("""
            INSERT INTO services(name,category,price,duration)
            VALUES(?,?,?,?)
        """, [
            ("Full Car Service", "Maintenance", 4500, 180),
            ("Oil & Filter Change", "Maintenance", 2200, 60),
            ("Brake Inspection", "Safety", 1200, 60),
            ("Brake Pad Replacement", "Safety", 6800, 120),
            ("AC Service", "Comfort", 3500, 120),
            ("Engine Diagnostics", "Diagnostics", 2500, 90),
            ("Wheel Alignment", "Tyres", 900, 45),
            ("Battery Check", "Electrical", 500, 30),
        ])

        today = date.today()
        cur.executemany("""
            INSERT INTO appointments(
                customer_id,vehicle_id,service_id,mechanic_id,
                appointment_date,appointment_time,status,notes,estimated_cost,created_at
            ) VALUES(?,?,?,?,?,?,?,?,?,?)
        """, [
            (1,1,1,1,str(today),"10:00","In Progress","Engine inspection requested",4500,now),
            (2,2,2,2,str(today),"12:30","Completed","Routine oil change",2200,now),
            (3,3,4,3,str(today + timedelta(days=1)),"15:00","Scheduled","Check rear brakes",6800,now),
            (4,4,5,4,str(today + timedelta(days=2)),"16:30","Scheduled","AC cooling issue",3500,now),
            (5,5,6,1,str(today - timedelta(days=1)),"11:00","Completed","Diagnostic scan",2500,now),
        ])

        # A few invoices for dashboard revenue.
        cur.executemany("""
            INSERT INTO invoices(
                appointment_id,invoice_no,subtotal,tax,discount,total,
                payment_status,payment_method,created_at
            ) VALUES(?,?,?,?,?,?,?,?,?)
        """, [
            (2, "INV-1001", 2200, 396, 0, 2596, "Paid", "UPI", now),
            (5, "INV-1002", 2500, 450, 200, 2750, "Paid", "Card", now),
        ])

    conn.commit()
    conn.close()


init_db()


# ============================================================
# MODELS
# ============================================================

class CustomerIn(BaseModel):
    name: str
    phone: str
    email: str = ""
    address: str = ""


class VehicleIn(BaseModel):
    customer_id: int
    registration: str
    make: str
    model: str
    year: int = 2024
    fuel: str = "Petrol"
    mileage: int = 0
    color: str = ""


class AppointmentIn(BaseModel):
    customer_id: int
    vehicle_id: int
    service_id: int
    mechanic_id: Optional[int] = None
    appointment_date: str
    appointment_time: str
    notes: str = ""
    estimated_cost: float = 0


class StatusIn(BaseModel):
    status: str


# ============================================================
# API - DASHBOARD
# ============================================================

@app.get("/api/dashboard")
def dashboard():
    conn = db()
    cur = conn.cursor()

    total_services = cur.execute(
        "SELECT COUNT(*) FROM appointments"
    ).fetchone()[0]

    completed = cur.execute(
        "SELECT COUNT(*) FROM appointments WHERE status='Completed'"
    ).fetchone()[0]

    in_progress = cur.execute(
        "SELECT COUNT(*) FROM appointments WHERE status='In Progress'"
    ).fetchone()[0]

    scheduled = cur.execute(
        "SELECT COUNT(*) FROM appointments WHERE status='Scheduled'"
    ).fetchone()[0]

    customers = cur.execute(
        "SELECT COUNT(*) FROM customers"
    ).fetchone()[0]

    vehicles = cur.execute(
        "SELECT COUNT(*) FROM vehicles"
    ).fetchone()[0]

    revenue = cur.execute(
        "SELECT COALESCE(SUM(total),0) FROM invoices WHERE payment_status='Paid'"
    ).fetchone()[0]

    pending = cur.execute(
        "SELECT COALESCE(SUM(total),0) FROM invoices WHERE payment_status='Pending'"
    ).fetchone()[0]

    today = str(date.today())
    today_appointments = cur.execute("""
        SELECT
            a.id,a.appointment_time,a.status,a.estimated_cost,
            c.name customer,v.registration,v.make,v.model,
            s.name service,m.name mechanic
        FROM appointments a
        JOIN customers c ON c.id=a.customer_id
        JOIN vehicles v ON v.id=a.vehicle_id
        JOIN services s ON s.id=a.service_id
        LEFT JOIN mechanics m ON m.id=a.mechanic_id
        WHERE a.appointment_date=?
        ORDER BY a.appointment_time
    """, (today,)).fetchall()

    recent = cur.execute("""
        SELECT
            a.id,a.appointment_date,a.appointment_time,a.status,
            a.estimated_cost,c.name customer,
            v.registration,v.make,v.model,
            s.name service,m.name mechanic
        FROM appointments a
        JOIN customers c ON c.id=a.customer_id
        JOIN vehicles v ON v.id=a.vehicle_id
        JOIN services s ON s.id=a.service_id
        LEFT JOIN mechanics m ON m.id=a.mechanic_id
        ORDER BY a.id DESC LIMIT 8
    """).fetchall()

    # Last 7 days service count.
    chart = []
    for i in range(6, -1, -1):
        d = date.today() - timedelta(days=i)
        count = cur.execute(
            "SELECT COUNT(*) FROM appointments WHERE appointment_date=?",
            (str(d),)
        ).fetchone()[0]
        chart.append({"date": d.strftime("%a"), "count": count})

    conn.close()

    return {
        "stats": {
            "total_services": total_services,
            "completed": completed,
            "in_progress": in_progress,
            "scheduled": scheduled,
            "customers": customers,
            "vehicles": vehicles,
            "revenue": revenue,
            "pending": pending,
        },
        "today": [dict(x) for x in today_appointments],
        "recent": [dict(x) for x in recent],
        "chart": chart,
    }


# ============================================================
# API - CUSTOMERS
# ============================================================

@app.get("/api/customers")
def customers():
    conn = db()
    rows = conn.execute("""
        SELECT c.*,
        (SELECT COUNT(*) FROM vehicles v WHERE v.customer_id=c.id) vehicle_count
        FROM customers c
        ORDER BY c.id DESC
    """).fetchall()
    conn.close()
    return [dict(x) for x in rows]


@app.post("/api/customers")
def create_customer(data: CustomerIn):
    conn = db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO customers(name,phone,email,address,created_at)
        VALUES(?,?,?,?,?)
    """, (
        data.name, data.phone, data.email, data.address,
        datetime.now().isoformat(timespec="seconds")
    ))
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return {"success": True, "id": new_id}


# ============================================================
# API - VEHICLES
# ============================================================

@app.get("/api/vehicles")
def vehicles():
    conn = db()
    rows = conn.execute("""
        SELECT v.*,c.name customer,c.phone
        FROM vehicles v
        JOIN customers c ON c.id=v.customer_id
        ORDER BY v.id DESC
    """).fetchall()
    conn.close()
    return [dict(x) for x in rows]


@app.post("/api/vehicles")
def create_vehicle(data: VehicleIn):
    conn = db()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO vehicles(
                customer_id,registration,make,model,year,fuel,mileage,color
            ) VALUES(?,?,?,?,?,?,?,?)
        """, (
            data.customer_id, data.registration.upper(),
            data.make, data.model, data.year, data.fuel,
            data.mileage, data.color
        ))
        conn.commit()
        new_id = cur.lastrowid
        return {"success": True, "id": new_id}
    except sqlite3.IntegrityError:
        raise HTTPException(400, "Registration number already exists")
    finally:
        conn.close()


# ============================================================
# API - MECHANICS & SERVICES
# ============================================================

@app.get("/api/mechanics")
def mechanics():
    conn = db()
    rows = conn.execute(
        "SELECT * FROM mechanics ORDER BY name"
    ).fetchall()
    conn.close()
    return [dict(x) for x in rows]


@app.get("/api/services")
def services():
    conn = db()
    rows = conn.execute(
        "SELECT * FROM services ORDER BY category,name"
    ).fetchall()
    conn.close()
    return [dict(x) for x in rows]


# ============================================================
# API - APPOINTMENTS
# ============================================================

@app.get("/api/appointments")
def appointments():
    conn = db()
    rows = conn.execute("""
        SELECT
            a.*,
            c.name customer,c.phone,
            v.registration,v.make,v.model,
            s.name service,s.price service_price,
            m.name mechanic
        FROM appointments a
        JOIN customers c ON c.id=a.customer_id
        JOIN vehicles v ON v.id=a.vehicle_id
        JOIN services s ON s.id=a.service_id
        LEFT JOIN mechanics m ON m.id=a.mechanic_id
        ORDER BY a.appointment_date DESC,a.appointment_time DESC
    """).fetchall()
    conn.close()
    return [dict(x) for x in rows]


@app.post("/api/appointments")
def create_appointment(data: AppointmentIn):
    conn = db()
    cur = conn.cursor()

    # Prevent obvious double-booking for the same mechanic/time.
    if data.mechanic_id:
        existing = cur.execute("""
            SELECT id FROM appointments
            WHERE mechanic_id=? AND appointment_date=?
            AND appointment_time=? AND status NOT IN ('Cancelled','Completed')
        """, (
            data.mechanic_id,
            data.appointment_date,
            data.appointment_time
        )).fetchone()

        if existing:
            conn.close()
            raise HTTPException(
                409,
                "Selected mechanic is already booked at this time."
            )

    service = cur.execute(
        "SELECT price FROM services WHERE id=?",
        (data.service_id,)
    ).fetchone()

    if not service:
        conn.close()
        raise HTTPException(404, "Service not found")

    cost = data.estimated_cost or service["price"]

    cur.execute("""
        INSERT INTO appointments(
            customer_id,vehicle_id,service_id,mechanic_id,
            appointment_date,appointment_time,status,notes,
            estimated_cost,created_at
        ) VALUES(?,?,?,?,?,?,?,?,?,?)
    """, (
        data.customer_id,data.vehicle_id,data.service_id,data.mechanic_id,
        data.appointment_date,data.appointment_time,"Scheduled",
        data.notes,cost,datetime.now().isoformat(timespec="seconds")
    ))

    conn.commit()
    new_id = cur.lastrowid
    conn.close()

    return {"success": True, "id": new_id}


@app.patch("/api/appointments/{appointment_id}/status")
def update_status(appointment_id: int, data: StatusIn):
    allowed = {
        "Scheduled",
        "In Progress",
        "Completed",
        "Cancelled",
        "Ready for Pickup"
    }

    if data.status not in allowed:
        raise HTTPException(400, "Invalid status")

    conn = db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE appointments SET status=? WHERE id=?",
        (data.status, appointment_id)
    )
    conn.commit()

    if cur.rowcount == 0:
        conn.close()
        raise HTTPException(404, "Appointment not found")

    conn.close()
    return {"success": True}


# ============================================================
# API - INVOICES
# ============================================================

@app.get("/api/invoices")
def invoices():
    conn = db()
    rows = conn.execute("""
        SELECT
            i.*,
            c.name customer,
            v.registration,
            s.name service
        FROM invoices i
        JOIN appointments a ON a.id=i.appointment_id
        JOIN customers c ON c.id=a.customer_id
        JOIN vehicles v ON v.id=a.vehicle_id
        JOIN services s ON s.id=a.service_id
        ORDER BY i.id DESC
    """).fetchall()
    conn.close()
    return [dict(x) for x in rows]


# ============================================================
# FRONTEND
# ============================================================

HTML = r"""
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AutoPro Service Hub</title>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<style>
:root{
    --orange:#ff5a1f;
    --orange2:#ff7b42;
    --black:#101318;
    --black2:#171b22;
    --bg:#f5f7fb;
    --card:#ffffff;
    --text:#202631;
    --muted:#7c8492;
    --line:#e7eaf0;
    --green:#16a34a;
    --greenbg:#e9f8ef;
    --blue:#2563eb;
    --bluebg:#eaf2ff;
    --yellow:#d97706;
    --yellowbg:#fff5df;
    --red:#dc2626;
    --redbg:#feecec;
    --shadow:0 10px 30px rgba(16,19,24,.06);
}
*{box-sizing:border-box;margin:0;padding:0}
body{
    font-family:Inter,Arial,sans-serif;
    background:var(--bg);
    color:var(--text);
}
button,input,select,textarea{font:inherit}
button{cursor:pointer}
.app{min-height:100vh;display:flex}

/* SIDEBAR */
.sidebar{
    width:250px;
    position:fixed;
    left:0;top:0;bottom:0;
    background:linear-gradient(180deg,#0e1116,#191e26);
    color:#fff;
    padding:20px 14px;
    z-index:50;
}
.brand{
    display:flex;align-items:center;gap:11px;
    padding:7px 10px 28px;
}
.brand-icon{
    width:43px;height:43px;border-radius:13px;
    background:linear-gradient(135deg,var(--orange),#ff3d00);
    display:grid;place-items:center;font-size:22px;
    box-shadow:0 8px 20px rgba(255,90,31,.25)
}
.brand strong{font-size:18px;letter-spacing:-.5px}
.brand span{color:var(--orange)}
.menu-label{
    font-size:10px;font-weight:800;color:#69717e;
    letter-spacing:1.1px;padding:11px 11px 7px;
}
.nav{
    display:flex;align-items:center;gap:12px;
    padding:12px 12px;margin:4px 0;border-radius:10px;
    color:#aeb5c1;font-size:12px;font-weight:600;
    transition:.2s;
}
.nav:hover{background:#ffffff0d;color:#fff}
.nav.active{
    background:linear-gradient(135deg,var(--orange),#f0440c);
    color:#fff;box-shadow:0 8px 20px rgba(255,90,31,.18)
}
.nav .ico{width:22px;text-align:center;font-size:16px}
.sidebar-foot{
    position:absolute;left:14px;right:14px;bottom:18px;
    border-top:1px solid #ffffff10;padding-top:15px
}
.user{
    display:flex;gap:10px;align-items:center;
    padding:9px;background:#ffffff09;border-radius:12px
}
.avatar{
    width:36px;height:36px;border-radius:10px;
    display:grid;place-items:center;background:#ff6933;
    font-size:11px;font-weight:800
}
.user b{display:block;font-size:11px}
.user small{color:#7e8794;font-size:9px}

/* MAIN */
.main{margin-left:250px;width:calc(100% - 250px)}
.topbar{
    height:72px;background:#fff;border-bottom:1px solid var(--line);
    display:flex;align-items:center;justify-content:space-between;
    padding:0 28px;position:sticky;top:0;z-index:30
}
.top-title h1{font-size:19px;font-weight:800}
.top-title p{font-size:10px;color:var(--muted);margin-top:4px}
.top-right{display:flex;align-items:center;gap:10px}
.search{
    width:260px;height:38px;border:1px solid var(--line);
    border-radius:9px;padding:0 13px;outline:none;font-size:11px
}
.search:focus{border-color:var(--orange)}
.icon-btn{
    width:38px;height:38px;border:1px solid var(--line);
    background:#fff;border-radius:9px;position:relative
}
.dot{
    position:absolute;right:7px;top:7px;width:7px;height:7px;
    background:var(--orange);border-radius:50%
}
.content{padding:27px}

/* HERO */
.hero{
    border-radius:18px;padding:25px 28px;color:#fff;
    background:
      radial-gradient(circle at 85% 30%,#ff6b3a33,transparent 26%),
      linear-gradient(120deg,#151920,#252c36);
    display:flex;align-items:center;justify-content:space-between;
    overflow:hidden;position:relative;margin-bottom:21px
}
.hero:after{
    content:"🚘";position:absolute;right:90px;top:-38px;
    font-size:150px;opacity:.07;transform:rotate(-6deg)
}
.hero h2{font-size:23px;margin-bottom:6px}
.hero p{font-size:11px;color:#aeb5c0}
.btn{
    border:0;border-radius:9px;padding:11px 15px;
    font-size:11px;font-weight:800
}
.btn-primary{
    color:#fff;background:var(--orange);
    box-shadow:0 7px 18px #ff5a1f30
}
.btn-primary:hover{background:#ed4811}
.btn-light{background:#fff;border:1px solid var(--line);color:var(--text)}
.btn-danger{background:var(--redbg);color:var(--red)}
.btn-green{background:var(--greenbg);color:var(--green)}

/* STATS */
.stats{
    display:grid;grid-template-columns:repeat(4,1fr);
    gap:15px;margin-bottom:20px
}
.stat{
    background:#fff;border:1px solid var(--line);
    border-radius:14px;padding:17px;box-shadow:var(--shadow);
    transition:.2s
}
.stat:hover{transform:translateY(-2px)}
.stat-head{display:flex;justify-content:space-between;align-items:center}
.stat-icon{
    width:40px;height:40px;border-radius:11px;display:grid;place-items:center;font-size:17px
}
.si-orange{background:#fff0e9}.si-green{background:var(--greenbg)}
.si-blue{background:var(--bluebg)}.si-yellow{background:var(--yellowbg)}
.stat h3{font-size:25px;margin-top:14px}
.stat p{font-size:10px;color:var(--muted);margin-top:3px}
.trend{font-size:9px;color:var(--green);font-weight:800}

/* CARDS */
.grid2{display:grid;grid-template-columns:1.65fr 1fr;gap:18px;margin-bottom:20px}
.card{
    background:#fff;border:1px solid var(--line);border-radius:14px;
    padding:18px;box-shadow:var(--shadow)
}
.card-title{
    display:flex;align-items:center;justify-content:space-between;
    margin-bottom:16px
}
.card-title h3{font-size:13px}
.card-title span{font-size:10px;color:var(--orange);font-weight:800}
.chart-box{height:245px}

/* APPOINTMENTS */
.appt{display:flex;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid var(--line)}
.appt:last-child{border:0}
.car{
    width:39px;height:39px;border-radius:10px;background:#f2f4f7;
    display:grid;place-items:center;font-size:18px
}
.appt-info{flex:1}.appt-info b{font-size:11px;display:block}
.appt-info small{font-size:9px;color:var(--muted)}
.appt-time{text-align:right}.appt-time b{font-size:10px;display:block}
.appt-time small{font-size:9px;color:var(--muted)}

/* TABLE */
.table-card{
    background:#fff;border:1px solid var(--line);border-radius:14px;
    overflow:hidden;box-shadow:var(--shadow)
}
.table-top{
    padding:18px;display:flex;justify-content:space-between;align-items:center
}
.table-top h3{font-size:13px}
.filter{
    border:1px solid var(--line);height:34px;border-radius:8px;
    padding:0 10px;font-size:10px;background:#fff
}
.table-wrap{overflow:auto}
table{width:100%;border-collapse:collapse;min-width:820px}
th{
    text-align:left;background:#fafbfc;color:#7c8492;
    font-size:9px;text-transform:uppercase;letter-spacing:.5px;padding:12px 18px
}
td{padding:13px 18px;border-top:1px solid var(--line);font-size:10px}
.person{display:flex;align-items:center;gap:8px}
.person-avatar{
    width:30px;height:30px;border-radius:8px;background:#f0f2f6;
    display:grid;place-items:center;font-size:9px;font-weight:800
}
.person b{display:block}.person small{color:var(--muted);font-size:8px}
.badge{
    display:inline-block;padding:5px 8px;border-radius:20px;
    font-size:8px;font-weight:800
}
.b-green{background:var(--greenbg);color:var(--green)}
.b-blue{background:var(--bluebg);color:var(--blue)}
.b-yellow{background:var(--yellowbg);color:var(--yellow)}
.b-red{background:var(--redbg);color:var(--red)}
.actions{display:flex;gap:5px}
.mini{
    border:1px solid var(--line);background:#fff;border-radius:6px;
    padding:5px 7px;font-size:9px
}

/* PAGES */
.page{display:none}
.page.active{display:block}
.page-head{
    display:flex;justify-content:space-between;align-items:center;
    margin-bottom:18px
}
.page-head h2{font-size:20px}
.page-head p{font-size:10px;color:var(--muted);margin-top:4px}
.cards3{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}
.info-card{
    background:#fff;border:1px solid var(--line);border-radius:13px;
    padding:17px;box-shadow:var(--shadow)
}
.info-card h4{font-size:12px;margin-bottom:8px}
.info-card p{font-size:10px;color:var(--muted);line-height:1.7}
.vehicle-card{
    background:#fff;border:1px solid var(--line);border-radius:14px;
    padding:17px;box-shadow:var(--shadow);position:relative
}
.vehicle-top{display:flex;justify-content:space-between}
.vehicle-art{
    width:47px;height:47px;background:#fff0e9;border-radius:13px;
    display:grid;place-items:center;font-size:23px
}
.vehicle-card h3{font-size:14px;margin-top:14px}
.vehicle-card .reg{font-size:10px;color:var(--orange);font-weight:800;margin-top:4px}
.vehicle-meta{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:15px}
.vehicle-meta div{background:#f7f8fa;padding:8px;border-radius:8px}
.vehicle-meta span{display:block;color:var(--muted);font-size:8px}
.vehicle-meta b{font-size:9px}

/* MODAL */
.modal{
    position:fixed;inset:0;background:#0008;display:none;
    align-items:center;justify-content:center;z-index:1000;padding:20px
}
.modal.show{display:flex}
.modal-box{
    width:610px;max-width:100%;background:#fff;border-radius:17px;
    padding:22px;box-shadow:0 25px 70px #0003
}
.modal-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}
.modal-head h3{font-size:15px}
.close{
    width:31px;height:31px;border:0;background:#f1f3f5;border-radius:8px
}
.form{display:grid;grid-template-columns:1fr 1fr;gap:13px}
.group{display:flex;flex-direction:column;gap:6px}
.group.full{grid-column:1/-1}
.group label{font-size:9px;font-weight:800}
.group input,.group select,.group textarea{
    border:1px solid var(--line);border-radius:8px;height:39px;
    padding:0 10px;font-size:10px;outline:none;background:#fff
}
.group textarea{height:75px;padding-top:10px;resize:vertical}
.group input:focus,.group select:focus,.group textarea:focus{border-color:var(--orange)}
.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:19px}

/* TOAST */
.toast{
    position:fixed;right:24px;bottom:24px;background:#161a21;color:#fff;
    padding:12px 16px;border-radius:10px;font-size:10px;display:none;
    z-index:2000;box-shadow:0 15px 40px #0003
}
.toast.show{display:block;animation:toast .25s ease}
@keyframes toast{from{transform:translateY(8px);opacity:0}to{transform:none;opacity:1}}

/* MOBILE */
@media(max-width:1050px){
    .stats{grid-template-columns:repeat(2,1fr)}
    .grid2{grid-template-columns:1fr}
    .cards3{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:720px){
    .sidebar{width:68px;padding:14px 7px}
    .brand{justify-content:center;padding-bottom:22px}
    .brand strong,.menu-label,.nav span,.user div:not(.avatar){display:none}
    .nav{justify-content:center;padding:12px 5px}
    .user{justify-content:center}
    .main{margin-left:68px;width:calc(100% - 68px)}
    .topbar{padding:0 15px}
    .search{display:none}
    .content{padding:15px}
    .stats{grid-template-columns:1fr}
    .hero{align-items:flex-start;flex-direction:column;gap:16px}
    .cards3{grid-template-columns:1fr}
    .form{grid-template-columns:1fr}
    .group.full{grid-column:auto}
}
</style>
</head>

<body>
<div class="app">

<aside class="sidebar">
    <div class="brand">
        <div class="brand-icon">🔧</div>
        <strong>Auto<span>Pro</span></strong>
    </div>

    <div class="menu-label">WORKSPACE</div>

    <div class="nav active" onclick="showPage('dashboard',this)">
        <div class="ico">▦</div><span>Dashboard</span>
    </div>
    <div class="nav" onclick="showPage('appointments',this)">
        <div class="ico">📅</div><span>Appointments</span>
    </div>
    <div class="nav" onclick="showPage('vehicles',this)">
        <div class="ico">🚗</div><span>Vehicles</span>
    </div>
    <div class="nav" onclick="showPage('customers',this)">
        <div class="ico">👥</div><span>Customers</span>
    </div>
    <div class="nav" onclick="showPage('mechanics',this)">
        <div class="ico">👨‍🔧</div><span>Mechanics</span>
    </div>

    <div class="menu-label">FINANCE</div>

    <div class="nav" onclick="showPage('invoices',this)">
        <div class="ico">🧾</div><span>Invoices</span>
    </div>
    <div class="nav" onclick="showPage('services',this)">
        <div class="ico">🛠️</div><span>Service Catalog</span>
    </div>

    <div class="menu-label">SYSTEM</div>

    <div class="nav" onclick="showPage('reports',this)">
        <div class="ico">📊</div><span>Reports</span>
    </div>
    <div class="nav" onclick="showPage('settings',this)">
        <div class="ico">⚙️</div><span>Settings</span>
    </div>

    <div class="sidebar-foot">
        <div class="user">
            <div class="avatar">AD</div>
            <div>
                <b>Service Admin</b>
                <small>Workshop Manager</small>
            </div>
        </div>
    </div>
</aside>

<main class="main">
<header class="topbar">
    <div class="top-title">
        <h1 id="pageTitle">Dashboard</h1>
        <p id="pageSubtitle">Service center overview</p>
    </div>
    <div class="top-right">
        <input class="search" id="globalSearch" placeholder="Search customers, vehicles..." oninput="globalSearch()">
        <button class="icon-btn" onclick="loadDashboard()">↻</button>
        <button class="icon-btn">🔔<i class="dot"></i></button>
    </div>
</header>

<section class="content">

<!-- DASHBOARD -->
<div class="page active" id="page-dashboard">
    <div class="hero">
        <div>
            <h2>Good afternoon, Admin 👋</h2>
            <p>Manage your workshop, customers and vehicle services from one place.</p>
        </div>
        <button class="btn btn-primary" onclick="openAppointment()">+ New Appointment</button>
    </div>

    <div class="stats">
        <div class="stat">
            <div class="stat-head">
                <div class="stat-icon si-orange">🔧</div><span class="trend">+12.5%</span>
            </div>
            <h3 id="sTotal">0</h3><p>Total Services</p>
        </div>
        <div class="stat">
            <div class="stat-head">
                <div class="stat-icon si-green">✓</div><span class="trend">+8.2%</span>
            </div>
            <h3 id="sCompleted">0</h3><p>Completed</p>
        </div>
        <div class="stat">
            <div class="stat-head">
                <div class="stat-icon si-blue">⏱</div><span class="trend">Live</span>
            </div>
            <h3 id="sProgress">0</h3><p>In Progress</p>
        </div>
        <div class="stat">
            <div class="stat-head">
                <div class="stat-icon si-yellow">₹</div><span class="trend">+15.8%</span>
            </div>
            <h3 id="sRevenue">₹0</h3><p>Paid Revenue</p>
        </div>
    </div>

    <div class="grid2">
        <div class="card">
            <div class="card-title">
                <h3>Service Activity</h3><span>LAST 7 DAYS</span>
            </div>
            <div class="chart-box"><canvas id="serviceChart"></canvas></div>
        </div>

        <div class="card">
            <div class="card-title">
                <h3>Today's Schedule</h3><span id="todayCount">0 APPOINTMENTS</span>
            </div>
            <div id="todayList"></div>
        </div>
    </div>

    <div class="table-card">
        <div class="table-top">
            <h3>Recent Service Activity</h3>
            <button class="btn btn-primary" onclick="openAppointment()">+ Add Service</button>
        </div>
        <div class="table-wrap">
            <table>
                <thead><tr>
                    <th>Customer</th><th>Vehicle</th><th>Service</th>
                    <th>Mechanic</th><th>Date</th><th>Status</th><th>Amount</th>
                </tr></thead>
                <tbody id="recentTable"></tbody>
            </table>
        </div>
    </div>
</div>

<!-- APPOINTMENTS -->
<div class="page" id="page-appointments">
    <div class="page-head">
        <div><h2>Appointments</h2><p>Schedule and manage workshop jobs.</p></div>
        <button class="btn btn-primary" onclick="openAppointment()">+ New Appointment</button>
    </div>
    <div class="table-card">
        <div class="table-top">
            <h3>All Appointments</h3>
            <select class="filter" onchange="filterAppointments(this.value)">
                <option value="">All Status</option>
                <option>Scheduled</option>
                <option>In Progress</option>
                <option>Ready for Pickup</option>
                <option>Completed</option>
                <option>Cancelled</option>
            </select>
        </div>
        <div class="table-wrap">
            <table>
                <thead><tr>
                    <th>Customer</th><th>Vehicle</th><th>Service</th>
                    <th>Date & Time</th><th>Mechanic</th><th>Status</th><th>Action</th>
                </tr></thead>
                <tbody id="appointmentTable"></tbody>
            </table>
        </div>
    </div>
</div>

<!-- VEHICLES -->
<div class="page" id="page-vehicles">
    <div class="page-head">
        <div><h2>Vehicle Garage</h2><p>Customer vehicles and service information.</p></div>
        <button class="btn btn-primary" onclick="openVehicle()">+ Add Vehicle</button>
    </div>
    <div class="cards3" id="vehicleCards"></div>
</div>

<!-- CUSTOMERS -->
<div class="page" id="page-customers">
    <div class="page-head">
        <div><h2>Customers</h2><p>Manage customer profiles and registered vehicles.</p></div>
        <button class="btn btn-primary" onclick="openCustomer()">+ Add Customer</button>
    </div>
    <div class="table-card">
        <div class="table-top"><h3>Customer Directory</h3></div>
        <div class="table-wrap">
            <table>
                <thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th>Location</th><th>Vehicles</th></tr></thead>
                <tbody id="customerTable"></tbody>
            </table>
        </div>
    </div>
</div>

<!-- MECHANICS -->
<div class="page" id="page-mechanics">
    <div class="page-head">
        <div><h2>Mechanics</h2><p>Workshop team, skills and availability.</p></div>
    </div>
    <div class="cards3" id="mechanicCards"></div>
</div>

<!-- INVOICES -->
<div class="page" id="page-invoices">
    <div class="page-head">
        <div><h2>Invoices & Payments</h2><p>Track billing and payment status.</p></div>
    </div>
    <div class="stats">
        <div class="stat"><div class="stat-icon si-green">✓</div><h3 id="paidInvoices">₹0</h3><p>Paid</p></div>
        <div class="stat"><div class="stat-icon si-yellow">⌛</div><h3 id="pendingInvoices">₹0</h3><p>Pending</p></div>
        <div class="stat"><div class="stat-icon si-blue">🧾</div><h3 id="invoiceCount">0</h3><p>Total Invoices</p></div>
        <div class="stat"><div class="stat-icon si-orange">%</div><h3>18%</h3><p>GST Rate</p></div>
    </div>
    <div class="table-card">
        <div class="table-top"><h3>Invoice Register</h3></div>
        <div class="table-wrap">
            <table>
                <thead><tr><th>Invoice</th><th>Customer</th><th>Vehicle</th><th>Service</th><th>Total</th><th>Status</th><th>Method</th></tr></thead>
                <tbody id="invoiceTable"></tbody>
            </table>
        </div>
    </div>
</div>

<!-- SERVICES -->
<div class="page" id="page-services">
    <div class="page-head">
        <div><h2>Service Catalog</h2><p>Workshop services, pricing and estimated duration.</p></div>
    </div>
    <div class="cards3" id="serviceCards"></div>
</div>

<!-- REPORTS -->
<div class="page" id="page-reports">
    <div class="page-head">
        <div><h2>Workshop Reports</h2><p>Quick business intelligence from your service data.</p></div>
    </div>
    <div class="cards3">
        <div class="info-card"><h4>📈 Service Growth</h4><p>Monitor completed jobs, active jobs and scheduled appointments to understand workshop workload.</p></div>
        <div class="info-card"><h4>💰 Revenue Tracking</h4><p>Paid invoice totals provide a simple view of realized workshop revenue.</p></div>
        <div class="info-card"><h4>👨‍🔧 Team Utilization</h4><p>Mechanic assignments and appointment conflicts are checked automatically during booking.</p></div>
        <div class="info-card"><h4>🚗 Customer Retention</h4><p>Vehicle records keep registration, mileage, fuel type and customer information together.</p></div>
        <div class="info-card"><h4>🛡️ Service Quality</h4><p>Use status transitions from Scheduled to In Progress, Ready for Pickup and Completed.</p></div>
        <div class="info-card"><h4>📋 Digital Job Flow</h4><p>Appointments, services, mechanics and invoices are connected through a relational SQLite database.</p></div>
    </div>
</div>

<!-- SETTINGS -->
<div class="page" id="page-settings">
    <div class="page-head">
        <div><h2>Settings</h2><p>Application configuration and workshop preferences.</p></div>
    </div>
    <div class="cards3">
        <div class="info-card"><h4>🏢 Workshop</h4><p><b>AutoPro Service Hub</b><br>Professional automobile service management system.</p></div>
        <div class="info-card"><h4>🗄️ Database</h4><p>SQLite database stored locally as <b>autopro.db</b>. Data remains available after restarting the server.</p></div>
        <div class="info-card"><h4>🔐 Access</h4><p>This demo is configured as an admin dashboard. Authentication can be added when deploying publicly.</p></div>
    </div>
</div>

</section>
</main>
</div>

<!-- APPOINTMENT MODAL -->
<div class="modal" id="appointmentModal">
<div class="modal-box">
    <div class="modal-head"><h3>New Service Appointment</h3><button class="close" onclick="closeModal('appointmentModal')">✕</button></div>
    <form class="form" id="appointmentForm" onsubmit="createAppointment(event)">
        <div class="group"><label>CUSTOMER</label><select id="aCustomer" required onchange="loadCustomerVehicles()"></select></div>
        <div class="group"><label>VEHICLE</label><select id="aVehicle" required></select></div>
        <div class="group"><label>SERVICE</label><select id="aService" required onchange="setServiceCost()"></select></div>
        <div class="group"><label>MECHANIC</label><select id="aMechanic"></select></div>
        <div class="group"><label>DATE</label><input id="aDate" type="date" required></div>
        <div class="group"><label>TIME</label><input id="aTime" type="time" required></div>
        <div class="group"><label>ESTIMATED COST (₹)</label><input id="aCost" type="number" min="0"></div>
        <div class="group full"><label>NOTES</label><textarea id="aNotes" placeholder="Customer concern, requested checks, additional instructions..."></textarea></div>
        <div class="modal-actions">
            <button type="button" class="btn btn-light" onclick="closeModal('appointmentModal')">Cancel</button>
            <button class="btn btn-primary">Create Appointment</button>
        </div>
    </form>
</div>
</div>

<!-- CUSTOMER MODAL -->
<div class="modal" id="customerModal">
<div class="modal-box">
    <div class="modal-head"><h3>Add Customer</h3><button class="close" onclick="closeModal('customerModal')">✕</button></div>
    <form class="form" onsubmit="createCustomer(event)">
        <div class="group"><label>FULL NAME</label><input id="cName" required></div>
        <div class="group"><label>PHONE</label><input id="cPhone" required></div>
        <div class="group"><label>EMAIL</label><input id="cEmail" type="email"></div>
        <div class="group"><label>LOCATION</label><input id="cAddress"></div>
        <div class="modal-actions" style="grid-column:1/-1">
            <button type="button" class="btn btn-light" onclick="closeModal('customerModal')">Cancel</button>
            <button class="btn btn-primary">Save Customer</button>
        </div>
    </form>
</div>
</div>

<!-- VEHICLE MODAL -->
<div class="modal" id="vehicleModal">
<div class="modal-box">
    <div class="modal-head"><h3>Register Vehicle</h3><button class="close" onclick="closeModal('vehicleModal')">✕</button></div>
    <form class="form" onsubmit="createVehicle(event)">
        <div class="group"><label>CUSTOMER</label><select id="vCustomer" required></select></div>
        <div class="group"><label>REGISTRATION</label><input id="vReg" placeholder="KA01AB1234" required></div>
        <div class="group"><label>MAKE</label><input id="vMake" placeholder="Hyundai" required></div>
        <div class="group"><label>MODEL</label><input id="vModel" placeholder="Creta" required></div>
        <div class="group"><label>YEAR</label><input id="vYear" type="number" value="2024"></div>
        <div class="group"><label>FUEL</label><select id="vFuel"><option>Petrol</option><option>Diesel</option><option>CNG</option><option>Electric</option><option>Hybrid</option></select></div>
        <div class="group"><label>MILEAGE (KM)</label><input id="vMileage" type="number" value="0"></div>
        <div class="group"><label>COLOR</label><input id="vColor"></div>
        <div class="modal-actions" style="grid-column:1/-1">
            <button type="button" class="btn btn-light" onclick="closeModal('vehicleModal')">Cancel</button>
            <button class="btn btn-primary">Register Vehicle</button>
        </div>
    </form>
</div>
</div>

<div class="toast" id="toast"></div>

<script>
let dashboardData = {};
let allAppointments = [];
let allCustomers = [];
let allVehicles = [];
let allServices = [];
let chart = null;

const $ = id => document.getElementById(id);
const money = n => "₹" + Number(n || 0).toLocaleString("en-IN");
const initials = name => (name || "").split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();

function toast(msg){
    $("toast").innerText = msg;
    $("toast").classList.add("show");
    setTimeout(()=>$("toast").classList.remove("show"),3000);
}

function showPage(page, el){
    document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
    $("page-"+page).classList.add("active");
    document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));
    if(el) el.classList.add("active");

    const names = {
        dashboard:["Dashboard","Service center overview"],
        appointments:["Appointments","Schedule and manage workshop jobs"],
        vehicles:["Vehicle Garage","Customer vehicles and service information"],
        customers:["Customers","Customer relationship management"],
        mechanics:["Mechanics","Workshop team and availability"],
        invoices:["Invoices & Payments","Billing and payment tracking"],
        services:["Service Catalog","Workshop services and pricing"],
        reports:["Reports","Workshop performance insights"],
        settings:["Settings","System configuration"]
    };
    $("pageTitle").innerText = names[page][0];
    $("pageSubtitle").innerText = names[page][1];

    if(page==="appointments") loadAppointments();
    if(page==="vehicles") loadVehicles();
    if(page==="customers") loadCustomers();
    if(page==="mechanics") loadMechanics();
    if(page==="invoices") loadInvoices();
    if(page==="services") loadServices();
}

async function loadDashboard(){
    const r = await fetch("/api/dashboard");
    dashboardData = await r.json();
    const s = dashboardData.stats;

    $("sTotal").innerText = s.total_services;
    $("sCompleted").innerText = s.completed;
    $("sProgress").innerText = s.in_progress;
    $("sRevenue").innerText = money(s.revenue);

    $("todayCount").innerText = dashboardData.today.length + " APPOINTMENTS";

    $("todayList").innerHTML = dashboardData.today.length
      ? dashboardData.today.map(a => `
        <div class="appt">
            <div class="car">🚗</div>
            <div class="appt-info">
                <b>${a.customer}</b>
                <small>${a.make} ${a.model} · ${a.service}</small>
            </div>
            <div class="appt-time">
                <b>${a.appointment_time}</b>
                <small>${a.status}</small>
            </div>
        </div>`).join("")
      : `<div style="color:#7c8492;font-size:10px;padding:20px 0">No appointments today.</div>`;

    $("recentTable").innerHTML = dashboardData.recent.map(a => `
        <tr>
            <td><div class="person"><div class="person-avatar">${initials(a.customer)}</div><div><b>${a.customer}</b><small>${a.make} ${a.model}</small></div></div></td>
            <td>${a.registration}</td>
            <td>${a.service}</td>
            <td>${a.mechanic || "Unassigned"}</td>
            <td>${a.appointment_date}</td>
            <td>${badge(a.status)}</td>
            <td><b>${money(a.estimated_cost)}</b></td>
        </tr>`).join("");

    drawChart();
}

function drawChart(){
    const ctx = $("serviceChart").getContext("2d");
    if(chart) chart.destroy();
    chart = new Chart(ctx,{
        type:"line",
        data:{
            labels:dashboardData.chart.map(x=>x.date),
            datasets:[{
                data:dashboardData.chart.map(x=>x.count),
                borderColor:"#ff5a1f",
                backgroundColor:"rgba(255,90,31,.08)",
                fill:true,tension:.4,borderWidth:3,
                pointRadius:4,pointBackgroundColor:"#ff5a1f"
            }]
        },
        options:{
            responsive:true,maintainAspectRatio:false,
            plugins:{legend:{display:false}},
            scales:{
                y:{beginAtZero:true,grid:{color:"#eef0f4"},ticks:{font:{size:9}}},
                x:{grid:{display:false},ticks:{font:{size:9}}}
            }
        }
    });
}

function badge(status){
    const cls = {
        "Completed":"b-green",
        "Scheduled":"b-blue",
        "In Progress":"b-yellow",
        "Ready for Pickup":"b-green",
        "Cancelled":"b-red"
    }[status] || "b-blue";
    return `<span class="badge ${cls}">${status}</span>`;
}

async function loadAppointments(){
    allAppointments = await (await fetch("/api/appointments")).json();
    renderAppointments(allAppointments);
}
function renderAppointments(data){
    $("appointmentTable").innerHTML = data.map(a=>`
        <tr>
            <td><div class="person"><div class="person-avatar">${initials(a.customer)}</div><div><b>${a.customer}</b><small>${a.phone}</small></div></div></td>
            <td><b>${a.make} ${a.model}</b><br><small style="color:#7c8492">${a.registration}</small></td>
            <td>${a.service}</td>
            <td><b>${a.appointment_date}</b><br><small>${a.appointment_time}</small></td>
            <td>${a.mechanic || "Unassigned"}</td>
            <td>${badge(a.status)}</td>
            <td>
                <select class="filter" onchange="changeStatus(${a.id},this.value)">
                    <option value="">Update</option>
                    <option>Scheduled</option>
                    <option>In Progress</option>
                    <option>Ready for Pickup</option>
                    <option>Completed</option>
                    <option>Cancelled</option>
                </select>
            </td>
        </tr>`).join("");
}
function filterAppointments(v){
    renderAppointments(v ? allAppointments.filter(x=>x.status===v) : allAppointments);
}

async function changeStatus(id,status){
    if(!status) return;
    const r = await fetch(`/api/appointments/${id}/status`,{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({status})
    });
    if(r.ok){toast("Appointment status updated");loadAppointments();loadDashboard();}
    else toast("Could not update appointment");
}

async function loadCustomers(){
    allCustomers = await (await fetch("/api/customers")).json();
    $("customerTable").innerHTML = allCustomers.map(c=>`
        <tr>
            <td><div class="person"><div class="person-avatar">${initials(c.name)}</div><div><b>${c.name}</b><small>ID #${c.id}</small></div></div></td>
            <td>${c.phone}</td><td>${c.email || "—"}</td><td>${c.address || "—"}</td><td><b>${c.vehicle_count}</b></td>
        </tr>`).join("");
}

async function loadVehicles(){
    allVehicles = await (await fetch("/api/vehicles")).json();
    $("vehicleCards").innerHTML = allVehicles.map(v=>`
        <div class="vehicle-card">
            <div class="vehicle-top">
                <div class="vehicle-art">🚙</div>
                <span class="badge b-green">${v.fuel}</span>
            </div>
            <h3>${v.make} ${v.model}</h3>
            <div class="reg">${v.registration}</div>
            <div class="vehicle-meta">
                <div><span>OWNER</span><b>${v.customer}</b></div>
                <div><span>YEAR</span><b>${v.year}</b></div>
                <div><span>MILEAGE</span><b>${Number(v.mileage).toLocaleString()} km</b></div>
                <div><span>COLOR</span><b>${v.color || "—"}</b></div>
            </div>
        </div>`).join("");
}

async function loadMechanics(){
    const data = await (await fetch("/api/mechanics")).json();
    $("mechanicCards").innerHTML = data.map(m=>`
        <div class="info-card">
            <div style="display:flex;justify-content:space-between;align-items:center">
                <div class="vehicle-art">👨‍🔧</div>${badge(m.status)}
            </div>
            <h4 style="margin-top:14px">${m.name}</h4>
            <p><b>${m.specialization}</b><br>${m.experience} years experience<br>${m.phone}</p>
        </div>`).join("");
}

async function loadServices(){
    allServices = await (await fetch("/api/services")).json();
    $("serviceCards").innerHTML = allServices.map(s=>`
        <div class="info-card">
            <div style="display:flex;justify-content:space-between">
                <span class="badge b-blue">${s.category}</span>
                <b style="color:#ff5a1f">${money(s.price)}</b>
            </div>
            <h4 style="margin-top:14px">${s.name}</h4>
            <p>Estimated duration: ${s.duration} minutes</p>
        </div>`).join("");
}

async function loadInvoices(){
    const data = await (await fetch("/api/invoices")).json();
    const paid = data.filter(x=>x.payment_status==="Paid").reduce((a,x)=>a+Number(x.total),0);
    const pending = data.filter(x=>x.payment_status==="Pending").reduce((a,x)=>a+Number(x.total),0);
    $("paidInvoices").innerText = money(paid);
    $("pendingInvoices").innerText = money(pending);
    $("invoiceCount").innerText = data.length;
    $("invoiceTable").innerHTML = data.map(i=>`
        <tr>
            <td><b>${i.invoice_no}</b></td>
            <td>${i.customer}</td>
            <td>${i.registration}</td>
            <td>${i.service}</td>
            <td><b>${money(i.total)}</b></td>
            <td>${badge(i.payment_status==="Paid"?"Completed":"Scheduled")}</td>
            <td>${i.payment_method}</td>
        </tr>`).join("");
}

async function prepareDropdowns(){
    allCustomers = await (await fetch("/api/customers")).json();
    allVehicles = await (await fetch("/api/vehicles")).json();
    allServices = await (await fetch("/api/services")).json();
    const mechanics = await (await fetch("/api/mechanics")).json();

    $("aCustomer").innerHTML = allCustomers.map(c=>`<option value="${c.id}">${c.name} · ${c.phone}</option>`).join("");
    $("vCustomer").innerHTML = allCustomers.map(c=>`<option value="${c.id}">${c.name}</option>`).join("");
    $("aService").innerHTML = allServices.map(s=>`<option value="${s.id}">${s.name} · ${money(s.price)}</option>`).join("");
    $("aMechanic").innerHTML = `<option value="">Unassigned</option>` +
        mechanics.filter(m=>m.status!=="Busy").map(m=>`<option value="${m.id}">${m.name} · ${m.specialization}</option>`).join("");

    loadCustomerVehicles();
    setServiceCost();
}

function loadCustomerVehicles(){
    const cid = Number($("aCustomer").value);
    const list = allVehicles.filter(v=>v.customer_id===cid);
    $("aVehicle").innerHTML = list.length
      ? list.map(v=>`<option value="${v.id}">${v.make} ${v.model} · ${v.registration}</option>`).join("")
      : `<option value="">No vehicle registered</option>`;
}

function setServiceCost(){
    const s = allServices.find(x=>x.id===Number($("aService").value));
    if(s) $("aCost").value = s.price;
}

function openAppointment(){
    prepareDropdowns();
    $("aDate").value = new Date().toISOString().slice(0,10);
    $("aTime").value = "10:00";
    $("appointmentModal").classList.add("show");
}
function openCustomer(){ $("customerModal").classList.add("show"); }
function openVehicle(){
    prepareDropdowns();
    $("vehicleModal").classList.add("show");
}
function closeModal(id){ $(id).classList.remove("show"); }

async function createAppointment(e){
    e.preventDefault();
    const body = {
        customer_id:Number($("aCustomer").value),
        vehicle_id:Number($("aVehicle").value),
        service_id:Number($("aService").value),
        mechanic_id:$("aMechanic").value ? Number($("aMechanic").value) : null,
        appointment_date:$("aDate").value,
        appointment_time:$("aTime").value,
        estimated_cost:Number($("aCost").value || 0),
        notes:$("aNotes").value
    };
    const r = await fetch("/api/appointments",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)
    });
    const data = await r.json();
    if(!r.ok){toast(data.detail || "Unable to create appointment");return;}
    closeModal("appointmentModal");
    $("appointmentForm").reset();
    toast("✓ Appointment created successfully");
    loadDashboard();
    loadAppointments();
}

async function createCustomer(e){
    e.preventDefault();
    const body = {
        name:$("cName").value,phone:$("cPhone").value,
        email:$("cEmail").value,address:$("cAddress").value
    };
    const r = await fetch("/api/customers",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)
    });
    if(r.ok){
        closeModal("customerModal");e.target.reset();toast("✓ Customer added");
        loadCustomers();loadDashboard();prepareDropdowns();
    }
}

async function createVehicle(e){
    e.preventDefault();
    const body = {
        customer_id:Number($("vCustomer").value),
        registration:$("vReg").value,
        make:$("vMake").value,model:$("vModel").value,
        year:Number($("vYear").value||2024),
        fuel:$("vFuel").value,mileage:Number($("vMileage").value||0),
        color:$("vColor").value
    };
    const r = await fetch("/api/vehicles",{
        method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)
    });
    const data = await r.json();
    if(!r.ok){toast(data.detail || "Unable to register vehicle");return;}
    closeModal("vehicleModal");e.target.reset();toast("✓ Vehicle registered");
    loadVehicles();loadDashboard();prepareDropdowns();
}

function globalSearch(){
    const q = $("globalSearch").value.toLowerCase().trim();
    if(!q) return;
    const matches = allAppointments.filter(a =>
        Object.values(a).some(v=>String(v).toLowerCase().includes(q))
    );
    if(document.querySelector("#page-appointments").classList.contains("active")){
        renderAppointments(matches);
    }
}

window.onclick = e => {
    if(e.target.classList.contains("modal")) e.target.classList.remove("show");
};

loadDashboard();
loadCustomers();
loadVehicles();
</script>
</body>
</html>
"""


@app.get("/", response_class=HTMLResponse)
def home():
    return HTML


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )
