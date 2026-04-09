import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from ..view.db_process import process_db_ora_mysql

# ------------------- Helpers -------------------
def keys_upper(d):
    """تحويل كل مفاتيح dict إلى UPPERCASE لتتوافق مع Oracle"""
    return {k.upper(): v for k, v in d.items()}

# ------------------- Views -------------------
@csrf_exempt
def services_page(request):
    """صفحة الخدمات HTML"""
    return render(request, "servprac.html")

@csrf_exempt
def get_services(request):
    print("💡 get_services reached")
    db = process_db_ora_mysql()

    SERVICE_PRICE_TAB=f"SERVICE_PRICE_CLIN{request.session.get('clinic_id')}"
    try:
        query = {SERVICE_PRICE_TAB: [{"select": True}]}
        result = db.execute_bulk(query)
        services_raw = result.get("select", {}).get(SERVICE_PRICE_TAB, [])
        # تحويل المفاتيح إلى UPPERCASE لتوافق JS
        services = [keys_upper(s) for s in services_raw]
        print("💡 get_services response:", services)
        return JsonResponse({"success": True, "services": services})
    except Exception as e:
        return JsonResponse({"success": False, "services": [], "error": str(e)})

@csrf_exempt
def manage_services(request):
    print("💡 manage_services reached")
    db = process_db_ora_mysql()

    if request.method != "POST":
        return JsonResponse({"success": False, "message": "الطريقة غير مسموحة"})

    try:
        data = json.loads(request.body)
        service_tab = data.get("service_price_tab", [])
        print("💡 Payload:", service_tab)
        SERVICE_PRICE_TAB=f"SERVICE_PRICE_CLIN{request.session.get('clinic_id')}"
        for s in service_tab:
            if s.get("insert"):
                # طريقة الإضافة بدون "set" - نفس أسلوب CLIN_SURGERY_DOC_TIME
                insert_data = {
                    SERVICE_PRICE_TAB: [
                        {"insert": True, **keys_upper(s["set"])}
                    ]
                }
                db.execute_bulk(insert_data)

            elif s.get("update"):
                db.execute_bulk({
                    SERVICE_PRICE_TAB: [{
                        "update": True,
                        "set": keys_upper(s["set"]),
                        "condition": s["condition"]
                    }]
                })

            elif s.get("delete"):
                db.execute_bulk({
                    SERVICE_PRICE_TAB: [{
                        "delete": True,
                        "condition": s["condition"]
                    }]
                })

        db.connection.commit()
        return JsonResponse({"success": True})

    except Exception as e:
        db.connection.rollback()
        return JsonResponse({"success": False, "error": str(e)})
