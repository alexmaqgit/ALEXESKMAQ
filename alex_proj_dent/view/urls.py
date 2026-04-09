from django.urls import path
from . import booking_code

# login
from ..cincopra.loginmed import login_page, login_system,logout_view,check_user_type,supervisor_home
from ..cincopra.permissions import *
# clinics
from ..cincopra.addclin import newadd_clin, get_clin_view, update_clin
from ..cincopra.ceate_tab_clin_dac import ins_clin_data
from ..cincopra.doc_jop import (update_visit_note,update_visit_procedures,
                                    update_visit_exams,
                                    update_visit_datetime,
                                    update_visit_drugs,
                                    get_patient_visits,
                                    doctor_payment_api,
                                    doc_jop_view,
                                     get_lab_exams,
                                     get_services_for_select,
                                      get_available_periods,
                                      add_patient_visit,
                                     get_doctor_patients)
# doctors
from ..cincopra.doctadd import add_doctor
from alex_proj_dent.cincopra import doctadd
from ..cincopra.doc_time_file import (
    doctors_screen_time,
    get_visit_periods,
    save_doctor_time,
    get_doctor_details_time
)

# services
from ..cincopra.servprac import (
    get_services,
    manage_services,
    services_page
)
from ..cincopra.drug import (drug_page,get_drugs,delete_drug,update_drug,add_drug)
# doctor screen
'''from ..cincopra.docscreen import (
    docscreen_view,
    #get_patient_visits,
    add_patient_visit,
    update_patient_visit,
    get_services_for_select,
    get_available_periods,
    get_lab_exams,
    #doctor_payment_api,
    get_doctor_patients,
    tstdrop
)'''

# invoice
from ..cincopra.invoice import (
    invoice_view,
    confirm_payment,
    get_payment_invoice,
    confirm_visit,
    get_patient_doctors,
   get_clinics
)

# patients
from ..cincopra.patientscreen import (
    get_patients,
    add_patient,
    update_patient,
    patient_page,
    get_last_patient_file_no,
    test_p,
    get_dental_conditions,
    add_patient_all
)

# treatments
from ..cincopra.PATIENT_TREATMENTS import (
    get_patient_treatments,
    patient_treatment_view,
    save_patient_treatments_tramo,
    get_dental_treatments_tramo
)
from django.views.generic import RedirectView
# =====================================================================================

