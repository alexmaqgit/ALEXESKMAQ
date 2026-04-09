from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from ..view.db_process import process_db_ora_mysql

# -------------------------------
# 1️⃣ عرض صفحة اختيار الأدوية
# -------------------------------
def patient_treatment_view(request):
    return render(request, 'PATIENT_TREATMENT.html')


# -------------------------------
# 2️⃣ جلب كل الأدوية باستخدام TRAMO
# -------------------------------
@csrf_exempt
def get_dental_treatments_tramo(request):
    try:
        db = process_db_ora_mysql()

        tramo = {
            "DENTAL_DRUG": [
                {"select": True, "order_by": "TREATMENT_NAME"}
            ]
        }

        result = db.execute_bulk(tramo)

        # جلب البيانات الحقيقية
        raw_treatments = result.get('select', {}).get('DENTAL_DRUG', [])
        #print(" raw_treatments raw_treatments raw_treatments raw_treatments raw_treatments", raw_treatments)
        # تحويل LOB إلى نص
        treatments = []
        for t in raw_treatments:
            instructions = t.get('USAGE_INSTRUCTIONS')
            if hasattr(instructions, 'read'):
                instructions = instructions.read()  # قراءة محتوى LOB
            treatments.append({
                'id': t.get('ID'),
                'name': t.get('TREATMENT_NAME'),
                'instructions': instructions
            })
        #print("treatments+++++++++++++++++++++++++++++++++++++++++++++++++++treatments",treatments)
        return JsonResponse(treatments, safe=False)

    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)})


# -------------------------------
# 3️⃣ حفظ أدوية المريض باستخدام TRAMO
# -------------------------------

@csrf_exempt
def save_patient_treatments_tramo(request):
    db = process_db_ora_mysql()
    doct_id=request.session.get("doc_id") 
    if request.method != 'POST':
        return JsonResponse({"success": False, "message": "الطريقة غير مسموحة"})

    try:
        data = json.loads(request.body)
        patient_id = int(data.get('patient_id'))
        doctor_id = int(doct_id)#int(data.get('doctor_id', ))
        visit_number = int(data.get('visit_number', 1))
        add_codes = data.get('add_codes', [])
        remove_codes = data.get('remove_codes', [])

        # جلب العلاجات القديمة إن وجدت
        tramo_select = {
            "PATIENT_TREATMENTS": [
                {
                    "select": True,
                    "condition": f"PATIENT_ID={patient_id} AND DOCTOR_ID={doctor_id} AND VISIT_NUMBER={visit_number}"
                }
            ]
        }
        result = db.execute_bulk(tramo_select)
        old_codes = []
        rows = result.get("select", {}).get("PATIENT_TREATMENTS", [])
        if rows:
            old_codes = (rows[0].get("TREATMENT_CODES") or "").split("-")

        # دمج الإضافات والإزالات
        final_codes = set(old_codes)
        final_codes.update(str(c) for c in add_codes)
        final_codes.difference_update(str(c) for c in remove_codes)

        # حفظ النتيجة، إذا سجل جديد يقوم بعمل insert
        tramo_update = {
            "PATIENT_TREATMENTS": [
                {"delete": True,
                 "condition": f"PATIENT_ID={patient_id} AND DOCTOR_ID={doctor_id} AND VISIT_NUMBER={visit_number}"},
                {"insert": True,
                 "PATIENT_ID": patient_id,
                 "DOCTOR_ID": doctor_id,
                 "VISIT_NUMBER": visit_number,
                 "TREATMENT_CODES": "-".join(final_codes) if final_codes else "0"}  # تجنب None
            ]
        }

        db.execute_bulk(tramo_update)
        db.connection.commit()

        return JsonResponse({"success": True, "message": "تم حفظ التعديلات بنجاح"})

    except Exception as e:
        db.connection.rollback()
        return JsonResponse({"success": False, "message": str(e)})# -------------------------------
# 4️⃣ جلب أدوية المريض مع تفاصيل كاملة
# -------------------------------
@csrf_exempt
def get_patient_treatments(request):
    db = process_db_ora_mysql()

    try:
        # --- قراءة patient_id و visit_number ---
        patient_id = int(request.GET.get('patient_id') or 0)
        visit_number = int(request.GET.get('visit_number') or 0)

        # --- قراءة doctor_id من GET أو session ---
        doctor_id_str = request.GET.get('doctor_id') or request.session.get("doc_id")
        if not doctor_id_str:
            return JsonResponse([], safe=False)
        try:
            doctor_id = int(doctor_id_str)
        except ValueError:
            doctor_id = int(request.session.get("doc_id") or 0)

        # --- الاتصال بقاعدة البيانات ---
       
        # --- جلب العلاجات للمريض في زيارة محددة ---
        tramo = {
            "PATIENT_TREATMENTS": [
                {
                    "select": True,
                    "condition": f"PATIENT_ID={patient_id} AND DOCTOR_ID={doctor_id} AND VISIT_NUMBER={visit_number}"
                }
            ]
        }

        result = db.execute_bulk(tramo)
        rows = result.get("select", {}).get("PATIENT_TREATMENTS", [])

        if not rows:
            return JsonResponse([], safe=False)

        codes_list = [(c or "").strip() for c in (rows[0].get("TREATMENT_CODES") or "").split("-") if c.strip()]

        if not codes_list:
            return JsonResponse([], safe=False)

        # --- تحسين: جلب كل العلاجات في استعلام واحد باستخدام IN ---
        codes_str = ",".join(codes_list)
        tramo2 = {
            "DENTAL_DRUG": [
                {"select": True, "condition": f"ID IN ({codes_str})"}
            ]
        }

        result2 = db.execute_bulk(tramo2)
        treatment_rows = result2.get("select", {}).get("DENTAL_DRUG", [])

        clean_data = []
        for t in treatment_rows:
            instructions = t.get("INSTRUCTIONS") or t.get("USAGE_INSTRUCTIONS")
            if hasattr(instructions, "read"):
                instructions = instructions.read()
            clean_data.append({
                "id": t.get("ID"),
                "name": t.get("TREATMENT_NAME"),
                "instructions": instructions or ""
            })

        return JsonResponse(clean_data, safe=False)

    except Exception as e:
        print("ERROR in get_patient_treatments:", str(e))
        return JsonResponse([], safe=False)