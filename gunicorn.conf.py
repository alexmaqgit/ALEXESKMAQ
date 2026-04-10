# gunicorn.conf.py
workers = 1  # قلل من 2 إلى 1
threads = 1  # قلل threads
timeout = 300  # زدها من 120 إلى 300
max_requests = 100  # أعد تشغيل العامل بعد 100 طلب