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
    initDatabaseTables();
  } else {
    console.warn(`[CHAT BRIDGE WARN] No se encontró chat.db en: ${CHAT_SYSTEM_DB_PATH}`);
  }
} catch (err) {
  console.error(`[CHAT BRIDGE ERROR] No se pudo inicializar conexión con chat.db:`, err);
}

function initDatabaseTables() {
  if (!chatDb) return;
  try {
    chatDb.exec(`
      CREATE TABLE IF NOT EXISTS conversation_sessions (
        client_id TEXT PRIMARY KEY,
        client_alias TEXT NOT NULL,
        device_info TEXT,
        cart_summary TEXT,
        status TEXT DEFAULT 'active',
        closed_by TEXT,
        created_at TEXT NOT NULL,
        closed_at TEXT,
        last_activity TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_conv_status ON conversation_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_conv_last_act ON conversation_sessions(last_activity);
    `);
    console.log(`[CHAT BRIDGE] Tabla conversation_sessions verificada e indexada.`);

    // Auto-discover and populate existing client sessions from historical messages
    try {
      const existing = chatDb.prepare(`
        SELECT senderId, senderName, content, timestamp 
        FROM messages 
        WHERE senderId LIKE 'usr_cli_%' OR content LIKE '%cli_%'
        ORDER BY timestamp ASC
      `).all() as any[];

      for (const m of existing) {
        let clientId = '';
        if (m.senderId && m.senderId.startsWith('usr_cli_')) {
          clientId = m.senderId.replace('usr_', '');
        } else {
          const match = (m.content || '').match(/`cli_([a-zA-Z0-9]+)`/);
          if (match) clientId = `cli_${match[1]}`;
        }
        if (!clientId) continue;

        let alias = (m.senderName || 'Visitante Web').replace(' (Catálogo)', '');
        const aliasMatch = (m.content || '').match(/👤 \*Cliente:\*\s*([^\n]+)/);
        if (aliasMatch) alias = aliasMatch[1].trim();

        const isMobile = (m.content || '').includes('(Móvil)');
        const device = isMobile ? 'Móvil' : 'Escritorio';

        chatDb.prepare(`
          INSERT INTO conversation_sessions (client_id, client_alias, device_info, status, created_at, last_activity)
          VALUES (?, ?, ?, 'active', ?, ?)
          ON CONFLICT(client_id) DO UPDATE SET
            last_activity = excluded.last_activity
        `).run(clientId, alias, device, m.timestamp, m.timestamp);
      }
    } catch (e) {
      console.warn('[CHAT BRIDGE] Error backfilling sessions:', e);
    }
  } catch (e) {
    console.error(`[CHAT BRIDGE ERROR] Error al crear tabla conversation_sessions:`, e);
  }
}

export interface DirectMessagePayload {
  clientId?: string;
  name?: string;
  deviceInfo?: string;
  phone?: string;
  message: string;
  cartSummary?: string;
  productCode?: string;
  productClave?: string;
  productName?: string;
}

export interface DirectMessageResult {
  success: boolean;
  messageId?: string;
  chatUrl: string;
  message?: {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: string;
    isFromMe: boolean;
  };
  error?: string;
}

export interface ClientChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  isFromMe: boolean;
  type: string;
}

export interface ActiveConversationItem {
  clientId: string;
  clientName: string;
  device?: string;
  cartSummary?: string;
  status: string;
  lastMessage?: string;
  lastTimestamp: string;
  unreadCount: number;
}

export function getClientSessionStatus(clientId: string) {
  if (!chatDb || !clientId) return { status: 'active' };
  try {
    const stmt = chatDb.prepare(`
      SELECT status, closed_by as closedBy, closed_at as closedAt, client_alias as clientName
      FROM conversation_sessions
      WHERE client_id = ?
    `);
    const row = stmt.get(clientId) as any;
    if (row) {
      return {
        status: row.status || 'active',
        closedBy: row.closedBy,
        closedAt: row.closedAt,
        clientName: row.clientName
      };
    }
  } catch (err) {
    console.error('[CHAT BRIDGE ERROR] Error al obtener session status:', err);
  }
  return { status: 'active' };
}

