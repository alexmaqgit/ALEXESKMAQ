import json
import datetime
import logging
from django.http import JsonResponse
from django.test import RequestFactory
from django.views.decorators.csrf import csrf_exempt
from ..view.db_process import process_db_ora_mysql
from ..cincopra.PATIENT_TREATMENTS import get_patient_treatments
from django.shortcuts import render

logger = logging.getLogger(__name__)

@csrf_exempt
def doc_jop_view(request):
    return render(request, "doc_jop.html")

class VisitManager:
    """
    كلاس متخصص لإدارة جميع عمليات الزيارات
    يحتوي على دوال منفصلة لكل عملية: الإضافة، التعديل، الجلب، الحذف
    """
    
    def __init__(self, request):
        """
        تهيئة الكلاس مع الطلب الحالي
        """
        self.request = request
        self.db = process_db_ora_mysql()
        self.clinic_id = request.session.get("clinic_id")
        self.doctor_id = request.session.get("doc_id")
        self.patient_id = request.session.get("pai_id") 
        
        # أسماء الجداول الديناميكية
        self.visits_table = f"VISITS_CLIN{self.clinic_id}"
        self.services_table = f"SERVICE_PRICE_CLIN{self.clinic_id}"
        self.doctor_time_table = f"DOC_TIME_CLIN{self.clinic_id}"
    
    # ======================
    # 1. دوال الجلب (GET)
    # ======================
    
    def get_patient_visits(self, patient_no):
        """
        جلب جميع زيارات المريض مع تفاصيلها
        """
        print(f"🏥 دالة الكلاس: جلب زيارات المريض {patient_no}")
        try:
            # جلب بيانات المريض (مع علامات تنصيص)
            patient_row = self.db.execute_bulk({
                "PATIENT_RECORDS": [{"select": True, "condition": f"FILE_PAT_NO = '{patient_no}'"}]
            }).get("select", {}).get("PATIENT_RECORDS", [])
            
            patient_name = patient_row[0]["PATIENT_NAME"] if patient_row else "غير محدد"
            
            # جلب الفحوصات
            exam_rows = self.db.execute_bulk({"LAB_IM_EX": [{"select": True}]}).get("select", {}).get("LAB_IM_EX", [])
            exams_dict = {str(r.get("ID")): r.get("EXAM_NAME") for r in exam_rows}
            
            # جلب الخدمات
            service_rows = self.db.execute_bulk({self.services_table: [{"select": True}]}).get("select", {}).get(self.services_table, [])
            services_dict = {str(r.get("SERVICE_ID")): r.get("SERVICE_NAME") for r in service_rows}
            
            # جلب الفترات
            periods = self.db.execute_bulk({"VISIT_PERIODS": [{"select": True}]}).get("select", {}).get("VISIT_PERIODS", [])
            periods_dict = {p.get("PERIOD_NUMBER"): f"{p.get('START_TIME')} - {p.get('END_TIME')}" for p in periods}
            
            # جلب قاموس الأدوية من جدول DENTAL_DRUG
            dental_drug_dict = {}
            try:
                dental_drug_rows = self.db.execute_bulk({"DENTAL_DRUG": [{"select": True}]}).get("select", {}).get("DENTAL_DRUG", [])
                for d in dental_drug_rows:
                    drug_id = str(d.get("ID"))
                    drug_name = d.get("dg_NAME")
                    if drug_name is not None:
                        dental_drug_dict[drug_id] = drug_name
                    else:
                        dental_drug_dict[drug_id] = drug_id
                print(f"✅ تم تحميل {len(dental_drug_dict)} دواء من جدول DENTAL_DRUG")
            except Exception as e:
                print(f"⚠️ فشل تحميل الأدوية: {e}")
                dental_drug_dict = {}
            
            # جلب الزيارات
            visit_rows = self.db.execute_bulk({
                self.visits_table: [{"select": True, "condition": f"PATIENT_NO = '{patient_no}' AND DOCTOR_ID = {self.doctor_id}"}]
            }).get("select", {}).get(self.visits_table, [])
            
            visits_list = []
            factory = RequestFactory()
            
            for visit in visit_rows:
                visit_number = visit.get("VISIT_NUMBER")
                doctor_id = visit.get("DOCTOR_ID")
                visit_date = str(visit.get("VISIT_DATE")) if visit.get("VISIT_DATE") else ""
                
                # الفحوصات
                exams_field = visit.get("EXAMS") or ""
                exam_ids = [x.strip() for x in str(exams_field).split(",") if x.strip()]
                exams_names = ', '.join([exams_dict.get(str(x), str(x)) for x in exam_ids])
                
                # الخدمات (الإجراءات)
                treatment_field = visit.get("TREATMENT") or ""
                treatment_ids = [x.strip() for x in str(treatment_field).split(",") if x.strip()]
                treatment_names = ', '.join([services_dict.get(str(x), str(x)) for x in treatment_ids])
                
                # قراءة الأدوية من قاعدة البيانات (حقل MEDCEN)
                medcen_field = visit.get("MEDCEN") or ""
                medcen_ids = [x.strip() for x in str(medcen_field).split(",") if x.strip()]
                
                # تحويل الرموز إلى أسماء
                medcen_names_list = []
                for drug_id in medcen_ids:
                    drug_name = dental_drug_dict.get(str(drug_id), str(drug_id))
                    if drug_name is None:
                        drug_name = str(drug_id)
                    medcen_names_list.append(str(drug_name))
                medcen_names = ', '.join(medcen_names_list)
                
                # الفترة
                period_no = visit.get("PERIOD_NO") or 0
                period_label = periods_dict.get(period_no, "")
                
                visits_list.append({
                    "visit_number": visit_number,
                    "period_no": period_label,
                    "treatment": treatment_names,
                    "exams": exams_names,
                    "visit_date": visit_date,
                    "note": visit.get("NOTE", ""),
                    "book_confirmation": visit.get("BOOK_CONFIRMATION", 0),
                    "medcen": medcen_names,
                    "medcen_ids": medcen_ids,
                    "doctor_id": doctor_id
                })
            
            return JsonResponse({
                "success": True,
                "patient_id": patient_no,
                "patient_name": patient_name,
                "visits": visits_list
            })
            
        except Exception as e:
            logger.error(f"Error in get_patient_visits: {str(e)}")
            print(f"❌ خطأ في get_patient_visits: {e}")
            return JsonResponse({"success": False, "message": str(e)})
    
    def get_services(self):
        """جلب جميع الخدمات (الإجراءات) للعيادة"""
        try:
            rows = self.db.execute_bulk({self.services_table: [{"select": True}]}).get("select", {}).get(self.services_table, [])
            services = [{"id": r.get("SERVICE_ID"), "name": r.get("SERVICE_NAME")} for r in rows]
            return JsonResponse({"success": True, "services": services})
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)})
    
    def get_lab_exams(self):
        """جلب جميع الفحوصات المخبرية"""
        try:
            rows = self.db.execute_bulk({"LAB_IM_EX": [{"select": True}]}).get("select", {}).get("LAB_IM_EX", [])
            exams = [{"id": r.get("ID"), "exam_name": r.get("EXAM_NAME"), "price": r.get("PRICE")} for r in rows]
            return JsonResponse({"success": True, "exams": exams})
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)})
    
    def get_available_periods(self, visit_date):
        """جلب الفترات المتاحة للحجز"""
        try:
            day_name = datetime.datetime.strptime(visit_date, "%Y-%m-%d").strftime("%A").upper()
            
            doc_rows = self.db.execute_bulk({
                self.doctor_time_table: [{"select": True, "condition": f"DOCTOR_ID={self.doctor_id}"}]
            }).get("select", {}).get(self.doctor_time_table, [])
            
            if not doc_rows:
                return JsonResponse({"success": True, "periods": []})
            
            allowed_periods = doc_rows[0].get(day_name, "")
            if not allowed_periods:
                return JsonResponse({"success": True, "periods": []})
            
            allowed_periods = allowed_periods.split("-")
            all_periods = self.db.execute_bulk({"VISIT_PERIODS": [{"select": True}]}).get("select", {}).get("VISIT_PERIODS", [])
            
            available = []
            for p in all_periods:
                period_no = str(p.get("PERIOD_NUMBER"))
                if period_no not in allowed_periods:
                    continue
                
                condition = f"VISIT_DATE = TO_DATE('{visit_date}','YYYY-MM-DD') AND PERIOD_NO='{period_no}' AND DOCTOR_ID={self.doctor_id}"
                booking = self.db.execute_bulk({
                    self.visits_table: [{"select": True, "condition": condition}]
                }).get("select", {}).get(self.visits_table, [])
                
                if not booking or booking[0].get("BOOK_CONFIRMATION") == 0:
                    available.append({
                        "period_no": period_no,
                        "label": f"{p.get('START_TIME')} - {p.get('END_TIME')}",
                        "start_time": p.get("START_TIME")
                    })
            
            return JsonResponse({"success": True, "periods": available})
            
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)})
    
    def get_doctor_patients(self):
        """جلب جميع مرضى الدكتور"""
        try:
            visit_rows = self.db.execute_bulk({
                self.visits_table: [{"select": True, "condition": f"DOCTOR_ID={self.doctor_id}"}]
            }).get("select", {}).get(self.visits_table, [])
            
            patient_nos = list({str(r["PATIENT_NO"]) for r in visit_rows})
            
            if patient_nos:
                # ✅ التصحيح: إضافة علامات تنصيص حول القيم النصية
                quoted_numbers = [f"'{num}'" for num in patient_nos]
                patient_records = self.db.execute_bulk({
                    "PATIENT_RECORDS": [{"select": True, "condition": f"FILE_PAT_NO IN ({','.join(quoted_numbers)})"}]
                }).get("select", {}).get("PATIENT_RECORDS", [])
            else:
                patient_records = []
            
            patients = [{"id": str(r["FILE_PAT_NO"]), "name": r["PATIENT_NAME"]} for r in patient_records]
            
            return JsonResponse({
                "patients": patients,
                "doctor_id": self.doctor_id
            })
            
        except Exception as e:
            logger.error(f"Error in get_doctor_patients: {str(e)}")
            return JsonResponse({"patients": [], "doctor_id": None})
    
    def get_payment_details(self, visit_number):
        """جلب تفاصيل الدفع لزيارة معينة"""
        try:
            patient_id = self.patient_id
            tablename = f"INV_{patient_id}"
            
            result = self.db.execute_bulk({
                tablename: [{
                    "select": ["ITEM_NAME", "ITEM_PRICE", "VOUCHER_NUMBER"],
                    "condition": f"VISIT_NUMBER='{visit_number}' AND DOCTOR_ID={self.doctor_id}"
                }]
            })
            
            return JsonResponse(result)
            
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)})
    
    # ======================
    # 2. دوال الأدوية
    # ======================
    
    def get_all_drugs(self):
        """جلب جميع الأدوية من جدول DENTAL_DRUG"""
        try:
            rows = self.db.execute_bulk({"DENTAL_DRUG": [{"select": True, "order_by": "dg_NAME"}]}).get("select", {}).get("DENTAL_DRUG", [])
            drugs = []
            for d in rows:
                instructions = d.get("USAGE_INSTRUCTIONS")
                if hasattr(instructions, 'read'):
                    instructions = instructions.read()
                drugs.append({
                    "id": d.get("ID"),
                    "name": d.get("dg_NAME"),
                    "instructions": instructions or ""
                })
            return JsonResponse(drugs, safe=False)
        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)})
    
    def get_patient_drugs(self, patient_id, doctor_id, visit_number):
        """جلب أدوية المريض لزيارة محددة"""
        try:
            tramo = {
                "PATIENT_drg": [
                    {
                        "select": True,
                        "condition": f"PATIENT_ID={patient_id} AND DOCTOR_ID={doctor_id} AND VISIT_NUMBER={visit_number}"
                    }
                ]
            }
            result = self.db.execute_bulk(tramo)
            rows = result.get("select", {}).get("PATIENT_drg", [])
            
            if not rows:
                return JsonResponse([], safe=False)
            
            codes_list = [c.strip() for c in (rows[0].get("dg_CODES") or "").split("-") if c.strip()]
            
            if not codes_list:
                return JsonResponse([], safe=False)
            
            codes_str = ",".join(codes_list)
            tramo2 = {
                "DENTAL_DRUG": [
                    {"select": True, "condition": f"ID IN ({codes_str})"}
                ]
            }
            result2 = self.db.execute_bulk(tramo2)
            dg_rows = result2.get("select", {}).get("DENTAL_DRUG", [])
            
            clean_data = []
            for t in dg_rows:
                instructions = t.get("INSTRUCTIONS") or t.get("USAGE_INSTRUCTIONS")
                if hasattr(instructions, "read"):
                    instructions = instructions.read()
                clean_data.append({
                    "id": t.get("ID"),
                    "name": t.get("dg_NAME"),
                    "instructions": instructions or ""
                })
            
            return JsonResponse(clean_data, safe=False)
            
        except Exception as e:
            print("ERROR in get_patient_drugs:", str(e))
            return JsonResponse([], safe=False)
    
    def save_patient_drugs(self, patient_id, doctor_id, visit_number, add_codes, remove_codes):
        """حفظ أدوية المريض (إضافة وحذف)"""
        try:
            tramo_select = {
                "PATIENT_drg": [
                    {
                        "select": True,
                        "condition": f"PATIENT_ID={patient_id} AND DOCTOR_ID={doctor_id} AND VISIT_NUMBER={visit_number}"
                    }
                ]
            }
            result = self.db.execute_bulk(tramo_select)
            old_codes = []
            rows = result.get("select", {}).get("PATIENT_drg", [])
            if rows:
                old_codes = (rows[0].get("dg_CODES") or "").split("-")
            
            final_codes = set(old_codes)
            final_codes.update(str(c) for c in add_codes)
            final_codes.difference_update(str(c) for c in remove_codes)
            
            tramo_update = {
                "PATIENT_drg": [
                    {"delete": True,
                     "condition": f"PATIENT_ID={patient_id} AND DOCTOR_ID={doctor_id} AND VISIT_NUMBER={visit_number}"},
                    {"insert": True,
                     "PATIENT_ID": patient_id,
                     "DOCTOR_ID": doctor_id,
                     "VISIT_NUMBER": visit_number,
                     "dg_CODES": "-".join(final_codes) if final_codes else "0"}
                ]
            }
            
            self.db.execute_bulk(tramo_update)
            self.db.connection.commit()
            
            medcen_codes = list(final_codes)
            medcen_str = ','.join(medcen_codes) if medcen_codes else ''
            
            self.db.execute_bulk({
                self.visits_table: [{
                    "update": True,
                    "set": {"MEDCEN": medcen_str},
                    "condition": f"VISIT_NUMBER={visit_number} AND DOCTOR_ID={doctor_id}"
                }]
            })
            self.db.connection.commit()
            
            return JsonResponse({"success": True, "message": "تم حفظ التعديلات بنجاح"})
            
        except Exception as e:
            self.db.connection.rollback()
            return JsonResponse({"success": False, "message": str(e)})
    
    # ======================
    # 3. دوال الإضافة والتعديل (POST)
    # ======================
    
    def add_visit(self, patient_id, data):
        """إضافة زيارة جديدة"""
        try:
            insert_data = {
                "DOCTOR_ID": data.get("doctor_id") or self.doctor_id,
                "PATIENT_NO": int(patient_id),
                "PERIOD_NO": data.get("timeSlot"),
                "BOOK_CONFIRMATION": 0,
                "TREATMENT": data.get("treatment"),
                "EXAMS": data.get("exams"),
                "VISIT_DATE": data.get("visit_date"),
                "NOTE": data.get("note", ""),
                "MEDCEN": data.get("medcen", ""),
            }
            
            self.db.execute_bulk({self.visits_table: [{"insert": True, **insert_data}]})
            self.db.connection.commit()
            
            return JsonResponse({"success": True, "message": "تمت إضافة الجلسة بنجاح"})
            
        except Exception as e:
            self.db.connection.rollback()
            return JsonResponse({"success": False, "message": str(e)})
    
    def update_visit_note(self, visit_number, note):
        """تحديث الملاحظة فقط"""
        return self._update_visit_field(visit_number, "NOTE", note)
    
    def update_visit_treatment(self, visit_number, treatment):
        """تحديث الإجراءات فقط"""
        return self._update_visit_field(visit_number, "TREATMENT", treatment)
    
    def update_visit_exams(self, visit_number, exams):
        """تحديث الفحوصات فقط"""
        return self._update_visit_field(visit_number, "EXAMS", exams)
    
    def update_visit_drugs(self, visit_number, medcen):
        """تحديث الأدوية فقط"""
        return self._update_visit_field(visit_number, "MEDCEN", medcen)
    
    def update_visit_datetime(self, visit_number, visit_date, period_no):
        """تحديث التاريخ والفترة فقط"""
        try:
            update_data = {
                "VISIT_DATE": visit_date,
                "PERIOD_NO": period_no
            }
            
            self.db.execute_bulk({
                self.visits_table: [{
                    "update": True,
                    "set": update_data,
                    "condition": f"VISIT_NUMBER={visit_number} AND DOCTOR_ID={self.doctor_id}"
                }]
            })
            self.db.connection.commit()
            
            return JsonResponse({"success": True, "message": "تم تحديث التاريخ والفترة بنجاح"})
            
        except Exception as e:
            self.db.connection.rollback()
            return JsonResponse({"success": False, "message": str(e)})
    
    def update_visit_all(self, data):
        """تحديث جميع بيانات الزيارة"""
        try:
            visit_number = data.get("visit_number")
            if not visit_number:
                return JsonResponse({"success": False, "message": "رقم الزيارة مفقود"})
            
            update_data = {
                "NOTE": data.get("note", ""),
                "TREATMENT": data.get("treatment", ""),
                "EXAMS": data.get("exams", ""),
                "VISIT_DATE": data.get("visit_date"),
                "PERIOD_NO": data.get("period_no")
            }
            
            self.db.execute_bulk({
                self.visits_table: [{
                    "update": True,
                    "set": update_data,
                    "condition": f"VISIT_NUMBER={visit_number} AND DOCTOR_ID={self.doctor_id}"
                }]
            })
            self.db.connection.commit()
            
            return JsonResponse({"success": True, "message": "تم تعديل الجلسة بنجاح"})
            
        except Exception as e:
            self.db.connection.rollback()
            return JsonResponse({"success": False, "message": str(e)})
    
    def _update_visit_field(self, visit_number, field_name, value):
        """دالة مساعدة لتحديث حقل واحد فقط"""
        try:
            self.db.execute_bulk({
                self.visits_table: [{
                    "update": True,
                    "set": {field_name: value},
                    "condition": f"VISIT_NUMBER={visit_number} AND DOCTOR_ID={self.doctor_id}"
                }]
            })
            self.db.connection.commit()
            
            return JsonResponse({"success": True, "message": f"تم تحديث {field_name} بنجاح"})
            
        except Exception as e:
            self.db.connection.rollback()
            return JsonResponse({"success": False, "message": str(e)})


