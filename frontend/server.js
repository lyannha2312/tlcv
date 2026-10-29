import { createServer } from 'http';
import { exec } from 'child_process';
import { parse } from 'url';

const PORT = 3001;

// Các thư mục gốc để tìm kiếm theo tên — chỉnh lại nếu cần
const SEARCH_ROOTS = ['D:\\'];

createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Content-Type', 'application/json');

    const { pathname, query } = parse(req.url, true);

    // Mở theo đường dẫn tuyệt đối (backward compat)
    if (pathname === '/open') {
        const filePath = query.path;
        const type = query.type || 'folder';

        if (!filePath) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing path' }));
            return;
        }

        if (!/^[A-Za-z]:\\/.test(filePath) && !/^\\\\/.test(filePath)) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid path' }));
            return;
        }

        const cmd = type === 'file'
            ? `explorer /select,"${filePath}"`
            : `explorer "${filePath}"`;

        exec(cmd, () => {
            res.writeHead(200);
            res.end(JSON.stringify({ ok: true }));
        });
        return;
    }

    // Tìm thư mục theo tên rồi mở
    if (pathname === '/find-folder') {
        const folderName = query.name;

        if (!folderName) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Missing name' }));
            return;
        }

        // Chặn ký tự đặc biệt nguy hiểm
        if (/[<>:"/\\|?*'`]/.test(folderName)) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Tên thư mục chứa ký tự không hợp lệ' }));
            return;
        }

        const rootList = SEARCH_ROOTS.map(r => `'${r}'`).join(',');
        const psCmd = `powershell -NoProfile -Command "Get-ChildItem -Path ${rootList} -Filter '${folderName}' -Directory -Depth 6 -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName"`;

        exec(psCmd, { timeout: 20000 }, (err, stdout) => {
            const found = stdout.trim();
            if (!found) {
                res.writeHead(404);
                res.end(JSON.stringify({ error: `Không tìm thấy thư mục "${folderName}" trong ${SEARCH_ROOTS.join(', ')}` }));
                return;
            }
            exec(`explorer "${found}"`, () => {
                res.writeHead(200);
                res.end(JSON.stringify({ ok: true, path: found }));
            });
        });
        return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));

}).listen(PORT, '127.0.0.1', () => {
    console.log(`File opener server: http://127.0.0.1:${PORT}`);
});
