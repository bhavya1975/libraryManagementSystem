const db = require('./backend/db');

async function testDelete(bookId) {
    const conn = await db.getConnection();
    try {
        console.log(`Testing deletion for book ID: ${bookId}`);
        
        // 1. Delete fines
        const res1 = await conn.execute(`
            DELETE FROM Fine 
            WHERE issue_id IN (
                SELECT issue_id 
                FROM Issue_Record 
                WHERE copy_id IN (SELECT copy_id FROM Book_Copy WHERE book_id = :book_id)
            )`, { book_id: bookId }, { autoCommit: false });
        console.log(`Fines deleted: ${res1.rowsAffected}`);

        // 2. Delete issues
        const res2 = await conn.execute(`
            DELETE FROM Issue_Record 
            WHERE copy_id IN (SELECT copy_id FROM Book_Copy WHERE book_id = :book_id)`, 
            { book_id: bookId }, { autoCommit: false });
        console.log(`Issues deleted: ${res2.rowsAffected}`);

        // 3. Delete copies
        const res3 = await conn.execute('DELETE FROM Book_Copy WHERE book_id = :book_id', { book_id: bookId }, { autoCommit: false });
        console.log(`Copies deleted: ${res3.rowsAffected}`);
        
        // 4. Delete author mappings
        const res4 = await conn.execute('DELETE FROM Book_Author WHERE book_id = :book_id', { book_id: bookId }, { autoCommit: false });
        console.log(`Author mappings deleted: ${res4.rowsAffected}`);
        
        // 5. Delete the book
        const res5 = await conn.execute('DELETE FROM Book WHERE book_id = :book_id', { book_id: bookId }, { autoCommit: false });
        console.log(`Book record deleted: ${res5.rowsAffected}`);
        
        await conn.commit();
        console.log('SUCCESS: All deletions committed.');
    } catch (err) {
        console.error('ERROR during deletion sequence:');
        console.error(err);
        await conn.rollback();
    } finally {
        await conn.close();
    }
}

// Test with ID 1 (based on the screenshot)
testDelete(1);
