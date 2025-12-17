import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middlewares/auth';
import { config } from '../config/env';
import { logger } from '../middlewares/logger';

export const ephisRouter = Router();

/**
 * Token Cache สำหรับเก็บ token และ expiration time
 */
interface TokenCache {
    token: string;
    expiresAt: number; // Unix timestamp in milliseconds
}

let tokenCache: TokenCache | null = null;

/**
 * Middleware สำหรับตรวจสอบว่า EPHIS Service ถูก config หรือไม่
 */
const requireEphisService = (req: Request, res: Response, next: any) => {
    if (!config.services.ephis) {
        return res.status(503).json({
            success: false,
            error: 'EPHIS_SERVICE_UNAVAILABLE',
            message: 'EPHIS Service is not configured'
        });
    }
    next();
};

/**
 * ฟังก์ชันสำหรับขอ token จาก EPHIS API
 */
async function getEphisToken(): Promise<string> {
    const ephisConfig = config.services.ephis;

    if (!ephisConfig) {
        throw new Error('EPHIS Service is not configured');
    }

    try {
        const response = await fetch(`${ephisConfig.baseUrl}/api/GetToken?user=${ephisConfig.user}&password=${ephisConfig.password}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`GetToken API returned status ${response.status}`);
        }

        const data = await response.json() as { MessageCode: number; Result: string };

        if (data.MessageCode !== 200 || !data.Result) {
            throw new Error(`GetToken API returned error: MessageCode ${data.MessageCode}`);
        }

        // Decode JWT token เพื่อดู expiration time
        try {
            const tokenParts = data.Result.split('.');
            if (tokenParts.length === 3) {
                const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
                const expiresAt = (payload.exp || 0) * 1000; // Convert to milliseconds

                // Cache token โดยลบ 5 นาทีก่อน expiration เพื่อความปลอดภัย
                tokenCache = {
                    token: data.Result,
                    expiresAt: expiresAt - (5 * 60 * 1000) // ลบ 5 นาที
                };
            } else {
                // ถ้า decode ไม่ได้ ให้ cache ไว้ 55 นาที (default)
                tokenCache = {
                    token: data.Result,
                    expiresAt: Date.now() + (55 * 60 * 1000)
                };
            }
        } catch {
            // ถ้า decode ไม่ได้ ให้ cache ไว้ 55 นาที (default)
            tokenCache = {
                token: data.Result,
                expiresAt: Date.now() + (55 * 60 * 1000)
            };
        }

        return data.Result;
    } catch (error: any) {
        logger.error({ error: error.message }, 'Failed to get EPHIS token');
        throw error;
    }
}

/**
 * ฟังก์ชันสำหรับดึง token จาก cache หรือขอใหม่
 */
async function getCachedToken(): Promise<string> {
    // ตรวจสอบว่า token ยัง valid อยู่หรือไม่
    if (tokenCache && Date.now() < tokenCache.expiresAt) {
        return tokenCache.token;
    }

    // ถ้า token หมดอายุหรือไม่มี ให้ขอใหม่
    return await getEphisToken();
}

/**
 * ขอ Token จาก EPHIS API
 * POST /api-gateway/ephis/token
 */
ephisRouter.post(
    '/token',
    authMiddleware,
    requireEphisService,
    async (req: Request, res: Response) => {
        try {
            const token = await getEphisToken();

            res.json({
                success: true,
                data: {
                    token
                }
            });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Error getting EPHIS token');

            res.status(500).json({
                success: false,
                error: 'TOKEN_REQUEST_FAILED',
                message: error.message || 'Failed to get EPHIS token'
            });
        }
    }
);

/**
 * ค้นหาข้อมูลผู้ป่วยจาก EPHIS API
 * POST /api-gateway/ephis/patient
 * Body: { hn?: string, an?: string } (ต้องมีอย่างน้อย 1 อย่าง)
 */
ephisRouter.post(
    '/patient',
    authMiddleware,
    requireEphisService,
    async (req: Request, res: Response) => {
        try {
            const { hn, an } = req.body;

            // ตรวจสอบว่ามี hn หรือ an อย่างน้อย 1 อย่าง
            if (!hn && !an) {
                return res.status(400).json({
                    success: false,
                    error: 'MISSING_PARAMETERS',
                    message: 'Either hn or an is required'
                });
            }

            // ดึง token จาก cache หรือขอใหม่
            const token = await getCachedToken();

            const ephisConfig = config.services.ephis!;
            
            // สร้าง request body โดยส่งเฉพาะ field ที่มีค่า
            const requestBody: { hn?: string; an?: string } = {};
            if (hn) {
                requestBody.hn = hn;
            }
            if (an) {
                requestBody.an = an;
            }
            
            const dataToSend = JSON.stringify(requestBody);
            
            // เรียก His/Patient API
            const response = await fetch(`${ephisConfig.baseUrl}/api/His/Patient`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Access-Token': token
                },
                body: dataToSend
            });

            

            if (!response.ok) {
                // ถ้าเป็น 401 อาจเป็นเพราะ token หมดอายุ ลองขอใหม่
                if (response.status === 401) {
                    logger.warn('EPHIS token expired, requesting new token');
                    const newToken = await getEphisToken();

                    // Retry request with new token
                    const retryResponse = await fetch(`${ephisConfig.baseUrl}/api/His/Patient`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Access-Token': newToken
                        },
                        body: JSON.stringify(requestBody)
                    });

                    if (!retryResponse.ok) {
                        throw new Error(`His/Patient API returned status ${retryResponse.status}`);
                    }

                    const retryApiData = await retryResponse.json();

                    // ตรวจสอบ MessageCode และ Result
                    if (retryApiData.MessageCode !== 200) {
                        return res.status(404).json({
                            success: false,
                            error: 'PATIENT_NOT_FOUND',
                            message: `MessageCode: ${retryApiData.MessageCode} - ไม่พบข้อมูลผู้ป่วย`
                        });
                    }

                    if (!retryApiData.Result || !Array.isArray(retryApiData.Result) || retryApiData.Result.length === 0) {
                        return res.status(404).json({
                            success: false,
                            error: 'PATIENT_NOT_FOUND',
                            message: 'ไม่พบข้อมูลผู้ป่วยในระบบ'
                        });
                    }

                    // ส่งข้อมูลผู้ป่วยคนแรกกลับไป
                    return res.json({
                        success: true,
                        data: retryApiData.Result[0]
                    });
                }

                throw new Error(`His/Patient API returned status ${response.status}`);
            }

            const apiData = await response.json();

            // ตรวจสอบ MessageCode และ Result
            if (apiData.MessageCode !== 200) {
                return res.status(404).json({
                    success: false,
                    error: 'PATIENT_NOT_FOUND',
                    message: `MessageCode: ${apiData.MessageCode} - ไม่พบข้อมูลผู้ป่วย`
                });
            }

            if (!apiData.Result || !Array.isArray(apiData.Result) || apiData.Result.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'PATIENT_NOT_FOUND',
                    message: 'ไม่พบข้อมูลผู้ป่วยในระบบ'
                });
            }

            // ส่งข้อมูลผู้ป่วยคนแรกกลับไป
            res.json({
                success: true,
                data: apiData.Result[0]
            });
        } catch (error: any) {
            logger.error({ error: error.message }, 'Error fetching patient data from EPHIS');

            res.status(500).json({
                success: false,
                error: 'PATIENT_FETCH_FAILED',
                message: error.message || 'Failed to fetch patient data from EPHIS'
            });
        }
    }
);

