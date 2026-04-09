# alex_proj_dent/cincopra/middleware.py
from django.shortcuts import redirect
from django.contrib import messages

class LoginRequiredMiddleware:
    """
    يحمي جميع صفحات النظام من الوصول بدون تسجيل دخول
    """
    def __init__(self, get_response):
        self.get_response = get_response
        # استثناء المسارات التي لا تحتاج تسجيل دخول (بدون '/' العام)
        self.exempt_urls = [
            '/login_page/',
            '/login_system/',
            '/logout/',
            '/logout_view/',
            '/static/',
            '/media/',
            '/check_user_type/',
        ]
        
        # الصفحة الرئيسية (تسجيل الدخول) يتم التعامل معها بشكل منفصل
        self.login_url = '/'
        
        print("=" * 50)
        print("✅ LoginRequiredMiddleware Loaded Successfully!")
        print(f"📋 Login URL: {self.login_url}")
        print(f"📋 Exempt URLs: {self.exempt_urls}")
        print("=" * 50)

    def __call__(self, request):
        path = request.path
        
        print(f"\n{'='*40}")
        print(f"📍 Path: {path}")
        print(f"👤 User: {request.session.get('user')}")
        
        # ✅ إذا المستخدم مسجل دخول
        if request.session.get('user'):
            print(f"✅ User logged in → Access GRANTED")
            return self.get_response(request)
        
        # ✅ إذا كانت الصفحة الرئيسية (تسجيل الدخول)
        if path == self.login_url:
            print(f"✅ Login page → Access GRANTED")
            return self.get_response(request)
        
        # ✅ إذا كان المسار من المستثنيين
        for exempt_url in self.exempt_urls:
            if path.startswith(exempt_url):
                print(f"✅ Path '{path}' is exempt → Access GRANTED")
                return self.get_response(request)
        
        # ❌ غير مسجل دخول
        print(f"❌ Access DENIED for '{path}' → Redirecting to login")
        messages.warning(request, '⚠️ الرجاء تسجيل الدخول أولاً للوصول إلى هذه الصفحة')
        request.session['next_url'] = path
        
        return redirect(self.login_url)