# alex_proj_dent/view/views.py
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
import datetime
from ..view.db_process import process_db_ora_mysql

# استدعاء الصلاحيات
from .permissions import *


# =========================================
# ✅ دالة موحدة لجلب العيادات (حل احترافي)
# =========================================
def get_clinics_list():
    db = process_db_ora_mysql()
    tramo = {"MEDICAL_CLINICS": [{"select": True}]}
    res = db.execute_bulk(tramo)

    clens_active = [
        b for b in res["select"].get("MEDICAL_CLINICS", [])
        if b.get('STATE') == 1
    ]

    return sorted(clens_active, key=lambda x: x.get('CLINIC_ID', 0))


# =========================================
@csrf_exempt
def login_page(request):
    """عرض صفحة تسجيل الدخول"""
    clens_sorted = get_clinics_list()
    return render(request, "loginclen.html", {"clen": clens_sorted})


# =========================================
@csrf_exempt
def login_system(request):
    """معالجة بيانات تسجيل الدخول"""
    if request.method != 'POST':
        return redirect('login_page')
    
    username = request.POST.get('username', '').strip()
    password = request.POST.get('password', '').strip()
    clinic_id = request.POST.get('clinic_code', '').strip()

    request.session["clinic_code"] = clinic_id

    # ✅ إذا كانت البيانات فارغة
    if not username or not password:
        messages.error(request, '❌ الرجاء إدخال اسم المستخدم وكلمة المرور')
        return render(request, "loginclen.html", {
            "error": "❌ الرجاء إدخال اسم المستخدم وكلمة المرور",
            "clen": get_clinics_list()
        })

    try:
        db = process_db_ora_mysql()
        today = datetime.date.today()

        # 🔹 التحقق من صلاحية النظام
        tramo = {
            "SUPERVISOR_TAB": [{
                "select": True,
                "condition": f"END_DATE >= TO_DATE('{today}', 'YYYY-MM-DD')"
            }]
        }
        supervisor_valid = db.execute_bulk(tramo).get("select", {}).get("SUPERVISOR_TAB", [])

        if not supervisor_valid:
            return render(request, "system_expired.html")

        # 🔹 التحقق من المشرف العام
        tramo = {
            "SUPERVISOR_TAB": [{
                "select": True,
                "condition": f"USERNAME='{username}' AND PASSWORD='{password}'"
            }]
        }
        sup_user = db.execute_bulk(tramo).get("select", {}).get("SUPERVISOR_TAB", [])

        if sup_user:
            request.session["user"] = username
            request.session["user_type"] = "supervisor"
            
            # الحصول على الرابط المحفوظ للعودة
            next_url = request.session.pop('next_url', None)
            print(f"🔗 Next URL: {next_url}")  # للاختبار
            
            if next_url and next_url != '/':
                messages.success(request, f'✨ مرحباً {username}، تم تسجيل الدخول بنجاح')
                return redirect(next_url)
            
            messages.success(request, f'✨ مرحباً {username}، تم تسجيل الدخول بنجاح')
            return redirect('/supervisor_home/')

        # 🔹 التحقق من الموظف الإداري
        tramo = {
            "ADMIN_STAFF_TAB": [{
                "select": True,
                "condition": f"USERNAME='{username}' AND PASSWORD='{password}'"
            }]
        }
        admin_user = db.execute_bulk(tramo).get("select", {}).get("ADMIN_STAFF_TAB", [])

        if admin_user:
            request.session["user"] = username
            request.session["user_type"] = "admin_staff"
            
            # الحصول على الرابط المحفوظ للعودة
            next_url = request.session.pop('next_url', None)
            print(f"🔗 Next URL: {next_url}")  # للاختبار
            
            if next_url and next_url != '/':
                messages.success(request, f'✨ مرحباً {username}، تم تسجيل الدخول بنجاح')
                return redirect(next_url)
            
            messages.success(request, f'✨ مرحباً {username}، تم تسجيل الدخول بنجاح')
            return redirect('/supervisor_home/')

        # 🔹 التحقق من مدير العيادة
        tramo = {
            "MEDICAL_CLINICS": [{
                "select": True,
                "condition": f"USERNAME='{username}' AND PASSWORD='{password}'"
            }]
        }
        clinic_admin = db.execute_bulk(tramo).get("select", {}).get("MEDICAL_CLINICS", [])

        if clinic_admin:
            request.session["user"] = username
            request.session["user_type"] = "clinic_admin"
            request.session["clinic_id"] = clinic_admin[0]["CLINIC_ID"]
            
            # الحصول على الرابط المحفوظ للعودة
            next_url = request.session.pop('next_url', None)
            print(f"🔗 Next URL: {next_url}")  # للاختبار
            
            if next_url and next_url != '/':
                messages.success(request, f'✨ مرحباً {username}، تم تسجيل الدخول بنجاح')
                return redirect(next_url)
            
            messages.success(request, f'✨ مرحباً {username}، تم تسجيل الدخول بنجاح')
            return redirect('/supervisor_home/')

        # 🔹 التحقق من الطبيب
        if clinic_id:
            clinic_table = f"CLIN{clinic_id}"
            tramo = {
                clinic_table: [{
                    "select": True,
                    "condition": f"USERNAME='{username}' AND PASSWORD='{password}'"
                }]
            }
            users = db.execute_bulk(tramo).get("select", {}).get(clinic_table, [])

            if users:
                request.session["user"] = username
                request.session["user_type"] = "normal"
                request.session["doc_id"] = users[0]['DOCTOR_ID']
                request.session["clinic_id"] = clinic_id
                
                # الحصول على الرابط المحفوظ للعودة
                next_url = request.session.pop('next_url', None)
                print(f"🔗 Next URL: {next_url}")  # للاختبار
                
                if next_url and next_url != '/':
                    messages.success(request, f'✨ مرحباً د.{username}، تم تسجيل الدخول بنجاح')
                    return redirect(next_url)
                
                messages.success(request, f'✨ مرحباً د.{username}، تم تسجيل الدخول بنجاح')
                return redirect('/doc_jop/')

    except Exception as e:
        print("login error:", e)
        messages.error(request, '❌ حدث خطأ في النظام، الرجاء المحاولة لاحقاً')

    # ❌ في حالة فشل تسجيل الدخول
    messages.error(request, '❌ اسم المستخدم أو كلمة المرور غير صحيحة')
    return render(request, "loginclen.html", {
        "error": "❌ اسم المستخدم أو كلمة المرور غير صحيحة",
        "clen": get_clinics_list()
    })


