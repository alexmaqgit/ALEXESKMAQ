from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
import json
from ..view.db_process import process_db_ora_mysql
from .creatinvoice import generate_voucher_number


def invoice_view(request):
    return render(request, "invoice.html")


# =================================================
# جلب جميع العيادات
# =================================================
@csrf_exempt
def get_clinics(request):
    """جلب جميع العيادات من جدول MEDICAL_CLINICS"""
    db = process_db_ora_mysql()
    try:
        clinics = db.execute_bulk({
            "MEDICAL_CLINICS": [{"select": True}]
        }).get("select", {}).get("MEDICAL_CLINICS", [])
        
        clinics_list = []
        for c in clinics:
            clinics_list.append({
                "id": c.get("CLINIC_ID"),
                "name": c.get("CLINIC_NAME")
            })
        return JsonResponse({"success": True, "clinics": clinics_list})
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)})


# =================================================
# جلب فاتورة الدفع
# =================================================
@require_GET
@csrf_exempt
def get_payment_invoice(request):
    db = process_db_ora_mysql()
    patient_no = request.GET.get("patient_no")
    clinic_id = request.GET.get("clinic_id")
    
    if not patient_no:
        return JsonResponse({"success": False, "message": "No patient number provided"})
    
    if not clinic_id:
        return JsonResponse({"success": False, "message": "No clinic selected"})

    # تخزين clinic_id في session
    request.session["clinic_id"] = int(clinic_id)
    
    # جلب معلومات الدكاترة المرتبطة بالمريض
    doc_info = get_patient_doctors(request, patient_no)
    doc_map = {d["doctor_id"]: d["doctor_name"] for d in doc_info}
   
    # جلب بيانات المريض (بدون علامات تنصيص يدوية)
    patient_row = db.execute_bulk({
        "PATIENT_RECORDS": [{"select": True, "condition": f"FILE_PAT_NO = '{patient_no}'"}]
    }).get("select", {}).get("PATIENT_RECORDS", [])

    patient_name = patient_row[0]["PATIENT_NAME"] if patient_row else "غير محدد"

    # جلب الخدمات والفحوصات حسب العيادة
    SERVICE_PRICE_TAB = f"SERVICE_PRICE_CLIN{clinic_id}"
    service_rows = db.execute_bulk({SERVICE_PRICE_TAB: [{"select": True}]}).get("select", {}).get(SERVICE_PRICE_TAB, [])

    exam_rows = db.execute_bulk({"LAB_IM_EX": [{"select": True}]}).get("select", {}).get("LAB_IM_EX", [])

    services_dict = {str(r.get("SERVICE_ID")): {"name": r.get("SERVICE_NAME"), "price": float(r.get("PRICE") or 0), "type": 1} for r in service_rows}
    exams_dict = {str(r.get("ID")): {"name": r.get("EXAM_NAME"), "price": float(r.get("PRICE") or 0), "type": 2} for r in exam_rows}

    # جلب جميع زيارات المريض حسب العيادة
    VISITS = f"VISITS_CLIN{clinic_id}"
    visit_rows = db.execute_bulk({
        VISITS: [{"select": True, "condition": f"PATIENT_NO = '{patient_no}'"}]
    }).get("select", {}).get(VISITS, [])

    # جلب البنود المدفوعة من جدول فاتورة المريض
    table_name = f"INV_{patient_no}"
    paid_rows = db.execute_bulk({table_name: [{"select": True}]}).get("select", {}).get(table_name, [])
    paid_set = {(r["ITEM_NAME"], r["VISIT_NUMBER"]) for r in paid_rows}

    items = []
    upcoming_visits = []

    for r in visit_rows:
        visit_number = r.get("VISIT_NUMBER")
        visit_date = r.get("VISIT_DATE")
        doctor_id = r.get("DOCTOR_ID")
        doctor_name = doc_map.get(doctor_id, f"دكتور {doctor_id}")

        # إعداد البنود (إجراءات وخدمات)
        treatment_ids = [x.strip() for x in str(r.get("TREATMENT") or "").split(",") if x.strip()]
        for tid in treatment_ids:
            s = services_dict.get(tid)
            if s:
                items.append({
                    "item_name": s["name"],
                    "item_price": s["price"],
                    "doctor_id": doctor_id,
                    "doctor_name": doctor_name,
                    "item_type": s["type"],
                    "visit_number": visit_number,
                    "paid": (s["name"], visit_number) in paid_set
                })

        exam_ids = [x.strip() for x in str(r.get("EXAMS") or "").split(",") if x.strip()]
        for eid in exam_ids:
            e = exams_dict.get(eid)
            if e:
                items.append({
                    "item_name": e["name"],
                    "item_price": e["price"],
                    "doctor_id": doctor_id,
                    "doctor_name": doctor_name,
                    "item_type": e["type"],
                    "visit_number": visit_number,
                    "paid": (e["name"], visit_number) in paid_set
                })

        # زيارات مستقبلية غير مؤكدة
        book_conf = str(r.get("BOOK_CONFIRMATION") or "0")
        if book_conf == "0":
            upcoming_visits.append({
                "visit_number": visit_number,
                "visit_date": visit_date.strftime("%Y-%m-%d") if visit_date else "",
                "book_confirmation": 0,
                "doctor_id": doctor_id,
                "doctor_name": doctor_name
            })

    return JsonResponse({
        "success": True,
        "patient_no": patient_no,
        "patient_name": patient_name,
        "items": items,
        "upcoming_visits": upcoming_visits
    })


