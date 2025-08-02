// assets/js/main.js
import * as consts from './constant.js';
import { getOrCreateUserId, findJsonInText, formatProductAsText } from './utils.js';
import { callGemini } from './api.js';
import { processAiCartAction } from './simpleCart-actions.js';
import { appendMessage, showTypingIndicator, hideTypingIndicator, openProductDetailModal, updateAiActiveTime, renderProducts, initializeUI } from './ui.js';

// Variabel global untuk user ID
let currentUserId = null;
let allProducts = []; // Cache produk
let showOnlyAvailable = false; // Filter stok

async function initializeApp() {
    currentUserId = getOrCreateUserId();
    console.log("User ID:", currentUserId);

    const chatMessagesDesktop = document.getElementById(consts.CHAT_MESSAGES_DESKTOP_ID);
    const chatInputDesktop = document.getElementById(consts.CHAT_INPUT_DESKTOP_ID);
    const chatSendBtnDesktop = document.getElementById(consts.CHAT_SEND_BTN_DESKTOP_ID);
    const mobileChatModal = document.getElementById(consts.MOBILE_CHAT_MODAL_ID);
    const openMobileChatBtn = document.getElementById(consts.OPEN_MOBILE_CHAT_BTN_ID);
    const chatMessagesMobile = document.getElementById(consts.CHAT_MESSAGES_MOBILE_ID);
    const chatInputMobile = document.getElementById(consts.CHAT_INPUT_MOBILE_ID);
    const chatSendBtnMobile = document.getElementById(consts.CHAT_SEND_BTN_MOBILE_ID);
    const productGrid = document.getElementById(consts.PRODUCT_GRID_ID);
    const productSearchbar = document.getElementById(consts.PRODUCT_SEARCHBAR_ID);
    const toggleStokBtn = document.getElementById(consts.TOGGLE_STOK_BTN_ID);

    initializeUI();

    await loadChatHistory(currentUserId, chatMessagesDesktop, chatMessagesMobile);

    updateAiActiveTime();
    setInterval(updateAiActiveTime, 1000);

    await renderProducts("", productGrid, showOnlyAvailable, allProducts, toggleStokBtn);

    if (productSearchbar) {
        productSearchbar.addEventListener('ionInput', (e) => renderProducts(e.detail.value, productGrid, showOnlyAvailable, allProducts, toggleStokBtn));
    }

    if (toggleStokBtn) {
        toggleStokBtn.addEventListener('click', (e) => {
            showOnlyAvailable = !showOnlyAvailable;
            e.target.textContent = showOnlyAvailable ? 'Tampilkan Semua Produk' : 'Hanya yang Tersedia';
            renderProducts(productSearchbar.value, productGrid, showOnlyAvailable, allProducts, toggleStokBtn);
        });
    }

    if (chatSendBtnDesktop) {
        chatSendBtnDesktop.addEventListener('click', handleChatSubmit);
    }
    if (chatInputDesktop) {
        chatInputDesktop.addEventListener('keypress', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleChatSubmit();
            }
        });
    }

    if (openMobileChatBtn) {
        openMobileChatBtn.addEventListener('click', () => mobileChatModal.present());
    }
    if (chatSendBtnMobile) {
        chatSendBtnMobile.addEventListener('click', handleChatSubmit);
    }
    if (chatInputMobile) {
        chatInputMobile.addEventListener('keypress', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleChatSubmit();
            }
        });
    }

    if (window.innerWidth < 768 && mobileChatModal) {
        mobileChatModal.present();
    }
}

