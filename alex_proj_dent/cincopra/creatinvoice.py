from datetime import datetime
from ..view.db_process import process_db_ora_mysql

def generate_voucher_number(patient_no):

    db = process_db_ora_mysql()
    year2 = str(datetime.now().year)[-2:]

    # جلب آخر رقم
    tramo1 = {
        "VOUCHER_COUNTER": [
            {
                "select": "MAX(VOUCHER_NUMBER) LAST_NO",
                "condition": f"VOUCHER_NUMBER LIKE '{year2}%'"
            }
        ]
    }

    result = db.execute_bulk(tramo1)
    row = result.get("select", {}).get("VOUCHER_COUNTER", [])
    last_no = row[0].get("LAST_NO") if row else None

    # تحديد الرقم الجديد
    if last_no is None:
        new_number = int(year2 + "001")
    else:
        new_number = int(last_no) + 1

    while True:

        tramo2 = {
            "VOUCHER_COUNTER": [
                {
                    "insert": True,
                    "VOUCHER_NUMBER": new_number,
                    "VOUCHER_DATE": datetime.now(),
                    "PATIENT_NO": patient_no
                }
            ]
        }

        try:
            db.execute_bulk(tramo2)
            print("رقم السند الجديد:", new_number)
            return new_number

        except Exception as e:

            if "ORA-00001" in str(e):
                new_number += 1
                print("محاولة رقم جديد:", new_number)
            else:
                raise e