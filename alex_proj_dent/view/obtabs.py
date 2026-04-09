visit_periods_sch = [
    ("period_id", "INT", "AUTO_INCREMENT PRIMARY KEY"),
    ("start_time", "TIME", "NOT NULL"),
    ("end_time", "TIME", "NOT NULL"),
]

visit_periods_sch_dict = {
    "period_id": "",
    "start_time": "",
    "end_time": ""
}
#--------------------------------------------------
#__________________________________________
#جدول العيادات الرئيسي
medical_clinics_sch = [
    ("clinic_id", "INT", "AUTO_INCREMENT PRIMARY KEY"),   # رقم العيادة الفريد
    ("clinic_name", "VARCHAR(100)", "NOT NULL"),          # اسم العيادة التخصصي
    ("manager_name", "VARCHAR(100)", "NOT NULL"),         # اسم المدير
    ("username", "VARCHAR(50)", "UNIQUE NOT NULL"),       # اسم المستخدم للدخول
    ("password", "VARCHAR(200)", "NOT NULL"),            # كلمة السر (يفضل تخزينها مشفرة)
    ("phone_number", "VARCHAR(20)", ""),                 # رقم الهاتف (اختياري)
    ("email", "VARCHAR(100)", "")                        # البريد الإلكتروني (اختياري)
]
medical_clinics_sch_dict = {
    "clinic_id": "",
    "clinic_name": "",
    "manager_name": "",
    "username": "",
    "password": "",
    "phone_number": "",
    "address": "",
    "email": ""
}
#----------------------------------------

#جدول التخصصات في العيادات
dental_clinics_sch = [
           # رقم العيادة الفريد
               # اسم العيادة التخصصي
    ("doctor_id", "INT", "AUTO_INCREMENT"),                  # رقم الدكتور الفريد داخل العيادة
    ("doctor_name", "VARCHAR(100)", "NOT NULL"),             # اسم الدكتور
    ("username", "VARCHAR(50)", "UNIQUE NOT NULL"),          # اسم المستخدم للدكتور
    ("password", "VARCHAR(200)", "NOT NULL"),                # كلمة السر (مشفر)
    ("specialty", "VARCHAR(100)", ""),                       # تخصص الدكتور الدقيق (اختياري)
    ("phone_number", "VARCHAR(20)", ""),                     # رقم الهاتف
    ("address", "VARCHAR(200)", ""),                         # عنوان العيادة أو الدكتور
    ("email", "VARCHAR(100)", "")                             # البريد الإلكتروني
]

dental_clinics_sch_dict = {
    
   
    "doctor_id": "",
    "doctor_name": "",
    "username": "",
    "password": "",
    "specialty": "",
    "phone_number": "",
    "address": "",
    "email": ""
}

#جدول مواعيد الدكترة في العيادة الواحدة
doctor_weekly_schedule_sch = [
    ("doctor_id", "INT", "PRIMARY KEY"),  # رقم الدكتور فريد
    ("Saturday", "VARCHAR(50)", ""),      # ترميز الفترات السبت
    ("Sunday", "VARCHAR(50)", ""),        # ترميز الفترات الأحد
    ("Monday", "VARCHAR(50)", ""),        # وهكذا
    ("Tuesday", "VARCHAR(50)", ""),
    ("Wednesday", "VARCHAR(50)", ""),
    ("Thursday", "VARCHAR(50)", ""),
    ("Friday", "VARCHAR(50)", "")
]

doctor_weekly_schedule_sch_dict = {
    "doctor_id": "",
    "Saturday": "",
    "Sunday": "",
    "Monday": "",
    "Tuesday": "",
    "Wednesday": "",
    "Thursday": "",
    "Friday": ""
}
#____________________________________________________________
#----------------------------------------
# جدول الحجز المؤقت
#----------------------------------------
# جدول الحجز المؤقت لكل العيادات
temporary_booking_sch = [
    ("booking_id", "INT", "AUTO_INCREMENT PRIMARY KEY"),  # رقم الحجز الفريد
    ("patient_name", "VARCHAR(100)", "NOT NULL"),         # اسم المريض
    ("patient_phone", "VARCHAR(20)", ""),                 # رقم الهاتف
    ("patient_address", "VARCHAR(200)", ""),             # العنوان
    ("clinic_time", "VARCHAR(100)", "NOT NULL"),          # الوقت المتاح من العيادة (مرمّز)
    ("patient_time", "VARCHAR(100)", ""),                 # الوقت المناسب للمريض (مرمّز اختياري)
    ("booking_date", "DATE", "NOT NULL"),                 # التاريخ
    ("clinic_id", "INT", "NOT NULL"),                     # رقم العيادة المرتبط
    ("doctor_id", "INT", "NOT NULL")                      # رقم الدكتور المعني
]

