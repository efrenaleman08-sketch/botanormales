const { Telegraf } = require('telegraf');
const fs = require('fs').promises;
const fsSync = require('fs');
const http = require('http');
const path = require('path');
const dotenv = require('dotenv');

// Cargar variables de entorno solo si existe .env (en Render se usan env vars)
if (fsSync.existsSync(path.join(process.cwd(), '.env'))) {
    const result = dotenv.config();
    if (result.error) {
        console.error('Error al cargar .env:', result.error);
    }
}

// Archivos
const DATA_FILE = 'guerras_familia.json';
const MEMBROS_BASE_FILE = 'miembros_base.json';
const ATTENDANCE_FILE = 'asistencias.json';

// Máximo de miembros permitidos
const MAX_MIEMBROS = 70;
const ASISTENCIA_INICIO_MIN = 20 * 60; // 20:00 Venezuela
const ASISTENCIA_FIN_MIN = 22 * 60 + 20; // 22:20 Venezuela
const ASSISTENCIA_TOPIC_ID = process.env.ASISTENCIA_TOPIC_ID
    ? Number(process.env.ASISTENCIA_TOPIC_ID)
    : null;
const ASSISTENCIA_CHAT_ID = process.env.ASISTENCIA_CHAT_ID
    ? String(process.env.ASISTENCIA_CHAT_ID)
    : null;
const BIBLIA_TOPIC_ID = process.env.BIBLIA_TOPIC_ID
    ? Number(process.env.BIBLIA_TOPIC_ID)
    : null;

// Reglas Biblia RP (códigos -> descripción)
const BIBLIA_RULES = {
    MDM: 'Prohibido MDM (Mass Death Match): matar/dañar a 3+ jugadores sin motivo. Prisión 60 min + restricción de armas / Ban 3-7 días.',
    RDM: 'Prohibido RDM (Random Death Match): entrar en acción sin estar involucrado. Prisión 60 min / Ban 1-3 días.',
    VDM: 'Prohibido VDM (Vehicle Death Match): atropellar jugadores sin motivo. Prisión 60 min / Ban 1-5 días.',
    MG: 'Prohibido MG (Metagaming): usar info fuera de rol para beneficio/perjuicio. Prisión 60 min / Ban 1-3 días. Emotes tipo "=D" prohibidos en chat IC.',
    CL: 'Prohibido CL (Combat Log): salir del juego en acción para beneficiarse. Prisión 60 min / Ban 1-3 días.',
    DM: 'Extremadamente prohibido DM (Death Match): dañar/matar sin motivo. Prisión 60 min / Ban 1-3 días.',
    RK: 'Prohibido RK (Revenge Kill): matar/dañar por venganza de otra vida. Prisión 60 min / Ban 1-3 días.',
    SK: 'Prohibido SK (Spawn Kill): matar/dañar en territorio de facción/org o zona de spawn. Prisión 60 min / Ban 1-5 días.',
    TK: 'Prohibido TK (Team Kill): dañar/matar a miembro/aliado sin razón. Prisión 40 min / Ban 1-2 días.',
    COP: 'Prohibido Cop-Bait: forzar acción policial con insultos. Prisión 60 min / Ban 1-5 días.',
    SAAV: 'Prohibido SAAV (Sin Amor a la Vida): no valorar la vida, preferir morir que cooperar. Prisión 40 min / Ban 1-2 días.',
    PG: 'Prohibido PG (Power Gaming): hacer algo imposible en la vida real. Prisión 60 min / Ban 1-5 días.',
    BUNNY: 'Prohibido Bunny-Hop: correr y saltar para ventaja. Kick / Prisión 40 min.',
    FLAMING: 'Prohibido Flaming RP: discurso de odio/ofensas. Según gravedad: Prisión + Mute 60+ min / Ban 1-30 días.',
    IFP: 'Prohibido IFP (Info Fuera de Personaje): usar HUD (nombre/vida). Prisión 60 min / Ban 1-5 días.',
    ZZ: 'Prohibido ZZ (Zig Zag): correr en zigzag para esquivar balas. Prisión 40 min / Ban 1-2 días.',
    KOS: 'Prohibido KOS (Kill On Sight): matar a la vista por ser de org/facción/familia. Prisión 60 min / Ban 1-5 días.',
    PK: 'Prohibido PK (Player Kill): muerte al jugador; pierdes memoria del evento. Prisión 60 min / Ban 1-5 días.',
    RPFW: 'Prohibido RPFW (Roleplay For The Win): rol donde solo tú ganas. Prisión 60 min / Ban 1-5 días.',
    MIX: 'Prohibido MIX: mezclar temas OOC en el RP. Prisión 60 min / Ban 1-5 días.',
    MULTIACC: 'Prohibido multi-cuentas para transferir dinero. Ban 30 días (IP).',
    AAP: 'Prohibido AAP (Atrapalhar Ação Propositalmente): arruinar acción golpeando, gritando, spameando. Prisión 60 min / Ban 1-3 días.',
    DMA: 'Prohibido DMA (Death Match Auto): dañar vehículos públicos/privados sin motivo. Kick / Prisión 60 min.',
    NRA: 'Prohibido NRA (Non Role Ambiente): usar arma en lugares públicos (hospital, comisaría). Prisión 20 min.',
    NDR: 'Prohibido NDR (Non Drive RP): conducir en condiciones imposibles o de forma inverosímil. Kick / Prisión 20 min.',
    AI: 'Prohibido AI (Acción Irregular): invadir/merodear propiedades privadas para forzar acción. Ban 10 días; si es familia conjunta: aviso/Ban IP.',
    INA: 'Prohibido INA (Invasión No Autorizada): invadir org/corp sin permiso de la prefectura. Ban 5 días.',
    FAIL: 'Prohibido FAIL (Acción Fallida): ejecutar acciones fuera de las reglas. Prisión 60 min | Ban 3-5 días | Warn.',
    TSC: 'Prohibido TSC: transferir ítems a admin sin consentimiento. Prisión 20 min.',
    CMD_FAKE: 'Prohibido enseñar comandos falsos para beneficio. Prisión 60 min | Ban 1-2 días.'
};

// Reglas de secuestro
const REGLAS_SECUESTRO = `🔒 Reglas de Secuestro

1) Debe haber más secuestradores que víctimas, y todos armados con armas de fuego.
2) Prohibido interferir en acciones donde no estés involucrado.
3) La víctima debe mostrar miedo/shock (Fear RP), sin bromas.
4) Si te apuntan a la cabeza, tu comunicación queda cortada automáticamente.
5) Acciones a nivel de calle: solo pistolas.
6) Con rehenes, la víctima puede intentar contactar familiar/policía para generar rol (a criterio de los secuestradores permitirlo).
7) Máximo dinero sin secuestro: $5,000 por rehén.
8) Máximo dinero con secuestro: $15,000 por rehén.
9) Situaciones con rehenes: máximo 30 minutos.
10) Solo facciones y mafias pueden hacer secuestros.
11) Horario: 08:00 a 00:00, mínimo 30 minutos entre acciones.`;

