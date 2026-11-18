import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const CHAT_SYSTEM_DB_PATH = process.env.CHAT_SYSTEM_DB_PATH || '/home/spanel20/Documents/chat_system/data/chat.db';
const CHAT_SYSTEM_URL = process.env.CHAT_SYSTEM_URL || 'https://bridge.flexivor.com.mx';

let chatDb: DatabaseSync | null = null;

try {
  if (fs.existsSync(CHAT_SYSTEM_DB_PATH)) {
    chatDb = new DatabaseSync(CHAT_SYSTEM_DB_PATH);
    console.log(`[CHAT BRIDGE] Conectado exitosamente con Flexivor Chat System en: ${CHAT_SYSTEM_DB_PATH}`);
  } else {
    console.warn(`[CHAT BRIDGE WARN] No se encontró chat.db en: ${CHAT_SYSTEM_DB_PATH}`);
  }
} catch (err) {
  console.error(`[CHAT BRIDGE ERROR] No se pudo inicializar conexión con chat.db:`, err);
}

export interface DirectMessagePayload {
  name?: string;
  phone?: string;
  message: string;
  productCode?: string;
  productClave?: string;
  productName?: string;
}

export interface DirectMessageResult {
  success: boolean;
  messageId?: string;
  chatUrl: string;
  error?: string;
}

export function sendDirectMessageToChatSystem(payload: DirectMessagePayload): DirectMessageResult {
  const name = (payload.name || 'Cliente Web').trim();
  const rawMessage = (payload.message || '').trim();

  if (!rawMessage) {
    return {
      success: false,
      chatUrl: CHAT_SYSTEM_URL,
      error: 'El mensaje no puede estar vacío'
    };
  }

  const messageId = `msg_cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();

  let formattedContent = `💬 *[ATENCIÓN DIRECTA · CATÁLOGO TRUPER]*\n`;
  formattedContent += `👤 *Cliente:* ${name}\n`;
  if (payload.phone) {
    formattedContent += `📱 *Teléfono/Contacto:* ${payload.phone.trim()}\n`;
  }
  if (payload.productClave || payload.productCode) {
    formattedContent += `🔧 *Producto en consulta:* ${payload.productName || ''} (Clave: ${payload.productClave || ''} | Cód: ${payload.productCode || ''})\n`;
  }
  formattedContent += `━━━━━━━━━━━━━━━━━━━━━\n`;
  formattedContent += `📝 *Mensaje:* ${rawMessage}`;

  try {
    if (chatDb) {
      const stmt = chatDb.prepare(`
        INSERT INTO messages 
        (id, senderId, senderName, content, timestamp, type, status, recipientId, recipientName, isPrivate, room, fileUrl, fileName, fileSize, mimeType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        messageId,
        'usr_truper_catalog',
        `${name} (Catálogo)`,
        formattedContent,
        timestamp,
        'text',
        'delivered',
        null,
        null,
        0,
        'general',
        null,
        null,
        null,
        null
      );
    }

    return {
      success: true,
      messageId,
      chatUrl: `${CHAT_SYSTEM_URL}/?room=general&origin=catalogo_truper`
    };
  } catch (error: any) {
    console.error('[CHAT BRIDGE ERROR] Error al guardar mensaje en chat_system:', error);
    return {
      success: false,
      chatUrl: CHAT_SYSTEM_URL,
      error: error.message || 'Error al enviar mensaje directo'
    };
  }
}