# =================================================
# تأكيد الدفع
# =================================================
@csrf_exempt
@require_POST
def confirm_payment(request):
    db = process_db_ora_mysql()
    try:
        body = json.loads(request.body)
        patient_no = body.get("patient_no")
        items = body.get("items", [])
        clinic_id = body.get("clinic_id")
        
        if not patient_no or not items:
            return JsonResponse({"success": False, "message": "بيانات الدفع ناقصة"})
        
        VISITS = f"VISITS_CLIN{clinic_id}"
        
        # جلب رقم الزيارة
        visit_row = db.execute_bulk({
            VISITS: [
                {
                    "select": True,
                    "condition": f"PATIENT_NO = '{patient_no}'"
                }
            ]
        }).get("select", {}).get(VISITS, [])

        if not visit_row:
            return JsonResponse({"success": False, "message": "لا توجد زيارة للمريض"})

        visit_number = visit_row[0].get("VISIT_NUMBER")
        if not visit_number:
            return JsonResponse({"success": False, "message": "رقم الزيارة غير موجود"})

        table_name = f"INV_{patient_no}"
        tramo_insert = {table_name: []}

        VOUCHER_NUMBER1 = generate_voucher_number(patient_no)
        
        for it in items:
            doctor_id = it.get("doctor_id")
            visit_number = it.get("visit_number")
            row = {
                "insert": True,
                "ITEM_NAME": it.get("item_name"),
                "ITEM_PRICE": it.get("item_price", 0),
                "DOCTOR_ID": doctor_id,
                "ITEM_TYPE": it.get("item_type"),
                "VISIT_NUMBER": visit_number,
                "VOUCHER_NUMBER": VOUCHER_NUMBER1
            }
            tramo_insert[table_name].append(row)
        
        if tramo_insert[table_name]:
            db.execute_bulk(tramo_insert)
            db.connection.commit()

        return JsonResponse({"success": True})

    except Exception as e:
        db.connection.rollback()
        return JsonResponse({"success": False, "message": str(e)})


# =================================================
# تأكيد الزيارة
# =================================================
@csrf_exempt
@require_POST
def confirm_visit(request):
    
    db = process_db_ora_mysql()
    try:
        body = json.loads(request.body)
        patient_no = body.get("patient_no")
        visit_number = body.get("visit_number")
        doctor_id = body.get("doctor_id")
        clinic_id = body.get("clinic_id")
        
        if not patient_no or not visit_number or not doctor_id or not clinic_id:
            return JsonResponse({"success": False, "message": "بيانات ناقصة"})
        
        VISITS = f"VISITS_CLIN{clinic_id}"
        print("VISITS VISITS", VISITS)
        
        updated = db.execute_bulk({
            VISITS: [
                {
                    "update": True,
                    "set": {"BOOK_CONFIRMATION": 1},
                    "condition": f"PATIENT_NO = '{patient_no}' AND VISIT_NUMBER = {visit_number} AND DOCTOR_ID = {doctor_id} AND BOOK_CONFIRMATION = 0"
                }
            ]
        })
        
        if updated:
            db.connection.commit()
            return JsonResponse({"success": True})
        else:
            return JsonResponse({"success": False, "message": "السجل غير موجود أو مؤكد مسبقًا"})

    except Exception as e:
        db.connection.rollback()
        return JsonResponse({"success": False, "message": str(e)})


# =================================================
# جلب أطباء المريض
# =================================================
@csrf_exempt
def get_patient_doctors(request, patient_no):
    db = process_db_ora_mysql()
    clinic_id = request.session.get("clinic_id")
    
    if not patient_no or not clinic_id:
        return []
    
    vis = f"VISITS_CLIN{clinic_id}"
    visits = db.execute_bulk({
        vis: [{"select": True, "condition": f"PATIENT_NO = '{patient_no}'"}]
    }).get("select", {}).get(vis, [])

    visit_doctors = {int(v["DOCTOR_ID"]) for v in visits if v.get("DOCTOR_ID")}

    if not visit_doctors:
        return []

    # جلب أسماء الأطباء من جدول CLIN{clinic_id}
    doctor_table = f"CLIN{clinic_id}"
    doctor_rows = db.execute_bulk({
        doctor_table: [{"select": True, "condition": f"DOCTOR_ID IN ({','.join(str(d) for d in visit_doctors)})"}]
    }).get("select", {}).get(doctor_table, [])
    
    doctor_map = {int(d["DOCTOR_ID"]): d.get("DOCTOR_NAME", f"دكتور {d['DOCTOR_ID']}") for d in doctor_rows}

    unique_doctors = []
    for doc_id in visit_doctors:
        unique_doctors.append({
            "doctor_id": doc_id,
            "doctor_name": doctor_map.get(doc_id, f"دكتور {doc_id}")
        })

    return unique_doctors