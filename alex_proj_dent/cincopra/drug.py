import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
from ..view.db_process import process_db_ora_mysql

db = process_db_ora_mysql()

@csrf_exempt
def drug_page(request):
    return render(request, "drug.html", {"clin_id": request.session.get("clinic_id", "")})

# =========================================
# جلب الأدوية (باستخدام execute_bulk)
# =========================================

@csrf_exempt
def get_drugs(request):
    try:
        query = request.GET.get("q", "").strip()
        page = int(request.GET.get("page", 1))
        page_size = int(request.GET.get("page_size", 20))
        offset = (page - 1) * page_size

        # استخدام execute_bulk لجلب جميع الأدوية
        result = db.execute_bulk({
            "DENTAL_DRUG": [{"select": True}]
        })
        
        all_drugs = result.get("select", {}).get("DENTAL_DRUG", [])
        
        # تصفية النتائج حسب البحث (إذا وجد)
        if query:
            query_upper = query.upper()
            filtered_drugs = []
            for drug in all_drugs:
                treatment_name = drug.get("TREATMENT_NAME", "") or ""
                if query_upper in treatment_name.upper():
                    filtered_drugs.append(drug)
            all_drugs = filtered_drugs
        
        total = len(all_drugs)
        
        # تقسيم النتائج على الصفحات
        drugs_page = all_drugs[offset:offset + page_size]
        
        # تحويل النتائج إلى الشكل المطلوب
        drugs = []
        for drug in drugs_page:
            drugs.append({
                "id": drug.get("ID"),
                "treatment_name": drug.get("TREATMENT_NAME") or "",
                "usage_instructions": drug.get("USAGE_INSTRUCTIONS") or "",
                "clin_id": str(drug.get("CLIN_ID") or "")
            })

        return JsonResponse({
            "success": True,
            "drugs": drugs,
            "total": total,
            "page": page,
            "has_more": offset + page_size < total
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({"success": False, "message": str(e)})

# =========================================
# إضافة دواء (باستخدام execute_bulk)
# =========================================

@csrf_exempt
def add_drug(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Method not allowed"})
    try:
        data = json.loads(request.body)
        
        # الحصول على ID جديد
        all_drugs = db.execute_bulk({
            "DENTAL_DRUG": [{"select": True}]
        }).get("select", {}).get("DENTAL_DRUG", [])
        
        max_id = 0
        for drug in all_drugs:
            drug_id = drug.get("ID")
            if drug_id and drug_id > max_id:
                max_id = drug_id
        new_id = max_id + 1
        
        # إضافة الدواء
        db.execute_bulk({
            "DENTAL_DRUG": [{
                "insert": True,
                "ID": new_id,
                "TREATMENT_NAME": data.get("treatment_name", "").strip(),
                "USAGE_INSTRUCTIONS": data.get("usage_instructions", ""),
                "CLIN_ID": data.get("clin_id", "").strip()
            }]
        })
        
        db.connection.commit()
        return JsonResponse({"success": True, "message": "تمت الإضافة", "new_id": new_id})
    except Exception as e:
        db.connection.rollback()
        return JsonResponse({"success": False, "message": str(e)})

# =========================================
# تحديث دواء (باستخدام execute_bulk)
# =========================================

@csrf_exempt
def update_drug(request, drug_id):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "Method not allowed"})
    try:
        data = json.loads(request.body)
        
        updates = {}
        if "treatment_name" in data and data["treatment_name"]:
            updates["TREATMENT_NAME"] = data["treatment_name"]
        if "usage_instructions" in data:
            updates["USAGE_INSTRUCTIONS"] = data["usage_instructions"]
        if "clin_id" in data and data["clin_id"]:
            updates["CLIN_ID"] = data["clin_id"]
        
        if not updates:
            return JsonResponse({"success": False, "message": "No data"})
        
        db.execute_bulk({
            "DENTAL_DRUG": [{
                "update": True,
                "set": updates,
                "condition": f"ID = {drug_id}"
            }]
        })
        
        db.connection.commit()
        return JsonResponse({"success": True, "message": "تم التحديث"})
    except Exception as e:
        db.connection.rollback()
        return JsonResponse({"success": False, "message": str(e)})

# =========================================
# حذف دواء (باستخدام execute_bulk)
# =========================================

@csrf_exempt
def delete_drug(request, drug_id):
    if request.method != "DELETE":
        return JsonResponse({"success": False, "message": "Method not allowed"})
    try:
        db.execute_bulk({
            "DENTAL_DRUG": [{
                "delete": True,
                "condition": f"ID = {drug_id}"
            }]
        })
        
        db.connection.commit()
        return JsonResponse({"success": True, "message": "تم الحذف"})
    except Exception as e:
        db.connection.rollback()
        return JsonResponse({"success": False, "message": str(e)})