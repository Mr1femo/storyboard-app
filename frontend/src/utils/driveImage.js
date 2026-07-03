/**
 * Normalize Google Drive URLs for reliable embedding in <img> tags.
 */
export function getDriveImageUrl(url) {
  if (!url) return '';

  const idMatch = url.match(/[?&]id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
  if (idMatch) {
    return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
  }

  return url;
}
