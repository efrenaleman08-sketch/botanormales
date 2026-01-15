# Bot de Telegram para Guerras de Familia

Bot de Telegram para gestionar listas de jugadores en guerras de familia (máximo 70 miembros).

## 🚀 Instalación

1. **Instala Node.js** (versión 14 o superior)
   - Descarga desde [nodejs.org](https://nodejs.org/)

2. **Instala las dependencias:**
```bash
npm install
```

3. **Crea un bot en Telegram:**
   - Abre Telegram y busca `@BotFather`
   - Envía `/newbot` y sigue las instrucciones
   - Copia el token que te proporciona

4. **Configura el token:**
   - Crea un archivo `.env` en la raíz del proyecto
   - Agrega tu token:
   ```
   TELEGRAM_BOT_TOKEN=tu_token_aqui
   ```

5. **Ejecuta el bot:**
```bash
npm start
```

Para desarrollo con auto-reload (recomendado):
```bash
npm run dev
```

## 📋 Comandos Disponibles

### Comandos Básicos:
- `/start` - Muestra el mensaje de bienvenida y comandos disponibles
- `/nueva_guerra` - Crea una nueva lista de guerra de familia
- `/agregar <nombre>` - Agrega un jugador a la lista actual
- `/eliminar <nombre>` - Elimina un jugador de la lista actual
- `/lista` - Muestra la lista completa de jugadores
- `/limpiar` - Limpia toda la lista actual
- `/exportar` - Exporta la lista en formato para copiar fácilmente
- `/contar` - Muestra cuántos jugadores hay en la lista

### Comandos de Base de Datos:
- `/miembros` - Muestra todos los miembros disponibles en la base
- `/miembros_online` - Agrega automáticamente solo los miembros en línea a la guerra
- `/agregar_todos` - Agrega todos los miembros de la base a la guerra actual
- `/agregar_rango <rango>` - Agrega miembros de un rango específico (Chefe, Subchefe, Conselheiro, etc.)
- `/buscar <nombre>` - Busca un miembro en la base de datos
- `/stats_base` - Muestra estadísticas de la base de miembros (por rango, estado, etc.)
- `/lista_detallada` - Muestra la lista ordenada por rango con información completa
- `/exportar_detallado` - Exporta la lista con información de rangos agrupada

## 📝 Ejemplos de Uso

### Uso Básico:
```
/nueva_guerra
/agregar JuanPerez
/lista
/exportar
```

### Usando la Base de Datos:
```
/nueva_guerra
/miembros_online          # Agrega solo los que están en línea
# o
/agregar_todos            # Agrega todos los 68 miembros
# o
/agregar_rango Conselheiro # Agrega solo Conselheiros
/buscar Aleman            # Busca miembros con "Aleman" en el nombre
/lista_detallada          # Ver lista ordenada por rango
/exportar_detallado       # Exportar con información de rangos
/stats_base               # Ver estadísticas de la base
```

## ⚙️ Características

- ✅ Gestión de listas de hasta 70 jugadores
- ✅ Base de datos con 68 miembros pre-cargados
- ✅ Agregar miembros automáticamente desde la base
- ✅ Filtrar por estado (en línea/desconectado)
- ✅ Búsqueda de miembros en la base
- ✅ Estadísticas por rango y estado
- ✅ Validación de duplicados
- ✅ Exportación de listas
- ✅ Persistencia de datos (se guarda en `guerras_familia.json`)
- ✅ Contador de jugadores en tiempo real
- ✅ Manejo de errores robusto
- ✅ Cierre graceful del bot

## 📁 Archivos

- `bot.js` - Código principal del bot
- `package.json` - Configuración y dependencias
- `miembros_base.json` - Base de datos con los 68 miembros de la familia
- `.env` - Configuración con tu token (no compartir)
- `guerras_familia.json` - Datos guardados (se crea automáticamente)

## 🔒 Seguridad

- **NUNCA** compartas tu archivo `.env` o tu token de bot
- El archivo `.env` está en `.gitignore` para evitar subirlo por error

## 🛠️ Tecnologías

- **Node.js** - Runtime de JavaScript
- **Telegraf** - Framework para bots de Telegram
- **dotenv** - Manejo de variables de entorno

## 📚 Estructura del Proyecto

```
bot-de-rio-rise/
├── bot.js              # Código principal
├── package.json        # Dependencias
├── .env               # Token (crear manualmente)
├── .gitignore         # Archivos a ignorar
└── README.md          # Esta documentación
```

## 🐛 Solución de Problemas

**Error: "No se encontró TELEGRAM_BOT_TOKEN"**
- Asegúrate de crear el archivo `.env` con tu token

**Error: "Cannot find module 'telegraf'"**
- Ejecuta `npm install` para instalar las dependencias

**El bot no responde**
- Verifica que el token sea correcto
- Asegúrate de que el bot esté ejecutándose (`npm start`)
