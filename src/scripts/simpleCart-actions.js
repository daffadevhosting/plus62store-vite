// assets/js/simpleCart-actions.js
import { appendMessage } from './ui.js';

/**
 * Memproses tindakan keranjang yang diminta oleh AI.
 * @param {object} actionData - Objek data tindakan dari AI.
 * @param {HTMLElement} targetChatMessages - Elemen container pesan chat.
 * @returns {boolean} True jika ada pengalihan halaman, false jika tidak.
 */
export function processAiCartAction(actionData, targetChatMessages) {
    let redirected = false;

    switch (actionData.action) {
        case 'addToCart':
            const productToAdd = {
                name: actionData.productName,
                price: actionData.price,
                quantity: actionData.quantity || 1,
                image: actionData.image,
                warna: actionData.warna || null,
                ukuran: actionData.ukuran || null,
                berat: actionData.berat || null
            };
            simpleCart.add(productToAdd); // Gunakan simpleCart langsung
            appendMessage(`Baik, saya akan menambahkan ${productToAdd.quantity} ${productToAdd.name} ${productToAdd.warna ? `warna ${productToAdd.warna}` : ''} ke keranjang belanja Anda.`, 'ai', targetChatMessages);
            break;

        case 'removeFromCart':
            const productNameToRemove = actionData.productName;
            const productWarnaToRemove = actionData.warna;

            if (!productNameToRemove) {
                appendMessage("Maaf, saya tidak bisa menghapus item tanpa nama produk.", 'ai', targetChatMessages);
                break;
            }

            let itemsRemovedCount = 0;
            let removedItemNames = [];

            const currentItems = simpleCart.items(); // Gunakan simpleCart langsung

            const itemsToDelete = currentItems.filter(item => {
                const matchesName = item.get('name') === productNameToRemove;
                const matchesWarna = productWarnaToRemove ? item.get('warna') === productWarnaToRemove : true;

                return matchesName && matchesWarna;
            });

            if (itemsToDelete.length > 0) {
                itemsToDelete.forEach(item => {
                    item.remove(); // Gunakan item.remove() untuk menghapus item
                    itemsRemovedCount += item.get('quantity');
                    if (!removedItemNames.includes(item.get('name') + (item.get('warna') ? ` (${item.get('warna')})` : ''))) {
                        removedItemNames.push(item.get('name') + (item.get('warna') ? ` (${item.get('warna')})` : ''));
                    }
                });
                if (productWarnaToRemove) {
                    appendMessage(`Baik, saya telah menghapus ${itemsRemovedCount} ${productNameToRemove} warna ${productWarnaToRemove} dari keranjang belanja Anda.`, 'ai', targetChatMessages);
                } else {
                    appendMessage(`Baik, saya telah menghapus ${itemsRemovedCount} ${productNameToRemove} dari keranjang belanja Anda.`, 'ai', targetChatMessages);
                }
            } else {
                appendMessage(`Maaf, saya tidak menemukan ${productNameToRemove} ${productWarnaToRemove ? `warna ${productWarnaToRemove}` : ''} di keranjang Anda.`, 'ai', targetChatMessages);
            }
            break;

        case 'updateCartQuantity':
            // ...
            break;

        case 'emptyCart':
            simpleCart.empty(); // Gunakan simpleCart langsung
            appendMessage("Baik, keranjang belanja Anda telah dikosongkan.", 'ai', targetChatMessages);
            break;

        case 'viewCart':
            const currentCartItemsView = simpleCart.items(); // Ambil item keranjang
            let cartSummaryMessages = [];
            let cartTotal = 0;

            if (currentCartItemsView.length === 0) {
                cartSummaryMessages.push("Keranjang belanja Anda masih kosong. Yuk, cari-cari produk dulu! 😊");
            } else {
                cartSummaryMessages.push("Ini isi keranjang belanja Anda saat ini:");
                currentCartItemsView.forEach(item => {
                    const itemName = item.get('name');
                    const itemQuantity = item.get('quantity');
                    const itemPrice = item.get('price');
                    const itemWarna = item.get('warna') || ''; // Pastikan ada warna
                    const itemSubtotal = itemQuantity * itemPrice;
                    cartTotal += itemSubtotal;

                    // Format harga agar lebih mudah dibaca
                    const formattedPrice = itemPrice.toLocaleString('id-ID'); // Contoh: 15.600
                    
                    cartSummaryMessages.push(`- ${itemQuantity}x ${itemName} ${itemWarna ? `(Warna: ${itemWarna})` : ''} @ Rp ${formattedPrice}`);
                });
                // Format total harga
                const formattedCartTotal = cartTotal.toLocaleString('id-ID');
                cartSummaryMessages.push(`\nTotal Harga: Rp ${formattedCartTotal}`);
                cartSummaryMessages.push(`\nAda yang ingin diubah atau lanjutkan ke pembayaran?`);
            }
            appendMessage(cartSummaryMessages.join('\n'), 'ai', targetChatMessages);
            break;

        case 'checkout':
            // ...
            break;

        default:
            console.warn('AI requested an unknown action:', actionData.action);
            appendMessage('Maaf, saya tidak mengerti tindakan yang diminta.', 'ai', targetChatMessages);
            break;
    }
    return redirected;
}