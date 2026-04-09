import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.template import loader
from ..view.db_process import process_db_ora_mysql   # تأكد من المسار صحيح حسب مشروعك

# ==========================================
# إنشاء اتصال قاعدة البيانات
# ==========================================
db = process_db_ora_mysql()


# ==========================================
# صفحة إدارة الدكاترة
# ==========================================
from django.shortcuts import render

@csrf_exempt
def doctor_page(request):
    return render(request, "addoc_clin.html")


# ==========================================
# جلب جميع الدكاترة
# ==========================================
@csrf_exempt
def get_doctors(request):
    # 1️⃣ الحصول على رقم العيادة
    clinic_id = request.GET.get('clinic_id') or request.session.get('clinic_id')
    request.session["clinic_code"] = clinic_id
    
    if not clinic_id:
        return JsonResponse({
            "success": False,
            "doctors": [],
            "message": "رقم العيادة مفقود"
        })

    try:
        clinic_id = int(clinic_id)
    except ValueError:
        return JsonResponse({
            "success": False,
            "doctors": [],
            "message": "رقم العيادة غير صالح"
        })

    # 2️⃣ تكوين اسم جدول ديناميكي
    tablename = f"CLIN{clinic_id}"

    # 3️⃣ تجهيز الاستعلام
    tramo = {
        tablename: [
            {
                "select": True,
                "columns": ["DOCTOR_ID", "DOCTOR_NAME"],
            }
        ]
    }

    # 4️⃣ تنفيذ الاستعلام مع معالجة الأخطاء
    try:
        result = db.execute_bulk(tramo)
    except Exception as e:
        # الجدول غير موجود
        return JsonResponse({
            "success": False,
            "doctors": [],
            "message": f"الجدول {tablename} غير موجود في قاعدة البيانات"
        })

    # 5️⃣ التحقق من نتيجة الاستعلام
    doctors = result.get("select", {}).get(tablename)
    
    if doctors is None:
        # الجدول موجود ولكن لم يتم الإرجاع بشكل صحيح
        return JsonResponse({
            "success": False,
            "doctors": [],
            "message": f"الجدول {tablename} موجود لكن لم يتم العثور على بيانات"
        })
    elif not doctors:
        # الجدول فارغ
        return JsonResponse({
            "success": False,
            "doctors": [],
            "message": f"لا يوجد أطباء في الجدول {tablename}"
        })

    # 6️⃣ إذا وجدنا بيانات
    return JsonResponse({
        "success": True,
        "doctors": doctors
    })
# ==========================================
# إضافة دكتور جديد
# ==========================================
@csrf_exempt
def add_doctor(request):

    if request.method != "POST":
        return JsonResponse({"success": False, "message": "الطريقة غير مسموحة"})
    clin_id=request.session.get("clinic_code")
    try:
        data = json.loads(request.body)

        doctor_row = {
           # "DOCTOR_ID": data.get("doctor_id"),
            "DOCTOR_NAME": data.get("doctor_name"),
            "USERNAME": data.get("username"),
            "PASSWORD": data.get("password"),
            "SPECIALTY": data.get("specialty"),
            "PHONE_NUMBER": data.get("phone"),
            "ADDRESS": data.get("address"),
            "EMAIL": data.get("email"),
        }
        table_clin=f"CLIN{clin_id}"
        print("---------===========-----------------------=============--table_clin=",table_clin )
        tramo_insert = {
             table_clin: [
                {
                    "insert": True,**doctor_row
                    
                }
            ]
        }

        db.execute_bulk(tramo_insert)
        db.connection.commit()

        return JsonResponse({
            "success": True,
            "message": "تمت إضافة الدكتور بنجاح"
        })

    except Exception as e:
        db.connection.rollback()
        return JsonResponse({
            "success": False,
            "message": str(e)
        })


# ==========================================
# تعديل بيانات دكتور
# ==========================================
@csrf_exempt
def update_doctor(request, doctor_id):

    if request.method != "POST":
        return JsonResponse({"success": False, "message": "الطريقة غير مسموحة"})

    try:
        data = json.loads(request.body)

        doctor_row = {
            "CLINIC_NAME": data.get("clinic_name"),
            "DOCTOR_NAME": data.get("doctor_name"),
            "USERNAME": data.get("username"),
            "PASSWORD": data.get("password"),
            "SPECIALTY": data.get("specialty"),
            "PHONE_NUMBER": data.get("phone"),
            "ADDRESS": data.get("address"),
            "EMAIL": data.get("email"),
        }

        doctor_row = {k: v for k, v in doctor_row.items() if v not in [None, ""]}
        clin_id=request.session.get("clinic_code")
        table_clin=f"CLIN{clin_id}"
        tramo_update = {
            table_clin: [
                {
                    "update": True,
                    "set": doctor_row,
                    "condition": f"DOCTOR_ID = {doctor_id}"
                }
            ]
        }

        db.execute_bulk(tramo_update)
        db.connection.commit()

        return JsonResponse({
            "success": True,
            "message": "تم تعديل بيانات الدكتور بنجاح"
        })

    except Exception as e:
        db.connection.rollback()
        return JsonResponse({
            "success": False,
            "message": str(e)
        })


# ==========================================
# دالة مساعدة
# ==========================================

def get_doctor_list(request):
    clin_id=request.session.get("clinic_code")
    table_clin=f"CLIN{clin_id}"

    tramo = {table_clin: [{"select": True}]}
    result = db.execute_bulk(tramo)
    return result.get("select", {}).get(table_clin, [])
