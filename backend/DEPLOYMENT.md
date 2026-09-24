# راهنمای استقرار و نصب سامانه فروش بلیت تئاتر (Production Deployment Guide)

این راهنما مراحل استقرار کامل پایگاه داده، صف‌ها (Queues)، بک‌اند لاراول و فرانت‌اند Next.js را برای سرور ابری (Ubuntu/Debian) شرح می‌دهد.

---

## ۱. پیش‌نیازهای سرور (Server Requirements)
- **PHP**: نسخه 8.2 یا جدیدتر با اکستنشن‌های: `bcmath, ctype, fileinfo, json, mbstring, openssl, pdo_mysql, tokenizer, xml, curl, redis`
- **Database**: MySQL 8.0+ یا PostgreSQL 15+
- **Cache & Queue**: Redis 7+
- **Node.js**: نسخه 20+ LTS و پکیج منیجر npm / pnpm
- **Web Server**: Nginx با گواهی رایگان Let's Encrypt SSL
- **Process Manager**: Supervisor (برای کارگران صف و تسک‌های پس‌زمینه)

---

## ۲. راه‌اندازی و کانفیگ بک‌اند لاراول (Laravel Backend Setup)

```bash
# رفتن به پوشه بک‌اند
cd /var/www/theatre-ticket/backend

# نصب وابستگی‌های کامپوزر بدون پکیج‌های توسعه
composer install --no-dev --optimize-autoloader

# کپی فایل محیط و تنظیم متغیرها
cp .env.example .env
nano .env

# تولید کلید برنامه
php artisan key:generate

# اجرای مایگریشن‌ها و سید کردن حساب‌های کاربری (مدیر، فروشنده، خریدار)
php artisan migrate --force --seed

# ایجاد لینک حافظه فایل‌ها و پوسترها
php artisan storage:link

# کش کردن تنظیمات و مسیرها جهت حداکثر سرعت
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## ۳. تنظیم صف‌ها با Supervisor (Queue Worker for SMS & Payments)
یک فایل کانفیگ در مسیر `/etc/supervisor/conf.d/theatre-worker.conf` ایجاد کنید:

```ini
[program:theatre-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/theatre-ticket/backend/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/theatre-ticket/backend/storage/logs/worker.log
stopwaitsecs=3600
```

سپس سرویس را فعال نمایید:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start theatre-worker:*
```

---

## ۴. کرون‌جاب پاکسازی رزروهای منقضی صندلی (Scheduler / Cron)
برای آزادسازی خودکار صندلی‌هایی که ۱۰ دقیقه از قفل آن‌ها گذشته و پرداخت نشده‌اند:
```bash
crontab -e -u www-data
```
دستور زیر را اضافه فرمایید:
```cron
* * * * * cd /var/www/theatre-ticket/backend && php artisan schedule:run >> /dev/null 2>&1
```

---

## ۵. کانفیگ وب‌سرور Nginx
نمونه کانفیگ هماهنگ برای API لاراول و فرانت‌اند Next.js:

```nginx
server {
    listen 80;
    server_name ticket.yourdomain.ir;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ticket.yourdomain.ir;

    ssl_certificate /etc/letsencrypt/live/ticket.yourdomain.ir/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ticket.yourdomain.ir/privkey.pem;

    # مسیر API به بک‌اند لاراول
    location /api {
        root /var/www/theatre-ticket/backend/public;
        try_files $uri $uri/ /index.php?$query_string;

        location ~ \.php$ {
            include fastcgi_params;
            fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
            fastcgi_param SCRIPT_FILENAME /var/www/theatre-ticket/backend/public$fastcgi_script_name;
        }
    }

    # مسیرهای استاتیک استوریج
    location /storage {
        alias /var/www/theatre-ticket/backend/storage/app/public;
        expires 30d;
    }

    # فرانت‌اند Next.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
