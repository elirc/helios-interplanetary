CREATE TABLE customers (
  id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id), name text NOT NULL,
  contact text NOT NULL, UNIQUE(organization_id,id)
);
CREATE TABLE subscriptions (
  id text PRIMARY KEY, organization_id text NOT NULL, customer_id text NOT NULL,
  plan text NOT NULL, base_cents integer NOT NULL CHECK(base_cents>=0), unit_cents integer NOT NULL CHECK(unit_cents>=0),
  UNIQUE(organization_id,id), FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id)
);
CREATE TABLE usage_records (
  id uuid PRIMARY KEY, organization_id text NOT NULL, subscription_id text NOT NULL,
  period text NOT NULL, quantity integer NOT NULL CHECK(quantity>0),
  FOREIGN KEY(organization_id,subscription_id) REFERENCES subscriptions(organization_id,id)
);
CREATE TABLE invoices (
  id uuid PRIMARY KEY, number integer GENERATED ALWAYS AS IDENTITY, organization_id text NOT NULL,
  subscription_id text NOT NULL, customer_id text NOT NULL, period text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','UNKNOWN','PAID','REFUNDED')),
  amount_cents integer NOT NULL CHECK(amount_cents>0), created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  paid_at timestamptz, correlation_id uuid NOT NULL,
  UNIQUE(organization_id,id), UNIQUE(organization_id,subscription_id,period),
  FOREIGN KEY(organization_id,subscription_id) REFERENCES subscriptions(organization_id,id),
  FOREIGN KEY(organization_id,customer_id) REFERENCES customers(organization_id,id)
);
CREATE TABLE invoice_lines (
  organization_id text NOT NULL, invoice_id uuid NOT NULL, line_key text NOT NULL,
  description text NOT NULL, quantity integer NOT NULL CHECK(quantity>0), unit_cents integer NOT NULL CHECK(unit_cents>=0),
  PRIMARY KEY(organization_id,invoice_id,line_key), FOREIGN KEY(organization_id,invoice_id) REFERENCES invoices(organization_id,id)
);
CREATE TABLE payment_attempts (
  id uuid PRIMARY KEY, organization_id text NOT NULL, invoice_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','UNKNOWN','SUCCEEDED','REFUNDED')),
  amount_cents integer NOT NULL CHECK(amount_cents>0), provider_key uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(organization_id,id), UNIQUE(organization_id,invoice_id),
  FOREIGN KEY(organization_id,invoice_id) REFERENCES invoices(organization_id,id)
);
-- Independent simulated provider store: written in a separate transaction from Helios settlement.
CREATE TABLE provider_charges (
  provider_key uuid PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id), invoice_id uuid NOT NULL,
  amount_cents integer NOT NULL CHECK(amount_cents>0), status text NOT NULL CHECK(status IN ('SUCCEEDED','REFUNDED')),
  charged_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(organization_id,invoice_id)
);
CREATE TABLE payment_webhooks (
  id uuid PRIMARY KEY, organization_id text NOT NULL, attempt_id uuid NOT NULL,
  payload jsonb NOT NULL, received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY(organization_id,attempt_id) REFERENCES payment_attempts(organization_id,id)
);
CREATE TABLE ledger_accounts (
  organization_id text NOT NULL REFERENCES organizations(id), code text NOT NULL, name text NOT NULL,
  PRIMARY KEY(organization_id,code)
);
CREATE TABLE journal_entries (
  id uuid PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id), reference text NOT NULL,
  description text NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), created_tx bigint NOT NULL DEFAULT txid_current(),
  UNIQUE(organization_id,id), UNIQUE(organization_id,reference)
);
CREATE TABLE journal_lines (
  id uuid PRIMARY KEY, organization_id text NOT NULL, entry_id uuid NOT NULL, account text NOT NULL,
  side text NOT NULL CHECK(side IN ('DEBIT','CREDIT')), amount_cents integer NOT NULL CHECK(amount_cents>0),
  FOREIGN KEY(organization_id,entry_id) REFERENCES journal_entries(organization_id,id),
  FOREIGN KEY(organization_id,account) REFERENCES ledger_accounts(organization_id,code)
);
CREATE FUNCTION check_journal_balance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE journal_id uuid; balance bigint; lines_count integer;
BEGIN
  IF TG_TABLE_NAME='journal_entries' THEN journal_id=NEW.id; ELSE journal_id=NEW.entry_id; END IF;
  SELECT COALESCE(sum(CASE WHEN side='DEBIT' THEN amount_cents ELSE -amount_cents END),0),count(*) INTO balance,lines_count FROM journal_lines WHERE entry_id=journal_id;
  IF balance<>0 OR lines_count<2 THEN RAISE EXCEPTION 'Journal entry must contain balanced debit and credit lines' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER balanced_journal_entry AFTER INSERT ON journal_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_journal_balance();
CREATE CONSTRAINT TRIGGER balanced_journal_lines AFTER INSERT ON journal_lines DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_journal_balance();
CREATE FUNCTION reject_journal_edit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Posted journals are immutable; post a reversal' USING ERRCODE='23514'; END $$;
CREATE TRIGGER immutable_journal_lines BEFORE UPDATE OR DELETE ON journal_lines FOR EACH ROW EXECUTE FUNCTION reject_journal_edit();
CREATE TRIGGER immutable_journal_entries BEFORE UPDATE OR DELETE ON journal_entries FOR EACH ROW EXECUTE FUNCTION reject_journal_edit();
CREATE FUNCTION require_new_journal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM journal_entries WHERE id=NEW.entry_id AND created_tx=txid_current()) THEN
    RAISE EXCEPTION 'Cannot append to a committed journal' USING ERRCODE='23514';
  END IF; RETURN NEW;
END $$;
CREATE TRIGGER journal_lines_same_transaction BEFORE INSERT ON journal_lines FOR EACH ROW EXECUTE FUNCTION require_new_journal();
CREATE TABLE support_tickets (
  id uuid PRIMARY KEY, number integer GENERATED ALWAYS AS IDENTITY, organization_id text NOT NULL REFERENCES organizations(id),
  invoice_id uuid, title text NOT NULL, status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','INVESTIGATING','RESOLVED')),
  priority text NOT NULL DEFAULT 'P2', summary text NOT NULL, resolution text,
  due_at timestamptz NOT NULL DEFAULT (clock_timestamp()+interval '4 hours'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), correlation_id uuid NOT NULL,
  UNIQUE(organization_id,invoice_id), FOREIGN KEY(organization_id,invoice_id) REFERENCES invoices(organization_id,id)
);
CREATE TABLE security_investigations (
  id uuid PRIMARY KEY, number integer GENERATED ALWAYS AS IDENTITY, organization_id text NOT NULL REFERENCES organizations(id),
  title text NOT NULL, status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','INVESTIGATING','RESOLVED')),
  signals jsonb NOT NULL, finding text, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  resolved_by text, correlation_id uuid NOT NULL
);
ALTER TABLE workflow_instances ADD COLUMN escalated_at timestamptz;
