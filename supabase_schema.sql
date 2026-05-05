-- ==========================================
-- ENGLISH TUTORY APP - CORE SCHEMA
-- ==========================================
-- Note: This is a fresh schema containing only the necessary 
-- non-gamification tables based on the provided reference.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Students Table (Cleaned: removed total_xp, changed cycle_classes to sessions_attended)
CREATE TABLE public.students (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  qr_code text NOT NULL UNIQUE,
  full_name text NOT NULL,
  grade_batch text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  card_variant integer DEFAULT 1,
  enrollment_date date,
  pin_code text,
  sessions_attended integer DEFAULT 0,
  CONSTRAINT students_pkey PRIMARY KEY (id)
);

-- 2. Schedules Table (Dependency for attendance_logs)
CREATE TABLE public.schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  schedule_type text NOT NULL,
  parent_schedule_id uuid,
  override_action text,
  day_of_week integer,
  specific_date date,
  start_time time without time zone,
  end_time time without time zone,
  target_grades ARRAY DEFAULT '{}'::text[],
  target_students ARRAY DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT schedules_pkey PRIMARY KEY (id),
  CONSTRAINT schedules_parent_schedule_id_fkey FOREIGN KEY (parent_schedule_id) REFERENCES public.schedules(id)
);

-- 3. Attendance Logs Table
CREATE TABLE public.attendance_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  scanned_at timestamp with time zone NOT NULL,
  synced_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'present'::text,
  schedule_id uuid,
  CONSTRAINT attendance_logs_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_logs_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT attendance_logs_schedule_id_fkey FOREIGN KEY (schedule_id) REFERENCES public.schedules(id)
);

-- 4. Payments Table (Existing structure untouched)
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_month date NOT NULL,
  paid_at timestamp with time zone DEFAULT now(),
  notes text,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);

-- 5. Push Subscriptions Table
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT push_subscriptions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);

-- 6. Notifications Table (For in-app notification history)
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid,
  title text NOT NULL,
  message text,
  type text DEFAULT 'info'::text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);

-- 7. Card Print Queue
CREATE TABLE public.card_print_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid,
  added_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'pending'::text,
  CONSTRAINT card_print_queue_pkey PRIMARY KEY (id),
  CONSTRAINT card_print_queue_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);


-- ==========================================
-- PUSH NOTIFICATION TRIGGERS
-- ==========================================

-- Function to handle 'Fee Due' notification when sessions_attended hits 8
CREATE OR REPLACE FUNCTION trigger_fee_due_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if sessions_attended exactly hit 8
  IF NEW.sessions_attended = 8 AND OLD.sessions_attended < 8 THEN
    
    -- 1. Create an in-app notification record
    INSERT INTO public.notifications (student_id, title, message, type)
    VALUES (NEW.id, 'Fee Due', 'You have attended 8 sessions. Your fee is now due.', 'alert');
    
    -- 2. Call external Push Notification service via pg_net (Edge Function or external API)
    -- Uncomment and replace the URL with your Supabase Edge Function URL
    /*
    PERFORM net.http_post(
      url := 'https://<your-project-ref>.supabase.co/functions/v1/send-push',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon-key>"}'::jsonb,
      body := json_build_object(
        'student_id', NEW.id,
        'title', '💳 Fee Due',
        'body', 'You have attended 8 sessions. Your fee is now due.',
        'url', '/dashboard/payments'
      )::jsonb
    );
    */
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Fire AFTER UPDATE on students table
CREATE TRIGGER on_sessions_attended_update
  AFTER UPDATE OF sessions_attended ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION trigger_fee_due_notification();


-- Function to handle 'Payment Received' notification on new payment
CREATE OR REPLACE FUNCTION trigger_payment_received_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Create an in-app notification record
  INSERT INTO public.notifications (student_id, title, message, type)
  VALUES (NEW.student_id, 'Payment Received', 'Your payment of ' || NEW.amount || ' has been processed successfully.', 'success');
  
  -- 2. Call external Push Notification service via pg_net
  -- Uncomment and replace the URL with your Supabase Edge Function URL
  /*
  PERFORM net.http_post(
    url := 'https://<your-project-ref>.supabase.co/functions/v1/send-push',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon-key>"}'::jsonb,
    body := json_build_object(
      'student_id', NEW.student_id,
      'title', '✅ Payment Received',
      'body', 'Your payment of ' || NEW.amount || ' has been processed successfully.',
      'url', '/dashboard/ledger'
    )::jsonb
  );
  */
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Fire AFTER INSERT on payments table
CREATE TRIGGER on_payment_inserted
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_payment_received_notification();
