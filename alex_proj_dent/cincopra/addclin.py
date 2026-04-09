import json
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from ..view.db_process import process_db_ora_mysql

# إنشاء نسخة قاعدة البيانات واحدة لكل الملف
db = process_db_ora_mysql()


# ---------------------------
# صفحة إضافة / تعديل عيادة
# ---------------------------
from django.template import loader

@csrf_exempt
def newadd_clin(request):
    tramo = {"MEDICAL_CLINICS": [{"select": True}]}
    result = db.execute_bulk(tramo)
    rows = result.get("select", {}).get("MEDICAL_CLINICS", [])

    last_clin_code = max([int(r.get("CLINIC_ID", 0)) for r in rows], default=0)

    context = {"last_clin_code": last_clin_code}
    template = loader.get_template("addnewclin.html")
    return HttpResponse(template.render(context, request))


# ---------------------------
# جلب كل العيادات
# ---------------------------
@csrf_exempt
def get_clin_view(request):
    try:
        res = db.execute_bulk({"MEDICAL_CLINICS": [{"select": True}]})
        medical_clinics = res.get("select", {}).get("MEDICAL_CLINICS", [])
        return JsonResponse({"success": True, "users": medical_clinics})
    except Exception as e:
        return JsonResponse({"success": False, "users": [], "message": str(e)})


# ---------------------------
# إضافة عيادة جديدة
# ---------------------------
import json
from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from ..view.db_process import process_db_ora_mysql

# إنشاء نسخة قاعدة البيانات واحدة لكل الملف
db = process_db_ora_mysql()


# ---------------------------
# صفحة إضافة / تعديل عيادة
# ---------------------------
from django.template import loader

@csrf_exempt
def newadd_clin(request):
    tramo = {"MEDICAL_CLINICS": [{"select": True}]}
    result = db.execute_bulk(tramo)
    rows = result.get("select", {}).get("MEDICAL_CLINICS", [])

    last_clin_code = max([int(r.get("CLINIC_ID", 0)) for r in rows], default=0)

    context = {"last_clin_code": last_clin_code}
    template = loader.get_template("addnewclin.html")
    return HttpResponse(template.render(context, request))


# ---------------------------
# جلب كل العيادات
# ---------------------------
@csrf_exempt
def get_clin_view(request):
    try:
        res = db.execute_bulk({"MEDICAL_CLINICS": [{"select": True}]})
        medical_clinics = res.get("select", {}).get("MEDICAL_CLINICS", [])
        return JsonResponse({"success": True, "users": medical_clinics})
    except Exception as e:
        return JsonResponse({"success": False, "users": [], "message": str(e)})


# ---------------------------
# إضافة عيادة جديدة
# ---------------------------

@csrf_exempt
def clin_add(request):
    from ceate_tab_clin_dac import ins_clin_data

    if request.method == "POST":
        try:
            result = ins_clin_data(request)

            if result is False:
                return JsonResponse({
                    "success": False,
                    "message": "⚠️ رقم العيادة موجود مسبقاً"
                })

            return JsonResponse({
                "success": True,
                "message": "تمت الإضافة بنجاح"
            })

        except Exception as e:
            return JsonResponse({
                "success": False,
                "message": str(e)
            })

    return JsonResponse({"success": False, "message": "طلب غير صالح"})
# ---------------------------
# تحديث عيادة موجودة
# ---------------------------
@csrf_exempt
def update_clin(request, clinic_id):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "الطريقة غير مسموحة"})

    try:
        data = json.loads(request.body)

        # تجهيز البيانات للتحديث
        clin_row = {
            "CLINIC_NAME": data.get("clin_name_p", "").strip(),
            "MANAGER_NAME": data.get("first_p", "").strip(),
            "USERNAME": data.get("user_p", "").strip(),
            "PASSWORD": data.get("passwordu_p", "").strip(),
            "PHONE_NUMBER": data.get("phone_p", "").strip(),
            "ADDRESS": data.get("address", "").strip(),
            "EMAIL": data.get("mang_e", "").strip(),
        }

        # حذف القيم الفارغة
        clin_row = {k: v for k, v in clin_row.items() if v not in [None, ""]}
        print("update_clin_clin_row", clin_row)

        # بناء الاستعلام
        tramo_update = {
            "MEDICAL_CLINICS": [
                {
                    "update": True,
                    "set": clin_row,
                    "condition": f"CLINIC_ID = {clinic_id}"
                }
            ]
        }

        # تنفيذ التحديث
        try:
            db.execute_bulk(tramo_update)
            db.connection.commit()
        except Exception as e:
            db.connection.rollback()
            return JsonResponse({"success": False, "message": str(e)})

        # إعادة قائمة العيادات بعد التحديث
        users = get_bra_list()
        return JsonResponse({"success": True, "message": "تم تحديث بيانات العيادة بنجاح", "users": users})

    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)})