export function getActiveConversations(): ActiveConversationItem[] {
  if (!chatDb) return [];
  try {
    const stmt = chatDb.prepare(`
      SELECT 
        client_id as clientId,
        client_alias as clientName,
        device_info as device,
        cart_summary as cartSummary,
        status,
        last_activity as lastTimestamp
      FROM conversation_sessions
      WHERE status = 'active'
      ORDER BY last_activity DESC
      LIMIT 50
    `);

    const rows = stmt.all() as any[];

    return rows.map((r) => {
      // Obtener el último mensaje registrado para este cliente
      let lastMsg = '';
      try {
        const msgStmt = chatDb!.prepare(`
          SELECT content FROM messages
          WHERE senderId = ? OR recipientId = ? OR content LIKE ?
          ORDER BY timestamp DESC
          LIMIT 1
        `);
        const senderId = `usr_${r.clientId}`;
        const lastRow = msgStmt.get(senderId, senderId, `%${r.clientId}%`) as any;
        if (lastRow && lastRow.content) {
          // Extraer texto limpio de mensajes con formato
          const cleanText = lastRow.content.split('📝 *Mensaje:*')[1] || lastRow.content;
          lastMsg = cleanText.replace(/[*_#`]/g, '').trim().substring(0, 60);
        }
      } catch {}

      return {
        clientId: r.clientId,
        clientName: r.clientName,
        device: r.device || 'Móvil',
        cartSummary: r.cartSummary,
        status: r.status,
        lastMessage: lastMsg || 'Nueva consulta recibida',
        lastTimestamp: r.lastTimestamp,
        unreadCount: 0
      };
    });
  } catch (err) {
    console.error('[CHAT BRIDGE ERROR] Error al consultar active conversations:', err);
    return [];
  }
}

export function endConversation(clientId: string, closedBy: 'client' | 'operator'): { ok: boolean; status: string; error?: string } {
  if (!chatDb || !clientId) {
    return { ok: false, status: 'error', error: 'Falta clientId o conexión de BD' };
  }

  const now = new Date().toISOString();
  const noticeMsgId = `notice_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const senderTitle = closedBy === 'operator' ? 'el Asesor de Ventas Mostrador' : 'el Cliente';
  const noticeText = `🔒 *[ATENCIÓN FINALIZADA]*\nEsta sesión ha sido dada por terminada por ${senderTitle}.`;

  try {
    const updateStmt = chatDb.prepare(`
      UPDATE conversation_sessions
      SET status = 'closed', closed_by = ?, closed_at = ?, last_activity = ?
      WHERE client_id = ?
    `);
    updateStmt.run(closedBy, now, now, clientId);

    // Insertar aviso en tabla de mensajes para que quede en el historial
    const msgStmt = chatDb.prepare(`
      INSERT INTO messages 
      (id, senderId, senderName, content, timestamp, type, status, recipientId, room)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    msgStmt.run(
      noticeMsgId,
      'sys_notice',
      'Sistema Flexivor',
      noticeText,
      now,
      'notice',
      'delivered',
      `usr_${clientId}`,
      'general'
    );

    return { ok: true, status: 'closed' };
  } catch (err: any) {
    console.error('[CHAT BRIDGE ERROR] Error al cerrar conversación:', err);
    return { ok: false, status: 'error', error: err.message };
  }
}

export function sendReplyFromMostrador(payload: {
  clientId: string;
  message: string;
  senderName?: string;
}): { ok: boolean; messageId?: string; error?: string } {
  if (!chatDb || !payload.clientId || !payload.message.trim()) {
    return { ok: false, error: 'Datos incompletos para responder' };
  }

  const messageId = `reply_mst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const timestamp = new Date().toISOString();
  const senderName = (payload.senderName || 'Ventas Mostrador (Flexivor)').trim();
  const recipientId = `usr_${payload.clientId}`;

  try {
    const stmt = chatDb.prepare(`
      INSERT INTO messages 
      (id, senderId, senderName, content, timestamp, type, status, recipientId, room)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      messageId,
      'usr_mostrador',
      senderName,
      payload.message.trim(),
      timestamp,
      'text',
      'delivered',
      recipientId,
      'general'
    );

    // Actualizar actividad y asegurar que la sesión esté activa
    const updateStmt = chatDb.prepare(`
      UPDATE conversation_sessions
      SET last_activity = ?, status = 'active', closed_at = NULL, closed_by = NULL
      WHERE client_id = ?
    `);
    updateStmt.run(timestamp, payload.clientId);

    return { ok: true, messageId };
  } catch (err: any) {
    console.error('[CHAT BRIDGE ERROR] Error al enviar respuesta desde mostrador:', err);
    return { ok: false, error: err.message };
  }
}

