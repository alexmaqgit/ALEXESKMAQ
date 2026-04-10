FROM python:3.11-slim

WORKDIR /app

# منع ملفات غير ضرورية + تحسين اللوق
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# تثبيت المتطلبات الأساسية فقط
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# تثبيت باكجات Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# نسخ المشروع
COPY . .

# نسخ ملف إعدادات gunicorn
COPY gunicorn.conf.py /app/gunicorn.conf.py

# فتح البورت
EXPOSE 8000

# تشغيل Gunicorn مع الإعدادات
CMD ["gunicorn", "--config", "gunicorn.conf.py", "alex_proj_dent.wsgi:application"]