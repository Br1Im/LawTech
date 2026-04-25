-- Migration 011: split daily plan into weekday and weekend
ALTER TABLE office_plans
  CHANGE COLUMN daily_plan_amount daily_plan_weekday DECIMAL(15, 2) NOT NULL DEFAULT 0;

ALTER TABLE office_plans
  ADD COLUMN daily_plan_weekend DECIMAL(15, 2) NOT NULL DEFAULT 0 AFTER daily_plan_weekday;