# نموذج دكت (Dictionary) لتخزين البيانات مؤقتًا
temporary_booking_sch_dict = {
    "booking_id": "",
    "patient_name": "",
    "patient_phone": "",
    "patient_address": "",
    "clinic_time": "",
    "patient_time": "",
    "booking_date": "",
    "clinic_id": "",
    "doctor_id": ""
}
#____________________________________________
# جدول ملفات المرضى العام
patients_sch = [
    ("patient_id", "INT", "AUTO_INCREMENT PRIMARY KEY"),   # رقم الملف الفريد لكل مريض
    ("patient_name", "VARCHAR(100)", "NOT NULL"),          # اسم المريض
    ("patient_phone", "VARCHAR(20)", ""),                  # رقم الهاتف
    ("patient_address", "VARCHAR(200)", ""),              # عنوان المريض
    ("patient_gender", "VARCHAR(10)", ""),                # جنس المريض (ذكر / أنثى)
    ("patient_age", "INT", ""),                            # عمر المريض
    ("registration_date", "DATE", "NOT NULL")             # تاريخ تسجيل المريض
]

# نموذج Dictionary لتخزين بيانات المريض
patients_sch_dict = {
    "patient_id": "",
    "patient_name": "",
    "patient_phone": "",
    "patient_address": "",
    "patient_gender": "",       # ذكر أو أنثى
    "patient_age": "",
    "registration_date": ""
}
#_______________________
# جدول التشخيص
lab_reports_sch = [
    ("report_id", "INT", "AUTO_INCREMENT PRIMARY KEY"),   # رقم فريد للتقرير
    ("patient_id", "INT", "NOT NULL"),                    # رقم ملف المريض
    ("report_name", "VARCHAR(200)", "NOT NULL"),         # اسم التقرير
    ("folder_path", "VARCHAR(500)", "NOT NULL"),         # مسار المجلد أو العنوان الكامل للتقرير
    ("report_date", "DATE", "NOT NULL"),                 # تاريخ التقرير
    ("notes", "TEXT", "")                                # ملاحظات إضافية
]

# نموذج Dictionary لتخزين بيانات التقرير
lab_reports_sch_dict = {
    "report_id": "",
    "patient_id": "",
    "report_name": "",
    "folder_path": "",
    "report_date": "",
    "notes": ""
}
#___________________________________
# جدول زيارات المرضى والخطة العلاجية
visits_sch = [
    ("visit_id", "INT", "AUTO_INCREMENT PRIMARY KEY"),   # رقم فريد للزيارة
    ("patient_id", "INT", "NOT NULL"),                   # رقم ملف المريض
    ("doctor_id", "INT", "NOT NULL"),                   # رقم الدكتور المسؤول
    ("visit_date", "DATE", "NOT NULL"),                 # تاريخ الزيارة
    ("visit_time", "VARCHAR(20)", ""),                  # وقت الزيارة (مرمّز أو نصي)
    ("required_tests", "TEXT", ""),                     # الفحوصات المطلوبة
    ("treatment_plan", "TEXT", ""),                     # الخطة العلاجية
    ("visit_results", "TEXT", ""),                      # تقرير النتائج
    ("next_visit", "DATE", "")                          # موعد الزيارة القادمة (اختياري)
]

# نموذج Dictionary لتخزين بيانات الزيارة
visits_sch_dict = {
    "visit_id": "",
    "patient_id": "",
    "doctor_id": "",
    "visit_date": "",
    "visit_time": "",
    "required_tests": "",
    "treatment_plan": "",
    "visit_results": "",
    "next_visit": ""
}
#_________________________________
# جدول أسعار الخدمات لكل عيادة (خاص بالعيادة نفسها)
clinic_services_sch = [
    ("service_id", "INT", "AUTO_INCREMENT PRIMARY KEY"),   # رقم الخدمة الفريد
    ("service_name", "VARCHAR(100)", "NOT NULL"),         # اسم الخدمة
    ("service_price", "DECIMAL(10,2)", "NOT NULL")       # سعر الخدمة
]

# نموذج Dictionary لتخزين بيانات الخدمة
clinic_services_sch_dict = {
    "service_id": "",
    "service_name": "",
    "service_price": ""
}
#---------------------------------------
inv_sch = [
    ("ITEM_NAME", "VARCHAR2(255)", ""),
    ("ITEM_PRICE", "NUMBER(10)", ""),
    ("DOCTOR_ID", "NUMBER(15)", ""),
    ("ITEM_TYPE", "VARCHAR2(1)", ""),
    ("VISIT_NUMBER", "NUMBER", ""),
    ("VOUCHER_NUMBER", "NUMBER", "")
]