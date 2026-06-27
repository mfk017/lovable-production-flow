
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'reception', 'quality', 'worker');
CREATE TYPE public.worker_specialty AS ENUM ('cutting', 'embroidery', 'sewing', 'buttons', 'ironing', 'other');
CREATE TYPE public.order_status AS ENUM ('in_progress', 'completed', 'flagged');
CREATE TYPE public.assignment_status AS ENUM ('pending', 'in_progress', 'done', 'returned');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  username TEXT UNIQUE,
  specialty public.worker_specialty,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND approved = true)
$$;

-- PROFILES policies
CREATE POLICY "users view own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_approved(auth.uid()));
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "users update own basic profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND approved = (SELECT approved FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "admin manage profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- USER ROLES policies
CREATE POLICY "view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- handle_new_user trigger -> create profile row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.raw_user_meta_data->>'username')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- BRANCHES
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER branches_touch BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE POLICY "approved read branches" ON public.branches FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "admin write branches" ON public.branches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PRODUCT CATEGORIES
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
GRANT ALL ON public.product_categories TO service_role;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER cats_touch BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE POLICY "approved read cats" ON public.product_categories FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "admin write cats" ON public.product_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- WORKFLOW STAGES (per category)
CREATE TABLE public.workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  order_index INT NOT NULL,
  required_role public.app_role NOT NULL DEFAULT 'worker',
  required_specialty public.worker_specialty,
  is_quality BOOLEAN NOT NULL DEFAULT false,
  is_final_delivery BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, order_index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflow_stages TO authenticated;
GRANT ALL ON public.workflow_stages TO service_role;
ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved read stages" ON public.workflow_stages FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "admin write stages" ON public.workflow_stages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- INVOICE SEQUENCE (yearly)
CREATE TABLE public.invoice_counters (
  year INT PRIMARY KEY,
  last_value INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.invoice_counters TO authenticated;
GRANT ALL ON public.invoice_counters TO service_role;
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "approved read counters" ON public.invoice_counters FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));

CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  y INT := EXTRACT(YEAR FROM now())::int;
  n INT;
BEGIN
  INSERT INTO public.invoice_counters(year, last_value) VALUES (y, 1)
    ON CONFLICT (year) DO UPDATE SET last_value = public.invoice_counters.last_value + 1
    RETURNING last_value INTO n;
  RETURN 'INV-' || y::text || '-' || lpad(n::text, 4, '0');
END; $$;

-- ORDERS
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  category_id UUID NOT NULL REFERENCES public.product_categories(id),
  branch_id UUID NOT NULL REFERENCES public.branches(id),
  customer_name TEXT NOT NULL DEFAULT '',
  product_name TEXT NOT NULL DEFAULT '',
  quantity INT NOT NULL DEFAULT 1,
  notes TEXT,
  status public.order_status NOT NULL DEFAULT 'in_progress',
  flagged BOOLEAN NOT NULL DEFAULT false,
  flag_reason TEXT,
  current_stage_id UUID REFERENCES public.workflow_stages(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX orders_status_idx ON public.orders(status);
CREATE INDEX orders_current_stage_idx ON public.orders(current_stage_id);

CREATE POLICY "approved read orders" ON public.orders FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "reception or admin create" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'reception'));
CREATE POLICY "admin update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete orders" ON public.orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ORDER ASSIGNMENTS
CREATE TABLE public.order_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.workflow_stages(id),
  assigned_to UUID REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id),
  status public.assignment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  is_return BOOLEAN NOT NULL DEFAULT false,
  return_reason TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_assignments TO authenticated;
GRANT ALL ON public.order_assignments TO service_role;
ALTER TABLE public.order_assignments ENABLE ROW LEVEL SECURITY;
CREATE INDEX oa_order_idx ON public.order_assignments(order_id);
CREATE INDEX oa_assignee_idx ON public.order_assignments(assigned_to);

CREATE POLICY "approved read assignments" ON public.order_assignments FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "approved create assignments" ON public.order_assignments FOR INSERT TO authenticated
  WITH CHECK (public.is_approved(auth.uid()));
CREATE POLICY "approved update assignments" ON public.order_assignments FOR UPDATE TO authenticated
  USING (public.is_approved(auth.uid())) WITH CHECK (public.is_approved(auth.uid()));
CREATE POLICY "admin delete assignments" ON public.order_assignments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ORDER HISTORY (audit)
CREATE TABLE public.order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  from_stage_id UUID REFERENCES public.workflow_stages(id),
  to_stage_id UUID REFERENCES public.workflow_stages(id),
  to_user_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_history TO authenticated;
GRANT ALL ON public.order_history TO service_role;
ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX oh_order_idx ON public.order_history(order_id);
CREATE POLICY "approved read history" ON public.order_history FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "approved write history" ON public.order_history FOR INSERT TO authenticated
  WITH CHECK (public.is_approved(auth.uid()));
