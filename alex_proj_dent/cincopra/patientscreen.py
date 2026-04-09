import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
from ..view.db_process import process_db_ora_mysql  # تأكد من المسار صحيح حسب مشروعك
from .doc_jop import add_patient_visit
# ==========================================
# إنشاء اتصال قاعدة البيانات
# ==========================================
db = process_db_ora_mysql()

# ==========================================
# صفحة إدارة المرضى
# ==========================================
@csrf_exempt
def patient_page(request):
    return render(request, "patientscreen.html")

# ==========================================
@csrf_exempt
def test_p(request):
    return render(request, "test_p.html")

# جلب جميع المرضى
# ==========================================
@csrf_exempt
def get_patients(request):
    try:
        query = request.GET.get("q", "").strip()

        if query:
            tramo = {
                "PATIENT_RECORDS": [
                    {
                        "select": True,
                        "condition": f"FILE_PAT_NO LIKE '%{query}%' OR PATIENT_NAME LIKE '%{query}%'"
                    }
                ]
            }
        else:
            tramo = {
                "PATIENT_RECORDS": [
                    {"select": True}
                ]
            }

        result = db.execute_bulk(tramo)
        patients = result.get("select", {}).get("PATIENT_RECORDS", [])

        json_patients = []

        for p in patients:
            json_patients.append({
                "file_pat_no": p.get("FILE_PAT_NO"),
                "name": p.get("PATIENT_NAME"),
                "age": p.get("AGE"),
                "phone": p.get("PHONE_NUMBER"),
                "gender": p.get("GENDER"),
                "current_address": p.get("CURRENT_ADDRESS"),
                "registration_date": p["REGISTRATION_DATE"].strftime("%Y-%m-%d") if p.get("REGISTRATION_DATE") else ""
            })

        return JsonResponse({
            "success": True,
            "patients": json_patients
        })

    except Exception as e:
        return JsonResponse({
            "success": False,
            "patients": [],
            "message": str(e)
        })
#-----------------------------------------------------------------
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def get_last_patient_file_no(request):
    try:
        # 1️⃣ جلب كل المرضى بدون ترتيب
        tramo = {
            "PATIENT_RECORDS": [
                {
                    "select": True,
                    "columns": ["FILE_PAT_NO"]
                }
            ]
        }
        result = db.execute_bulk(tramo)
        last_patient = result.get("select", {}).get("PATIENT_RECORDS", [])

        # 2️⃣ ترتيب رقمي باستخدام بايثون
        sorted_patients = sorted(
            last_patient,
            key=lambda x: int(x["FILE_PAT_NO"])  # تحويل النص لرقم للترتيب
        )

        # 3️⃣ أخذ آخر رقم بعد الترتيب
        last_file_no = sorted_patients[-1]["FILE_PAT_NO"] if sorted_patients else None

        return JsonResponse({
            "success": True,
            "last_file_no": last_file_no
        })

    except Exception as e:
        return JsonResponse({
            "success": False,
            "last_file_no": None,
            "message": str(e)
        })# إضافة مريض جديد
# ==========================================
#------------------------------------
from types import SimpleNamespace

@csrf_exempt
def add_patient(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "الطريقة غير مسموحة"})

    try:
        data = json.loads(request.body)
        reg_date = data.get("registration_date")
        file_pat_no = data.get("file_pat_no")
        frist_ch2=data.get("frist_che")
        doctor_id = data.get("doctor_id")  # رقم الدكتور ضروري
        inv_sch = {
            "ITEM_NAME": "VARCHAR2(255)",
            "ITEM_PRICE": "NUMBER(10)",
            "DOCTOR_ID": "NUMBER(15)",
            "ITEM_TYPE": "VARCHAR2(1)",
            "VISIT_NUMBER": "NUMBER",
            "VOUCHER_NUMBER": "NUMBER"
            }
        # بيانات المريض
        patient_row = {
            "FILE_PAT_NO": file_pat_no,
            "PATIENT_NAME": data.get("name"),
            "AGE": data.get("age"),
            "PHONE_NUMBER": data.get("phone"),
            "GENDER": data.get("gender"),
            "CURRENT_ADDRESS": data.get("current_address"),
        }
        if reg_date:
            patient_row["REGISTRATION_DATE"] = reg_date
        new_inv_tab=f"INV_{file_pat_no}"
        print("new_inv_tab_new_inv_tab",new_inv_tab)
           # إدخال المريض
        db.execute_bulk({
            "PATIENT_RECORDS": [{"insert": True, **patient_row}],
                new_inv_tab: [{
                "create": True,
                "columns": inv_sch
            }]
        })
        db.connection.commit()
        note_1= f"التشخيص الاولي لطبيب الاسرة:{frist_ch2}"
        print("note_1==",note_1)
        # ===== dummy_request لإضافة الزيارة =====
        dummy_request = SimpleNamespace()
        dummy_request.method = "POST"
        dummy_request.session = {"doc_id": doctor_id,"clinic_id": data.get("clinic_id"),"pai_id":file_pat_no }                
        dummy_request.body = json.dumps({
            "timeSlot": data.get("proid_visit"),
            "treatment": "121",
            "exams": data.get("exams", ""),
            "visit_date": data.get("date_visit"),
            "clinic": data.get("clinic_id"),
            "medcen": "",
            "note": note_1#data.get("note", "")
        }).encode("utf-8")  # مهم أن يكون bytes
        print("dummy_request.body",dummy_request.body)
        # استدعاء دالة add_patient_visit
        add_patient_visit(dummy_request, patient_id=file_pat_no)
         
        return JsonResponse({
            "success": True,
            "message": "تمت إضافة المريض والزيارة بنجاح",
            "new_file_no": file_pat_no
        })
       
    except Exception as e:
        db.connection.rollback()
        return JsonResponse({"success": False, "message": str(e)})# ==========================================
