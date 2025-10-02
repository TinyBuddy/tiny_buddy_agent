// 简单的文件上传服务器
// 用于处理Nginx转发的文件上传请求
const http = require('http');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');

// 创建upload目录（如果不存在）
const uploadDir = path.join(__dirname, 'upload');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    // 只处理POST请求
    if (req.method !== 'POST') {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
        return;
    }

    // 使用formidable处理文件上传
    const form = new formidable.IncomingForm({
        uploadDir: uploadDir,
        keepExtensions: true,
        maxFileSize: 500 * 1024 * 1024, // 500MB
    });

    form.parse(req, (err, fields, files) => {
        if (err) {
            console.error('文件上传错误:', err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('文件上传失败');
            return;
        }

        // 获取上传的文件
        const uploadedFile = files.file;
        if (!uploadedFile) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('未找到文件');
            return;
        }

        // 获取原始文件名
        const originalFilename = uploadedFile.originalFilename || path.basename(uploadedFile.newFilename);
        const targetPath = path.join(uploadDir, originalFilename);

        // 重命名文件
        fs.rename(uploadedFile.filepath, targetPath, (err) => {
            if (err) {
                console.error('文件重命名错误:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('文件保存失败');
                return;
            }

            console.log(`文件上传成功: ${originalFilename}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                filename: originalFilename,
                size: uploadedFile.size,
                path: `/upload/${originalFilename}`
            }));
        });
    });
});

// 启动服务器，监听8082端口
const PORT = 8082;
server.listen(PORT, () => {
    console.log(`文件上传服务器已启动，监听端口 ${PORT}`);
});

// 优雅关闭服务器
process.on('SIGINT', () => {
    console.log('关闭文件上传服务器...');
    server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
    });
});