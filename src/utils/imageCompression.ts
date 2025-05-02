import imageCompression from 'browser-image-compression';

export const MAX_FILE_SIZE_MB = 2;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Default compression options (adjust as needed)
export const DEFAULT_COMPRESSION_OPTIONS = {
  maxSizeMB: 1, // Compress images over 1MB
  maxWidthOrHeight: 1024, // Resize images larger than 1024px
  useWebWorker: true,
  initialQuality: 0.8, // Start with 80% quality
};

/**
 * Compresses an image file according to given options
 * 
 * @param file The image file to compress
 * @param options Compression options that override the defaults
 * @returns Promise resolving to the compressed file
 */
export async function compressImage(
  file: File,
  defaultOptions = {}
): Promise<File> {
  const options = { ...DEFAULT_COMPRESSION_OPTIONS, ...defaultOptions };
  try {
    console.log(`Original file size: ${file.size / 1024 / 1024} MB`);
    const compressedFile = await imageCompression(file, options);
    console.log(
      `Compressed file size: ${compressedFile.size / 1024 / 1024} MB`,
    );
    return compressedFile;
  } catch (error) {
    console.error('Error during image compression:', error);
    throw new Error('Failed to compress image');
  }
}