# =========================================
@csrf_exempt
def check_user_type(request):
    """التحقق من نوع المستخدم"""
    username = request.GET.get("username", "").strip()
    db = process_db_ora_mysql()

    try:
        tramo = {"SUPERVISOR_TAB": [{"select": True, "condition": f"USERNAME='{username}'"}]}
        sup = db.execute_bulk(tramo).get("select", {}).get("SUPERVISOR_TAB", [])
        if sup:
            return JsonResponse({"type": "supervisor"})

        tramo = {"MEDICAL_CLINICS": [{"select": True, "condition": f"USERNAME='{username}'"}]}
        clinic_admin = db.execute_bulk(tramo).get("select", {}).get("MEDICAL_CLINICS", [])
        if clinic_admin:
            return JsonResponse({"type": "clinic_admin"})

        tramo = {"ADMIN_STAFF_TAB": [{"select": True, "condition": f"USERNAME='{username}'"}]}
        admin_staff = db.execute_bulk(tramo).get("select", {}).get("ADMIN_STAFF_TAB", [])
        if admin_staff:
            return JsonResponse({"type": "admin_staff"})

    except Exception as e:
        print("check_user_type error:", e)

    return JsonResponse({"type": "normal"})


# =========================================
@csrf_exempt
def supervisor_home(request):
    """الصفحة الرئيسية للمشرف"""
    # 🔥 أضف هذا للاختبار
    print(f"👤 User in supervisor_home: {request.session.get('user')}")
    print(f"🔑 User type: {request.session.get('user_type')}")
    
    perms = {
        "add_clinic": can_create_clinic(request.session),
        "add_doctor": can_add_doctor(request.session),
        "services": can_manage_services(request.session),
        "doc_jop": can_view_doctor_screen(request.session),
        "booking": can_booking(request.session),
        "add_patient": can_add_patient(request.session),
        "visit_periods": can_visit_periods(request.session),
        "payments": can_payments(request.session),
        "patient_drugs": can_patient_drugs(request.session),
        "doctor_schedule": can_doctor_schedule(request.session),
    }

    return render(request, "supervisor_home.html", {"perms": perms})


# =========================================
@csrf_exempt
def logout_view(request):
    """تسجيل الخروج"""
    print("👋 Logging out user...")  # للاختبار
    
    # حذف الرابط المحفوظ للعودة
    if 'next_url' in request.session:
        del request.session['next_url']
    
    # مسح جميع بيانات الجلسة
    request.session.flush()
    
    # إضافة رسالة نجاح
    messages.success(request, '👋 تم تسجيل الخروج بنجاح')
    
    # التحويل إلى صفحة تسجيل الدخول
    return redirect('login_page')