-- Migration 012: contracts now distinguish between «подготовка документов»
-- (contract_type='docs') and «представительство в суде» (contract_type='court_rep').
-- For docs contracts we additionally track the expert who prepares the package
-- and the readiness flag (docs_status: 'pending' | 'ready').

ALTER TABLE contracts
  ADD COLUMN contract_type VARCHAR(20) NOT NULL DEFAULT 'docs' AFTER id_employee,
  ADD COLUMN expert_id INT NULL AFTER contract_type,
  ADD COLUMN docs_status VARCHAR(20) NOT NULL DEFAULT 'pending' AFTER expert_id;

ALTER TABLE contracts
  ADD INDEX idx_contracts_type (contract_type),
  ADD INDEX idx_contracts_expert (expert_id);