urlpatterns = [

    # =============================
    # 🔐 تسجيل الدخول
    # =============================
    path('',login_page, name='login_page'),
    path('login_system/', login_system, name='login_system'),
    path('logout/', logout_view, name='logout'),
    path('check_user_type/', check_user_type, name='check_user_type'),
    path('supervisor_home/', supervisor_home, name='supervisor_home'),
    # =============================
    # 🏠 الصفحة الرئيسية بعد الدخول
    # =============================
    path('booking/', booking_code.booking_view, name='booking'),

    # =============================
    # ⏰ فترات الزيارات
    # =============================
    path('visit-periods/', booking_code.visit_periods_view, name='visit_periods'),
    path('visit-periods/create-table/', booking_code.create_visit_periods_table, name='create_visit_periods_table'),
    path('visit-periods/add/', booking_code.add_visit_period, name='add_visit_period'),
    path('visit-periods/list/', booking_code.list_visit_periods, name='list_visit_periods'),
    path('visit-periods/delete/<int:period_number>/', booking_code.delete_visit_period, name='delete_visit_period'),

    # =============================
    # 🏥 العيادات
    # =============================
    path("newadd_clin/", newadd_clin, name="newaddclin"),
    path("add_clin/", ins_clin_data, name="ins_clin_data"),
    path("get_clin/", get_clin_view, name="get_clin_view"),
    path("update_clin/<int:clinic_id>/", update_clin, name="update_clin"),

    # =============================
    # 👨‍⚕️ الأطباء
    # =============================
    path("doctors/", doctadd.doctor_page, name="doctor_page"),
    path("get_doctors/", doctadd.get_doctors, name="get_doctors"),
    path("add_doctor/", add_doctor, name="add_doctor"),
    path("update_doctor/<int:doctor_id>/", doctadd.update_doctor, name="update_doctor"),

    path("doctors_screen_time/", doctors_screen_time, name="doctors_screen_time"),
    path("get_doctor_details_time/", get_doctor_details_time, name="get_doctor_details_time"),
    path("save_doctor_time/", save_doctor_time, name="save_doctor_time"),
    path("get_visit_periods/", get_visit_periods, name="get_visit_periods"),

    # =============================
    # 🧾 الخدمات
    # =============================
    path('clinic/services/page/', services_page, name='services_page'),
    path('clinic/services/', get_services, name='get_services'),
    path('clinic/services/manage/', manage_services, name='manage_services'),

    # =============================
    # 🖥 شاشة الطبيب
    # =============================
    path('doc_jop/',doc_jop_view, name='doc_jop'),
    path('get_patient_visits/', get_patient_visits, name='get_patient_visits'),
    path('add_patient_visit/<int:patient_id>/', add_patient_visit, name='add_patient_visit'),
    #path('update_patient_visit/<int:patient_id>/<int:period_no>/', update_patient_visit, name='update_patient_visit'),
    #path('update_patient_visit/', update_patient_visit, name='update_patient_visit'),
    path('get_services_for_select/', get_services_for_select, name='get_services_for_select'),
    path('get_available_periods/', get_available_periods, name='get_available_periods'),
    path('get_lab_exams/', get_lab_exams, name='get_lab_exams'),
    #path('doctor_payment_api/', doctor_payment_api, name='doctor_payment_api'),
    path('get_doctor_patients/', get_doctor_patients,name='get_doctor_patients'),
    #path('tstdrop/',tstdrop,name='tstdrop'),
    # =============================
    # 🧾 الفواتير
    # =============================
    path('invoice/', invoice_view, name='invoice'),
    path('get_payment_invoice', get_payment_invoice, name='get_payment_invoice'),
    path('confirm_payment', confirm_payment, name='confirm_payment'),
    path('confirm_visit',confirm_visit, name='confirm_visit'),
    path('get_patient_doctors',get_patient_doctors, name='get_patient_doctors'),
    path('get_clinics/', get_clinics, name='get_clinics'),
    # =============================
    # 👥 المرضى
    # =============================
    path('patients/', patient_page, name='patient_page'),
    path('get_patients/', get_patients, name='get_patients'),
    path('add_patient/', add_patient, name='add_patient'),
    path('update_patient/<str:file_pat_no>/', update_patient, name='update_patient'),
    path('generate_file_no/', get_last_patient_file_no, name='generate_file_no'),
    #path('test_p/', test_p, name='test_p'),
    path('get_dental_conditions/',get_dental_conditions, name='get_dental_conditions'),
    path('add_patient_all/',add_patient_all, name='add_patient_all'),
    # =============================
    # 💊 العلاجات
    # =============================
    path('patient_drg/', patient_treatment_view, name='patient_treatments'),
    path('get_dental_drg/', get_dental_treatments_tramo, name='get_dental_treatments'),
    path('save_patient_drg/', save_patient_treatments_tramo, name='save_patient_treatments'),
    path('get_patient_drg/', get_patient_treatments, name='get_patient_treatments'),
    path('update_visit_drugs/',update_visit_drugs, name='update_visit_drugs'),
    #==================================
    path('update_visit_note/',update_visit_note, name='update_visit_note'),
    path('update_visit_procedures/', update_visit_procedures, name='update_visit_procedures'),
    path('update_visit_exams/', update_visit_exams, name='update_visit_exams'),
    path('update_visit_datetime/',update_visit_datetime, name='update_visit_datetime'),
    path('doctor2_payment_api/',doctor_payment_api, name='doctor2_payment_api'),
    #-----------------العلاجات-------------------------------
    path('drugs/',drug_page, name='drug_page'),
    path('get_drugs/',get_drugs, name='get_drugs'),
    path('api/drugs/add/', add_drug, name='add_drug'),
    path('api/drugs/update/<int:drug_id>/',update_drug, name='update_drug'),
    path('api/drugs/delete/<int:drug_id>/',delete_drug, name='delete_drug'),
    #path('api/drugs/last-id/',get_drugs, name='get_drugs'),
    #-----------------------------------------------------------
    path('favicon.ico', RedirectView.as_view(url='/static/img/favicon.ico', permanent=True)),
]