-- Oracle triggers for status and fine handling

-- After a book is issued, mark copy as 'issued'
CREATE OR REPLACE TRIGGER trg_after_issue_insert
AFTER INSERT ON Issue_Record
FOR EACH ROW
BEGIN
  UPDATE Book_Copy
  SET    status = 'issued'
  WHERE  copy_id = :NEW.copy_id;
END;
/

-- After an issue record is updated with a return_date, mark copy as 'available'
-- and create/update Fine if there is a late return
CREATE OR REPLACE TRIGGER trg_after_issue_update
AFTER UPDATE OF return_date ON Issue_Record
FOR EACH ROW
DECLARE
  v_amount NUMBER;
BEGIN
  -- If return_date was just set
  IF :NEW.return_date IS NOT NULL AND :OLD.return_date IS NULL THEN

    UPDATE Book_Copy
    SET status = 'available'
    WHERE copy_id = :NEW.copy_id;

    v_amount := CASE 
      WHEN TRUNC(:NEW.return_date) > TRUNC(:NEW.due_date)
      THEN (TRUNC(:NEW.return_date) - TRUNC(:NEW.due_date)) * 5
      ELSE 0
    END;

    IF v_amount > 0 THEN
      BEGIN
        INSERT INTO Fine (issue_id, amount, paid_status)
        VALUES (:NEW.issue_id, v_amount, 'unpaid');
      EXCEPTION
        WHEN DUP_VAL_ON_INDEX THEN
          UPDATE Fine
          SET amount = v_amount
          WHERE issue_id = :NEW.issue_id;
      END;
    END IF;

  END IF;
END;
/

commit;