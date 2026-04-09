import json
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from view.db_process import process_db_ora_mysql

@csrf_exempt
def user_add(request):
    db =  process_db_ora_mysql

    # ------------------- دالة لجلب المستخدمين -------------------
    def get_users():
        braadd= request.session['pranch_code']
        tablname=f"USER_ADD{braadd}"
        tramo_userget = {tablname: [{"select": True}]}
        result = db.execute_bulk(tramo_userget)
       # print("addd_____________________addd1111", result)
       # print("json________________dumps", json.dumps(result, indent=4, ensure_ascii=False))

        users = []  # نهيئ القائمة الفارغة افتراضياً

        # التأكد من أن النتيجة صالحة وتحتوي بيانات
        if isinstance(result, dict):
        # بعض النسخ ترجع المفتاح باسم select
           if "select" in result and isinstance(result["select"], dict):
            users = result["select"].get(tablname, [])
        # أو في حال مستقبلاً صارت data
        elif "data" in result and isinstance(result["data"], dict):
            users = result["data"].get(tablname, [])
        # أو حتى مباشرة في الجذر
        elif tablname in result:
            users = result.get(tablname, [])

       # print("addd222_____________________addd2222", users)
        return users

    # ------------------- POST: إضافة مستخدم جديد -------------------
    if request.method == "POST":
        try:
            data = json.loads(request.body)

            # التحقق من الحقول الأساسية
            required_fields = ["employee_name", "type_jop", "phon_num", "username", "password1"]
            missing = [f for f in required_fields if not data.get(f)]
            if missing:
                return JsonResponse({
                    "success": False,
                    "message": f"الحقول التالية مطلوبة: {', '.join(missing)}"
                })

            # بيانات المستخدم + الصلاحيات
            user_row = {
                "EMPLOY_NAME": data.get("employee_name"),
                "TYPE_JOP": data.get("type_jop"),
                "PHONE": data.get("phon_num"),
                "USERNAME": data.get("username"),
                "PASSWORDU": data.get("password1"),
                "ADD_PP": data.get("add_pp", 0),
                "USER_ADD": data.get("user_add", 0),
                "SE_TRA": data.get("se_tra", 0),
                "RE_YTA": data.get("re_yta", 0),
                "FO_TRA": data.get("fo_tra", 0),
                "UPD_TRA": data.get("upd_tra", 0),
                "SHO_REP": data.get("sho_rep", 0),
            }

            # ------------------- بناء أمر الإدخال بطريقة tramo -------------------
            braadd= request.session['pranch_code']
            tablname=f"USER_ADD{braadd}"
            tramo_insert = {
                tablname: [
                    {
                        "insert": True,
                        **user_row
                    }
                ]
            }

            result_insert = db.execute_bulk(tramo_insert)

            if result_insert and result_insert.get("success"):
                # بعد الإدخال، جلب قائمة المستخدمين المحدثة
                users = get_users()
                print("add333_____________________addd333333", users)
                return JsonResponse({"success": True, "users": users})
            else:
                return JsonResponse({
                    "success": False,
                    "message": result_insert.get("error", "فشل الإدخال")
                })

        except Exception as e:
            return JsonResponse({"success": False, "message": str(e)})

    # ------------------- GET: عرض الصفحة مع المستخدمين -------------------
    users = get_users()
    #print("add44444_____________________addd44444", users)
    # في حال الجدول فارغ، نرجع الصفحة بدون مشاكل
    return render(request, "user_add.html", {"users": users})


@csrf_exempt
def get_users_view(request):
    braadd= request.session['pranch_code']
    tablname=f"USER_ADD{braadd}"
    db =  process_db_ora_mysql
    tramo_userget = { tablname: [{"select": True}]}
    result = db.execute_bulk(tramo_userget)
    users = []
    if isinstance(result, dict):
        if "select" in result and isinstance(result["select"], dict):
            users = result["select"].get( tablname, [])
        elif "data" in result and isinstance(result["data"], dict):
            users = result["data"].get( tablname, [])
        elif  tablname in result:
            users = result.get( tablname, [])
    return JsonResponse({"users": users})
##########################################################
@csrf_exempt
def update_user(request, user_id):
    braadd= request.session['pranch_code']
    tablname=f"USER_ADD{braadd}"
    db =  process_db_ora_mysql
    if request.method == "POST":
        data = json.loads(request.body)
        print(f"🟢 تحديث مستخدم ID={user_id} مع البيانات: {data}")

        # ✅ تصحيح مشكلة الاسم الكبير/الصغير
        EMPLOY_NAME = data.get("employee_name") or data.get("employ_name")
        if not EMPLOY_NAME:
            return JsonResponse({"success": False, "message": "اسم الموظف لا يمكن أن يكون فارغاً"})

        tramo_update = {
            tablname: [{"update": True, "set": {
                "EMPLOY_NAME": EMPLOY_NAME,
                "TYPE_JOP": data.get("type_jop",""),
                "PHONE": data.get("phon_num",""),
                "USERNAME": data.get("username",""),
                "PASSWORDU": data.get("password1",""),
                "ADD_PP": data.get("add_pp",0),
                "USER_ADD": data.get("user_add",0),
                "SE_TRA": data.get("se_tra",0),
                "RE_YTA": data.get("re_yta",0),
                "FO_TRA": data.get("fo_tra",0),
                "UPD_TRA": data.get("upd_tra",0),
                "SHO_REP": data.get("sho_rep",0)
            }, "condition": f"ID = {user_id}"}]
        }

        result = db.execute_bulk(tramo_update)

        # بعد التحديث جلب جميع المستخدمين لتحديث الجدول
        tramo_userget = {tablname: [{"select": True}]}
        users_result = db.execute_bulk(tramo_userget)
        users = users_result.get(tablname, [])

        return JsonResponse({"success": result.get("success", False), "message": result.get("error",""), "users": users})

    return JsonResponse({"success": False, "message": "غير مسموح"})