# ---------------------------
# دالة مساعدة لجلب العيادات
# ---------------------------
def get_bra_list():
    tramo_branch = {"MEDICAL_CLINICS": [{"select": True}]}
    result = db.execute_bulk(tramo_branch)
    return result.get("select", {}).get("MEDICAL_CLINICS", [])


# ---------------------------
# تحديث حالة العيادة (STATE)
# ---------------------------
@csrf_exempt
def update_branch_state(request, branch_code):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "الطريقة غير مسموحة"})
    try:
        data = json.loads(request.body)
        new_state = int(data.get("state", 0))

        tramo_update = {
            "MEDICAL_CLINICS": [
                {
                    "update": True,
                    "set": {"STATE": new_state},
                    "condition": f"CLINIC_ID = {branch_code}"
                }
            ]
        }

        db.execute_bulk(tramo_update)
        db.connection.commit()
        return JsonResponse({"success": True, "message": f"تم تحديث حالة الفرع {branch_code} إلى {new_state}"})

    except Exception as e:
        db.connection.rollback()
        return JsonResponse({"success": False, "message": str(e)})



# ---------------------------
# تحديث عيادة موجودة
# ---------------------------
@csrf_exempt
def update_clin(request, clinic_id):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "الطريقة غير مسموحة"})

    try:
        data = json.loads(request.body)

        # تجهيز البيانات للتحديث
        clin_row = {
            "CLINIC_NAME": data.get("clin_name_p", "").strip(),
            "MANAGER_NAME": data.get("first_p", "").strip(),
            "USERNAME": data.get("user_p", "").strip(),
            "PASSWORD": data.get("passwordu_p", "").strip(),
            "PHONE_NUMBER": data.get("phone_p", "").strip(),
            "ADDRESS": data.get("address", "").strip(),
            "EMAIL": data.get("mang_e", "").strip(),
        }

        # حذف القيم الفارغة
        clin_row = {k: v for k, v in clin_row.items() if v not in [None, ""]}
        print("update_clin_clin_row", clin_row)

        # بناء الاستعلام
        tramo_update = {
            "MEDICAL_CLINICS": [
                {
                    "update": True,
                    "set": clin_row,
                    "condition": f"CLINIC_ID = {clinic_id}"
                }
            ]
        }

        # تنفيذ التحديث
        try:
            db.execute_bulk(tramo_update)
            db.connection.commit()
        except Exception as e:
            db.connection.rollback()
            return JsonResponse({"success": False, "message": str(e)})

        # إعادة قائمة العيادات بعد التحديث
        users = get_bra_list()
        return JsonResponse({"success": True, "message": "تم تحديث بيانات العيادة بنجاح", "users": users})

    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)})


# ---------------------------
# دالة مساعدة لجلب العيادات
# ---------------------------
def get_bra_list():
    tramo_branch = {"MEDICAL_CLINICS": [{"select": True}]}
    result = db.execute_bulk(tramo_branch)
    return result.get("select", {}).get("MEDICAL_CLINICS", [])


# ---------------------------
# تحديث حالة العيادة (STATE)
# ---------------------------
@csrf_exempt
def update_branch_state(request, branch_code):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "الطريقة غير مسموحة"})
    try:
        data = json.loads(request.body)
        new_state = int(data.get("state", 0))

        tramo_update = {
            "MEDICAL_CLINICS": [
                {
                    "update": True,
                    "set": {"STATE": new_state},
                    "condition": f"CLINIC_ID = {branch_code}"
                }
            ]
        }

        db.execute_bulk(tramo_update)
        db.connection.commit()
        return JsonResponse({"success": True, "message": f"تم تحديث حالة الفرع {branch_code} إلى {new_state}"})

    except Exception as e:
        db.connection.rollback()
        return JsonResponse({"success": False, "message": str(e)})