# ======================
# دوال الـ Views التي تستخدم الكلاس
# ======================

@csrf_exempt
def get_patient_visits(request):
    print("🚀 تم استدعاء get_patient_visits (View)")
    manager = VisitManager(request)
    q = request.GET.get("q")
    request.session["pai_id"] = q
    print(f"🔍 البحث عن المريض: {q}")
    if not q:
        return JsonResponse({"success": False, "message": "No patient id provided"})
    result = manager.get_patient_visits(q)
    print("✅ تم جلب الزيارات بنجاح")
    return result

@csrf_exempt
def get_services_for_select(request):
    manager = VisitManager(request)
    return manager.get_services()

@csrf_exempt
def get_lab_exams(request):
    manager = VisitManager(request)
    return manager.get_lab_exams()

@csrf_exempt
def get_available_periods(request):
    manager = VisitManager(request)
    visit_date = request.GET.get("visit_date")
    if not visit_date:
        return JsonResponse({"success": False, "message": "visit_date مفقود"})
    return manager.get_available_periods(visit_date)

@csrf_exempt
def get_doctor_patients(request):
    manager = VisitManager(request)
    return manager.get_doctor_patients()

@csrf_exempt
def add_patient_visit(request, patient_id):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "غير مسموح"})
    
    try:
        data = json.loads(request.body)
        print("📦 DATA =", data)
        manager = VisitManager(request)
        print("📌 session clinic_id =", request.session.get("clinic_id"))
        print("📌 session doctor_id =", request.session.get("doc_id"))
        print("👤 patient_id =", patient_id)
        return manager.add_visit(patient_id, data)
    except Exception as e:
        print("❌ ERROR:", str(e))
        return JsonResponse({"success": False, "message": str(e)})