export function getClientMessages(clientId: string): ClientChatMessage[] {
  if (!chatDb || !clientId) {
    return [];
  }

  const senderId = `usr_${clientId}`;

  try {
    const stmt = chatDb.prepare(`
      SELECT id, senderId, senderName, content, timestamp, type, recipientId
      FROM messages
      WHERE senderId = ? 
         OR recipientId = ?
         OR (recipientId IS NULL AND content LIKE ?)
      ORDER BY timestamp ASC
      LIMIT 120
    `);

    const rows = stmt.all(senderId, senderId, `%${clientId}%`) as any[];

    return rows.map((row) => ({
      id: row.id,
      senderId: row.senderId,
      senderName: row.senderName,
      content: row.content,
      timestamp: row.timestamp,
      isFromMe: row.senderId === senderId,
      type: row.type || 'text'
    }));
  } catch (err) {
    console.error('[CHAT BRIDGE ERROR] Error al consultar mensajes del cliente:', err);
    return [];
  }
}

export function sendDirectMessageToChatSystem(payload: DirectMessagePayload): DirectMessageResult {
  const name = (payload.name || 'Visitante Web').trim();
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
  const senderId = payload.clientId ? `usr_${payload.clientId}` : 'usr_truper_catalog';

  let formattedContent = `💬 *[ATENCIÓN DIRECTA · CATÁLOGO TRUPER]*\n`;
  formattedContent += `👤 *Cliente:* ${name}${payload.deviceInfo ? ` (${payload.deviceInfo})` : ''}\n`;
  if (payload.clientId) {
    formattedContent += `🆔 *ID Sesión:* \`${payload.clientId}\`\n`;
  }
  if (payload.cartSummary) {
    formattedContent += `🛒 *Cotización actual:* ${payload.cartSummary}\n`;
  }
  if (payload.phone) {
    formattedContent += `📱 *Contacto:* ${payload.phone.trim()}\n`;
  }
  if (payload.productClave || payload.productCode) {
    formattedContent += `🔧 *Producto:* ${payload.productName || ''} (Clave: ${payload.productClave || ''} | Cód: ${payload.productCode || ''})\n`;
  }
  formattedContent += `━━━━━━━━━━━━━━━━━━━━━\n`;
  formattedContent += `📝 *Mensaje:* ${rawMessage}`;

  try {
    if (chatDb) {
      // 1. Guardar mensaje en tabla principal
      const stmt = chatDb.prepare(`
        INSERT INTO messages 
        (id, senderId, senderName, content, timestamp, type, status, recipientId, recipientName, isPrivate, room, fileUrl, fileName, fileSize, mimeType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        messageId,
        senderId,
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

      // 2. Registrar o reabrir la sesión en conversation_sessions como 'active'
      if (payload.clientId) {
        const sessionStmt = chatDb.prepare(`
          INSERT INTO conversation_sessions 
          (client_id, client_alias, device_info, cart_summary, status, closed_by, created_at, closed_at, last_activity)
          VALUES (?, ?, ?, ?, 'active', NULL, ?, NULL, ?)
          ON CONFLICT(client_id) DO UPDATE SET
            client_alias = excluded.client_alias,
            device_info = COALESCE(excluded.device_info, conversation_sessions.device_info),
            cart_summary = COALESCE(excluded.cart_summary, conversation_sessions.cart_summary),
            status = 'active',
            closed_by = NULL,
            closed_at = NULL,
            last_activity = excluded.last_activity
        `);

        sessionStmt.run(
          payload.clientId,
          name,
          payload.deviceInfo || 'Móvil',
          payload.cartSummary || null,
          timestamp,
          timestamp
        );
      }
    }

    const cleanAlias = encodeURIComponent(name);
    return {
      success: true,
      messageId,
      chatUrl: `${CHAT_SYSTEM_URL}/?room=general&origin=catalogo_truper&user=${cleanAlias}`,
      message: {
        id: messageId,
        senderId,
        senderName: name,
        content: rawMessage,
        timestamp,
        isFromMe: true
      }
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
