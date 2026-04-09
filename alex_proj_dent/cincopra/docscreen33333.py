from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
from django.shortcuts import render
import json, datetime, logging
from ..view.db_process import process_db_ora_mysql

logger = logging.getLogger(__name__)

# ==================================
# عرض شاشة متابعة خطة العلاج
# ==================================
#@csrf_exempt
#def docscreen_view(request):
    #return render(request, "docscreen.html")

#@csrf_exempt
#def tstdrop(request):
   # return render(request, "tstdrop.html")



# ==================================
# جلب زيارات المريض مع الخدمات والفحوصات
# ==================================


from django.test import RequestFactory

from ..cincopra.PATIENT_TREATMENTS import get_patient_treatments
@csrf_exempt
def get_patient_visits(request):
    clin_id= request.session.get("clinic_id")
    '''db = process_db_ora_mysql()
    factory = RequestFactory()#شاشة وهمية لجلبت العلاجات
    doctor_id=request.session.get("doc_id") 
    print("doctor_iddoctor_iddoctor_iddoctor_iddoctor_id_from_get_patient_visits",doctor_id)
    try:
        q = request.GET.get("q")
        if not q:
            return JsonResponse({"success": False, "message": "No patient id provided"})

        # ---- بيانات المريض ----
        patient_row = db.execute_bulk({
            "PATIENT_RECORDS": [{"select": True,"condition" :f" FILE_PAT_NO= {q}"}]
        }).get("select", {}).get("PATIENT_RECORDS", [])

        patient_name = patient_row[0]["PATIENT_NAME"] if patient_row else "غير محدد"
        request.session["pai_id"]=q 
        # ---- الفحوصات ----
        exam_rows = db.execute_bulk({"LAB_IM_EX":[{"select": True}]}).get("select", {}).get("LAB_IM_EX", [])
        exams_dict = {str(r.get("ID")): r.get("EXAM_NAME") for r in exam_rows}

        # ---- الخدمات ----
        servicetab=f"SERVICE_PRICE_CLIN{clin_id}"
        service_rows = db.execute_bulk({servicetab:[{"select": True}]}).get("select", {}).get(servicetab, [])
        services_dict = {str(r.get("SERVICE_ID")): r.get("SERVICE_NAME") for r in service_rows}

        # ---- الفترات ----
        res = db.execute_bulk({"VISIT_PERIODS":[{"select": True}]})
        prio_time_list = res.get("select", {}).get("VISIT_PERIODS", [])
    #---------------------------------------------
      
        visttab=f"VISITS_CLIN{clin_id}"
        # ---- الزيارات ----
        visit_rows = db.execute_bulk({
        visttab: [{
                "select": True,
                "condition": f"PATIENT_NO={q} AND DOCTOR_ID={doctor_id}"
            }]
        }).get("select", {}).get(visttab, [])
        #print("  visit_rows  visit_rows  visit_rows  visit_rows  visit_rows  visit_rows  visit_rows=",  visit_rows)

        visits_list = []

        for r in visit_rows:

            visit_number = r.get("VISIT_NUMBER")
            doctor_id = r.get("DOCTOR_ID") 
            visit_date = str(r.get("VISIT_DATE")) if r.get("VISIT_DATE") else ""

            # ---- الفحوصات ----
            exams_field = r.get("EXAMS") or ""
            exam_ids = [x.strip() for x in str(exams_field).split(",") if x.strip()]
            exams_names = ', '.join([exams_dict.get(str(x), str(x)) for x in exam_ids])

            # ---- الخدمات ----
            treatment_field = r.get("TREATMENT") or ""
            treatment_ids = [x.strip() for x in str(treatment_field).split(",") if x.strip()]
            treatment_names = ', '.join([services_dict.get(str(x), str(x)) for x in treatment_ids])

            # ---- الفترة ----
            pri_no = int(r.get("PERIOD_NO") or 0)
            prio_time = ""
            for p in prio_time_list:
                if p["PERIOD_NUMBER"] == pri_no:
                    prio_time = f"{p['START_TIME']} - {p['END_TIME']}"
                    break
          
                   
                   
                  
            # ---- العلاجات المفصلة ----
            fake_request = factory.get('/fake-url/', {
                'patient_id': q,
                "doctor_id": str(doctor_id),
                'visit_number': visit_number
            })

            response = get_patient_treatments(fake_request)
            treatments_details = json.loads(response.content)
            medcen = ', '.join([t.get("name", "") for t in treatments_details])

            visits_list.append({
                "visit_number": visit_number,
                "period_no": prio_time,
                "treatment": treatment_names,
                "exams": exams_names,
                "visit_date": visit_date,
                "note": r.get("NOTE"),
                "book_confirmation": r.get("BOOK_CONFIRMATION"),
                "medcen": medcen
            })
        #print(" visits_list visits_list visits_list visits_list visits_list+++++++++++++++++++++ visits_list", visits_list)
        # ✅ return خارج الحلقة
        return JsonResponse({
            "success": True,
            "patient_id": q,
            "patient_name": patient_name,
            "visits": visits_list
        })

    except Exception as e:
        print("ERROR in get_patient_visits:", str(e))
        return JsonResponse({"success": False, "message": str(e)})
        '''