# تعديل بيانات مريض
# ==========================================

@csrf_exempt
def update_patient(request, file_pat_no):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "الطريقة غير مسموحة"})

    try:
        data = json.loads(request.body)

        patient_row = {
            "PATIENT_NAME": data.get("name"),
            "AGE": data.get("age"),
            "PHONE_NUMBER": data.get("phone"),
            "GENDER": data.get("gender"),
            "REGISTRATION_DATE": data.get("registration_date"),
            "CURRENT_ADDRESS": data.get("current_address"),
        }

        # إزالة القيم الفارغة
        patient_row = {k: v for k, v in patient_row.items() if v not in [None, ""]}

        tramo_update = {
            "PATIENT_RECORDS": [
                {
                    "update": True,
                    "set": patient_row,
                    "condition": f"FILE_PAT_NO = '{file_pat_no}'"
                }
            ]
        }

        db.execute_bulk(tramo_update)
        db.connection.commit()

        return JsonResponse({
            "success": True,
            "message": "تم تعديل بيانات المريض بنجاح"
        })

    except Exception as e:
        db.connection.rollback()
        return JsonResponse({
            "success": False,
            "message": str(e)
        })

# ==========================================
# دالة مساعدة لجلب قائمة المرضى
# ==========================================
def get_patient_list():
    tramo = {"PATIENT_RECORDS": [{"select": True}]}
    result = db.execute_bulk(tramo)
    return result.get("select", {}).get("PATIENT_RECORDS", [])
#=========================================================================
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def get_dental_conditions(request):
    """
    ترجع جميع الحالات المرضية من جدول DENTAL_CONDITIONS
    بصيغة JSON لاستخدامها في autocomplete
    """
    try:
        query = request.GET.get('q', '').strip()  # الكلمة المكتوبة للبحث

        # صياغة الشرط حسب قواعدك
        condition_clause = ""
        if query:
            # البحث في العربي والانجليزي مع LOWER لمطابقة الأحرف الصغيرة والكبيرة
            condition_clause = (
                f"LOWER(CONDITION_NAME_AR) LIKE '%{query.lower()}%' "
                f"OR LOWER(CONDITION_NAME_EN) LIKE '%{query.lower()}%'"
            )

        tramo = {
            "DENTAL_CONDITIONS": [
                {
                    "select": True,
                    "columns": ["ID", "CONDITION_NAME_AR", "CONDITION_NAME_EN", "CLINIC_ID"],
                    "condition": condition_clause
                }
            ]
        }

        result = db.execute_bulk(tramo)
        conditions = result.get("select", {}).get("DENTAL_CONDITIONS", [])
        #print(" get_dental_conditions__ conditions=", conditions)
        return JsonResponse({
            "success": True,
            "conditions": conditions
        })

    except Exception as e:
        return JsonResponse({
            "success": False,
            "conditions": [],
            "message": str(e)
        })
#====================================================
@csrf_exempt
def add_patient_all(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "الطريقة غير مسموحة"})

    try:
        data = json.loads(request.body)
        print("add_patient_all_ data=", data)
        reg_date = data.get("registration_date")
        last_file_no1=get_last_patient_file_no(request)
        print("last_file_no1+last_file_no1",last_file_no1)
        patient_row = {
            "FILE_PAT_NO": data.get("file_pat_no"),
            "PATIENT_NAME": data.get("name"),
            "AGE": data.get("age"),
            "PHONE_NUMBER": data.get("phone"),
            "GENDER": data.get("gender"),
            "CURRENT_ADDRESS": data.get("current_address"),
        }

        # أضف التاريخ فقط إذا تم إدخاله
        if reg_date:
            patient_row["REGISTRATION_DATE"] = reg_date

        tramo_insert = {
            "PATIENT_RECORDS": [
                {"insert": True, **patient_row}
            ]
        }

        db.execute_bulk(tramo_insert)
        db.connection.commit()

        return JsonResponse({
            "success": True,
            "message": "تمت إضافة المريض بنجاح"
        })

    except Exception as e:
        db.connection.rollback()
        return JsonResponse({
            "success": False,
            "message": str(e)
        })