# booking_code.py
from django.shortcuts import render
from django.http import JsonResponse
from .proidtime import VisitPeriodsManager
from django.views.decorators.csrf import csrf_exempt
import json

# مدير الفترات
manager = VisitPeriodsManager()

# ==================================================
# صفحة إدارة الفترات
# ==================================================
def visit_periods_view(request):
    #manager.ensure_table()
    return render(request, "visit_periods.html")

# ==================================================
# إنشاء جدول الفترات إذا لم يكن موجود
# ==================================================
def create_visit_periods_table(request):
    if request.method == "POST":
        res = manager.ensure_table()
        return JsonResponse(res)
    return JsonResponse({"success": False, "message": "غير مسموح"})

# ==================================================
# إضافة أو تعديل فترة
# ==================================================

@csrf_exempt
def add_visit_period(request):
    if request.method == "POST":
        data = json.loads(request.body)

        period_number = data.get("period_number")
        start_time = data.get("start_time")
        end_time = data.get("end_time")

        # تحقق هل السجل موجود
        existing = manager.get_period_by_number(period_number)

        if existing:
            res = manager.update_period(period_number, start_time, end_time)
        else:
            res = manager.add_period(period_number, start_time, end_time)

        return JsonResponse(res)

    return JsonResponse({"success": False, "message": "غير مسموح"})

# ==================================================
# جلب كل الفترات
# ==================================================
def list_visit_periods(request):
    periods = manager.get_periods()
    print(" def list_visit_periods(request)++++++++++++++r periods = manager.get_periods()",periods)
    return JsonResponse({"periods": periods})

# ==================================================
# حذف فترة
# ==================================================
# حذف فترة
@csrf_exempt
def delete_visit_period(request, period_number):
    if request.method == "POST":
        res = manager.delete_period(period_number)  # صححت الاسم هنا
        return JsonResponse(res)
    return JsonResponse({"success": False, "message": "غير مسموح"})


# ==================================================
# صفحة الحجز الرئيسية
# ==================================================
def booking_view(request):
    return render(request, "booking.html")