// --- Fungsi Inisialisasi Riwayat Chat ---
async function loadChatHistory(userId, desktopChatMessages, mobileChatMessages) {
    if (typeof simpleCart !== 'undefined') {
        const cartItems = simpleCart.items().map(item => ({
            name: item.get('name'),
            quantity: item.get('quantity'),
            price: item.get('price')
        }));

        try {
            const response = await fetch(`${consts.currentApiUrl}/chat-history?userId=${userId}`);
            const data = await response.json();

            desktopChatMessages.innerHTML = '';
            mobileChatMessages.innerHTML = '';

            if (!response.ok) {
                console.error("Failed to load chat history:", data.error);
                appendMessage("Hai! Saya L Y Я A, asisten AI toko online ini. Tanyakan apa saja tentang produk kami! 🤗", 'ai', desktopChatMessages, false);
                appendMessage("Hai! Saya L Y Я A, asisten AI toko online ini. Tanyakan apa saja tentang produk kami! 🤗", 'ai', mobileChatMessages, false);
                return;
            }

            if (data.history && data.history.length > 0) {
                data.history.forEach(entry => {
                    let displayedText = String(entry.text || '');
                    let role = entry.role;
                    if (role === 'user') {
                        try {
                            const parsedUserMessage = JSON.parse(displayedText);
                            if (parsedUserMessage.type === "product_detail" && parsedUserMessage.data) {
                                displayedText = `Boleh lihat detail untuk ${parsedUserMessage.data.title}?`;
                            }
                        } catch (e) {
                            // Not a JSON message, use as is.
                        }
                    }
                    appendMessage(displayedText, role, desktopChatMessages, true);
                    appendMessage(displayedText, role, mobileChatMessages, true);
                });
                desktopChatMessages.scrollTop = desktopChatMessages.scrollHeight;
                mobileChatMessages.scrollTop = mobileChatMessages.scrollHeight;
            } else {
                appendMessage("Hai! Saya L Y Я A, asisten AI toko online ini. Tanyakan apa saja tentang produk kami! 🤗", 'ai', desktopChatMessages, false);
                appendMessage("Hai! Saya L Y Я A, asisten AI toko online ini. Tanyakan apa saja tentang produk kami! 🤗", 'ai', mobileChatMessages, false);
            }
        } catch (error) {
            console.error("Error fetching chat history:", error);
            appendMessage("Hai! Saya L Y Я A, asisten AI toko online ini. Tanyakan apa saja tentang produk kami! 🤗", 'ai', desktopChatMessages, false);
            appendMessage("Hai! Saya L Y Я A, asisten AI toko online ini. Tanyakan apa saja tentang produk kami! 🤗", 'ai', mobileChatMessages, false);
        }
    }
}

