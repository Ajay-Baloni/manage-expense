import multer from 'multer';

/** CSV imports are parsed in-memory; cap at 5 MB. */
export const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});
