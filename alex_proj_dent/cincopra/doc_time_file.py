#doc_time_file.py
from django.shortcuts import render
from django.http import JsonResponse
from ..view.db_process import process_db_ora_mysql


def doctors_screen_time(request):
    db = process_db_ora_mysql()
   
    CLEN=f"CLIN{request.session.get('clinic_id')}"
    get_doctors = {CLEN:[{"select":True,"condition":"1=1 ORDER BY DOCTOR_NAME"}]}
    doctors = db.execute_bulk(get_doctors)
    doctors_list = doctors.get("select", {}).get(CLEN, [])
    return render(request, "doc_tim.html", {"doctors": doctors_list})

# views.py


def get_doctor_details_time(request):
    db = process_db_ora_mysql()
    """
    🔹 جلب بيانات الدكتور وجدول فترات عمله لكل يوم
    - doctor_id: يتم الحصول منه على الترميز من GET
    - جدول الدكتور: CLIN_SURGERY_DOC_TIME
    - جدول الفترات: VISIT_PERIODS (لعرض أسماء الفترات)
    """
    doctor_id = request.GET.get("doctor_id")
    if not doctor_id:
        return JsonResponse({"error": "Doctor ID missing"}, status=400)
    CLEN=f"CLIN{request.session.get('clinic_id')}"
    
    # 🔹 جلب بيانات الدكتور من جدول الأطباء (يمكنك تعديل اسم الجدول والحقول حسب مشروعك)
    doctor_data = db.execute_bulk({
        CLEN: [{"select": True, "condition": f"DOCTOR_ID={doctor_id}"}]
    })
    doctor_rows = doctor_data.get("select", {}).get(CLEN, [])
    if not doctor_rows:
        return JsonResponse({"doctor": None})

    doctor = doctor_rows[0]
     
    CLIN_DOC_TIME=f"DOC_TIME_CLIN{request.session.get('clinic_id')}"
    # 🔹 جلب جدول الفترات المحفوظة لهذا الدكتور من CLIN_SURGERY_DOC_TIME
    schedule_data = db.execute_bulk({
        CLIN_DOC_TIME: [{"select": True, "condition": f"DOCTOR_ID={doctor_id}"}]
    })
    schedule_rows = schedule_data.get("select", {}).get(CLIN_DOC_TIME, [])
    print("chedule_rowschedule_rowschedule_rowschedule_rows====================",schedule_rows)
    if schedule_rows:
        schedule_row = schedule_rows[0]
    else:
        # 🔹 إذا لا يوجد جدول، نهيئ كل الأيام فارغة
        schedule_row = {day: "" for day in ["SATURDAY","SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"]}

    # 🔹 الناتج النهائي لكل يوم: سلسلة الأرقام كما هي مخزنة
    days = ["SATURDAY","SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"]
    schedule = {}
    for day in days:
        schedule[day] = schedule_row.get(day) or ""  # "" إذا لا توجد فترات

    return JsonResponse({
        "doctor": doctor,
        "schedule": schedule  # 🔹 هذا يتوافق مع الكود JS
    })
#______________________________________________________

def save_doctor_time(request):
    db = process_db_ora_mysql()
    if request.method != "POST":
        return JsonResponse({"error": "غير مسموح"})
    data = request.POST
    doctor_id = data.get("doctor_id")
    if not doctor_id:
        return JsonResponse({"error": "رقم الدكتور غير موجود"})

    days = ["SATURDAY","SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"]

    # جمع الفترات لكل يوم
    periods = {}
    CLIN_DOC_TIME=f"DOC_TIME_CLIN{request.session.get('clinic_id')}"
    print("tab_CLIN_DOC_TIME=",CLIN_DOC_TIME," doctor_id =", doctor_id )
    for day in days:
        value = data.get(day)
        periods[day] = value if value else None

    # 🔎 تحقق هل يوجد سجل مسبق للدكتور
    check_query = {
        CLIN_DOC_TIME: [
            {"select": True, "condition": f"DOCTOR_ID = {doctor_id}"}
        ]
    }
    existing = db.execute_bulk(check_query)
    existing_rows = existing.get("select", {}).get(CLIN_DOC_TIME, [])

    if existing_rows:
        # 🔄 تحديث السجل لو موجود
        update_data = {
           CLIN_DOC_TIME: [
                {
                    "update": True,
                    "set": periods,
                    "condition": f"DOCTOR_ID = {doctor_id}"
                }
            ]
        }
        db.execute_bulk(update_data)
    else:
        print("tab_CLIN_DOC_TIME2=",CLIN_DOC_TIME," doctor_id2 =", doctor_id )
        # 🆕 إدخال جديد مع DOCTOR_ID
        insert_data = {
            CLIN_DOC_TIME: [
                {"insert": True, "DOCTOR_ID": doctor_id, **periods}
            ]
        }
        db.execute_bulk(insert_data)

    return JsonResponse({"success": True})

#______________________________________________

def get_visit_periods(request):
    db = process_db_ora_mysql()
    day = request.GET.get("day")
    print(" day  day  day  day  day  day  day  day ", day )
    get_periods = {"VISIT_PERIODS":[{"select":True,"condition":"1=1 ORDER BY START_TIME"}]}
    periods_result = db.execute_bulk(get_periods)
    periods = periods_result.get("select", {}).get("VISIT_PERIODS", [])
    return JsonResponse({"periods": periods})
    #_______________________________________________________
    
#