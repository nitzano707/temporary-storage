const path = require('path');
const fs = require('fs');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }

    const contentType = event.headers['content-type'] || '';
    if (!contentType.startsWith('multipart/form-data')) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid Content-Type. Expected multipart/form-data.' }),
        };
    }

    try {
        const boundary = contentType.split('boundary=')[1];
        const parts = parseMultipartFormData(Buffer.from(event.body, 'base64'), boundary);

        const file = parts.files.file; // Assume the file input is named 'file'
        const filePath = path.join('/tmp', file.filename);
        fs.writeFileSync(filePath, file.content);

        const publicUrl = `https://${process.env.SITE_NAME}.netlify.app/uploads/${file.filename}`;
        return {
            statusCode: 200,
            body: JSON.stringify({ url: publicUrl }),
        };
    } catch (error) {
        console.error('Error processing file:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to process file' }),
        };
    }
};

function parseMultipartFormData(body, boundary) {
    const parts = body.toString().split(`--${boundary}`);
    const files = {};
    const fields = {};

    for (const part of parts) {
        const [headers, content] = part.split('\r\n\r\n');
        if (!headers || !content) continue;

        const contentDisposition = headers.match(/Content-Disposition: form-data; name="(.+?)"(; filename="(.+?)")?/);
        if (!contentDisposition) continue;

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
    }

    return { files, fields };
}
