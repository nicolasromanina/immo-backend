// Script CommonJS pour corriger la syntaxe des variables dans tous les templates
// Remplace {variable} par ${variable} dans le champ content et subject


const mongoose = require('mongoose');
const path = require('path');
// Résout le chemin absolu du modèle Template
const Template = require(path.join(__dirname, '../src/models/Template')).default || require(path.join(__dirname, '../src/models/Template'));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dashboard';

async function fixTemplates() {
  await mongoose.connect(MONGO_URI);
  const templates = await Template.find({});
  let count = 0;

  for (const tpl of templates) {
    let updated = false;
    // Correction dans content
    if (tpl.content) {
      const newContent = tpl.content.replace(/\{([a-zA-Z0-9_]+)\}/g, '`${$1}`');
      if (newContent !== tpl.content) {
        tpl.content = newContent;
        updated = true;
      }
    }
    // Correction dans subject (pour les emails)
    if (tpl.subject) {
      const newSubject = tpl.subject.replace(/\{([a-zA-Z0-9_]+)\}/g, '`${$1}`');
      if (newSubject !== tpl.subject) {
        tpl.subject = newSubject;
        updated = true;
      }
    }
    if (updated) {
      await tpl.save();
      count++;
    }
  }
  console.log(`Templates corrigés : ${count}`);
  await mongoose.disconnect();
}

fixTemplates().catch(err => {
  console.error(err);
  process.exit(1);
});
