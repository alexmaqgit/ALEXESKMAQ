# gunicorn.conf.py
workers = 1  # قلل من 2 إلى 1
threads = 1  # قلل threads
timeout = 120  # زيد timeout
max_requests = 100  # أعد تشغيل العامل بعد 100 طلب