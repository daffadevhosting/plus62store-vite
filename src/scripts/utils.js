// assets/js/utils.js
/**
 * Mencari dan mem-parsing array JSON atau objek JSON dari dalam sebuah string teks.
 * Ini mencari blok JSON paling awal yang valid.
 * @param {string} text - Teks respons dari AI.
 * @returns {{parsed: Array|Object|null, remaining: string}} Objek berisi data JSON yang sudah diparsing dan sisa teks.
 */
export function findJsonInText(text) {
  if (typeof text !== 'string' || text.length === 0) {
      return { parsed: null, remaining: String(text || '') };
  }

  // Cari posisi kurung kurawal atau kurung siku pertama
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');

  let startIndex = -1;
  let endIndex = -1;
  let jsonString = '';

  // Prioritaskan kurung siku jika ada (untuk array), jika tidak, kurung kurawal
  if (firstBracket !== -1 && (firstBracket < firstBrace || firstBrace === -1)) {
    startIndex = firstBracket;
    // Cari kurung siku penutup terakhir yang cocok
    let openBracketCount = 0;
    for (let i = startIndex; i < text.length; i++) {
        if (text[i] === '[') openBracketCount++;
        else if (text[i] === ']') openBracketCount--;
        if (openBracketCount === 0 && text[i] === ']') {
            endIndex = i;
            break;
        }
    }
  } else if (firstBrace !== -1) {
    startIndex = firstBrace;
    // Cari kurung kurawal penutup terakhir yang cocok
    let openBraceCount = 0;
    for (let i = startIndex; i < text.length; i++) {
        if (text[i] === '{') openBraceCount++;
        else if (text[i] === '}') openBraceCount--;
        if (openBraceCount === 0 && text[i] === '}') {
            endIndex = i;
            break;
        }
    }
  }

  if (startIndex !== -1 && endIndex !== -1) {
      jsonString = text.substring(startIndex, endIndex + 1);

      // Pastikan untuk menghapus blok kode JSON (termasuk ```json dan ```) dari teks asli
      let remainingText = text.substring(0, startIndex).trim(); // Teks sebelum JSON
      remainingText += " " + text.substring(endIndex + 1).trim(); // Teks setelah JSON

      // Hapus marker ```json dan ``` jika masih ada di remainingText
      remainingText = remainingText.replace(/```json\s*/g, '').replace(/\s*```/g, '').trim();

      try {
          const parsed = JSON.parse(jsonString);
          return { parsed: parsed, remaining: remainingText };
      } catch (e) {
          // Jika gagal parsing, perlakukan seluruhnya sebagai teks biasa
          return { parsed: null, remaining: text };
      }
  }

  // Jika tidak ada JSON yang ditemukan, kembalikan seluruh teks sebagai 'remaining'
  return { parsed: null, remaining: text };
}

/**
 * Fungsi pembantu untuk memformat objek produk menjadi teks yang rapi.
 * Tidak menampilkan gambar atau tombol, hanya teks.
 * @param {object} product - Objek produk.
 * @returns {string} Teks terformat dari detail produk.
 */
export function formatProductAsText(product) {
    let details = `*${product.title}*\n`;
    details += `Harga: Rp ${product.discount} ${product.price && product.price !== product.discount ? `(_Harga Normal: Rp ${product.price}_)` : ''}\n`;
    details += `Stok: ${product.stok}\n`;
    if (product.description) {
        details += `Deskripsi: ${product.description}\n`;
    }
    if (product.styles && product.styles.length > 0) {
        const colors = product.styles.map(s => s.name).join(', ');
        details += `Varian Warna: ${colors}\n\n`;
    }
    return details;
}

/**
 * Fungsi untuk menghasilkan atau mengambil User ID dari localStorage.
 * @returns {string} User ID.
 */
export function getOrCreateUserId() {
    let userId = localStorage.getItem('lyra_user_id');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('lyra_user_id', userId);
    }
    return userId;
}

/**
 * Fungsi untuk memperbarui waktu aktif AI secara real-time.
 */
export function updateAiActiveTime(aiActiveTimeElement, aiActiveMobileElement) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    aiActiveTimeElement.textContent = `🕛️Active ${hours}:${minutes}`;
    aiActiveMobileElement.textContent = `🕛️Active ${hours}:${minutes}`;
}
