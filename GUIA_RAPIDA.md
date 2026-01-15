# 🚀 Guía Rápida - Bot de Guerras de Familia

## ⚡ Inicio Rápido

1. **Crea el archivo `.env`** con tu token:
   ```
   TELEGRAM_BOT_TOKEN=7999661289:AAGbiC09q8Fp2DqNU20A2NKYyp45zDFhYNM
   ```

2. **Instala dependencias:**
   ```bash
   npm install
   ```

3. **Ejecuta el bot:**
   ```bash
   npm start
   ```

4. **Prueba en Telegram:**
   - Busca tu bot: `@Mafia_AnormalesKing_bot`
   - Envía `/start`

## 📋 Flujo de Trabajo Típico

### Escenario 1: Guerra con miembros en línea
```
/nueva_guerra
/miembros_online
/lista_detallada
/exportar_detallado
```

### Escenario 2: Guerra con rango específico
```
/nueva_guerra
/agregar_rango Conselheiro
/agregar_rango Capitão
/lista_detallada
```

### Escenario 3: Guerra completa (todos los miembros)
```
/nueva_guerra
/agregar_todos
/contar
/exportar
```

## 🎯 Comandos Más Usados

| Comando | Descripción | Uso |
|---------|-------------|-----|
| `/nueva_guerra` | Crear nueva lista | Primero siempre |
| `/miembros_online` | Agregar solo online | Más rápido |
| `/agregar_rango Conselheiro` | Agregar por rango | Selectivo |
| `/lista_detallada` | Ver con rangos | Organizado |
| `/exportar_detallado` | Copiar lista | Para compartir |

## 💡 Tips

- **Usa `/miembros_online`** cuando necesites solo jugadores activos
- **Usa `/agregar_rango`** para agregar por jerarquía
- **Usa `/lista_detallada`** para ver la lista organizada por rango
- **Usa `/exportar_detallado`** para compartir la lista formateada

## 🔍 Buscar Miembros

```
/buscar Aleman        # Busca "Aleman" en nombres
/buscar Sr_           # Busca todos los que empiezan con "Sr_"
```

## 📊 Ver Estadísticas

```
/stats_base           # Estadísticas de toda la base
/contar               # Estadísticas de la guerra actual
```

## ⚠️ Solución Rápida de Problemas

**Bot no responde:**
- Verifica que el archivo `.env` existe
- Verifica que el token es correcto
- Verifica que el bot está ejecutándose (`npm start`)

**Error al agregar miembros:**
- Asegúrate de crear la guerra primero (`/nueva_guerra`)
- Verifica que no hayas alcanzado el límite de 70

**No encuentra miembros:**
- Verifica que `miembros_base.json` existe
- Usa `/miembros` para ver la base completa