// Reglas de cargamentos de materiales y guaraná
const REGLAS_CARGAMENTOS = `🚚 Cargamentos de Materiales
• Martes y sábado, 4:00 p.m. (hora Venezuela). Domingo: acción libre todas las mafias.
• No usar camiones comerciales (es AAP).
• No se puede usar camión (personal ni alquilado) para toma de cargamentos.

🍃 Cargamento de Guaranás
• Sin regla de cargamento: podemos atacar cargamentos de otras mafias.
• Si Ejército o Policía Federal van a la base mafia a quitarlas, es FAIL y es baneo.`;

// Reglas de robos de vehículos
const REGLAS_ROBOS = `🚗 Robos de Vehículos
• Se puede robar cualquier vehículo, pero el dueño no debe estar cerca.
• Siempre usar máscaras.
• Siempre 2 personas en un vehículo.
• Si los descubren y el dueño está cerca, no podemos hacer nada (abandonar).`;

// Admins permitidos (IDs de Telegram separados por coma en env ADMIN_IDS)
// Por defecto incluye al admin solicitado: 6912929677
const ADMIN_IDS = (process.env.ADMIN_IDS || '6912929677')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

function esAdmin(ctx) {
    const userId = ctx.from ? String(ctx.from.id) : '';
    return ADMIN_IDS.length === 0 ? false : ADMIN_IDS.includes(userId);
}

function requireAdmin(ctx) {
    if (!esAdmin(ctx)) {
        ctx.reply('❌ Solo administradores pueden usar este comando.');
        return false;
    }
    return true;
}

// Formatea fecha como dd-MM-YYYY para usar como ID de guerra diaria
function formatDateId(date = new Date()) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
}

