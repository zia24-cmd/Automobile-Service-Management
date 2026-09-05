from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime, timedelta
import sqlite3
import uvicorn
import os

APP_NAME = "AutoPro Service Hub"
DB_FILE = "autopro.db"

app = FastAPI(title=APP_NAME, version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
# FRONTEND STATIC FILES
# ============================================================

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")




if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )
