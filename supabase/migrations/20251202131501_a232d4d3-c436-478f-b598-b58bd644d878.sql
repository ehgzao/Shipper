-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('sales', 'engineering', 'design', 'operations', 'marketing', 'consulting', 'other');
CREATE TYPE public.strength_orientation AS ENUM ('technical', 'business', 'balanced');
CREATE TYPE public.company_type AS ENUM ('tech_giant', 'scaleup', 'startup');
CREATE TYPE public.work_model AS ENUM ('remote', 'hybrid', 'onsite');
CREATE TYPE public.seniority_level AS ENUM ('entry', 'mid', 'senior', 'lead', 'principal', 'director', 'vp');
CREATE TYPE public.opportunity_status AS ENUM ('researching', 'applied', 'interviewing', 'offer', 'rejected', 'ghosted', 'withdrawn');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  years_experience_total INTEGER DEFAULT 0,
  years_experience_product INTEGER DEFAULT 0,
  previous_background public.app_role,
  strength_orientation public.strength_orientation,
  industry_experience TEXT[] DEFAULT '{}',
  preferred_company_stage TEXT[] DEFAULT '{}',
  target_roles TEXT[] DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  preferred_countries TEXT[] DEFAULT '{}',
  verification_frequency_days INTEGER DEFAULT 7,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create target_companies table
CREATE TABLE public.target_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  company_type public.company_type,
  country TEXT NOT NULL,
  sector TEXT,
  careers_url TEXT,
  notes TEXT,
  last_checked_at TIMESTAMPTZ,
  is_preset BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on target_companies
ALTER TABLE public.target_companies ENABLE ROW LEVEL SECURITY;

-- Target companies policies
CREATE POLICY "Users can view own target companies" ON public.target_companies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own target companies" ON public.target_companies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own target companies" ON public.target_companies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own target companies" ON public.target_companies FOR DELETE USING (auth.uid() = user_id);

-- Create opportunities table
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  target_company_id UUID REFERENCES public.target_companies(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  job_url TEXT,
  location TEXT,
  work_model public.work_model,
  salary_range TEXT,
  required_skills TEXT[] DEFAULT '{}',
  required_years_experience INTEGER,
  seniority_level public.seniority_level,
  status public.opportunity_status DEFAULT 'researching',
  match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
  match_breakdown JSONB DEFAULT '{}',
  next_action TEXT,
  next_action_date DATE,
  contact_name TEXT,
  contact_linkedin TEXT,
  notes TEXT,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on opportunities
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Opportunities policies
CREATE POLICY "Users can view own opportunities" ON public.opportunities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own opportunities" ON public.opportunities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own opportunities" ON public.opportunities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own opportunities" ON public.opportunities FOR DELETE USING (auth.uid() = user_id);

-- Create preset_companies table (public read)
CREATE TABLE public.preset_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  company_type public.company_type,
  country TEXT NOT NULL,
  sector TEXT,
  careers_url TEXT
);

-- Enable RLS on preset_companies (public read)
ALTER TABLE public.preset_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view preset companies" ON public.preset_companies FOR SELECT USING (true);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert preset companies (60 companies across 6 countries)
INSERT INTO public.preset_companies (company_name, company_type, country, sector, careers_url) VALUES
-- PORTUGAL (10)
('OutSystems', 'tech_giant', 'portugal', 'Low-code Platform', 'https://www.outsystems.com/careers/'),
('Feedzai', 'tech_giant', 'portugal', 'AI/Fintech', 'https://feedzai.com/careers/'),
('Talkdesk', 'tech_giant', 'portugal', 'Contact Center SaaS', 'https://www.talkdesk.com/careers/'),
('Remote.com', 'tech_giant', 'portugal', 'HR Tech', 'https://remote.com/careers'),
('Critical Software', 'tech_giant', 'portugal', 'Enterprise Software', 'https://www.criticalsoftware.com/careers'),
('Tekever', 'scaleup', 'portugal', 'Drones/AI', 'https://tekever.com/careers/'),
('YData', 'scaleup', 'portugal', 'Data/AI', 'https://ydata.ai/careers'),
('Indie Campers', 'scaleup', 'portugal', 'Travel Tech', 'https://indiecampers.com/careers'),
('Anchorage Digital', 'scaleup', 'portugal', 'Crypto/Fintech', 'https://www.anchorage.com/careers'),
('Stratio', 'scaleup', 'portugal', 'AI/Transport', 'https://stratioautomotive.com/careers/'),
-- BRAZIL (10)
('Nubank', 'tech_giant', 'brazil', 'Fintech', 'https://nubank.com.br/carreiras/'),
('iFood', 'tech_giant', 'brazil', 'Delivery', 'https://carreiras.ifood.com.br/'),
('Grupo Boticário', 'tech_giant', 'brazil', 'Retail/Beauty Tech', 'https://grupoboticario.gupy.io/'),
('Creditas', 'tech_giant', 'brazil', 'Fintech', 'https://creditas.gupy.io/'),
('QuintoAndar', 'tech_giant', 'brazil', 'PropTech', 'https://carreiras.quintoandar.com.br/'),
('Blip', 'scaleup', 'brazil', 'AI/Communications', 'https://blip.ai/carreiras/'),
('Tractian', 'scaleup', 'brazil', 'Industrial AI', 'https://tractian.com/careers'),
('QI Tech', 'scaleup', 'brazil', 'Banking as a Service', 'https://qitech.com.br/carreiras'),
('Wellhub', 'scaleup', 'brazil', 'Wellness Tech', 'https://wellhub.com/careers/'),
('CloudWalk', 'scaleup', 'brazil', 'Payments', 'https://cloudwalk.io/careers'),
-- GERMANY (10)
('SAP', 'tech_giant', 'germany', 'Enterprise Software', 'https://jobs.sap.com/'),
('Celonis', 'tech_giant', 'germany', 'Process Mining', 'https://www.celonis.com/careers/'),
('Delivery Hero', 'tech_giant', 'germany', 'Delivery', 'https://careers.deliveryhero.com/'),
('Zalando', 'tech_giant', 'germany', 'E-commerce', 'https://jobs.zalando.com/'),
('N26', 'tech_giant', 'germany', 'Fintech', 'https://n26.com/en/careers'),
('FlixBus', 'scaleup', 'germany', 'Mobility', 'https://www.flixbus.com/careers'),
('Personio', 'scaleup', 'germany', 'HR Tech', 'https://www.personio.com/careers/'),
('Trade Republic', 'scaleup', 'germany', 'Fintech', 'https://traderepublic.com/careers'),
('SumUp', 'scaleup', 'germany', 'Payments', 'https://www.sumup.com/careers/'),
('GetYourGuide', 'scaleup', 'germany', 'Travel Tech', 'https://careers.getyourguide.com/'),
-- SPAIN (10)
('Glovo', 'tech_giant', 'spain', 'Delivery', 'https://jobs.glovoapp.com/'),
('Cabify', 'tech_giant', 'spain', 'Mobility', 'https://cabify.com/en/jobs'),
('Typeform', 'tech_giant', 'spain', 'Forms/SaaS', 'https://www.typeform.com/careers/'),
('Factorial', 'tech_giant', 'spain', 'HR Tech', 'https://factorialhr.com/careers'),
('Wallapop', 'tech_giant', 'spain', 'Marketplace', 'https://boards.eu.greenhouse.io/wallapop'),
('Jobandtalent', 'scaleup', 'spain', 'HR Tech', 'https://jobandtalent.com/careers'),
('Playtomic', 'scaleup', 'spain', 'Sports Tech', 'https://playtomic.io/careers'),
('TravelPerk', 'scaleup', 'spain', 'Travel B2B', 'https://www.travelperk.com/careers/'),
('Fever', 'scaleup', 'spain', 'Entertainment Tech', 'https://careers.feverup.com/'),
('Holded', 'scaleup', 'spain', 'Fintech/ERP', 'https://www.holded.com/careers'),
-- IRELAND (10)
('Stripe', 'tech_giant', 'ireland', 'Payments', 'https://stripe.com/jobs'),
('HubSpot', 'tech_giant', 'ireland', 'Marketing/CRM', 'https://www.hubspot.com/careers'),
('Salesforce', 'tech_giant', 'ireland', 'CRM/Cloud', 'https://salesforce.com/careers'),
('Workday', 'tech_giant', 'ireland', 'HR/Finance SaaS', 'https://workday.com/careers'),
('Indeed', 'tech_giant', 'ireland', 'Job Search', 'https://indeed.com/cmp/Indeed/jobs'),
('Intercom', 'scaleup', 'ireland', 'Customer Messaging', 'https://www.intercom.com/careers'),
('Fenergo', 'scaleup', 'ireland', 'Fintech/Compliance', 'https://www.fenergo.com/careers/'),
('Tines', 'scaleup', 'ireland', 'Security Automation', 'https://www.tines.com/careers'),
('Workhuman', 'scaleup', 'ireland', 'HR Tech', 'https://www.workhuman.com/careers/'),
('AccountsIQ', 'scaleup', 'ireland', 'Finance SaaS', 'https://www.accountsiq.com/careers/'),
-- NETHERLANDS (10)
('Booking.com', 'tech_giant', 'netherlands', 'Travel', 'https://careers.booking.com/'),
('Adyen', 'tech_giant', 'netherlands', 'Payments', 'https://careers.adyen.com/'),
('ASML', 'tech_giant', 'netherlands', 'Semiconductors', 'https://www.asml.com/careers'),
('Elastic', 'tech_giant', 'netherlands', 'Search/Data', 'https://www.elastic.co/careers/'),
('TomTom', 'tech_giant', 'netherlands', 'Location Tech', 'https://www.tomtom.com/careers/'),
('Mollie', 'scaleup', 'netherlands', 'Payments', 'https://www.mollie.com/careers'),
('Miro', 'scaleup', 'netherlands', 'Collaboration', 'https://miro.com/careers/'),
('Messagebird', 'scaleup', 'netherlands', 'Communications', 'https://messagebird.com/careers'),
('Sendcloud', 'scaleup', 'netherlands', 'Logistics SaaS', 'https://www.sendcloud.com/careers/'),
('Bunq', 'scaleup', 'netherlands', 'Fintech', 'https://www.bunq.com/careers');