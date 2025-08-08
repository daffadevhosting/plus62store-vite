// assets/js/ui.js
import * as consts from './constant.js';
import { formatProductAsText, findJsonInText } from './utils.js';
import { processAiCartAction } from './simpleCart-actions.js';

/**
 * Menampilkan pesan di jendela chat.
 * @param {string} text - Isi pesan dari AI (bisa berisi JSON tersemat).\n
 * @param {'user' | 'ai'} sender - Pengirim pesan.\n
 * @param {HTMLElement} targetChatMessages - Elemen kontainer chat.\n
 * @param {boolean} isHistorical - Menandakan apakah pesan ini dari riwayat (tidak perlu scroll ke bawah otomatis)\n
 */
export function appendMessage(text, sender, targetChatMessages, isHistorical = false) {
    if (text === null || text === undefined || String(text).trim() === '') {
        console.warn(`appendMessage received invalid text input for sender ${sender}:`, text);
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = `flex items-start mb-4 ${sender === 'user' ? 'flex-row-reverse' : ''}`;

    let contentHtml = '';
    let finalMessageText = String(text);
    let productDataForModal = null; // Variabel untuk menyimpan data produk jika ada

    if (sender === 'ai') {
        const { parsed, remaining } = findJsonInText(String(text));

        if (parsed && parsed.action) {
            // Tangani aksi keranjang atau lainnya
            if (parsed.action === 'viewProductDetails' && parsed.product) {
                productDataForModal = parsed.product; // Simpan data produk
                // Gunakan remaining text sebagai pesan AI, atau sediakan default
                finalMessageText = remaining || `Berikut detail produk yang Anda minta tentang *${parsed.product.title}*:`;
            } else {
                // Proses aksi lain seperti addToCart, emptyCart, dll.
                processAiCartAction(parsed, targetChatMessages);
                finalMessageText = remaining || String(text); // Gunakan sisa teks jika ada
            }
        }
    }

    // Tampilan teks pesan
    contentHtml = marked.parse(DOMPurify.sanitize(finalMessageText));

    // Tambahkan tombol "Lihat Detail Produk" jika ada data produk
    if (productDataForModal) {
        contentHtml += `
            <div class="mt-2 text-center">
                <ion-button class="view-product-details-btn" data-product='${encodeURIComponent(JSON.stringify(productDataForModal))}' size="small" fill="outline">
                    Lihat Detail Produk
                    <ion-icon name="open-outline" slot="end"></ion-icon>
                </ion-button>
            </div>
        `;
    }

    wrapper.innerHTML = `
        <div class="flex items-center justify-center h-8 w-8 rounded-full ${sender === 'user' ? 'bg-purple-500' : 'bg-blue-600'} text-white text-lg font-bold flex-shrink-0">
            ${sender === 'user' ? '<ion-icon name="person-outline"></ion-icon>' : '<ion-icon name="sparkles-outline"></ion-icon>'}
        </div>
        <div class="relative text-sm py-2 px-4 shadow rounded-xl ${sender === 'user' ? 'relative chat-bubble-user rounded-tr-none mr-3' : 'chat-bubble-ai rounded-bl-none ml-3'} max-w-[80%]">
            <div class="prose max-w-none break-words">${contentHtml}</div>
        </div>
    `;

    targetChatMessages.appendChild(wrapper);

    // Tambahkan event listener untuk tombol "Lihat Detail Produk"
    if (productDataForModal) {
        const button = wrapper.querySelector('.view-product-details-btn');
        if (button) {
            button.addEventListener('click', () => {
                const encodedData = button.dataset.product;
                const productToDisplay = JSON.parse(decodeURIComponent(encodedData));
                if (window.openProductDetailModal) { // Pastikan fungsi global tersedia
                    window.openProductDetailModal(productToDisplay);
                } else {
                    console.error("openProductDetailModal function is not defined globally.");
                }
            });
        }
    }

    // Auto-scroll ke bawah jika bukan pesan dari riwayat
    if (!isHistorical) {
        targetChatMessages.scrollTop = targetChatMessages.scrollHeight;
    }
}

// Pastikan fungsi ini ada dan di-export di ui.js
// atau di-expose ke window dari main.js
export function openProductDetailModal(product) {
    const productDetailModal = document.getElementById('description-modal'); // Asumsi ada modal dengan ID ini
    const productDetailContent = document.getElementById('product-detail-content'); // Kontainer isi modal

    if (!productDetailModal || !productDetailContent) {
        console.error("Modal atau konten detail produk tidak ditemukan.");
        return;
    }

    // Isi modal dengan detail produk
    productDetailContent.innerHTML = `
        <img src="${product.image || 'https://placehold.co/400x300/E0E0E0/333333?text=Gambar+Tidak+Tersedia'}"
             alt="${product.title}" class="w-full h-48 object-cover rounded-t-lg">
        <div class="p-4">
            <h2 class="text-2xl font-bold">${product.title}</h2>
            <p class="text-purple-600 text-xl font-bold mt-2">Rp ${product.discount} ${product.price && product.price !== product.discount ? `<span class="text-gray-500 line-through text-sm ml-2">Rp ${product.price}</span>` : ''}</p>
            <p class="text-gray-700 mt-2">${product.description || 'Tidak ada deskripsi.'}</p>
            <p class="text-gray-600 mt-2">Stok: ${product.stok}</p>
            ${product.styles.map(style => `
                <span class="w-fit h-10 rounded-full border border-gray-300 flex items-center px-2 mr-2 mb-2" title="${style.name}">
                    <span class="inline-block w-6 h-6 rounded-full mr-2" style="background-color: ${style.color};"></span
                    ${style.image_path ? `<img src="${style.image_path}" alt="${style.name}" class="inline-block w-8 h-8 rounded-full mr-2 border" />` : ''}
                    <span class="text-sm text-gray-700">${style.name}</span>
                </span>
            `).join('')}
            </div>
    `;

    productDetailModal.present();
}

/**
 * Menampilkan indikator mengetik AI.
 * @param {HTMLElement} targetChatMessages - Elemen kontainer chat.
 */
export function showTypingIndicator(targetChatMessages) {
  const typing = document.createElement('div');
  typing.id = 'typing-indicator';
  typing.className = 'flex items-start mb-4';
  typing.innerHTML = `
    <img src="https://lyra-ai-nine.vercel.app/logo.png" alt="LYRA" class="h-8 w-8 rounded-full mt-1 flex-shrink-0">
    <div class="ml-3">
      <div class="bg-transparent">
        <div class="typing-indicator"><span></span><span></span><span></span></div>
      </div>
    </div>
  `;
  targetChatMessages.appendChild(typing);

  const mobileChatModal = document.getElementById(consts.MOBILE_CHAT_MODAL_ID);
  if (targetChatMessages === document.getElementById(consts.CHAT_MESSAGES_MOBILE_ID)) {
      const ionContentEl = mobileChatModal.querySelector('ion-content');
      if (ionContentEl && typeof ionContentEl.getScrollElement === 'function') {
          ionContentEl.getScrollElement().then(scrollEl => {
              scrollEl.scrollTop = scrollEl.scrollHeight;
          }).catch(e => console.error("Error getting scroll element for mobile chat:", e));
      } else {
          targetChatMessages.scrollTop = targetChatMessages.scrollHeight;
      }
  } else {
      targetChatMessages.scrollTop = targetChatMessages.scrollHeight;
  }
}

/**
 * Menyembunyikan indikator mengetik AI.
 * @param {HTMLElement} targetChatMessages - Elemen kontainer chat.
 */
export function hideTypingIndicator(targetChatMessages) {
  const indicator = targetChatMessages.querySelector('#typing-indicator');
  if (indicator) indicator.remove();
}

/**
 * Membersihkan riwayat chat dari UI dan KV.
 * @param {HTMLElement} desktopChatMessages - Elemen chat desktop.
 * @param {HTMLElement} mobileChatMessages - Elemen chat mobile.
 * @param {string} userId - ID pengguna saat ini.
 */
export async function clearChatHistory(desktopChatMessages, mobileChatMessages, userId) {
    const alert = document.createElement('ion-alert');
    alert.header = 'Konfirmasi Hapus Riwayat';
    alert.message = 'Apakah Anda yakin ingin menghapus seluruh riwayat chat Anda? Tindakan ini tidak dapat dibatalkan.';
    alert.buttons = [
        {
            text: 'Batal',
            role: 'cancel',
            handler: () => { console.log('Hapus riwayat dibatalkan'); },
        },
        {
            text: 'Hapus',
            role: 'confirm',
            handler: async () => {
                try {
                    const response = await fetch(`${consts.currentApiUrl}/chat-history?userId=${userId}`, {
                        method: 'DELETE',
                    });
                    const data = await response.json();

                    const toast = document.createElement('ion-toast');
                    toast.duration = 3000;
                    toast.position = 'bottom';

                    if (response.ok) {
                        desktopChatMessages.innerHTML = '';
                        mobileChatMessages.innerHTML = '';
                        desktopChatMessages.innerHTML = `
                            <div class="flex items-start">
                                <img src="https://lyra-ai-nine.vercel.app/logo.png" alt="LYRA" class="h-8 w-8 rounded-full mt-1">
                                <div class="ml-3">
                                    <div class="bg-gray-100 p-3 rounded-lg chat-bubble-ai">
                                        <p class="text-sm">Riwayat chat Anda sudah dihapus, Kak! 👋</p>
                                    </div>
                                </div>
                            </div>
                        `;
                        mobileChatMessages.innerHTML = `
                            <div class="flex items-start">
                                <img src="https://lyra-ai-nine.vercel.app/logo.png" alt="LYRA" class="h-8 w-8 rounded-full mt-1">
                                <div class="ml-3">
                                    <div class="bg-gray-100 p-3 rounded-lg chat-bubble-ai">
                                        <p class="text-sm">Riwayat chat Anda sudah dihapus, Kak! 👋</p>
                                    </div>
                                </div>
                            </div>
                        `;
                        toast.message = 'Riwayat chat berhasil dihapus!';
                        toast.color = 'success';
                    } else {
                        console.error("Failed to delete chat history:", data.error);
                        toast.message = `Gagal menghapus riwayat: ${data.error || 'Terjadi kesalahan.'}`;
                        toast.color = 'danger';
                    }
                    document.body.appendChild(toast);
                    await toast.present();
                    toast.onDidDismiss(() => toast.remove());
                } catch (error) {
                    console.error("Error deleting chat history:", error);
                    const toast = document.createElement('ion-toast');
                    toast.message = `Terjadi kesalahan: ${error.message}`;
                    toast.color = 'danger';
                    toast.duration = 3000;
                    toast.position = 'bottom';
                    document.body.appendChild(toast);
                    await toast.present();
                    toast.onDidDismiss(() => toast.remove());
                }
            },
        },
    ];
    document.body.appendChild(alert);
    await alert.present();
    alert.onDidDismiss(() => alert.remove());
}


export function initializeUI() {
    const clearChatDesktopBtn = document.getElementById(consts.CLEAR_CHAT_DESKTOP_BTN_ID);
    const clearChatMobileBtn = document.getElementById(consts.CLEAR_CHAT_MOBILE_BTN_ID);
    const chatMessagesDesktop = document.getElementById(consts.CHAT_MESSAGES_DESKTOP_ID);
    const chatMessagesMobile = document.getElementById(consts.CHAT_MESSAGES_MOBILE_ID);

    if (clearChatDesktopBtn) {
        clearChatDesktopBtn.addEventListener('click', () => clearChatHistory(chatMessagesDesktop, chatMessagesMobile));
    }
    if (clearChatMobileBtn) {
        clearChatMobileBtn.addEventListener('click', () => clearChatHistory(chatMessagesDesktop, chatMessagesMobile));
    }
}

export function updateAiActiveTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timeString = `${hours}:${minutes}`;

    const aiActiveTimeElement = document.getElementById(consts.AI_ACTIVE_TIME_ID);
    if (aiActiveTimeElement) {
        aiActiveTimeElement.textContent = `🕛️Active ${timeString}`;
    }

    const aiActiveMobileElement = document.getElementById(consts.AI_ACTIVE_MOBILE_ID);
    if (aiActiveMobileElement) {
        aiActiveMobileElement.textContent = `🕛️Active ${timeString}`;
    }

    const aiOnlineIndicatorElement = document.getElementById(consts.AI_ONLINE_INDICATOR_ID);
    if (aiOnlineIndicatorElement && aiOnlineIndicatorElement.classList.contains('hidden')) {
    }
}

