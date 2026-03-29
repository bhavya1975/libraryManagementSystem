-- PL/SQL stored procedures for Library Management System 


-- Calculate fine based on days late and a fixed rate
CREATE OR REPLACE PROCEDURE calculate_fine (
  p_issue_id IN  NUMBER,
  p_amount   OUT NUMBER
) AS
  v_due_date    DATE;
  v_return_date DATE;
  v_minutes_late NUMBER;
  v_rate        NUMBER := {{__FINE_RATE__}}; -- fine per minute late
BEGIN
  SELECT due_date,
         NVL(return_date, SYSDATE) -- don't TRUNC so we keep exact time!
  INTO   v_due_date,
         v_return_date
  FROM   Issue_Record
  WHERE  issue_id = p_issue_id;

  IF v_due_date IS NULL THEN
    p_amount := 0;
  ELSE 
    -- explicitly apply 1 minute grace period and floor the minutes
    v_minutes_late := FLOOR((v_return_date - v_due_date) * 24 * 60);
    IF v_minutes_late >= 1 THEN
      p_amount := v_minutes_late * v_rate;
    ELSE
      p_amount := 0;
    END IF;
  END IF;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    p_amount := 0;
END;
/

-- Issue a book: validates availability, creates Issue_Record
CREATE OR REPLACE PROCEDURE issue_book (
  p_member_id    IN NUMBER,
  p_copy_id      IN NUMBER,
  p_librarian_id IN NUMBER
) AS
  v_status VARCHAR2(20);
BEGIN
  -- check member active
  SELECT status
  INTO   v_status
  FROM   Member
  WHERE  member_id = p_member_id;

  IF LOWER(v_status) <> 'active' THEN
    RAISE_APPLICATION_ERROR(-20001, 'Member not active');
  END IF;

  -- check copy availability
  SELECT status
  INTO   v_status
  FROM   Book_Copy
  WHERE  copy_id = p_copy_id
  FOR UPDATE;

  IF v_status <> 'available' THEN
    RAISE_APPLICATION_ERROR(-20002, 'Copy is not available');
  END IF;

  -- create issue record (14-day checkout period)
  INSERT INTO Issue_Record (copy_id, member_id, issue_date, due_date, issued_by)
  VALUES (p_copy_id,
          p_member_id,
          SYSDATE,
          SYSDATE + ({{__LOAN_PERIOD__}} / 24 / 60), -- EXACTLY 1 MINUTE PERIOD FOR TESTING
          p_librarian_id);

  -- status of Book_Copy will be set by trigger after insert on Issue_Record
END;
/

-- Return a book: updates Issue_Record.return_date, calculates fine and creates Fine row if needed
CREATE OR REPLACE PROCEDURE return_book (
  p_issue_id IN NUMBER
) AS
  v_returned DATE;
  v_amount   NUMBER;
BEGIN
  SELECT return_date
  INTO   v_returned
  FROM   Issue_Record
  WHERE  issue_id = p_issue_id
  FOR UPDATE;

  IF v_returned IS NOT NULL THEN
    RAISE_APPLICATION_ERROR(-20003, 'Book already returned');
  END IF;

  UPDATE Issue_Record
  SET    return_date = SYSDATE
  WHERE  issue_id = p_issue_id;

  -- trigger trg_after_issue_update will automatically update copy status 
  -- and insert the Fine row if applicable.
END;
/
COMMIT;
