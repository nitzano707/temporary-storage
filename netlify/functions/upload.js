const path = require('path');
const fs = require('fs');

exports.handler = async (event) => {
    // טיפול בבקשות OPTIONS (Preflight)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': 'https://ivritgit.netlify.app', // החלף בכתובת האפליקציה שלך
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: '',
        };
    }

    // טיפול בבקשות שאינן POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': 'https://ivritgit.netlify.app', // החלף בכתובת האפליקציה שלך
            },
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    try {
        // בדיקת Content-Type
        const contentType = event.headers['content-type'] || '';
        if (!contentType.startsWith('multipart/form-data')) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': 'https://ivritgit.netlify.app', // החלף בכתובת האפליקציה שלך
                },
                body: JSON.stringify({ error: 'Invalid Content-Type. Expected multipart/form-data.' }),
            };
        }

        // פענוח multipart/form-data
        const boundary = contentType.split('boundary=')[1];
        const parts = parseMultipartFormData(Buffer.from(event.body, 'base64'), boundary);

        // שמירת הקובץ לנתיב זמני
        const file = parts.files.file; // 'file' הוא שם הקובץ שהועלה
        const filePath = path.join('/tmp', file.filename);
        fs.writeFileSync(filePath, file.content);

        // יצירת URL ציבורי
        const publicUrl = `${process.env.STORAGE_BASE_URL}/uploads/${file.filename}`;
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': 'https://ivritgit.netlify.app', // החלף בכתובת האפליקציה שלך
            },
            body: JSON.stringify({ url: publicUrl }),
        };
    } catch (error) {
        console.error('Error processing file:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': 'https://ivritgit.netlify.app', // החלף בכתובת האפליקציה שלך
            },
            body: JSON.stringify({ error: 'Failed to process file' }),
        };
    }
};

// פונקציה לפענוח multipart/form-data
function parseMultipartFormData(body, boundary) {
    const parts = body.toString().split(`--${boundary}`);
    const files = {};
    const fields = {};

    parts.forEach((part) => {
        const [headers, content] = part.split('\r\n\r\n');
        if (!headers || !content) return;

        const contentDisposition = headers.match(/Content-Disposition: form-data; name="(.+?)"(; filename="(.+?)")?/);
        if (!contentDisposition) return;

        const fieldName = contentDisposition[1];
        const filename = contentDisposition[3];

        if (filename) {
            const contentType = headers.match(/Content-Type: (.+)/)[1];
            files[fieldName] = {
                filename,
                content: Buffer.from(content.trim(), 'utf8'),
                contentType,
            };
        } else {
            fields[fieldName] = content.trim();
        }
    });

    return { files, fields };
}