let productsCache = [];
const PRODUCT_FETCH_CACHE_DURATION = 5 * 60 * 1000; // 5 menit
let lastProductFetchTime = 0;

export async function renderProducts(keyword = "", productGridElement, showAvailableOnly, allCachedProducts, toggleStokButton) {
  productGridElement.innerHTML = `<div class="w-full flex justify-center py-8"><ion-spinner name="dots"></ion-spinner></div>`;

  try {
    const now = Date.now();
    if (productsCache.length === 0 || (now - lastProductFetchTime > PRODUCT_FETCH_CACHE_DURATION)) {
        const res = await fetch(consts.PRODUCT_LISTING_URL);
        const data = await res.json();
        productsCache = data.product;
        lastProductFetchTime = now;
    }
    allCachedProducts = productsCache;

    const keywordLower = keyword.toLowerCase();
    const filtered = allCachedProducts.filter(p => {
      const matchKeyword = p.title.toLowerCase().includes(keywordLower) || (p.description && p.description.toLowerCase().includes(keywordLower));
      const matchStok = showAvailableOnly ? p.stok?.toLowerCase() === "tersedia" : true;
      return matchKeyword && matchStok;
    });

    productGridElement.innerHTML = '';

    if (filtered.length === 0) {
      productGridElement.innerHTML = `<div class="text-center w-full text-gray-500 col-span-full py-8">Produk tidak ditemukan.</div>`;
      return;
    }

        filtered.forEach(product => {
      console.log('renderProducts: Rendering product', product.title);
      const card = document.createElement('ion-card');
      card.className = 'produk-page transition duration-300 ease-in-out transform shadow-md';

      const styleSwatches = (product.styles || [])
        .map(style => `<button class="w-5 h-5 rounded-full border border-gray-300" title="${style.name}" style="background-color: ${style.color}"></button>`).join('');

      card.innerHTML = `
        <div class="relative h-68 overflow-hidden">
          <img src="${product.image}" alt="${product.title}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='https://placehold.co/400x300/E0E0E0/333333?text=Gambar+Tidak+Tersedia';">
        </div>
        <ion-card-header class="p-4">
          <ion-card-title class="text-lg">${product.title}</ion-card-title>
          <ion-card-subtitle class="text-purple-600 font-bold mt-1">Rp ${product.discount}</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <div class="flex justify-end items-center">
            <ion-button fill="outline" size="small" color="primary" class="ask-ai-btn">
              <ion-icon name="sparkles-outline" slot="start"></ion-icon>
              Tanya AI
            </ion-button>
          </div>
        </ion-card-content>
      `;

      card.querySelector('.ask-ai-btn').addEventListener('click', () => {
        const currentChatMessages = window.innerWidth < 768 ? document.getElementById(consts.CHAT_MESSAGES_MOBILE_ID) : document.getElementById(consts.CHAT_MESSAGES_DESKTOP_ID);
        if (window.innerWidth < 768) {
            document.getElementById(consts.MOBILE_CHAT_MODAL_ID).present();
        }
        window.requestProductDetail(encodeURIComponent(JSON.stringify(product)), currentChatMessages);
      });

      productGridElement.appendChild(card);
    });

  } catch (err) {
    console.error("Gagal fetch produk:", err);
    productGridElement.innerHTML = `<div class="w-full text-center text-red-600 py-4 col-span-full">❌ Gagal memuat produk.</div>`;
  }
}