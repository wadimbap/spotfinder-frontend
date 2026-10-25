export function validatePhoto(file: File): string {
    if (file.size === 0) return `${file.name}: the file is empty.`;
    if (file.size > 5 * 1024 * 1024) return `${file.name}: maximum file size is 5 MiB.`;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return `${file.name}: choose a JPEG, PNG or WebP image.`;
    return "";
}
