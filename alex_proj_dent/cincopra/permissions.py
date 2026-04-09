# permissions.py

def is_super_admin(session):
    return session.get("user_type") == "supervisor"


def is_clinic_admin(session):
    return session.get("user_type") == "clinic_admin"


def is_doctor(session):
    return session.get("user_type") == "normal"


def is_admin_staff(session):
    return session.get("user_type") == "admin_staff"


# =========================
# الصلاحيات
# =========================

def can_create_clinic(session):
    return is_super_admin(session) 


def can_add_doctor(session):
    return  is_clinic_admin(session)


def can_manage_services(session):
    return  is_clinic_admin(session)


def can_view_doctor_screen(session):
    return is_doctor(session)


def can_booking(session):
    return is_admin_staff(session)


def can_add_patient(session):
    return is_admin_staff(session)


def can_visit_periods(session):
    return is_clinic_admin(session) or is_super_admin(session)


def can_payments(session):
    return is_admin_staff(session)


def can_patient_drugs(session):
    return  is_clinic_admin(session) or is_doctor(session) or is_super_admin(session)


def can_doctor_schedule(session):
    return is_clinic_admin(session) or is_super_admin(session)
def testmewsc(session):
    return is_doctor(session)