function getVzDateParts(date = new Date()) {
    const formatter = new Intl.DateTimeFormat('es-VE', {
        timeZone: 'America/Caracas',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    const parts = formatter.formatToParts(date);
    const get = (type) => parts.find(p => p.type === type)?.value || '';
    return {
        day: get('day'),
        month: get('month'),
        year: get('year'),
        hour: get('hour'),
        minute: get('minute')
    };
}

function getVzDateId(date = new Date()) {
    const { day, month, year } = getVzDateParts(date);
    return `${day}-${month}-${year}`;
}

function getVzMinutes(date = new Date()) {
    const { hour, minute } = getVzDateParts(date);
    return Number(hour) * 60 + Number(minute);
}

function asistenciaHorarioAbierto(date = new Date()) {
    const minutos = getVzMinutes(date);
    return minutos >= ASISTENCIA_INICIO_MIN && minutos <= ASISTENCIA_FIN_MIN;
}

async function autoCerrarAsistencia() {
    const minutos = getVzMinutes();
    if (minutos < ASISTENCIA_FIN_MIN) return;

    const diaVz = getVzDateId();
    const asistencias = await loadAsistencias();
    const chatIds = new Set(Object.keys(asistencias));
    if (ASSISTENCIA_CHAT_ID) {
        chatIds.add(ASSISTENCIA_CHAT_ID);
    }

    let changed = false;
    for (const chatId of chatIds) {
        const registro = ensureAsistencia(chatId, asistencias);
        if (registro.control_asistencia.dia !== diaVz) {
            continue;
        }
        if (!registro.control_asistencia.abierta) {
            continue;
        }
        registro.control_asistencia.abierta = false;
        changed = true;
        const mensaje = '🛑 Asistencia cerrada automáticamente (22:20 VZ).';
        try {
            if (ASSISTENCIA_TOPIC_ID) {
                await bot.telegram.sendMessage(chatId, mensaje, { message_thread_id: ASSISTENCIA_TOPIC_ID });
            } else {
                await bot.telegram.sendMessage(chatId, mensaje);
            }
        } catch (error) {
            console.error('Error al cerrar asistencia automática:', error);
        }
    }

    if (changed) {
        await saveAsistencias(asistencias);
    }
}

function isAsistenciaTopic(ctx) {
    if (!ASSISTENCIA_TOPIC_ID) return true;
    const threadId = ctx?.message?.message_thread_id;
    return Number(threadId) === ASSISTENCIA_TOPIC_ID;
}

function isBibliaTopic(ctx) {
    if (!BIBLIA_TOPIC_ID) return true;
    const threadId = ctx?.message?.message_thread_id;
    return Number(threadId) === BIBLIA_TOPIC_ID;
}

async function autoAbrirAsistencia() {
    if (!asistenciaHorarioAbierto()) return;

    const diaVz = getVzDateId();
    const asistencias = await loadAsistencias();
    const chatIds = new Set(Object.keys(asistencias));
    if (ASSISTENCIA_CHAT_ID) {
        chatIds.add(ASSISTENCIA_CHAT_ID);
    }

    let changed = false;
    for (const chatId of chatIds) {
        const registro = ensureAsistencia(chatId, asistencias);
        if (registro.control_asistencia.dia === diaVz) {
            continue;
        }
        registro.control_asistencia.abierta = true;
        registro.control_asistencia.dia = diaVz;
        changed = true;

        const mensaje = '✅ Asistencia abierta automáticamente. Puedes usar /asistir.';
        try {
            if (ASSISTENCIA_TOPIC_ID) {
                await bot.telegram.sendMessage(chatId, mensaje, { message_thread_id: ASSISTENCIA_TOPIC_ID });
            } else {
                await bot.telegram.sendMessage(chatId, mensaje);
            }
        } catch (error) {
            console.error('Error al abrir asistencia automática:', error);
        }
    }

    if (changed) {
        await saveAsistencias(asistencias);
    }
}

function getTopicLink(ctx, topicId) {
    const chatId = ctx?.chat?.id;
    if (!chatId || !topicId) return null;
    const idStr = String(chatId);
    if (!idStr.startsWith('-100')) return null;
    const baseId = idStr.slice(4);
    return `https://t.me/c/${baseId}/${topicId}`;
}

// Cargar datos guardados
async function loadData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// Guardar datos
async function saveData(data) {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Cargar base de miembros
async function loadMiembrosBase() {
    try {
        const data = await fs.readFile(MEMBROS_BASE_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error al cargar miembros_base.json:', error);
        return { miembros: [] };
    }
}

// Cargar asistencias
async function loadAsistencias() {
    try {
        const data = await fs.readFile(ATTENDANCE_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// Guardar asistencias
async function saveAsistencias(data) {
    await fs.writeFile(ATTENDANCE_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Asegura la estructura de asistencias por chat
function ensureAsistencia(chatId, asistencias) {
    if (!asistencias[chatId]) {
        asistencias[chatId] = {
            faltas: {},
            historial: [],
            guerra_actual: null,
            control_asistencia: { abierta: false, dia: null }
        };
    } else {
        if (!asistencias[chatId].faltas) asistencias[chatId].faltas = {};
        if (!asistencias[chatId].historial) asistencias[chatId].historial = [];
        if (!Object.prototype.hasOwnProperty.call(asistencias[chatId], 'guerra_actual')) {
            asistencias[chatId].guerra_actual = null;
        }
        if (!asistencias[chatId].control_asistencia) {
            asistencias[chatId].control_asistencia = { abierta: false, dia: null };
        }
    }
    return asistencias[chatId];
}

// Normaliza la lista de presentes para que siempre sean objetos { nombre, userId }
function normalizePresentes(presentes) {
    return (presentes || []).map(p => {
        if (typeof p === 'string') {
            return { nombre: p, userId: null };
        }
        return { nombre: p.nombre, userId: p.userId ?? null };
    });
}

function nombreMatch(a, b) {
    return String(a || '').toLowerCase() === String(b || '').toLowerCase();
}

// Obtiene un nombre a registrar desde el texto o desde el usuario de Telegram
function obtenerNombreDesdeCtx(ctx, texto) {
    const nombreLimpio = texto ? texto.trim() : '';
    if (nombreLimpio) return nombreLimpio;

    const user = ctx.from || {};
    if (user.username) return user.username;
    if (user.first_name || user.last_name) return [user.first_name, user.last_name].filter(Boolean).join(' ');
    return 'Desconocido';
}

async function esMiembroBase(nombre) {
    const base = await loadMiembrosBase();
    const miembros = base.miembros || [];
    const nombreNorm = String(nombre || '').toLowerCase();
    return miembros.some(m => String(m.nombre || '').toLowerCase() === nombreNorm);
}

// Verificar token antes de crear el bot
if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('❌ No se encontró TELEGRAM_BOT_TOKEN.');
    console.error('Configura TELEGRAM_BOT_TOKEN en variables de entorno (Render) o crea un archivo .env.');
    console.error('Directorio actual:', process.cwd());
    process.exit(1);
}

// Crear bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

function helpMessage(ctx) {
    const admin = esAdmin(ctx);
    return admin
        ? `
🤖 *Bot de Gestión de Guerras de Familia*

*Comandos (ADMIN):*
/start | /help - Muestra este mensaje
/nueva_guerra - Crea una nueva lista de guerra
/agregar <nombre> - Agrega un jugador a la lista actual
/eliminar <nombre> - Elimina un jugador de la lista actual
/lista - Muestra la lista actual de jugadores
/limpiar - Limpia la lista actual
/exportar - Exporta la lista en formato para copiar
/contar - Muestra cuántos jugadores hay en la lista
/abrir_asistencia - Abre asistencia (8:00 p.m. a 10:10 p.m. VZ)
/cerrar_asistencia - Cierra asistencia
/asistir <nombre> - Marca asistencia a la guerra actual
/reporte_asistencia - Muestra presentes y pendientes
/cerrar_guerra - Cierra la guerra y marca ausentes
/faltas - Faltas acumuladas (2 faltas = expulsión)
/biblia <código> - Ver reglas (ej: /biblia VDM)
/reglas_secuestro | /secuestro - Ver reglas de secuestro
/cargamentos - Reglas de cargamentos (materiales/guaraná)
/robos - Reglas de robos de vehículos

*Límite:* Máximo 70 miembros por guerra
        `
        : `
🤖 *Bot de Gestión de Guerras de Familia*

*Comandos (jugador):*
/help - Ver ayuda (este menú)
/asistir <nombre> - Marca asistencia a la guerra actual
/biblia <código> - Ver reglas (ej: /biblia VDM)
/reglas_secuestro | /secuestro - Ver reglas de secuestro
/cargamentos - Reglas de cargamentos (materiales/guaraná)
/robos - Reglas de robos de vehículos

Para dudas, contacta a un administrador.
        `;
}

// Comando /start y /help
bot.command(['start', 'help', 'Help', 'HELP'], async (ctx) => {
    await ctx.reply(helpMessage(ctx));
});

// Mensaje de bienvenida al entrar al grupo
bot.on('new_chat_members', async (ctx) => {
    const nuevos = (ctx.message.new_chat_members || []).map(u => u.first_name || u.username || 'Jugador');
    const nombres = nuevos.join(', ');
    await ctx.reply(
        `👋 Bienvenido${nuevos.length > 1 ? 's' : ''} ${nombres} al bot de la mafia ANORMALES.\n` +
        `Presiona /start para empezar.`
    );
});

// Comando /nueva_guerra
bot.command('nueva_guerra', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    const chatId = String(ctx.chat.id);
    const data = await loadData();
    
    if (!data[chatId]) {
        data[chatId] = {};
    }
    
    // Crear nueva guerra con ID de fecha diaria (dd-MM-YYYY)
    const guerraId = formatDateId(new Date());
    // Cargar miembros base para auto-llenar la lista de guerra
    const base = await loadMiembrosBase();
    const miembros = (base.miembros || []).map(m => m.nombre);

    data[chatId].guerra_actual = {
        id: guerraId,
        jugadores: miembros.slice(0, MAX_MIEMBROS),
        fecha_creacion: new Date().toISOString()
    };
    
    await saveData(data);

    // Registrar asistencia para la nueva guerra
    const asistencias = await loadAsistencias();
    const registro = ensureAsistencia(chatId, asistencias);
    registro.guerra_actual = {
        id: guerraId,
        presentes: [],
        fecha: new Date().toISOString()
    };
    await saveAsistencias(asistencias);

    await ctx.reply(
        `✅ Nueva guerra de familia creada!\n` +
        `ID: ${guerraId}\n` +
        `Lista cargada automáticamente con ${data[chatId].guerra_actual.jugadores.length} miembros.\n` +
        `Usa /lista para verlos o /agregar para añadir más.`
    );
});

// Comando /agregar
bot.command('agregar', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    const chatId = String(ctx.chat.id);
    const data = await loadData();
    
    if (!data[chatId] || !data[chatId].guerra_actual) {
        await ctx.reply('❌ No hay una guerra activa. Usa /nueva_guerra primero.');
        return;
    }
    
    const nombreArg = ctx.message.text.split(' ').slice(1).join(' ');
    const nombre = obtenerNombreDesdeCtx(ctx, nombreArg);
    
    if (!nombreArg && nombre === 'Desconocido') {
        await ctx.reply(
            '❌ Por favor especifica el nombre del jugador.\n' +
            'Ejemplo: /agregar JuanPerez'
        );
        return;
    }
    
    const guerra = data[chatId].guerra_actual;
    
    // Verificar límite
    if (guerra.jugadores.length >= MAX_MIEMBROS) {
        await ctx.reply(
            `❌ La lista está llena. Máximo ${MAX_MIEMBROS} miembros.\n` +
            `Usa /eliminar para quitar jugadores antes de agregar más.`
        );
        return;
    }
    
    // Verificar si ya existe
    if (guerra.jugadores.includes(nombre)) {
        await ctx.reply(`⚠️ El jugador '${nombre}' ya está en la lista.`);
        return;
    }
    
    guerra.jugadores.push(nombre);
    await saveData(data);
    
    const total = guerra.jugadores.length;
    await ctx.reply(
        `✅ Jugador '${nombre}' agregado.\n` +
        `📊 Total: ${total}/${MAX_MIEMBROS}`
    );
});

// Comando /eliminar
bot.command('eliminar', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    const chatId = String(ctx.chat.id);
    const data = await loadData();
    
    if (!data[chatId] || !data[chatId].guerra_actual) {
        await ctx.reply('❌ No hay una guerra activa. Usa /nueva_guerra primero.');
        return;
    }
    
    const nombre = ctx.message.text.split(' ').slice(1).join(' ');
    
    if (!nombre) {
        await ctx.reply(
            '❌ Por favor especifica el nombre del jugador.\n' +
            'Ejemplo: /eliminar JuanPerez'
        );
        return;
    }
    
    const guerra = data[chatId].guerra_actual;
    const index = guerra.jugadores.indexOf(nombre);
    
    if (index === -1) {
        await ctx.reply(`❌ El jugador '${nombre}' no está en la lista.`);
        return;
    }
    
    guerra.jugadores.splice(index, 1);
    await saveData(data);
    
    const total = guerra.jugadores.length;
    await ctx.reply(
        `✅ Jugador '${nombre}' eliminado.\n` +
        `📊 Total: ${total}/${MAX_MIEMBROS}`
    );
});

// Función auxiliar para obtener info de miembro desde la base
async function getMiembroInfo(nombre) {
    const base = await loadMiembrosBase();
    const miembros = base.miembros || [];
    return miembros.find(m => m.nombre === nombre);
}

// Comando /lista
bot.command('lista', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    const chatId = String(ctx.chat.id);
    const data = await loadData();
    
    if (!data[chatId] || !data[chatId].guerra_actual) {
        await ctx.reply('❌ No hay una guerra activa. Usa /nueva_guerra primero.');
        return;
    }
    
    const guerra = data[chatId].guerra_actual;
    const jugadores = guerra.jugadores;
    
    if (jugadores.length === 0) {
        await ctx.reply('📋 La lista está vacía. Usa /agregar para añadir jugadores.');
        return;
    }
    
    const total = jugadores.length;
    let mensaje = `📋 *Lista de Jugadores*\n\n`;
    mensaje += `Total: ${total}/${MAX_MIEMBROS}\n\n`;
    
    // Dividir en mensajes si es muy largo (Telegram tiene límite de 4096 caracteres)
    let listaTexto = '';
    jugadores.forEach((jugador, i) => {
        listaTexto += `${i + 1}. ${jugador}\n`;
    });
    
    // Si el mensaje es muy largo, dividirlo
    if ((mensaje + listaTexto).length > 4000) {
        await ctx.reply(mensaje);
        // Enviar lista en partes
        const chunkSize = 50;
        for (let i = 0; i < jugadores.length; i += chunkSize) {
            const chunk = jugadores.slice(i, i + chunkSize);
            const chunkTexto = chunk.map((jugador, j) => `${i + j + 1}. ${jugador}`).join('\n');
            await ctx.reply(chunkTexto);
        }
    } else {
        await ctx.reply(mensaje + listaTexto);
    }
});

// Comando /lista_detallada - Lista con información de rango y estado
bot.command('lista_detallada', async (ctx) => {
    const chatId = String(ctx.chat.id);
    const data = await loadData();
    
    if (!data[chatId] || !data[chatId].guerra_actual) {
        await ctx.reply('❌ No hay una guerra activa. Usa /nueva_guerra primero.');
        return;
    }
    
    const guerra = data[chatId].guerra_actual;
    const jugadores = guerra.jugadores;
    
    if (jugadores.length === 0) {
        await ctx.reply('📋 La lista está vacía. Usa /agregar para añadir jugadores.');
        return;
    }
    
    const base = await loadMiembrosBase();
    const miembrosMap = {};
    (base.miembros || []).forEach(m => {
        miembrosMap[m.nombre] = m;
    });
    
    // Ordenar por rango (mayor a menor nivel)
    const jugadoresConInfo = jugadores.map(nombre => {
        const info = miembrosMap[nombre];
        return {
            nombre,
            rango: info ? info.rango : 'Desconocido',
            nivel_rango: info ? info.nivel_rango : 0,
            estado: info ? info.estado : 'desconectado',
            contribucion: info ? info.contribucion : 0
        };
    });
    
    jugadoresConInfo.sort((a, b) => b.nivel_rango - a.nivel_rango);
    
    const total = jugadores.length;
    let mensaje = `📋 *Lista Detallada de Jugadores*\n\n`;
    mensaje += `Total: ${total}/${MAX_MIEMBROS}\n\n`;
    
    // Agrupar por rango
    const porRango = {};
    jugadoresConInfo.forEach(j => {
        if (!porRango[j.rango]) {
            porRango[j.rango] = [];
        }
        porRango[j.rango].push(j);
    });
    
    const ordenRangos = ['Chefe', 'Subchefe', 'Conselheiro', 'Capitão', 'Soldado', 'Novato', 'Desconocido'];
    ordenRangos.forEach(rango => {
        if (porRango[rango]) {
            mensaje += `*${rango} [${porRango[rango][0].nivel_rango || '?'}]*: ${porRango[rango].length}\n`;
        }
    });
    
    await ctx.reply(mensaje);
    
    // Enviar lista detallada en partes
    let contador = 1;
    ordenRangos.forEach(rango => {
        if (porRango[rango]) {
            let listaRango = `\n*${rango} [${porRango[rango][0].nivel_rango || '?'}]*\n`;
            porRango[rango].forEach(j => {
                const estado = j.estado === 'en línea' ? '🟢' : '🔴';
                listaRango += `${contador}. ${j.nombre} ${estado}\n`;
                contador++;
            });
            
            if (listaRango.length > 4000) {
                // Dividir si es muy largo
                const partes = listaRango.match(/[\s\S]{1,4000}/g) || [];
                partes.forEach(parte => ctx.reply(parte));
            } else {
                ctx.reply(listaRango);
            }
        }
    });
});

// Comando /limpiar
bot.command('limpiar', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    const chatId = String(ctx.chat.id);
    const data = await loadData();
    
    if (!data[chatId] || !data[chatId].guerra_actual) {
        await ctx.reply('❌ No hay una guerra activa.');
        return;
    }
    
    const guerra = data[chatId].guerra_actual;
    const total = guerra.jugadores.length;
    guerra.jugadores = [];
    await saveData(data);
    
    await ctx.reply(`✅ Lista limpiada. Se eliminaron ${total} jugadores.`);
});

// Comando /exportar
bot.command('exportar', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    const chatId = String(ctx.chat.id);
    const data = await loadData();
    
    if (!data[chatId] || !data[chatId].guerra_actual) {
        await ctx.reply('❌ No hay una guerra activa. Usa /nueva_guerra primero.');
        return;
    }
    
    const guerra = data[chatId].guerra_actual;
    const jugadores = guerra.jugadores;
    
    if (jugadores.length === 0) {
        await ctx.reply('❌ La lista está vacía.');
        return;
    }
    
    // Formato exportable
    const listaExport = jugadores.join('\n');
    const total = jugadores.length;
    
    const mensaje = `📤 *Lista Exportada*\n\n` +
        `Total: ${total}/${MAX_MIEMBROS}\n\n` +
        `\`\`\`\n${listaExport}\n\`\`\``;
    
    await ctx.reply(mensaje);
});

// Comando /exportar_detallado - Exporta con información de rango
bot.command('exportar_detallado', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    const chatId = String(ctx.chat.id);
    const data = await loadData();
    
    if (!data[chatId] || !data[chatId].guerra_actual) {
        await ctx.reply('❌ No hay una guerra activa. Usa /nueva_guerra primero.');
        return;
    }
    
    const guerra = data[chatId].guerra_actual;
    const jugadores = guerra.jugadores;
    
    if (jugadores.length === 0) {
        await ctx.reply('❌ La lista está vacía.');
        return;
    }
    
    const base = await loadMiembrosBase();
    const miembrosMap = {};
    (base.miembros || []).forEach(m => {
        miembrosMap[m.nombre] = m;
    });
    
    // Ordenar por rango
    const jugadoresConInfo = jugadores.map(nombre => {
        const info = miembrosMap[nombre];
        return {
            nombre,
            rango: info ? info.rango : 'Desconocido',
            nivel_rango: info ? info.nivel_rango : 0
        };
    });
    
    jugadoresConInfo.sort((a, b) => b.nivel_rango - a.nivel_rango);
    
    const total = jugadores.length;
    let listaExport = `Lista de Guerra - Total: ${total}/${MAX_MIEMBROS}\n\n`;
    
    // Agrupar por rango
    const porRango = {};
    jugadoresConInfo.forEach(j => {
        if (!porRango[j.rango]) {
            porRango[j.rango] = [];
        }
        porRango[j.rango].push(j);
    });
    
    const ordenRangos = ['Chefe', 'Subchefe', 'Conselheiro', 'Capitão', 'Soldado', 'Novato', 'Desconocido'];
    ordenRangos.forEach(rango => {
        if (porRango[rango]) {
            listaExport += `${rango} [${porRango[rango][0].nivel_rango || '?'}]:\n`;
            porRango[rango].forEach(j => {
                listaExport += `  - ${j.nombre}\n`;
            });
            listaExport += '\n';
        }
    });
    
    const mensaje = `📤 *Lista Detallada Exportada*\n\n` +
        `\`\`\`\n${listaExport}\`\`\``;
    
    await ctx.reply(mensaje);
});

// Comando /contar
bot.command('contar', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    const chatId = String(ctx.chat.id);
    const data = await loadData();
    
    if (!data[chatId] || !data[chatId].guerra_actual) {
        await ctx.reply('❌ No hay una guerra activa. Usa /nueva_guerra primero.');
        return;
    }
    
    const guerra = data[chatId].guerra_actual;
    const total = guerra.jugadores.length;
    const restantes = MAX_MIEMBROS - total;
    
    const mensaje = `📊 *Estadísticas*\n\n` +
        `Jugadores: ${total}/${MAX_MIEMBROS}\n` +
        `Espacios disponibles: ${restantes}`;
    
    await ctx.reply(mensaje);
});

