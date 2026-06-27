# نظام إدارة إنتاج مصنع الملابس

## نظرة عامة
تطبيق ويب لإدارة دورة الإنتاج من استلام الطلب حتى تسليمه للفرع، مع توكيل المهام بالاسم بين الموظفين، فحص الجودة مع إمكانية الإرجاع، وخط سير مخصص لكل تصنيف منتج.

## المصادقة والصلاحيات
- تسجيل دخول/إنشاء حساب بالبريد + كلمة سر (Lovable Cloud)
- كل حساب جديد يدخل في حالة "بانتظار الموافقة" — لا يصل لشيء حتى يوافق الأدمن ويحدد دوره
- الأدوار: `admin` / `reception` (استلام طلبات وفرع) / `quality` / `worker` (مع تخصص: cutting/embroidery/sewing/buttons/ironing)
- جدول `user_roles` منفصل + دالة `has_role` (SECURITY DEFINER) لتفادي recursion في RLS

## نموذج البيانات (Lovable Cloud)
- `profiles` — id, full_name, username, approved (bool), specialty
- `app_role` enum + `user_roles(user_id, role)`
- `branches` — id, name (قابل للتعديل من الأدمن)
- `product_categories` — id, name
- `workflow_stages` — id, category_id, stage_key, label, order_index, assignable_role/specialty — يحدد الأدمن المراحل وترتيبها لكل تصنيف
- `orders` — id, invoice_number (INV-2026-0001 تلقائي عبر sequence + trigger)، category_id، branch_id، customer_name، quantity، notes، current_stage_id، status (in_progress/completed/flagged)، flagged (bool أحمر)
- `order_assignments` — id, order_id, stage_id, assigned_to (user_id)، assigned_by، status (pending/in_progress/done/returned)، started_at، finished_at، notes، returned_from_quality (bool)، return_reason
- `order_history` — سجل كل حركة (تسليم/استلام/إرجاع جودة) للتدقيق

## تدفق العمل
1. **استلام الطلب** — reception ينشئ طلب جديد، يختار التصنيف والفرع والكمية → يولّد رقم فاتورة تلقائي ويُنشئ assignment للمرحلة الأولى
2. **توكيل المهمة** — الموظف الحالي عند الانتهاء يختار الشخص التالي بالاسم/اليوزر من قائمة الموظفين المؤهلين للمرحلة التالية
3. **الجودة** — مسؤول الجودة يفحص. إما يمرّر للمرحلة التالية، أو يُرجع لمرحلة سابقة محددة مع تحديد الموظف المسؤول عن الخطأ + سبب → يُعلَّم الطلب بعلامة حمراء (flagged) ويظهر تنبيه
4. **التسليم النهائي** — بعد الكوي والأزرار يُسلَّم للفرع ويتغير status إلى completed

## الواجهات
- `/auth` — تسجيل دخول/تسجيل (عام)
- `/pending-approval` — شاشة انتظار موافقة الأدمن
- `/_authenticated/`:
  - `dashboard` — مهامي الحالية + الطلبات المعلَّمة بالأحمر
  - `orders` — قائمة كل الطلبات مع فلاتر
  - `orders/$id` — تفاصيل + شريط مراحل + سجل كامل + زر تسليم/إرجاع/فحص حسب الدور
  - `orders/new` — إنشاء طلب (reception/admin)
  - `admin/users` — موافقة على المستخدمين + تعيين أدوار وتخصصات
  - `admin/categories` — تصنيفات + بناء خط السير لكل تصنيف (drag/order)
  - `admin/branches` — إدارة وتعديل أسماء الفروع
  - `invoices` — قائمة الفواتير

## اللغة والتصميم
- عربي/إنجليزي مع تبديل، `dir="rtl"` افتراضي
- خطوط: Tajawal للعربي، Inter للإنجليزي (من @fontsource)
- نظام تصميم نظيف صناعي — لوحة محايدة هادئة مع لون أساسي مميز (تيل/أزرق غامق)، أحمر واضح لعلامة الجودة، حالات مراحل ملوّنة (بانتظار/قيد التنفيذ/مكتمل/مرتجع)
- بطاقة الطلب تُظهر شريط تقدم بالمراحل مع اسم الموظف الحالي

## الأمان
- RLS مفعّل على كل جدول
- لا يصل أي مستخدم لأي بيانات إلا بعد `approved=true` وتعيين دور
- صلاحيات الكتابة محصورة حسب الدور (مثلاً تعديل categories/branches/users للأدمن فقط)
- جميع عمليات تغيير الحالة عبر server functions مع `requireSupabaseAuth`

## التفاصيل التقنية
- TanStack Start + Cloud + RLS + has_role function
- توليد رقم الفاتورة: PostgreSQL sequence سنوي + trigger BEFORE INSERT
- i18n خفيف عبر context بسيط (قاموسين ar/en)
- تحقق المدخلات بـ zod في كل server function

## ما هو خارج النطاق (يمكن إضافته لاحقاً)
- طباعة الفاتورة PDF
- إشعارات فورية (realtime)
- تقارير وإحصائيات متقدمة
- رفع صور للمنتج في كل مرحلة