@csrf_exempt
def update_patient_visit(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "غير مسموح"})
    manager = VisitManager(request)
    data = json.loads(request.body)
    return manager.update_visit_all(data)

@csrf_exempt
def doctor_payment_api(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "غير مسموح"})
    manager = VisitManager(request)
    data = json.loads(request.body)
    visit_num = data.get("visit_num")
    print("visit_num=-=-=-=-=-=", visit_num)
    return manager.get_payment_details(visit_num)

# ======================
# دوال الأدوية
# ======================

@csrf_exempt
def get_dental_drg(request):
    """جلب جميع الأدوية من جدول DENTAL_DRUG"""
    manager = VisitManager(request)
    return manager.get_all_drugs()

@csrf_exempt
def get_patient_drg(request):
    """جلب أدوية المريض"""
    manager = VisitManager(request)
    patient_id = request.GET.get('patient_id')
    doctor_id = request.GET.get('doctor_id') or request.session.get("doc_id")
    visit_number = request.GET.get('visit_number')
    
    if not patient_id or not doctor_id or not visit_number:
        return JsonResponse([], safe=False)
    
    return manager.get_patient_drugs(int(patient_id), int(doctor_id), int(visit_number))

@csrf_exempt
def save_patient_drg(request):
    """حفظ أدوية المريض"""
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "غير مسموح"})
    
    manager = VisitManager(request)
    data = json.loads(request.body)
    
    patient_id = data.get('patient_id')
    doctor_id = data.get('doctor_id') or request.session.get("doc_id")
    visit_number = data.get('visit_number')
    add_codes = data.get('add_codes', [])
    remove_codes = data.get('remove_codes', [])
    
    return manager.save_patient_drugs(patient_id, doctor_id, visit_number, add_codes, remove_codes)

