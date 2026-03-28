const db = require('./backend/db');

async function testDelete(bookId) {
    const conn = await db.getConnection();
    try {
        console.log(`DELETING BOOK ID: ${bookId}`);
        
        // Step 1: Fines
        const res1 = await conn.execute(`
            DELETE FROM Fine 
            WHERE issue_id IN (
                SELECT issue_id 
                FROM Issue_Record 
                WHERE copy_id IN (SELECT copy_id FROM Book_Copy WHERE book_id = :book_id)
            )`, { book_id: bookId }, { autoCommit: false });
        console.log('Fines deleted:', res1.rowsAffected);

        // Step 2: Issues
        const res2 = await conn.execute(`
            DELETE FROM Issue_Record 
            WHERE copy_id IN (SELECT copy_id FROM Book_Copy WHERE book_id = :book_id)`, 
            { book_id: bookId }, { autoCommit: false });
        console.log('Issues deleted:', res2.rowsAffected);

        // Step 3: Copies
        const res3 = await conn.execute('DELETE FROM Book_Copy WHERE book_id = :book_id', { book_id: bookId }, { autoCommit: false });
        console.log('Copies deleted:', res3.rowsAffected);

        // Step 4: Book_Author
        const res4 = await conn.execute('DELETE FROM Book_Author WHERE book_id = :book_id', { book_id: bookId }, { autoCommit: false });
        console.log('Author links deleted:', res4.rowsAffected);

        // Step 5: Book
        const res5 = await conn.execute('DELETE FROM Book WHERE book_id = :book_id', { book_id: bookId }, { autoCommit: false });
        console.log('Book record deleted:', res5.rowsAffected);
        
        await conn.commit();
        console.log('SUCCESS');
    } catch (err) {
        console.error('FAILED:', err);
        await conn.rollback();
    } finally {
        await conn.close();
    }
}

testDelete(23);
