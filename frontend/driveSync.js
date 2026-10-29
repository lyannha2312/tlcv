const CLIENT_ID = '750727203253-qtp2iqlu7hrvn38qlr88cfdlrnr44r6l.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient;
let accessToken = null;

// 1. Khởi tạo thư viện Google Identity Services
export const initGoogleAuth = (onReady) => {
    if (!document.getElementById('gsi-script')) {
        const script = document.createElement('script');
        script.id = 'gsi-script';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            if (window.google) {
                tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: '' // sẽ được ghi đè lúc gọi
                });
                if (onReady) onReady();
            }
        };
        document.body.appendChild(script);
    }
};

// 2. Bật cửa sổ đăng nhập / Cấp quyền
export const loginAndSync = (actionCallback) => {
    if (!tokenClient) {
        alert('Thư viện Google chưa tải xong. Vui lòng thử lại sau 1-2 giây.');
        return;
    }
    tokenClient.callback = (resp) => {
        if (resp.error) {
            console.error(resp.error);
            return;
        }
        accessToken = resp.access_token;
        actionCallback();
    };
    tokenClient.requestAccessToken({ prompt: '' });
};

// 3. Tìm file backup cũ trên Drive
const findBackupFile = async () => {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='QLCV_Cloud_Backup.json' and trashed=false`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await res.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
};

// 4. Upload ghi đè dữ liệu lên Drive
export const uploadToDrive = async (appData) => {
    if (!accessToken) throw new Error("Chưa xác thực Google");
    let file = await findBackupFile();
    
    // Nếu chưa có file thì tạo metadata trước
    if (!file) {
        const metaRes = await fetch('https://www.googleapis.com/drive/v3/files', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'QLCV_Cloud_Backup.json', mimeType: 'application/json' }) });
        file = await metaRes.json();
    }

    // Đẩy nội dung vào file
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=media`, { method: 'PATCH', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(appData) });
    if (!res.ok) throw new Error('Lỗi tải dữ liệu lên mạng');
    return true;
};

// 5. Tải dữ liệu từ Drive về máy
export const downloadFromDrive = async () => {
    if (!accessToken) throw new Error("Chưa xác thực Google");
    const file = await findBackupFile();
    if (!file) return null;
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error('Lỗi tải dữ liệu xuống máy');
    return await res.json();
};