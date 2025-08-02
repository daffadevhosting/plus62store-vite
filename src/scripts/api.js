// assets/js/api.js
// Fungsi untuk berinteraksi dengan backend Worker AI
import * as consts from './constant.js';

/**
 * Memanggil API AI untuk mendapatkan respons.
 * @param {string} message - Pesan pengguna yang akan ditampilkan (human-readable).
 * @param {Array<Object>} cartItems - Item-item saat ini di keranjang.
 * @param {string} userId - ID unik pengguna.
 * @param {Object|null} aiStructuredInput - Opsional: Payload JSON terstruktur untuk AI (misal detail produk).
 * @returns {Promise<string>} Respons teks dari AI.
 */
export async function callGemini(message, cartItems, userId) {
  try {
    const response = await fetch(`${consts.currentApiUrl}/ai-assistant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message, cartItems: cartItems, userId: userId })
    });

    const data = await response.json();

    if (!response.ok) {
        if (response.status === 429) {
            throw new Error(data.error || 'Anda telah mencapai batas chat harian.');
        }
        throw new Error(data.error || 'Terjadi kesalahan pada server.');
    }

    const aiOnlineIndicatorElement = document.getElementById(consts.AI_ONLINE_INDICATOR_ID);
    const aiActiveTimeElement = document.getElementById(consts.AI_ACTIVE_TIME_ID);
    const aiOnlineMobileElement = document.getElementById(consts.AI_ONLINE_MOBILE_ID);
    const aiActiveMobileElement = document.getElementById(consts.AI_ACTIVE_MOBILE_ID);

    if (aiOnlineIndicatorElement) {
        aiOnlineIndicatorElement.classList.remove('hidden');
        aiActiveTimeElement.classList.add('hidden');
    }

    if (aiOnlineMobileElement) {
        aiOnlineMobileElement.classList.remove('hidden');
        aiActiveMobileElement.classList.add('hidden');
    }

    return data.reply;
  } catch (error) {
    console.error("AI error:", error);
    const aiOnlineIndicatorElement = document.getElementById(consts.AI_ONLINE_INDICATOR_ID);
    const aiActiveTimeElement = document.getElementById(consts.AI_ACTIVE_TIME_ID);
    const aiOnlineMobileElement = document.getElementById(consts.AI_ONLINE_MOBILE_ID);
    const aiActiveMobileElement = document.getElementById(consts.AI_ACTIVE_MOBILE_ID);

    if (aiOnlineIndicatorElement) {
        aiOnlineIndicatorElement.classList.add('hidden');
        aiActiveTimeElement.classList.remove('hidden');
    }
    if (aiOnlineMobileElement) {
        aiOnlineMobileElement.classList.add('hidden');
        aiActiveMobileElement.classList.remove('hidden');
    }
    return error.message || "Waduh, koneksiku lagi bermasalah nih. Coba lagi nanti ya! 😔";
  }
}