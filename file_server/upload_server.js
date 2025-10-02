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
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 处理OPTIONS请求
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 处理POST请求（文件上传）
    if (req.method === 'POST') {
        const form = new formidable.IncomingForm();
        form.uploadDir = uploadDir;
        form.keepExtensions = true;
        form.maxFileSize = 500 * 1024 * 1024; // 500MB

        form.parse(req, (err, fields, files) => {
            if (err) {
                console.error('文件上传错误:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('文件上传失败');
                return;
            }

            // 获取上传的文件
            let fileData;
            if (Array.isArray(files.file)) {
                // 如果是数组，取第一个文件
                fileData = files.file[0];
            } else {
                // 如果不是数组，直接使用
                fileData = files.file;
            }
            
            if (!fileData) {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('未找到文件');
                return;
            }

            try {
                // 打印文件对象结构用于调试
                console.log('文件对象结构:', JSON.stringify(fileData, null, 2));
                
                // 获取文件路径
                let tempFilePath;
                if (fileData.filepath) {
                    tempFilePath = fileData.filepath;
                } else if (fileData.path) {
                    tempFilePath = fileData.path;
                } else if (fileData.newFilename) {
                    tempFilePath = path.join(uploadDir, fileData.newFilename);
                } else {
                    console.error('找不到有效的文件路径');
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('文件保存失败');
                    return;
                }

                console.log('找到的临时文件路径:', tempFilePath);
                
                // 检查文件是否存在
                if (!fs.existsSync(tempFilePath)) {
                    console.error('临时文件不存在:', tempFilePath);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('文件保存失败');
                    return;
                }

                // 生成新的文件名（使用时间戳避免冲突）
                const timestamp = Date.now();
                const originalName = fileData.originalFilename || 'uploaded_file';
                const ext = path.extname(originalName);
                const safeFilename = `upload_${timestamp}${ext}`;
                const targetPath = path.join(uploadDir, safeFilename);

                // 重命名文件
                fs.renameSync(tempFilePath, targetPath);

                console.log(`文件上传成功: ${safeFilename}`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    filename: safeFilename,
                    path: `/upload/${safeFilename}`
                }));
            } catch (error) {
                console.error('文件处理错误:', error);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('文件保存失败');
            }
        });
        return;
    }

    // 处理DELETE请求（文件删除）
    if (req.method === 'DELETE') {
        // 从URL中提取文件名
        const urlParts = req.url.split('/');
        const filename = urlParts[urlParts.length - 1];
        
        // 构建文件路径
        const filePath = path.join(uploadDir, filename);
        
        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
            console.error('文件不存在:', filePath);
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                message: '文件不存在'
            }));
            return;
        }
        
        try {
            // 删除文件
            fs.unlinkSync(filePath);
            console.log(`文件删除成功: ${filename}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: '文件删除成功'
            }));
        } catch (error) {
            console.error('文件删除错误:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                message: '文件删除失败'
            }));
        }
        return;
    }

    // 其他请求方法不支持
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
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