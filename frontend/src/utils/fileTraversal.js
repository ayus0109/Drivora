import api from '../api/axios';

/**
 * Recursive File & Directory Traversal (HTML5 FileSystem API)
 * Traverses dropped folders from Windows Explorer / macOS Finder
 * and maps nested file paths to cloud folder structures.
 */

// Reads all entries from a FileSystemDirectoryReader
const readAllDirectoryEntries = async (directoryReader) => {
  const entries = [];
  let readEntries = await new Promise((resolve, reject) => {
    directoryReader.readEntries(resolve, reject);
  });

  while (readEntries.length > 0) {
    entries.push(...readEntries);
    readEntries = await new Promise((resolve, reject) => {
      directoryReader.readEntries(resolve, reject);
    });
  }

  return entries;
};

// Recursively walks an entry (file or directory)
const traverseEntry = async (entry, pathSegments = []) => {
  if (entry.isFile) {
    return new Promise((resolve) => {
      entry.file((file) => {
        resolve([
          {
            file,
            pathSegments,
            name: file.name,
          },
        ]);
      }, () => resolve([]));
    });
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    const entries = await readAllDirectoryEntries(reader);
    const results = [];
    const currentSegments = [...pathSegments, entry.name];

    for (const childEntry of entries) {
      const childFiles = await traverseEntry(childEntry, currentSegments);
      results.push(...childFiles);
    }
    return results;
  }
  return [];
};

/**
 * Extract all files from a drop event with directory tree preservation
 */
export const extractFilesFromDataTransfer = async (dataTransfer) => {
  const items = dataTransfer.items;

  // Modern FileSystem Entry check
  if (items && items.length > 0 && typeof items[0].webkitGetAsEntry === 'function') {
    const allFiles = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          const files = await traverseEntry(entry, []);
          allFiles.push(...files);
        }
      }
    }
    if (allFiles.length > 0) {
      return allFiles;
    }
  }

  // Fallback to standard dataTransfer.files
  const rawFiles = dataTransfer.files;
  if (rawFiles && rawFiles.length > 0) {
    return Array.from(rawFiles).map((file) => ({
      file,
      pathSegments: [],
      name: file.name,
    }));
  }

  return [];
};

/**
 * Resolves or creates a nested folder chain in MongoDB
 * e.g. pathSegments = ['Photos', '2026', 'Summer']
 * Returns the final folderId to upload files into.
 */
const folderPathCache = new Map();

export const resolveFolderPath = async (pathSegments, rootFolderId = null) => {
  if (!pathSegments || pathSegments.length === 0) {
    return rootFolderId || null;
  }

  let currentParentId = rootFolderId || 'root';

  for (const segment of pathSegments) {
    const cacheKey = `${currentParentId}_${segment}`;
    if (folderPathCache.has(cacheKey)) {
      currentParentId = folderPathCache.get(cacheKey);
      continue;
    }

    try {
      // Find existing folder under parent
      const parentParam = currentParentId === 'root' ? 'root' : currentParentId;
      const res = await api.get('/folders', {
        params: { parent: parentParam, search: segment },
      });

      const existing = (res.data?.folders || []).find(
        (f) => f.name.toLowerCase() === segment.toLowerCase()
      );

      if (existing) {
        currentParentId = existing._id;
        folderPathCache.set(cacheKey, existing._id);
      } else {
        // Create folder
        const createRes = await api.post('/folders', {
          name: segment,
          parentId: currentParentId === 'root' ? null : currentParentId,
        });
        const createdId = createRes.data?.folder?._id;
        if (createdId) {
          currentParentId = createdId;
          folderPathCache.set(cacheKey, createdId);
        }
      }
    } catch (err) {
      console.warn('Folder resolution fallback:', err.message);
      break;
    }
  }

  return currentParentId === 'root' ? null : currentParentId;
};