#==========================================================================  
# '''  
@csrf_exempt
def add_patient_visit(request, patient_id):
    db = process_db_ora_mysql()
    '''  if request.method != "POST":
        return JsonResponse({"success": False, "message": "غير مسموح"})

    data = json.loads(request.body)
    clinic_id=data.get("clinic") or request.session.get("clinic_id")
    print("clinic__clinic__clinic==",clinic_id)
    doctor_id =request.session.get("doc_id") #الاضافة الاخيرة لتطوير الكود

    try:
        insert_data = {
            "DOCTOR_ID": doctor_id,
            "PATIENT_NO": int(patient_id),
            "PERIOD_NO": data.get("timeSlot"),
            "BOOK_CONFIRMATION": 0,
            "TREATMENT": data.get("treatment"),  # يمكن أن يكون ,2,3,5,
            "EXAMS": data.get("exams"),          # يمكن أن يكون ,1,4,
            "VISIT_DATE": data.get("visit_date"),
            "NOTE": data.get("note"),
            "MEDCEN":""
        }
        #---------------------------------------------
        #clinic_id = request.GET.get("clinic_id") or request.session.get("clinic_id")
        visttab=f"VISITS_CLIN{clinic_id}"
        print("-=-==-data-=add_patient_visit-=",visttab,"insert_data==========s",insert_data)
        db.execute_bulk({visttab: [{"insert": True, **insert_data}]})
        db.connection.commit()
        return JsonResponse({"success": True, "message": "تمت إضافة الجلسة بنجاح"})
    except Exception as e:
        db.connection.rollback()
        return JsonResponse({"success": False, "message": str(e)})


# ==================================
# تعديل زيارة
# ==================================

@csrf_exempt
def update_patient_visit(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "غير مسموح"})

    data = json.loads(request.body)
    db = process_db_ora_mysql()
    
    visit_number = data.get("visit_number")
    #doctor_id = data.get("doctor_id")
    doctor_id =request.session.get("doc_id") or data.get("doctor_id")
    print(" doctor_id doctor_id^visit_numbervisit_number", doctor_id,visit_number,  doctor_id)
    if not visit_number or not doctor_id:
        return JsonResponse({"success": False, "message": "رقم الزيارة أو رقم الدكتور مفقود"})
    dec_data={"NOTE": data.get("note"),
              "TREATMENT":data.get("treatment"),
              "EXAMS":data.get("exams")
    }
    clin_id= request.session.get("clinic_id")
    visttab=f"VISITS_CLIN{clin_id}"
    try:
        tramo = {
            visttab: [
                {
                    "update": True,
                    "set": dec_data,
                    "condition": f"VISIT_NUMBER={visit_number} AND DOCTOR_ID={doctor_id}"
                }
            ]
        }
        db.execute_bulk(tramo)
        db.connection.commit()
        return JsonResponse({"success": True, "message": "تم تعديل الجلسة بنجاح"})
    except Exception as e:
        db.connection.rollback()
        return JsonResponse({"success": False, "message": str(e)})# حذف زيارة
# ==================================
'''
'''
# ==================================
# جلب الخدمات للفورم
# ==================================
@csrf_exempt
def get_services_for_select(request):
    clin_id=request.session.get("clinic_id")
   servicetab=f"SERVICE_PRICE_CLIN{clin_id}"
    print(" from_get_services_for_select \servicetab servicetab servicetab",servicetab)
    db = process_db_ora_mysql()
    try:
        rows = db.execute_bulk({ servicetab: [{"select": True}]}).get("select", {}).get(servicetab, [])
        services = [{"id": r.get("SERVICE_ID"), "name": r.get("SERVICE_NAME")} for r in rows]
        return JsonResponse({"success": True, "services": services})
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)})


# ==================================
# جلب الفحوصات للفورم
# ==================================
@csrf_exempt
def get_exams_for_select(request):
    db = process_db_ora_mysql()
   
    try:
        
        rows = db.execute_bulk({"LAB_IM_EX":[{"select": True}]}).get("select", {}).get("LAB_IM_EX", [])
        exams = [{"id": r.get("ID"), "name": r.get("EXAM_NAME")} for r in rows]
        #print(" exams exams exams exams exams exams exams exams exams exams exams==", exams)
        return JsonResponse({"success": True, "exams": exams})
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)})


# ==================================
# جلب الفترات المتاحة
# ==================================
@csrf_exempt
def get_available_periods(request):
    db = process_db_ora_mysql()
    
    # ✅ الطريقة الصحيحة لجلب البيانات من GET request
    doctor_id = request.GET.get("doctor_id")
    visit_date = request.GET.get("visit_date")
    clinic_id = request.GET.get("clinic_id") or request.session.get("clinic_id")
    
    print(f"🔍 get_available_periods - doctor_id: {doctor_id}")
    print(f"🔍 get_available_periods - visit_date: {visit_date}")
    print(f"🔍 get_available_periods - clinic_id: {clinic_id}")
    
    # ✅ التحقق من وجود البيانات المطلوبة
    if not doctor_id or not visit_date:
        return JsonResponse({
            "success": False, 
            "message": "مفقود doctor_id أو visit_date",
            "periods": []
        })
    
    try:
        # تحويل doctor_id إلى integer
        doctor_id = int(doctor_id)
        
        # اسم جدول مواعيد الدكتور
        timetab = f"DOC_TIME_CLIN{clinic_id}"
        visttab = f"VISITS_CLIN{clinic_id}"
        
        print(f"📋 timetab: {timetab}")
        print(f"📋 visttab: {visttab}")
        
        # جلب اسم اليوم من التاريخ
        day_name = datetime.datetime.strptime(visit_date, "%Y-%m-%d").strftime("%A").upper()
        print(f"📅 Day: {day_name}")
        
        # جلب مواعيد الدكتور لهذا اليوم
        doc_row = db.execute_bulk({
            timetab: [{
                "select": True, 
                "condition": f"DOCTOR_ID={doctor_id}"
            }]
        }).get("select", {}).get(timetab, [])
        
        print(f"👨‍⚕️ Doctor schedule: {doc_row}")
        
        if not doc_row:
            return JsonResponse({"success": True, "periods": []})
        
        # جلب الفترات المسموحة لهذا اليوم
        allowed_periods = doc_row[0].get(day_name)
        if not allowed_periods:
            return JsonResponse({"success": True, "periods": []})
        
        # تحويل الفترات المسموحة إلى قائمة
        allowed_periods = allowed_periods.split("-")
        print(f"✅ Allowed periods: {allowed_periods}")
        
        # جلب جميع الفترات من جدول VISIT_PERIODS
        all_periods = db.execute_bulk({
            "VISIT_PERIODS": [{"select": True}]
        }).get("select", {}).get("VISIT_PERIODS", [])
        
        print(f"📊 All periods count: {len(all_periods)}")
        
        # تجهيز الفترات المتاحة
        available = []
        for p in all_periods:
            period_no = str(p.get("PERIOD_NUMBER"))
            
            # التحقق إذا كانت الفترة مسموحة للدكتور
            if period_no not in allowed_periods:
                continue
            
            # التحقق من عدم وجود حجز في هذه الفترة
            condition = f"VISIT_DATE = TO_DATE('{visit_date}','YYYY-MM-DD') AND PERIOD_NO='{period_no}' AND DOCTOR_ID={doctor_id}"
            booking = db.execute_bulk({
                visttab: [{"select": True, "condition": condition}]
            }).get("select", {}).get(visttab, [])
            
            # إذا لم يكن هناك حجز، أو الحجز غير مؤكد (BOOK_CONFIRMATION = 0)
            if not booking or booking[0].get("BOOK_CONFIRMATION") == 0:
                available.append({
                    "period_no": period_no, 
                    "label": f"{p.get('START_TIME')} - {p.get('END_TIME')}",
                    "start_time": p.get('START_TIME'),
                    "end_time": p.get('END_TIME')
                })
        
        print(f"✅ Available periods: {available}")
        return JsonResponse({"success": True, "periods": available})
        
    except Exception as e:
        print(f"❌ Error in get_available_periods: {str(e)}")
        return JsonResponse({"success": False, "message": str(e), "periods": []})
#---------------------------------------------------------
@csrf_exempt
def get_lab_exams(request):
    db = process_db_ora_mysql()
    try:
        # تعديل الاسم حسب قاعدة البيانات (Oracle عادة تحتاج الحروف الكبيرة)
        tramo = {"LAB_IM_EX": [{"select": True}]}
        result = db.execute_bulk(tramo)
        #print("  result result result result result result result  result======", result)
        rows = result.get("select", {}).get("LAB_IM_EX", [])
        #print("  rows  rows  rows  rows  rows  rows  rows  rows  rows======",rows)
        exams = []
        for r in rows:
            exams.append({
                "id": r.get("ID"),
                "exam_name": r.get("EXAM_NAME"),
                "price": r.get("PRICE")
            })

        return JsonResponse({"success": True, "exams": exams})
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)})
#-----------------------------------------------------------------------------------------24_2_2026
# التحقق من الدفع لكل زيارة
# =========================================
@csrf_exempt
def doctor_payment_api(request):
    pai_no = request.session.get("pai_id")
    print("def doctor_payment_api def doctor_payment_api",pai_no)
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "غير مسموح"})
    try:
        body = json.loads(request.body)
        visit_num = body.get("visit_num")
        doctor_num = request.session.get("doc_id")

        db = process_db_ora_mysql()
        tablename = f"INV_{pai_no}"
        tramo_query = {
            tablename: [  # استخدم المفتاح الديناميكي هنا بدل "tablename" حرفياً
                {
                    "select": ["ITEM_NAME", "ITEM_PRICE", "VOUCHER_NUMBER"],
                    "condition": f"VISIT_NUMBER='{visit_num}' AND DOCTOR_ID={doctor_num}"
                }
            ]
        }
        result = db.execute_bulk(tramo_query)
        #print(" ++++++++++++++++++++++++++++++++++++++++++++++++++++++++result", result)
        return JsonResponse(result)
    except Exception as e:
        return JsonResponse({"success": False, "message": str(e)})
    
#++++++++++++++++++++++++++++++++++++++++++++++++++++++

@csrf_exempt
def get_doctor_patients(request):
    print("from_get_doctor_patients=")
    db = process_db_ora_mysql()
    
    # جلب doc_id من session
    doctor_id = request.session.get("doc_id") 
    print("from_get_doctor_patients-get_doctor_patients++++doctor_id =", doctor_id)
    clin_id= request.session.get("clinic_id")
    visttab=f"VISITS_CLIN{clin_id}"
    try:
        # 1️⃣ جلب جميع رقم المرضى من جدول VISITS المرتبط بالدكتور
        visit_rows = db.execute_bulk({
            visttab: [{"select": True, "condition": f"DOCTOR_ID={doctor_id}"}]
        }).get("select", {}).get(visttab, [])
        
        patient_nos = list({str(r["PATIENT_NO"]) for r in visit_rows})  # إزالة التكرار
        
        # 2️⃣ جلب أسماء المرضى من جدول PATIENT_RECORDS
        if patient_nos:
            patient_records = db.execute_bulk({
                "PATIENT_RECORDS": [{"select": True, "condition": f"FILE_PAT_NO IN ({','.join(patient_nos)})"}]
            }).get("select", {}).get("PATIENT_RECORDS", [])
        else:
            patient_records = []

        # 3️⃣ تجهيز قائمة المرضى
        patient_options = [
            {"id": str(r["FILE_PAT_NO"]), "name": r["PATIENT_NAME"]}
            for r in patient_records
        ]
        print("patient_optionspatient_optionspatient_optionspatient_options", patient_options)
        # 4️⃣ إعادة JSON صالح لـ JS ويشمل doctor_id
        return JsonResponse({
            "patients": patient_options,
            "doctor_id": doctor_id  # ← أضف هذا
        })
    
    except Exception as e:
        print("ERROR in get_doctor_patients:", str(e))
        return JsonResponse({"patients": [], "doctor_id": None})
        '''