// Comando /abrir_asistencia - abre asistencia diaria (solo admin)
bot.command('abrir_asistencia', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    if (!isAsistenciaTopic(ctx)) {
        await ctx.reply('❌ La asistencia solo se maneja en el topic de asistencia.');
        return;
    }
    const chatId = String(ctx.chat.id);
    const asistencias = await loadAsistencias();
    const registro = ensureAsistencia(chatId, asistencias);

    const diaVz = getVzDateId();
    if (registro.control_asistencia.dia === diaVz) {
        await ctx.reply('⚠️ La asistencia de hoy ya fue abierta. Solo se puede abrir una vez por día.');
        return;
    }

    if (!asistenciaHorarioAbierto()) {
        await ctx.reply('⏰ La asistencia solo se abre de 8:00 p.m. a 10:10 p.m. (hora Venezuela).');
        return;
    }

    registro.control_asistencia.abierta = true;
    registro.control_asistencia.dia = diaVz;
    await saveAsistencias(asistencias);
    await ctx.reply('✅ Asistencia abierta. Puedes usar /asistir.');
});

// Comando /cerrar_asistencia - cierra asistencia diaria (solo admin)
bot.command('cerrar_asistencia', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    if (!isAsistenciaTopic(ctx)) {
        await ctx.reply('❌ La asistencia solo se maneja en el topic de asistencia.');
        return;
    }
    const chatId = String(ctx.chat.id);
    const asistencias = await loadAsistencias();
    const registro = ensureAsistencia(chatId, asistencias);

    registro.control_asistencia.abierta = false;
    await saveAsistencias(asistencias);
    await ctx.reply('✅ Asistencia cerrada.');
});

