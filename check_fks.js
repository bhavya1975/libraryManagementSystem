const db = require('./backend/db');

async function checkFKs() {
    const conn = await db.getConnection();
    try {
        console.log('Checking for tables referencing Book or Book_Copy...');
        const sql = `
            SELECT a.table_name, a.column_name, a.constraint_name, c_pk.table_name as r_table_name
            FROM all_cons_columns a
            JOIN all_constraints c ON a.owner = c.owner AND a.constraint_name = c.constraint_name
            JOIN all_constraints c_pk ON c.r_owner = c_pk.owner AND c.r_constraint_name = c_pk.constraint_name
            WHERE c.constraint_type = 'R'
            AND c_pk.table_name IN ('BOOK', 'BOOK_COPY', 'ISSUE_RECORD')
            AND a.owner = (SELECT user FROM dual)
        `;
        const result = await conn.execute(sql);
        console.table(result.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await conn.close();
    }
}

checkFKs();
