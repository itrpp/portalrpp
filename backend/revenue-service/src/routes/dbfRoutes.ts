import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/authMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';
import { errorHandler } from '../utils/errorHandler';
import { logger } from '../utils/logger';
import multer from 'multer';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// GET /dbf/files - ดึงรายการไฟล์ DBF ทั้งหมด
router.get('/files', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const files = await prisma.dBFFile.findMany({
      where: { userId },
      include: {
        conditions: true,
        exports: true,
      },
    });

    return res.json(files);
  } catch (error) {
    return errorHandler(error as any, req, res);
  }
});

// GET /dbf/files/:id - ดึงไฟล์ DBF ตาม ID
router.get('/files/:id', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!id) {
      return res.status(400).json({ error: 'Missing file ID' });
    }

    const file = await prisma.dBFFile.findFirst({
      where: { id, userId },
      include: {
        conditions: true,
        exports: true,
      },
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    return res.json(file);
  } catch (error) {
    return errorHandler(error as any, req, res);
  }
});

// POST /dbf/files - อัปโหลดไฟล์ DBF ใหม่
router.post('/files', authMiddleware, rateLimitMiddleware, upload.single('file'), async (req, res) => {
  try {
    const userId = req.user?.id;
    const { filename, originalName, size, schema } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!filename || !originalName || !size) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const file = await prisma.dBFFile.create({
      data: {
        filename,
        originalName,
        size: parseInt(size),
        userId,
        schema: schema ? JSON.stringify(schema) : null,
      },
    });

    logger.info(`DBF file uploaded: ${filename} by user ${userId}`);
    return res.status(201).json(file);
  } catch (error) {
    return errorHandler(error as any, req, res);
  }
});

// DELETE /dbf/files/:id - ลบไฟล์ DBF
router.delete('/files/:id', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!id) {
      return res.status(400).json({ error: 'Missing file ID' });
    }

    const file = await prisma.dBFFile.findFirst({
      where: { id, userId },
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    await prisma.dBFFile.delete({
      where: { id },
    });

    logger.info(`DBF file deleted: ${file.filename} by user ${userId}`);
    return res.status(204).send();
  } catch (error) {
    return errorHandler(error as any, req, res);
  }
});

// GET /dbf/conditions - ดึงรายการเงื่อนไขทั้งหมด
router.get('/conditions', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conditions = await prisma.dBFCondition.findMany({
      where: { userId },
      include: {
        file: true,
      },
    });

    return res.json(conditions);
  } catch (error) {
    return errorHandler(error as any, req, res);
  }
});

// POST /dbf/conditions - สร้างเงื่อนไขใหม่
router.post('/conditions', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { name, description, rules, fileId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name || !description || !rules || !fileId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const condition = await prisma.dBFCondition.create({
      data: {
        name,
        description,
        rules,
        userId,
        fileId,
      },
    });

    logger.info(`DBF condition created: ${name} by user ${userId}`);
    return res.status(201).json(condition);
  } catch (error) {
    return errorHandler(error as any, req, res);
  }
});

// PUT /dbf/conditions/:id - อัปเดตเงื่อนไข
router.put('/conditions/:id', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { name, description, rules, isActive } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!id) {
      return res.status(400).json({ error: 'Missing condition ID' });
    }

    const condition = await prisma.dBFCondition.findFirst({
      where: { id, userId },
    });

    if (!condition) {
      return res.status(404).json({ error: 'Condition not found' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (rules !== undefined) updateData.rules = rules;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedCondition = await prisma.dBFCondition.update({
      where: { id },
      data: updateData,
    });

    logger.info(`DBF condition updated: ${id} by user ${userId}`);
    return res.json(updatedCondition);
  } catch (error) {
    return errorHandler(error as any, req, res);
  }
});

// DELETE /dbf/conditions/:id - ลบเงื่อนไข
router.delete('/conditions/:id', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!id) {
      return res.status(400).json({ error: 'Missing condition ID' });
    }

    const condition = await prisma.dBFCondition.findFirst({
      where: { id, userId },
    });

    if (!condition) {
      return res.status(404).json({ error: 'Condition not found' });
    }

    await prisma.dBFCondition.delete({
      where: { id },
    });

    logger.info(`DBF condition deleted: ${id} by user ${userId}`);
    return res.status(204).send();
  } catch (error) {
    return errorHandler(error as any, req, res);
  }
});

// GET /dbf/exports - ดึงรายการการส่งออกทั้งหมด
router.get('/exports', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const exports = await prisma.dBFExport.findMany({
      where: { userId },
      include: {
        file: true,
      },
    });

    return res.json(exports);
  } catch (error) {
    return errorHandler(error as any, req, res);
  }
});

// POST /dbf/exports - สร้างการส่งออกใหม่
router.post('/exports', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { fileId, filename, format } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!fileId || !filename || !format) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const exportRecord = await prisma.dBFExport.create({
      data: {
        fileId,
        filename,
        format,
        userId,
      },
    });

    logger.info(`DBF export created: ${filename} by user ${userId}`);
    return res.status(201).json(exportRecord);
  } catch (error) {
    return errorHandler(error as any, req, res);
  }
});

// PUT /dbf/exports/:id - อัปเดตการส่งออก
router.put('/exports/:id', authMiddleware, rateLimitMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { filename, format, status } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!id) {
      return res.status(400).json({ error: 'Missing export ID' });
    }

    const exportRecord = await prisma.dBFExport.findFirst({
      where: { id, userId },
    });

    if (!exportRecord) {
      return res.status(404).json({ error: 'Export not found' });
    }

    const updateData: any = {};
    if (filename !== undefined) updateData.filename = filename;
    if (format !== undefined) updateData.format = format;
    if (status !== undefined) updateData.status = status;

    const updatedExport = await prisma.dBFExport.update({
      where: { id },
      data: updateData,
    });

    logger.info(`DBF export updated: ${id} by user ${userId}`);
    return res.json(updatedExport);
  } catch (error) {
    return errorHandler(error as any, req, res);
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'revenue-service',
    timestamp: new Date().toISOString(),
    dbf: 'available',
  });
});

export default router; 