// Comando /topic_id - muestra el ID del topic actual (solo admin)
bot.command('topic_id', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    const threadId = ctx?.message?.message_thread_id;
    if (!threadId) {
        await ctx.reply('❌ Este comando debe usarse dentro de un topic.');
        return;
    }
    await ctx.reply(`🧵 ID del topic: ${threadId}`);
});

// En el topic de asistencia, solo permitir comandos específicos
bot.on('message', async (ctx, next) => {
    if (!isAsistenciaTopic(ctx)) {
        return next();
    }

    const text = ctx?.message?.text;
    if (!text) {
        return next();
    }

    const allowed = ['/asistir', '/abrir_asistencia', '/cerrar_asistencia', '/reporte_asistencia', '/cerrar_guerra', '/topic_id'];
    const cmd = text.trim().split(/\s+/)[0];
    if (allowed.includes(cmd)) {
        return next();
    }

    try {
        await ctx.deleteMessage();
    } catch (error) {
        console.error('Error al borrar mensaje fuera de comandos:', error);
    }
});

// Comando /asistir - marca asistencia para la guerra actual
bot.command('asistir', async (ctx) => {
    const chatId = String(ctx.chat.id);
    const data = await loadData();
    const asistencias = await loadAsistencias();

    if (!isAsistenciaTopic(ctx)) {
        const link = getTopicLink(ctx, ASSISTENCIA_TOPIC_ID);
        const mensaje = link
            ? `❌ Debes usar este comando en el topic de asistencia a guerra.\n👉 ${link}`
            : '❌ Debes usar este comando en el topic de asistencia a guerra.';
        await ctx.reply(mensaje);
        return;
    }

    if (!data[chatId] || !data[chatId].guerra_actual) {
        await ctx.reply('❌ No hay una guerra activa. Usa /nueva_guerra primero.');
        return;
    }

    const guerra = data[chatId].guerra_actual;
    const registro = ensureAsistencia(chatId, asistencias);

    const diaVz = getVzDateId();
    if (!registro.control_asistencia.abierta || registro.control_asistencia.dia !== diaVz) {
        await ctx.reply('⏰ La asistencia aún no está abierta. Se abre de 8:00 p.m. a 10:10 p.m. (hora Venezuela).');
        return;
    }
    if (!asistenciaHorarioAbierto()) {
        await ctx.reply('⏰ La asistencia está fuera de horario (8:00 p.m. a 10:10 p.m., hora Venezuela).');
        return;
    }

    if (!registro.guerra_actual || registro.guerra_actual.id !== guerra.id) {
        registro.guerra_actual = {
            id: guerra.id,
            presentes: [],
            fecha: new Date().toISOString()
        };
    }

    // Normalizar presentes para que siempre sean objetos { nombre, userId }
    registro.guerra_actual.presentes = normalizePresentes(registro.guerra_actual.presentes);

    const nombreArg = ctx.message.text.split(' ').slice(1).join(' ');
    const nombre = obtenerNombreDesdeCtx(ctx, nombreArg);
    const userId = ctx.from ? ctx.from.id : null;

    // Solo miembros registrados pueden marcar asistencia
    if (!(await esMiembroBase(nombre))) {
        await ctx.reply('❌ No estás en la base de miembros. Pídele a un admin que te agregue antes de asistir.');
        return;
    }

    // Solo una asistencia por día (por guerra ID)
    const historialHoy = (registro.historial || []).find(h => h.id === guerra.id);
    if (historialHoy) {
        const presentesHoy = (historialHoy.presentes || []).map(p => String(p));
        const ausentesHoy = (historialHoy.ausentes || []).map(a => String(a));
        const yaPorNombre = presentesHoy.some(p => nombreMatch(p, nombre)) || ausentesHoy.some(a => nombreMatch(a, nombre));
        if (yaPorNombre) {
            await ctx.reply('⚠️ Ya registraste asistencia hoy.');
            return;
        }
    }

    // Evitar doble marca por usuario de Telegram
    const yaPorUsuario = userId
        ? registro.guerra_actual.presentes.find(p => p.userId === userId)
        : null;
    if (yaPorUsuario) {
        await ctx.reply(`⚠️ Ya marcaste asistencia como ${yaPorUsuario.nombre}.`);
        return;
    }

    // Evitar duplicado por nombre exacto
    const yaPorNombre = registro.guerra_actual.presentes.find(p => p.nombre === nombre);
    if (yaPorNombre) {
        await ctx.reply(`⚠️ ${nombre} ya estaba marcado como asistido.`);
        return;
    }

    registro.guerra_actual.presentes.push({ nombre, userId });
    await saveAsistencias(asistencias);

    const totalPresentes = registro.guerra_actual.presentes.length;
    await ctx.reply(`✅ Asistencia registrada para ${nombre}.\nPresentes: ${totalPresentes}`);
});

