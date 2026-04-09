# proidtime.py
from .db_process import process_db_ora_mysql

class VisitPeriodsManager:
    """
    كلاس لإدارة جدول visit_periods
    - إنشاء الجدول
    - إضافة/تعديل/حذف فترة
    - جلب كل الفترات
    """

    def __init__(self):
        self.db = process_db_ora_mysql()
        self.table_name = "visit_periods"
        self.columns = {
            "period_number": "NUMBER NOT NULL PRIMARY KEY",  # الرقم اليدوي وفريد
            "start_time": "VARCHAR2(5) NOT NULL",
            "end_time": "VARCHAR2(5) NOT NULL"
        }

    # إنشاء الجدول إذا لم يكن موجود
    def ensure_table(self):
        try:
            self.db.execute_bulk({
                self.table_name: [{"select": True, "condition": "1=0"}]
            })
            return {"success": False, "message": "ℹ️ جدول الفترات موجود مسبقًا"}
        except Exception:
            self.db.execute_bulk({
                self.table_name: [{"create": True, "columns": self.columns}]
            })
            return {"success": True, "message": "✅ تم إنشاء جدول الفترات بنجاح"}

    # إضافة فترة
    
    def add_period(self, period_number, start_time, end_time):
        # تحويل الوقت من 24 ساعة إلى 12 ساعة مع AM/PM
        import datetime

        def to_ampm(t_str):
            # t_str بصيغة 'HH:MM'
            t_obj = datetime.datetime.strptime(t_str, "%H:%M")
            return t_obj.strftime("%I:%M %p")  # مثال: 08:00 AM

        start_ampm = to_ampm(start_time)
        end_ampm = to_ampm(end_time)

        data = {
         "period_number": period_number,
         "start_time": start_ampm,
            "end_time": end_ampm
        }

        self.db.execute_bulk({self.table_name: [{"insert": True, **data}]})
        return {"success": True, "message": "✅ تم إضافة الفترة بنجاح"}

       
    # تعديل فترة
    def update_period(self, period_number, start_time, end_time):
        self.db.execute_bulk({self.table_name:[{
            "update": True,
            "set": {"start_time": start_time, "end_time": end_time},
            "condition": f"period_number={period_number}"
        }]})
        return {"success": True, "message": "✏️ تم تعديل الفترة بنجاح"}

    # حذف فترة
    def delete_period(self, period_number):
        self.db.execute_bulk({self.table_name:[{
            "delete": True,
            "condition": f"period_number={period_number}"
        }]})
        return {"success": True, "message": "🗑️ تم حذف الفترة بنجاح"}

    # جلب كل الفترات
    def get_periods(self):
        res = self.db.execute_bulk({self.table_name:[{"select": True, "condition":"1=1"}]})
        return res.get("select", {}).get(self.table_name, [])

    # 🔹 دالة جديدة: التحقق من وجود رقم الفترة
    def get_period_by_number(self, period_number):
        periods = self.get_periods()
        for p in periods:
            if p["PERIOD_NUMBER"] == period_number:
                return p
        return None
