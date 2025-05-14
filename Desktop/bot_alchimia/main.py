import os
from telegram import Update, InputFile
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from image_utils import crea_cerchio

TOKEN = os.getenv("BOT_TOKEN")  # Lo metteremo su Render

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Benvenuto! Usa il comando /combina fuoco acqua per creare un cerchio.")

async def combina(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args or len(context.args) < 2:
        await update.message.reply_text("Devi indicare almeno 2 simboli (es: fuoco acqua).")
        return

    simboli = context.args[:3]  # Limitiamo a massimo 3
    paths = [f"static/{s}.png" for s in simboli]

    if not all(os.path.exists(p) for p in paths):
        await update.message.reply_text("Uno o più simboli non sono validi. Riprova.")
        return

    out_path = f"temp/{update.effective_user.id}_cerchio.png"
    crea_cerchio(paths, out_path)

    with open(out_path, "rb") as img:
        await update.message.reply_photo(photo=InputFile(img))

app = ApplicationBuilder().token(TOKEN).build()
app.add_handler(CommandHandler("start", start))
app.add_handler(CommandHandler("combina", combina))

if __name__ == "__main__":
    app.run_polling()