// Comando /reporte_asistencia - muestra presentes y pendientes
bot.command('reporte_asistencia', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    const chatId = String(ctx.chat.id);
    const data = await loadData();
    const asistencias = await loadAsistencias();

    if (!data[chatId] || !data[chatId].guerra_actual) {
        await ctx.reply('❌ No hay una guerra activa. Usa /nueva_guerra primero.');
        return;
    }

    const guerra = data[chatId].guerra_actual;
    const registro = ensureAsistencia(chatId, asistencias);
    const presentes = (registro.guerra_actual && registro.guerra_actual.id === guerra.id)
        ? normalizePresentes(registro.guerra_actual.presentes)
        : [];
    const nombresPresentes = presentes.map(p => p.nombre);
    const jugadores = guerra.jugadores || [];
    const pendientes = jugadores.filter(j => !nombresPresentes.includes(j));

    let mensaje = `📋 Asistencia guerra ${guerra.id}\n`;
    mensaje += `Presentes: ${presentes.length}\n`;
    if (presentes.length > 0) {
        mensaje += `${presentes.map((p, i) => `${i + 1}. ${p.nombre}`).join('\n')}\n`;
    }
    mensaje += `\nPendientes: ${pendientes.length}\n`;
    if (pendientes.length > 0) {
        mensaje += `${pendientes.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
    }

    await ctx.reply(mensaje);
});

// Comando /cerrar_guerra - marca ausentes, suma faltas y cierra asistencia
bot.command('cerrar_guerra', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    const chatId = String(ctx.chat.id);
    const data = await loadData();
    const asistencias = await loadAsistencias();

    if (!data[chatId] || !data[chatId].guerra_actual) {
        await ctx.reply('❌ No hay una guerra activa. Usa /nueva_guerra primero.');
        return;
    }

    const guerra = data[chatId].guerra_actual;
    const registro = ensureAsistencia(chatId, asistencias);

    if (!registro.guerra_actual || registro.guerra_actual.id !== guerra.id) {
        registro.guerra_actual = {
            id: guerra.id,
            presentes: [],
            fecha: new Date().toISOString()
        };
    }

    const presentes = normalizePresentes(registro.guerra_actual.presentes);
    const jugadores = guerra.jugadores || [];
    const nombresPresentes = presentes.map(p => p.nombre);
    const ausentes = jugadores.filter(j => !nombresPresentes.includes(j));

    ausentes.forEach(nombre => {
        registro.faltas[nombre] = (registro.faltas[nombre] || 0) + 1;
    });

    registro.historial.push({
        id: guerra.id,
        fecha: new Date().toISOString(),
        presentes: [...nombresPresentes],
        ausentes: [...ausentes]
    });

    const paraExpulsion = ausentes.filter(n => registro.faltas[n] >= 2);

    // Limpiar asistencia actual
    registro.guerra_actual = null;
    await saveAsistencias(asistencias);

    let mensaje = `✅ Guerra ${guerra.id} cerrada.\n`;
    mensaje += `🟢 Presentes: ${presentes.length}\n`;
    if (presentes.length > 0) {
        mensaje += presentes.map((p, i) => `🟢 ${i + 1}. ${p.nombre}`).join('\n') + '\n';
    }
    mensaje += `\n🔴 Ausentes: ${ausentes.length}\n`;
    if (ausentes.length > 0) {
        mensaje += ausentes.map((a, i) => `🔴 ${i + 1}. ${a} (faltas: ${registro.faltas[a]})`).join('\n') + '\n';
    }
    if (paraExpulsion.length > 0) {
        mensaje += `\n⚠️ Para expulsión (2 faltas): ${paraExpulsion.join(', ')}`;
    }

    await ctx.reply(mensaje);
});

// Comando /faltas - muestra faltas acumuladas
bot.command('faltas', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    const chatId = String(ctx.chat.id);
    const asistencias = await loadAsistencias();
    const registro = ensureAsistencia(chatId, asistencias);

    const entries = Object.entries(registro.faltas || {});
    if (entries.length === 0) {
        await ctx.reply('📊 No hay faltas registradas.');
        return;
    }

    entries.sort((a, b) => b[1] - a[1]);

    let mensaje = '📊 Faltas acumuladas:\n';
    entries.forEach(([nombre, faltas], idx) => {
        const marca = faltas >= 2 ? '⚠️' : '✅';
        mensaje += `${idx + 1}. ${nombre}: ${faltas} ${marca}\n`;
    });

    await ctx.reply(mensaje);
});

// Comando /biblia: lista todas o busca regla por código (accesible a todos)
bot.command(['biblia', 'Biblia'], async (ctx) => {
    if (!isBibliaTopic(ctx)) {
        await ctx.reply('❌ Este comando solo se usa en el topic de biblia RP.');
        return;
    }
    const args = ctx.message.text.split(' ').slice(1);
    const code = (args[0] || '').toUpperCase();

    if (!code) {
        const disponibles = Object.keys(BIBLIA_RULES).join(', ');
        await ctx.reply(
            `📘 Biblia\n` +
            `Usa: /biblia <código>\n` +
            `Ejemplos: /biblia VDM, /biblia CL\n` +
            `Códigos: ${disponibles}`
        );
        return;
    }

    const regla = BIBLIA_RULES[code];
    if (!regla) {
        const disponibles = Object.keys(BIBLIA_RULES).join(', ');
        await ctx.reply(
            `❌ Código no encontrado: ${code}\n` +
            `Códigos válidos: ${disponibles}`
        );
        return;
    }

    await ctx.reply(`📘 ${code}: ${regla}`);
});

// Comando /reglas_secuestro o /secuestro - accesible a todos
bot.command(['reglas_secuestro', 'Reglas_secuestro', 'REGLAS_SEQUESTRO', 'reglas_sequestro', 'secuestro', 'Secuestro'], async (ctx) => {
    if (!isBibliaTopic(ctx)) {
        await ctx.reply('❌ Este comando solo se usa en el topic de biblia RP.');
        return;
    }
    await ctx.reply(REGLAS_SECUESTRO);
});

// Comando /cargamentos - accesible a todos
bot.command(['cargamentos', 'Cargamentos'], async (ctx) => {
    if (!isBibliaTopic(ctx)) {
        await ctx.reply('❌ Este comando solo se usa en el topic de biblia RP.');
        return;
    }
    await ctx.reply(REGLAS_CARGAMENTOS);
});

// Comando /robos - accesible a todos
bot.command(['robos', 'Robos'], async (ctx) => {
    if (!isBibliaTopic(ctx)) {
        await ctx.reply('❌ Este comando solo se usa en el topic de biblia RP.');
        return;
    }
    await ctx.reply(REGLAS_ROBOS);
});

// Comando /miembros - Ver todos los miembros de la base
bot.command('miembros', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    const base = await loadMiembrosBase();
    const miembros = base.miembros || [];
    
    if (miembros.length === 0) {
        await ctx.reply('❌ No hay miembros en la base de datos.');
        return;
    }
    
    let mensaje = `👥 *Base de Miembros*\n\n`;
    mensaje += `Total: ${miembros.length} miembros\n\n`;
    
    // Agrupar por rango
    const porRango = {};
    miembros.forEach(m => {
        if (!porRango[m.rango]) {
            porRango[m.rango] = [];
        }
        porRango[m.rango].push(m);
    });
    
    // Mostrar por rango
    const ordenRangos = ['Chefe', 'Subchefe', 'Conselheiro', 'Capitão', 'Soldado', 'Novato'];
    ordenRangos.forEach(rango => {
        if (porRango[rango]) {
            const online = porRango[rango].filter(m => m.estado === 'en línea').length;
            mensaje += `*${rango} [${porRango[rango][0].nivel_rango}]*: ${porRango[rango].length} (${online} en línea)\n`;
        }
    });
    
    await ctx.reply(mensaje);
    
    // Enviar lista completa en partes
    const chunkSize = 20;
    for (let i = 0; i < miembros.length; i += chunkSize) {
        const chunk = miembros.slice(i, i + chunkSize);
        const chunkTexto = chunk.map((m, j) => {
            const estado = m.estado === 'en línea' ? '🟢' : '🔴';
            return `${i + j + 1}. ${m.nombre} - ${m.rango} [${m.nivel_rango}] ${estado}`;
        }).join('\n');
        await ctx.reply(chunkTexto);
    }
});

// Comando /miembros_online - Agregar solo miembros en línea
bot.command('miembros_online', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    const chatId = String(ctx.chat.id);
    const data = await loadData();
    
    if (!data[chatId] || !data[chatId].guerra_actual) {
        await ctx.reply('❌ No hay una guerra activa. Usa /nueva_guerra primero.');
        return;
    }
    
    const base = await loadMiembrosBase();
    const miembrosOnline = (base.miembros || []).filter(m => m.estado === 'en línea');
    
    if (miembrosOnline.length === 0) {
        await ctx.reply('❌ No hay miembros en línea en la base de datos.');
        return;
    }
    
    const guerra = data[chatId].guerra_actual;
    let agregados = 0;
    let yaExisten = 0;
    
    miembrosOnline.forEach(miembro => {
        if (guerra.jugadores.length >= MAX_MIEMBROS) {
            return;
        }
        if (!guerra.jugadores.includes(miembro.nombre)) {
            guerra.jugadores.push(miembro.nombre);
            agregados++;
        } else {
            yaExisten++;
        }
    });
    
    await saveData(data);
    
    await ctx.reply(
        `✅ Agregados ${agregados} miembros en línea.\n` +
        `${yaExisten > 0 ? `⚠️ ${yaExisten} ya estaban en la lista.\n` : ''}` +
        `📊 Total: ${guerra.jugadores.length}/${MAX_MIEMBROS}`
    );
});

// Comando /agregar_todos - Agregar todos los miembros
bot.command('agregar_todos', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    const chatId = String(ctx.chat.id);
    const data = await loadData();
    
    if (!data[chatId] || !data[chatId].guerra_actual) {
        await ctx.reply('❌ No hay una guerra activa. Usa /nueva_guerra primero.');
        return;
    }
    
    const base = await loadMiembrosBase();
    const miembros = base.miembros || [];
    
    if (miembros.length === 0) {
        await ctx.reply('❌ No hay miembros en la base de datos.');
        return;
    }
    
    const guerra = data[chatId].guerra_actual;
    let agregados = 0;
    let yaExisten = 0;
    let limiteAlcanzado = 0;
    
    miembros.forEach(miembro => {
        if (guerra.jugadores.length >= MAX_MIEMBROS) {
            limiteAlcanzado++;
            return;
        }
        if (!guerra.jugadores.includes(miembro.nombre)) {
            guerra.jugadores.push(miembro.nombre);
            agregados++;
        } else {
            yaExisten++;
        }
    });
    
    await saveData(data);
    
    let mensaje = `✅ Agregados ${agregados} miembros.\n`;
    if (yaExisten > 0) mensaje += `⚠️ ${yaExisten} ya estaban en la lista.\n`;
    if (limiteAlcanzado > 0) mensaje += `❌ ${limiteAlcanzado} no se pudieron agregar (límite alcanzado).\n`;
    mensaje += `📊 Total: ${guerra.jugadores.length}/${MAX_MIEMBROS}`;
    
    await ctx.reply(mensaje);
});

// Comando /buscar - Buscar miembro en la base
bot.command('buscar', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    const busqueda = ctx.message.text.split(' ').slice(1).join(' ').toLowerCase();
    
    if (!busqueda) {
        await ctx.reply('❌ Por favor especifica el nombre a buscar.\nEjemplo: /buscar Aleman');
        return;
    }
    
    const base = await loadMiembrosBase();
    const miembros = base.miembros || [];
    
    const resultados = miembros.filter(m => 
        m.nombre.toLowerCase().includes(busqueda)
    );
    
    if (resultados.length === 0) {
        await ctx.reply(`❌ No se encontraron miembros con "${busqueda}"`);
        return;
    }
    
    let mensaje = `🔍 *Resultados de búsqueda: "${busqueda}"*\n\n`;
    mensaje += `Encontrados: ${resultados.length}\n\n`;
    
    resultados.forEach((m, i) => {
        const estado = m.estado === 'en línea' ? '🟢' : '🔴';
        mensaje += `${i + 1}. ${m.nombre}\n`;
        mensaje += `   ${m.rango} [${m.nivel_rango}] - Contribución: ${m.contribucion} ${estado}\n\n`;
    });
    
    await ctx.reply(mensaje);
});

// Comando /agregar_rango - Agregar miembros por rango
bot.command('agregar_rango', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    const chatId = String(ctx.chat.id);
    const data = await loadData();
    
    if (!data[chatId] || !data[chatId].guerra_actual) {
        await ctx.reply('❌ No hay una guerra activa. Usa /nueva_guerra primero.');
        return;
    }
    
    const rangoBuscado = ctx.message.text.split(' ').slice(1).join(' ');
    
    if (!rangoBuscado) {
        await ctx.reply(
            '❌ Por favor especifica el rango.\n' +
            'Ejemplo: /agregar_rango Conselheiro\n' +
            'Rangos disponibles: Chefe, Subchefe, Conselheiro, Capitão, Soldado, Novato'
        );
        return;
    }
    
    const base = await loadMiembrosBase();
    const miembrosRango = (base.miembros || []).filter(m => 
        m.rango.toLowerCase() === rangoBuscado.toLowerCase()
    );
    
    if (miembrosRango.length === 0) {
        await ctx.reply(`❌ No se encontraron miembros con el rango "${rangoBuscado}"`);
        return;
    }
    
    const guerra = data[chatId].guerra_actual;
    let agregados = 0;
    let yaExisten = 0;
    let limiteAlcanzado = 0;
    
    miembrosRango.forEach(miembro => {
        if (guerra.jugadores.length >= MAX_MIEMBROS) {
            limiteAlcanzado++;
            return;
        }
        if (!guerra.jugadores.includes(miembro.nombre)) {
            guerra.jugadores.push(miembro.nombre);
            agregados++;
        } else {
            yaExisten++;
        }
    });
    
    await saveData(data);
    
    let mensaje = `✅ Agregados ${agregados} miembros con rango "${rangoBuscado}".\n`;
    if (yaExisten > 0) mensaje += `⚠️ ${yaExisten} ya estaban en la lista.\n`;
    if (limiteAlcanzado > 0) mensaje += `❌ ${limiteAlcanzado} no se pudieron agregar (límite alcanzado).\n`;
    mensaje += `📊 Total: ${guerra.jugadores.length}/${MAX_MIEMBROS}`;
    
    await ctx.reply(mensaje);
});

// Comando /stats_base - Estadísticas de la base
bot.command('stats_base', async (ctx) => {
    if (!requireAdmin(ctx)) return;
    const base = await loadMiembrosBase();
    const miembros = base.miembros || [];
    
    if (miembros.length === 0) {
        await ctx.reply('❌ No hay miembros en la base de datos.');
        return;
    }
    
    const online = miembros.filter(m => m.estado === 'en línea').length;
    const offline = miembros.length - online;
    
    // Agrupar por rango
    const porRango = {};
    miembros.forEach(m => {
        if (!porRango[m.rango]) {
            porRango[m.rango] = { total: 0, online: 0 };
        }
        porRango[m.rango].total++;
        if (m.estado === 'en línea') {
            porRango[m.rango].online++;
        }
    });
    
    let mensaje = `📊 *Estadísticas de la Base*\n\n`;
    mensaje += `Total miembros: ${miembros.length}\n`;
    mensaje += `🟢 En línea: ${online}\n`;
    mensaje += `🔴 Desconectados: ${offline}\n\n`;
    mensaje += `*Por Rango:*\n`;
    
    const ordenRangos = ['Chefe', 'Subchefe', 'Conselheiro', 'Capitão', 'Soldado', 'Novato'];
    ordenRangos.forEach(rango => {
        if (porRango[rango]) {
            mensaje += `${rango}: ${porRango[rango].total} (${porRango[rango].online} en línea)\n`;
        }
    });
    
    await ctx.reply(mensaje);
});

// Manejo de errores
bot.catch((err, ctx) => {
    console.error(`Error para ${ctx.updateType}:`, err);
});

// Iniciar bot
console.log('🤖 Bot iniciado...');
bot.launch();

// Manejo graceful de cierre
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Render Web Service requiere un puerto abierto
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
}).listen(PORT, () => {
    console.log(`🌐 Web server escuchando en puerto ${PORT}`);
});

// Apertura automática de asistencia (20:00 VZ)
autoAbrirAsistencia().catch(err => console.error('Error en apertura automática:', err));
setInterval(() => {
    autoAbrirAsistencia().catch(err => console.error('Error en apertura automática:', err));
    autoCerrarAsistencia().catch(err => console.error('Error en cierre automático:', err));
}, 60 * 1000);