// --- Fungsi Pengiriman Pesan ---
async function handleChatSubmit() {
    const chatInput = window.innerWidth < 768 ? document.getElementById(consts.CHAT_INPUT_MOBILE_ID) : document.getElementById(consts.CHAT_INPUT_DESKTOP_ID);
    const currentChatMessages = window.innerWidth < 768 ? document.getElementById(consts.CHAT_MESSAGES_MOBILE_ID) : document.getElementById(consts.CHAT_MESSAGES_DESKTOP_ID);
    const userMessage = chatInput.value.trim();
    if (typeof simpleCart === 'undefined') {
        console.error("simpleCart is not defined. Make sure simpleCart.js is loaded correctly.");
        appendMessage("Maaf, terjadi masalah internal (keranjang belanja tidak dapat diakses).", 'ai', currentChatMessages);
        hideTypingIndicator(currentChatMessages);
        return;
    }
    const cartItems = simpleCart.items().map(item => ({
        name: item.get('name'),
        quantity: item.get('quantity'),
        price: item.get('price')
    }));
    if (userMessage === '') {
        return;
    }
    appendMessage(userMessage, 'user', currentChatMessages);
    chatInput.value = '';
    showTypingIndicator(currentChatMessages);
    try {
        const aiResponseText = await callGemini(userMessage, cartItems, currentUserId);
        console.log("Raw AI Response Text:", aiResponseText);
        hideTypingIndicator(currentChatMessages);
        const { parsed: parsedJson, remaining: narrativeText } = findJsonInText(aiResponseText);
        let hasProcessedAction = false;
        if (parsedJson) {
            let actionsToProcess = [];
            if (Array.isArray(parsedJson)) {
                actionsToProcess = parsedJson;
            } else if (typeof parsedJson === 'object' && parsedJson !== null && parsedJson.action) {
                actionsToProcess = [parsedJson];
            }
            for (const actionData of actionsToProcess) {
                if (actionData.action === 'viewProductDetails' && actionData.product) {
                    appendMessage(narrativeText || `Berikut detail produk ${actionData.product.title}:`, 'ai', currentChatMessages);
                    openProductDetailModal(actionData.product);
                    hasProcessedAction = true;
                } else {
                    const redirected = processAiCartAction(actionData, currentChatMessages);
                    if (redirected) {
                        hasProcessedAction = true;
                        return;
                    }
                    hasProcessedAction = true;
                }
            }
            if (narrativeText && narrativeText.trim().length > 0) {
                if (!hasProcessedAction || narrativeText.trim().toLowerCase().includes("baik, saya akan menambahkan")) {
                    appendMessage(narrativeText, 'ai', currentChatMessages);
                }
                let cleanNarrativeText = narrativeText;
                if (cleanNarrativeText) {
                    cleanNarrativeText = cleanNarrativeText.replace(/^(json\s*)|(\s*json)$/ig, '').trim();
                }
                if (cleanNarrativeText && cleanNarrativeText.trim().length > 0) {
                    if (!hasProcessedAction || cleanNarrativeText.trim().toLowerCase().includes("baik, saya akan menambahkan")) {
                        appendMessage(cleanNarrativeText, 'ai', currentChatMessages);
                    }
                }
            } else if (actionsToProcess.length > 0 && !narrativeText) {
                let defaultNarrative = "Aksi Anda telah berhasil diproses.";
                if (actionsToProcess.length === 1 && actionsToProcess[0].action === "addToCart" && actionsToProcess[0].productName) {
                    defaultNarrative = `Baik, saya akan menambahkan ${actionsToProcess[0].productName} ke keranjang belanja Anda.`;
                } else if (actionsToProcess.length > 1 && actionsToProcess[0].action === "addToCart") {
                    defaultNarrative = "Baik, saya akan menambahkan beberapa item yang Anda sebutkan ke keranjang belanja Anda.";
                }
                appendMessage(defaultNarrative, 'ai', currentChatMessages);
            }
        } else {
            appendMessage(aiResponseText, 'ai', currentChatMessages);
        }
        updateAiActiveTime();
    } catch (error) {
        hideTypingIndicator(currentChatMessages);
        console.error("Error handling chat:", error);
        appendMessage(`Maaf, terjadi masalah: ${error.message || 'Tidak dapat memproses permintaan.'}`, 'ai', currentChatMessages);
    }
}

window.requestProductDetail = async function(productDataEncoded, targetChatMessages) {
    const product = JSON.parse(decodeURIComponent(productDataEncoded));
    const humanReadableMessage = `Boleh lihat detail untuk ${product.title}?`;
    appendMessage(humanReadableMessage, 'user', document.getElementById(consts.CHAT_MESSAGES_DESKTOP_ID));
    appendMessage(humanReadableMessage, 'user', document.getElementById(consts.CHAT_MESSAGES_MOBILE_ID));
    showTypingIndicator(document.getElementById(consts.CHAT_MESSAGES_DESKTOP_ID));
    showTypingIndicator(document.getElementById(consts.CHAT_MESSAGES_MOBILE_ID));
    const aiStructuredPayload = {
        type: "product_detail",
        data: product
    };
    const currentCartItems = simpleCart.items().map(item => ({
        id: item.id(),
        name: item.get('name'),
        quantity: item.quantity(),
        price: item.price(),
        image: item.get('thumb'),
        warna: item.get('warna'),
        ukuran: item.get('ukuran'),
        berat: item.get('berat')
    }));
    const aiResponse = await callGemini(humanReadableMessage, currentCartItems, currentUserId, aiStructuredPayload);
    hideTypingIndicator(document.getElementById(consts.CHAT_MESSAGES_DESKTOP_ID));
    hideTypingIndicator(document.getElementById(consts.CHAT_MESSAGES_MOBILE_ID));
    appendMessage(aiResponse, 'ai', document.getElementById(consts.CHAT_MESSAGES_DESKTOP_ID));
    appendMessage(aiResponse, 'ai', document.getElementById(consts.CHAT_MESSAGES_MOBILE_ID));
}

window.openProductDetailModal = function(product) {
    const productDetailModal = document.getElementById('description-modal');
    const modalTitle = document.getElementById('modal-title');
    const productImageInModal = document.getElementById('product-image-modal');
    const productNameInModal = document.getElementById('product-name-modal');
    const productPriceInModal = document.getElementById('product-price-modal');
    const productOriginalPriceInModal = document.getElementById('product-original-price-modal');
    const productDescriptionInModal = document.getElementById('product-description-modal');
    const productStockInModal = document.getElementById('product-stock-modal');
    const productColorsInModal = document.getElementById('product-colors-modal');
    const productSizesInModal = document.getElementById('product-sizes-modal');
    if (!productDetailModal || !modalTitle || !productImageInModal || !productNameInModal || !productPriceInModal || !productDescriptionInModal || !productStockInModal) {
        console.error("One or more modal elements not found. Please check your index.html and ensure correct IDs.");
        return;
    }
    modalTitle.textContent = "Detail Produk";
    productImageInModal.src = product.image || 'https://placehold.co/400x300/E0E0E0/333333?text=Gambar+Tidak+Tersedia';
    productImageInModal.alt = product.title;
    productNameInModal.textContent = product.title;
    productPriceInModal.textContent = `Rp ${product.discount}`;
    if (product.price && product.price !== product.discount) {
        productOriginalPriceInModal.textContent = `Rp ${product.price}`;
        productOriginalPriceInModal.classList.remove('hidden');
    } else {
        productOriginalPriceInModal.classList.add('hidden');
    }
    productDescriptionInModal.innerHTML = marked.parse(DOMPurify.sanitize(product.description || 'Tidak ada deskripsi.'));
    productStockInModal.textContent = `Stok: ${product.stok}`;
    if (productColorsInModal) {
        if (product.styles && product.styles.length > 0) {
            const colorsHtml = product.styles.map(style => `
                <span class="w-fit h-10 rounded-full border border-gray-300 flex items-center px-2 mr-2 mb-2" title="${style.name}">
                    <span class="inline-block w-6 h-6 rounded-full mr-2" style="background-color: ${style.color};"></span>
                    ${style.image_path ? `<img src="${style.image_path}" alt="${style.name}" class="inline-block w-8 h-8 rounded-full mr-2 border" />` : ''}
                    <span class="text-sm text-gray-700">${style.name}</span>
                </span>
            `).join('');
            productColorsInModal.innerHTML = `${colorsHtml}`;
            productColorsInModal.classList.remove('hidden');
        } else {
            productColorsInModal.classList.add('hidden');
        }
    }
    if (product.sizes && product.sizes.length > 0) {
        const sizesHtml = product.sizes.map(s => `
            <span class="inline-block bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2 mb-2">${s}</span>
        `).join('');
        productSizesInModal.innerHTML = `<p class="mt-2 text-gray-600">Ukuran Tersedia:</p>${sizesHtml}`;
        productSizesInModal.classList.remove('hidden');
    } else {
        productSizesInModal.classList.add('hidden');
    }
    if (typeof product.stok === 'string' && product.stok.toLowerCase().includes('habis')) {
        productStockInModal.classList.add('bg-red-100', 'text-red-700', 'rounded', 'px-2', 'py-1', 'inline-block');
    } else {
        productStockInModal.classList.remove('bg-red-100', 'text-red-700', 'rounded', 'px-2', 'py-1', 'inline-block');
        productStockInModal.classList.add('bg-green-100', 'text-green-700', 'rounded', 'px-2', 'py-1', 'inline-block');
    }
    productDetailModal.present();
};

window.dismissModal = (modalId) => {
    const modalToDismiss = document.getElementById(modalId);
    if (modalToDismiss) {
        modalToDismiss.dismiss();
    }
}

// --- Event Listeners ---
customElements.whenDefined('ion-app').then(() => {
    initializeApp();
});