# ======================
# دوال التحديث الجزئي
# ======================

@csrf_exempt
def update_visit_note(request):
    """تحديث الملاحظة فقط"""
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "غير مسموح"})
    manager = VisitManager(request)
    data = json.loads(request.body)
    return manager.update_visit_note(data.get("visit_number"), data.get("note", ""))

@csrf_exempt
def update_visit_procedures(request):
    """تحديث الإجراءات فقط"""
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "غير مسموح"})
    manager = VisitManager(request)
    data = json.loads(request.body)
    return manager.update_visit_treatment(data.get("visit_number"), data.get("treatment", ""))

@csrf_exempt
def update_visit_exams(request):
    """تحديث الفحوصات فقط"""
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "غير مسموح"})
    manager = VisitManager(request)
    data = json.loads(request.body)
    return manager.update_visit_exams(data.get("visit_number"), data.get("exams", ""))

@csrf_exempt
def update_visit_datetime(request):
    """تحديث التاريخ والفترة فقط"""
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "غير مسموح"})
    manager = VisitManager(request)
    data = json.loads(request.body)
    return manager.update_visit_datetime(
        data.get("visit_number"),
        data.get("visit_date"),
        data.get("period_no")
    )

@csrf_exempt
def update_visit_drugs(request):
    """تحديث الأدوية فقط"""
    if request.method != "POST":
        return JsonResponse({"success": False, "message": "غير مسموح"})
    manager = VisitManager(request)
    data = json.loads(request.body)
    return manager.update_visit_drugs(data.get("visit_number"), data.get("medcen", ""))