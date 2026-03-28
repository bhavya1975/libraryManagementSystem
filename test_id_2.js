const db = require('./backend/db');

async function testDelete(bookId) {
    const conn = await db.getConnection();
    try {
        console.log(`DELETING BOOK ID: ${bookId}`);
        
        await conn.execute(`
            DELETE FROM Fine 
            WHERE issue_id IN (
                SELECT issue_id 
                FROM Issue_Record 
                WHERE copy_id IN (SELECT copy_id FROM Book_Copy WHERE book_id = :book_id)
            )`, { book_id: bookId }, { autoCommit: false });

        await conn.execute(`
            DELETE FROM Issue_Record 
            WHERE copy_id IN (SELECT copy_id FROM Book_Copy WHERE book_id = :book_id)`, 
            { book_id: bookId }, { autoCommit: false });

        await conn.execute('DELETE FROM Book_Copy WHERE book_id = :book_id', { book_id: bookId }, { autoCommit: false });
        await conn.execute('DELETE FROM Book_Author WHERE book_id = :book_id', { book_id: bookId }, { autoCommit: false });
        await conn.execute('DELETE FROM Book WHERE book_id = :book_id', { book_id: bookId }, { autoCommit: false });
        
        await conn.commit();
        console.log('SUCCESS');
    } catch (err) {
        console.error('FAILED:', err.message);
        await conn.rollback();
    } finally {
        await conn.close();
    }
}

// I saw book ID 2 in the previous screenshot (behind the alert)
testDelete(2);
